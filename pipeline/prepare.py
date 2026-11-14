"""F3 крок 2 (офлайн, детермінований): кеш fetch.py → public/data/<region> (gale, columbia-hills; #101).
DEM 1 м → сітка 256×256 по 10 м: висоти — mean з валідних пікселів (без валідних — NoData),
схил — Horn 3×3 на нативному 1 м → max по клітинці, hazard = f(схил) (assumption), walkable.
elevation_render.f32 — 1024² по 2.5 м, середнє з валідних 1-м пікселів, зважене площею перетину (лише 3D).
Якщо в папці виходу є context.json (кладе context.py, Іван, #113) — переноситься в region.json.context.
Без часових міток і випадковості; SHA256SUMS у кінці (F3-AC1).
Запуск з кореня: python pipeline/prepare.py [--region gale] [--cache pipeline/.cache/<region>] [--output public/data/<region>]
"""
import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import png  # noqa: E402
import themis  # noqa: E402
import trek  # noqa: E402
import region_config as cfg  # noqa: E402

NODATA = -9999.0
HAZARD_MODEL = dict(kind='slope-linear', slopeDegAtMax=25, maxHazard=0.5)
# Модель — рішення 14.11 (#20, коментар xand0dev 14:05), джерела F5 (docs/SOURCES.md ## F5, #41).
# o2GPerS: Apollo, ходьба 3.5 км/год — 1560 BTU/год × 0.16 lb/год на 1000 BTU/год ≈ 113 г/год ≈ 0.031 г/с.
O2_G_PER_S = 0.031
SPEED_MPS = 1.0
# Аварійний запас O₂ (SPEC §7.6): SOP скафандра EMU — мінімум 30 хв; грами = 1800 с × o2GPerS.
EMERGENCY_O2_MIN = 30
LIMIT_TIME_S = 3600
RESERVE_FRACTION = 0.2
# limits.o2 = година ходьби з витратою Apollo після резерву 20 %: 0.031 × 3600 / 0.8 ≈ 140 г — assumption (рішення #20 14:11, #64).
LIMIT_O2_G = round(round(O2_G_PER_S * LIMIT_TIME_S) / (1 - RESERVE_FRACTION))  # 112 / 0.8 = 140
# Аварійний запас округлено до грама, як у рішенні #20 і розрахунках F5 (1800 × 0.031 = 55.8 → 56).
EMERGENCY_O2_G = round(EMERGENCY_O2_MIN * 60 * O2_G_PER_S)
JONES_URL = 'https://www.osti.gov/servlets/purl/7168757'
EMU_SOP_URL = 'https://ntrs.nasa.gov/api/citations/20140009556/downloads/20140009556.pdf'
MAX_SLOPE_DEG = 25
# Hillshade texture для районів без ортомозаїки (Columbia Hills): класичне сонце з північного заходу.
HILLSHADE_AZ = 315
HILLSHADE_ALT = 45
# Тексти легенд THEMIS: лише те, що сказано в описі продукту Trek.
THERMAL = {
    'night': dict(id='thermal', name='Thermal IR night (THEMIS)', low='cooler at night (lower thermal inertia)', high='warmer at night (higher thermal inertia)'),
    'day': dict(id='thermal-day', name='Thermal IR day (THEMIS)', low='cooler by day (shaded slopes)', high='warmer by day (sunward slopes)'),
}


def _invalid(v):
    return v == NODATA or not math.isfinite(v) or abs(v) >= 3e38


def _blocks(values, w, h, k):
    if w % k or h % k or len(values) != w * h:
        raise ValueError(f'native {w}x{h} not divisible by {k}')
    for R in range(h // k):
        rows = [values[(R * k + a) * w:(R * k + a + 1) * w] for a in range(k)]
        for C in range(w // k):
            yield [v for row in rows for v in row[C * k:(C + 1) * k]]


def block_mean(values, w, h, k):
    out = []
    for px in _blocks(values, w, h, k):
        valid = [v for v in px if not _invalid(v)]
        out.append(math.fsum(valid) / len(valid) if valid else NODATA)
    return out


def block_max(values, w, h, k):
    out = []
    for px in _blocks(values, w, h, k):
        valid = [v for v in px if math.isfinite(v)]
        out.append(max(valid) if valid else math.nan)
    return out


def _overlaps(n, N):
    """Для кожної з N клітинок — [(піксель, частка площі)] з n пікселів (n/N може бути дробовим)."""
    step = n / N
    out = []
    for c in range(N):
        a, b = c * step, (c + 1) * step
        out.append([(i, min(b, i + 1) - max(a, i)) for i in range(math.floor(a), math.ceil(b)) if min(b, i + 1) > max(a, i)])
    return out


def box_resample(values, w, h, W, H):
    """Середнє валідних пікселів, зважене площею перетину з клітинкою W×H; без валідних — NoData."""
    if len(values) != w * h:
        raise ValueError('розмір values')
    xs, ys = _overlaps(w, W), _overlaps(h, H)
    out = []
    for ry in ys:
        for cx in xs:
            tot = acc = 0.0
            for i, wy in ry:
                row = i * w
                for j, wx in cx:
                    v = values[row + j]
                    if not _invalid(v):
                        acc += v * wx * wy
                        tot += wx * wy
            out.append(acc / tot if tot else NODATA)
    return out


def hillshade(dem, w, h, res, azimuth=315.0, altitude=45.0):
    """Hillshade 0…1 (формула ESRI, градієнт Horn 3×3); NoData поруч → NODATA."""
    zen, az = math.radians(90 - altitude), math.radians((360 - azimuth + 90) % 360)
    cz, sz = math.cos(zen), math.sin(zen)
    out = [NODATA] * (w * h)
    k = 1 / (8 * res)
    for r in range(h):
        up, mid, dn = (max(r - 1, 0)) * w, r * w, (min(r + 1, h - 1)) * w
        for c in range(w):
            cl, cr = max(c - 1, 0), min(c + 1, w - 1)
            a, b, cc = dem[up + cl], dem[up + c], dem[up + cr]
            d, f = dem[mid + cl], dem[mid + cr]
            g, hh, i = dem[dn + cl], dem[dn + c], dem[dn + cr]
            if any(_invalid(v) for v in (a, b, cc, d, dem[mid + c], f, g, hh, i)):
                continue
            dx = ((cc + 2 * f + i) - (a + 2 * d + g)) * k
            dy = ((g + 2 * hh + i) - (a + 2 * b + cc)) * k
            sl = math.atan(math.hypot(dx, dy))
            asp = math.atan2(dy, -dx)
            out[mid + c] = max(0.0, cz * math.cos(sl) + sz * math.sin(sl) * math.cos(az - asp))
    return out


def reachable(walk, slope, W, H, start, max_slope):
    """Клітинки, досяжні з start по 8 сусідах: walkable = 1 і схил ≤ max_slope (як блокування F4)."""
    ok = lambda i: walk[i] and math.isfinite(slope[i]) and slope[i] <= max_slope  # noqa: E731
    seen = {start} if ok(start) else set()
    todo = list(seen)
    while todo:
        i = todo.pop()
        r, c = divmod(i, W)
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                rr, cc = r + dr, c + dc
                j = rr * W + cc
                if (dr or dc) and 0 <= rr < H and 0 <= cc < W and j not in seen and ok(j):
                    seen.add(j)
                    todo.append(j)
    return seen


def horn_slope(dem, w, h, res):
    """Схил у градусах (Horn 3×3), краї — повтор крайнього пікселя; NoData поруч → NaN."""
    out = [math.nan] * (w * h)
    k = 1 / (8 * res)
    for r in range(h):
        up, mid, dn = (max(r - 1, 0)) * w, r * w, (min(r + 1, h - 1)) * w
        for c in range(w):
            cl, cr = max(c - 1, 0), min(c + 1, w - 1)
            a, b, cc = dem[up + cl], dem[up + c], dem[up + cr]
            d, e, f = dem[mid + cl], dem[mid + c], dem[mid + cr]
            g, hh, i = dem[dn + cl], dem[dn + c], dem[dn + cr]
            if any(_invalid(v) for v in (a, b, cc, d, e, f, g, hh, i)):
                continue
            dx = ((cc + 2 * f + i) - (a + 2 * d + g)) * k
            dy = ((g + 2 * hh + i) - (a + 2 * b + cc)) * k
            out[mid + c] = math.degrees(math.atan(math.hypot(dx, dy)))
    return out


def hazard(slope_deg, model):
    if not math.isfinite(slope_deg):
        return 1.0
    return min(1.0, max(0.0, slope_deg) / model['slopeDegAtMax']) * model['maxHazard']


def clip_lines(lines, bbox):
    """Частини ліній усередині bbox; вихід за межі розриває лінію."""
    w, s, e, n = bbox
    out = []
    for line in lines:
        cur = []
        for p in line:
            if w <= p[0] <= e and s <= p[1] <= n:
                cur.append(p)
            else:
                if len(cur) > 1:
                    out.append(cur)
                cur = []
        if len(cur) > 1:
            out.append(cur)
    return out


def lonlat_to_xy(lon, lat, bbox, origin):
    """Як lonLatToXY у src/contracts/planning.ts."""
    west, south, _, north = bbox
    mid = math.radians((south + north) / 2)
    return (origin[0] + (lon - west) * trek.M_PER_DEG * math.cos(mid), origin[1] - (north - lat) * trek.M_PER_DEG)


def f32(values):
    return struct.pack(f'<{len(values)}f', *values)


def src(id, title, status, note, url=None, product=None, credit=None, accessed=None):
    s = dict(id=id, title=title, status=status, note=note)
    for k, v in (('url', url), ('productId', product), ('credit', credit), ('accessedAt', accessed)):
        if v is not None:
            s[k] = v
    return s


CONTEXT_KEYS = ('file', 'width', 'height', 'metersPerPixel', 'originM', 'noData')


def read_context(out):
    """context.json від context.py (#113) → поле region.context (лише ключі контракту) і файли для SHA256SUMS."""
    path = out / 'context.json' if out else None
    if not path or not path.exists():
        return None, {}
    ctx = json.loads(path.read_text(encoding='utf-8'))
    extra = {'context.json': path.read_bytes()}
    if (out / ctx['file']).exists():
        extra[ctx['file']] = (out / ctx['file']).read_bytes()
    return {k: ctx[k] for k in CONTEXT_KEYS if k in ctx}, extra


def esri_lines(doc):
    return [ln for ft in doc['features'] for ln in ft['geometry'].get('paths', [])]


def esri_points(doc):
    return [(ft['attributes']['name'], ft['geometry']['x'], ft['geometry']['y']) for ft in doc['features']]


def pick_base(walk, slope, W, H, cells, points, need=3):
    """Перша (найближча до центру) walkable-клітинка, з якої досяжні ≥ need клітинок points. → (cell, reach)."""
    for i in cells:
        if not walk[i]:
            continue
        reach = reachable(walk, slope, W, H, i, MAX_SLOPE_DEG)
        if sum(p in reach for p in points) >= need:
            return i, reach
    raise ValueError(f'немає бази з досяжними ≥ {need} точками')


def build(cache, region='gale', out=None):
    rc = cfg.REGIONS[region]
    if rc['kind'] != 'eva':
        raise ValueError(f'{region}: overview — пакет будує overview.py (#113)')
    gale = region == 'gale'
    bbox, center = rc['bbox'], rc['center']
    meta = json.loads((cache / 'fetch.json').read_text(encoding='utf-8'))
    day = meta['accessedAt']
    f = meta['files']
    at = lambda name: f[name].get('accessedAt', day)  # noqa: E731
    nw, nh, dem, tiff_nd = trek.read_tiff_f32((cache / 'dem.tif').read_bytes())
    if (nw, nh) != (cfg.NATIVE_PX, cfg.NATIVE_PX):
        raise ValueError(f'DEM {nw}x{nh}, expected {cfg.NATIVE_PX}')
    if tiff_nd is not None:
        dem = [NODATA if v == tiff_nd else v for v in dem]
    k = cfg.MPP // cfg.NATIVE_M
    W = H = cfg.CELLS
    valid_native = [v for v in dem if not _invalid(v)]
    elev = block_mean(dem, nw, nh, k)
    render = box_resample(dem, nw, nh, cfg.RENDER_PX, cfg.RENDER_PX)
    slope = block_max(horn_slope(dem, nw, nh, cfg.NATIVE_M), nw, nh, k)
    walk = [0 if _invalid(z) or not math.isfinite(s) else 1 for z, s in zip(elev, slope)]
    haz = [1.0 if not w else hazard(s, HAZARD_MODEL) for s, w in zip(slope, walk)]
    slope = [s if w else math.nan for s, w in zip(slope, walk)]

    origin = (0, H * cfg.MPP)

    def to_cell(lon, lat):
        x, y = lonlat_to_xy(lon, lat, bbox, origin)
        return min(H - 1, int((origin[1] - y) // cfg.MPP)) * W + min(W - 1, int(x // cfg.MPP))

    def inside(lon, lat):
        return bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]

    bx, by = lonlat_to_xy(*center, bbox, origin)
    bc, br = int(bx // cfg.MPP), int((origin[1] - by) // cfg.MPP)
    cells = sorted(range(W * H), key=lambda i: ((i // W - br) ** 2 + (i % W - bc) ** 2, i))
    waypoints = []
    base_note = f"Walkable cell nearest to bbox centre (lon {center[0]}, lat {center[1]}, {rc['centerNote']}); not a real habitat site."
    if gale:
        bi = next(i for i in cells if walk[i])
    else:
        # #101: база — walkable-клітинка, з якої по схилу ≤ maxSlopeDeg досяжні ≥ 3 точки Spirit у районі.
        wps = [(n, lon, lat) for n, lon, lat in esri_points(json.loads((cache / 'spirit_waypoints.json').read_text(encoding='utf-8'))) if inside(lon, lat)]
        bi, reach = pick_base(walk, slope, W, H, cells, [to_cell(lon, lat) for _, lon, lat in wps])
        waypoints = [dict(name=n, lonLat=[lon, lat], cell=to_cell(lon, lat), reachableFromBase=to_cell(lon, lat) in reach) for n, lon, lat in wps]
        base_note = (f"Walkable cell nearest to bbox centre (lon {center[0]}, lat {center[1]}, {rc['centerNote']}) from which "
                     f"{sum(w['reachableFromBase'] for w in waypoints)} of {len(waypoints)} Spirit waypoints in the bbox are reachable "
                     f"on slopes <= {MAX_SLOPE_DEG} deg; not a real habitat site.")
    base = [round(origin[0] + (bi % W + .5) * cfg.MPP, 3), round(origin[1] - (bi // W + .5) * cfg.MPP, 3)]

    if gale:
        trav = json.loads((cache / 'MSL_traverse.json').read_text(encoding='utf-8'))
        lines = [ln for ft in trav['features'] for ln in (ft['geometry']['coordinates'] if ft['geometry']['type'] == 'MultiLineString' else [ft['geometry']['coordinates']])]
        parts = clip_lines([[[round(c, 7) for c in p[:3]] for p in ln] for ln in lines], bbox)
    else:
        # Trek spirit_path — лише lon/lat; висота — з elevation.f32 (середнє клітинки 10 м).
        lines = esri_lines(json.loads((cache / 'spirit_path.json').read_text(encoding='utf-8')))
        parts = clip_lines([[[round(p[0], 7), round(p[1], 7)] for p in ln] for ln in lines], bbox)
        parts = [[[lon, lat, round(elev[to_cell(lon, lat)], 1)] for lon, lat in pt] for pt in parts]
    traverse = dict(type='FeatureCollection', features=[dict(type='Feature', geometry=dict(type='LineString', coordinates=p), properties={}) for p in parts])

    overlays, thermal_layers, thermal_sources, thermal_stats = {}, [], [], {}
    nat_w, nat_h = themis.native_count(bbox)
    for key, product in themis.PRODUCTS.items():
        names = {(r, c): themis.tile_name(key, r, c) for r, c in themis.tiles_for(bbox)}
        dn = themis.sample({rc_: (cache / n).read_bytes() for rc_, n in names.items()}, bbox, W, H)
        lo, hi = themis.stretch(dn)
        mid = (lo + hi) / 2
        path = f'layers/themis-{key}.png'
        overlays[path] = png.encode_rgba(W, H, themis.colorize(dn, lo, hi))
        t = THERMAL[key]
        sid = f'trek-themis-{key}-ir'
        thermal_stats[key] = dict(dnMin=min(v for v in dn if v is not None), dnMax=max(v for v in dn if v is not None), stretchLo=lo, stretchHi=hi,
                                  emptyCells=sum(v is None for v in dn), nativePx=[nat_w, nat_h], tiles=sorted(names.values()))
        first = names[min(names)]
        thermal_sources.append(src(sid, f'THEMIS IR {key}, controlled mosaic 100 m v2 (Mars Odyssey)', 'verified',
                                   f'Trek WMTS PNG tiles, level {themis.LEVEL} (~{round(themis.tile_deg() / 256 * trek.M_PER_DEG)} m/px), {len(names)} tile(s); '
                                   f'~{nat_w}x{nat_h} native pixels over the bbox, nearest per 10 m cell. 8-bit display brightness, not calibrated temperature. '
                                   'Display only, not an input to hazard (SPEC §8).',
                                   f[first]['url'], product, 'NASA/JPL-Caltech/Arizona State University, Mars Odyssey THEMIS; Mars Trek', at(first)))
        thermal_layers.append(dict(
            id=t['id'], name=t['name'], kind='thermal', url=path, sourceIds=[sid], status='verified',
            units='relative IR brightness (8-bit DN)', nativeResolutionM=themis.NATIVE_M, gridResolutionM=cfg.MPP,
            method=f'WMTS tile, nearest per cell; linear stretch DN {lo}–{hi} (p2–p98) to colour ramp',
            legend=[dict(value=lo, label=f'DN {lo} · {t["low"]}', color=themis.RAMP[0]),
                    dict(value=round(mid, 1), label=f'DN {round(mid)} · middle', color=themis.RAMP[1]),
                    dict(value=hi, label=f'DN {hi} · {t["high"]}', color=themis.RAMP[2])]))

    finite_e = [v for v in elev if not _invalid(v)]
    finite_r = [v for v in render if not _invalid(v)]
    fin_s = sorted(s for s in slope if math.isfinite(s))
    trek_credit = 'NASA/JPL-Caltech, Mars Trek'
    if gale:
        dem_id, texture = 'trek-gale-dem-1m', 'hirise.jpg'
        region_sources = [
            src(dem_id, 'Gale DEM 1 m (HiRISE stereo)', 'verified', 'Float32 TIFF via exportImage, nearest neighbour at native 1 m; mean of valid pixels per 10 m cell.', f['dem.tif']['url'], trek.DEM, trek_credit, at('dem.tif')),
            src('trek-hirise-mosaic', 'HiRISE mosaic, Curiosity area', 'verified', 'Grayscale JPEG 2048², same bbox; display only.', f['hirise.jpg']['url'], trek.HIRISE, trek_credit, at('hirise.jpg')),
            src('mmgis-msl-traverse', 'Curiosity traverse (MMGIS)', 'verified', 'MSL_traverse.json clipped to bbox; line leaves bbox → split.', f['MSL_traverse.json']['url'], 'MSL_traverse', 'NASA/JPL-Caltech, MSL MMGIS', at('MSL_traverse.json')),
        ]
        texture_bytes = (cache / 'hirise.jpg').read_bytes()
    else:
        dem_id, texture = 'trek-columbia-hills-dem-1m', 'hillshade.png'
        region_sources = [
            src(dem_id, 'Columbia Hills DEM 1 m (HiRISE stereo)', 'verified',
                'Float32 TIFF via exportImage at 1 m (native 1.7e-5 deg ~ 1.01 m), nearest neighbour; mean of valid pixels per 10 m cell.',
                f['dem.tif']['url'], rc['dem'], trek_credit, at('dem.tif')),
            src('hillshade-from-dem', 'Hillshade derived from the 1 m DEM', 'assumption',
                f'No HiRISE orthomosaic of Gusev in Trek, so the texture is computed: hillshade (sun azimuth {HILLSHADE_AZ} deg, altitude {HILLSHADE_ALT} deg, '
                f'Horn 3x3 at 1 m), area-weighted mean to {cfg.TEXTURE_PX}². Shading of the DEM, not a photograph.'),
            src('trek-spirit-path', 'Spirit traverse (Mars Trek)', 'verified', 'spirit_path polylines (lon/lat) clipped to bbox; elevation taken from elevation.f32 (10 m cell mean).',
                f['spirit_path.json']['url'], 'spirit_path', 'NASA/JPL-Caltech, Mars Trek', at('spirit_path.json')),
            src('trek-spirit-waypoints', 'Spirit waypoints (Mars Trek)', 'verified', 'Husband Hill and Home Plate set the bbox centre; waypoints inside the bbox check the base.',
                f['spirit_waypoints.json']['url'], 'spirit_waypoints', 'NASA/JPL-Caltech, Mars Trek', at('spirit_waypoints.json')),
        ]
        shade = hillshade(dem, nw, nh, cfg.NATIVE_M, HILLSHADE_AZ, HILLSHADE_ALT)
        tex = box_resample(shade, nw, nh, cfg.TEXTURE_PX, cfg.TEXTURE_PX)
        texture_bytes = png.encode_gray(cfg.TEXTURE_PX, cfg.TEXTURE_PX, bytes(0 if _invalid(v) else min(255, round(v * 255)) for v in tex))
    sources = [
        *region_sources,
        *thermal_sources,
        src('hazard-from-slope', 'Hazard derived from slope', 'assumption', f"hazard = min(1, slopeDeg / {HAZARD_MODEL['slopeDegAtMax']}) x {HAZARD_MODEL['maxHazard']}; NoData = 1. Test coefficients, not measured hazard."),
        src('base-assumption', 'Habitat base', 'assumption', base_note),
        src('jones-apollo-walk', 'Apollo EVA walking: O2 use and speed', 'assumption',
            f'"Oxygen use was about 0.16 lb/hr per 1000 BTU/hr"; "1560 BTU/hr at 3.5 km/hr" -> ~113 g/h = {O2_G_PER_S} g/s (o2GPerS). '
            f'Emergency return "3.6 km/hr for periods of up to an hour" -> {SPEED_MPS} m/s (speedMps). Apollo, Moon; transferred to Mars (1/6 g -> 0.38 g).',
            JONES_URL, 'LA-UR-89-3858', 'E. M. Jones, Apollo Lunar Surface Journal', '2026-11-14'),
        src('emu-sop-30min', 'Emergency O2 reserve (EMU Secondary Oxygen Package)', 'verified',
            f'NASA EVA overview (NTRS 20140009556): the EMU SOP "provides a minimum of {EMERGENCY_O2_MIN} minutes of emergency O2". '
            f'Grams = {EMERGENCY_O2_MIN * 60} s x {O2_G_PER_S} g/s = {EMERGENCY_O2_MIN * 60 * O2_G_PER_S:.1f} -> {EMERGENCY_O2_G} g. ISS suit, not a Mars suit.',
            EMU_SOP_URL, 'NTRS 20140009556', 'NASA', '2026-11-14'),
        src('model-assumption', 'Walk model coefficients', 'assumption', 'uphill/downhill factors, max slope, hazard weight, reserve, energy: SPEC §7.3–7.4 values; no source (docs/SOURCES.md ## F5).'),
        src('limit-time-assumption', 'EVA time limit', 'assumption', f'{LIMIT_TIME_S} s: 1 h EVA for the demo (SPEC §7.4). For reference: EMU EVA up to 7 h (NTRS 20140009556).'),
        src('limit-o2-assumption', 'O2 available for this EVA', 'assumption', f'{LIMIT_O2_G} g: 1 h of walking at the Apollo rate after the {round(RESERVE_FRACTION * 100)}% reserve ({O2_G_PER_S} g/s x {LIMIT_TIME_S} s / {1 - RESERVE_FRACTION:g} = {round(O2_G_PER_S * LIMIT_TIME_S)} / {1 - RESERVE_FRACTION:g}); decision #20.'),
        src('limit-energy-assumption', 'Suit energy limit', 'assumption', '600 Wh; not set in SPEC.'),
        src('limit-dose-assumption', 'Radiation dose limit', 'assumption', 'No per-EVA dose limit -> null -> budget status incomplete (SPEC §7.6).'),
    ]
    by_id = {s_['id']: s_ for s_ in sources}
    model_vals = dict(speedMps=SPEED_MPS, uphillFactor=2, downhillFactor=0.5, o2GPerS=O2_G_PER_S, energyWhPerM=0.05, doseUSvPerS=None,
                      maxSlopeDeg=MAX_SLOPE_DEG, hazardWeight=0.5, reserveFraction=RESERVE_FRACTION)
    evidence = {key: by_id['model-assumption'] for key in model_vals}
    evidence.update(speedMps=by_id['jones-apollo-walk'], o2GPerS=by_id['jones-apollo-walk'], emergencyO2G=by_id['emu-sop-30min'])
    model = dict(model_vals, emergencyO2G=EMERGENCY_O2_G, evidence=evidence)
    limits = dict(time=LIMIT_TIME_S, o2=LIMIT_O2_G, energy=600, dose=None)
    limits_evidence = {k_: by_id[f'limit-{k_}-assumption'] for k_ in limits}
    lo, hi = math.floor(min(finite_e)), math.ceil(max(finite_e))

    def layer(id, name, kind, url, srcs, units, native, method, legend):
        status = 'verified' if all(by_id[s_]['status'] == 'verified' for s_ in srcs) else 'assumption'
        return dict(id=id, name=name, kind=kind, url=url, sourceIds=srcs, status=status,
                    units=units, nativeResolutionM=native, gridResolutionM=cfg.MPP, method=method, legend=legend)
    if gale:
        optical = layer('optical', 'Optical (HiRISE)', 'optical', 'hirise.jpg', ['trek-hirise-mosaic'], 'grayscale', 0.25, 'exportImage resample to 2048²',
                        [dict(value=0, label='dark', color='#000000'), dict(value=255, label='bright', color='#ffffff')])
        mission = layer('traverse', 'Curiosity traverse', 'mission', 'traverse.geojson', ['mmgis-msl-traverse'], 'path', None, 'clip to bbox',
                        [dict(value=1, label='rover path', color='#e8b84a')])
    else:
        optical = layer('optical', 'Hillshade (derived from DEM)', 'optical', texture, [dem_id, 'hillshade-from-dem'], 'relative shading', cfg.NATIVE_M,
                        f'hillshade at 1 m (sun {HILLSHADE_AZ} deg / {HILLSHADE_ALT} deg), area-weighted mean to {cfg.TEXTURE_PX}²; not an image',
                        [dict(value=0, label='slope facing away from the sun', color='#000000'), dict(value=255, label='slope facing the sun', color='#ffffff')])
        mission = layer('traverse', 'Spirit traverse', 'mission', 'traverse.geojson', ['trek-spirit-path'], 'path', None, 'clip to bbox; elevation from grid',
                        [dict(value=1, label='rover path', color='#e8b84a')])
    layers = [
        layer('terrain', 'Terrain (DEM)', 'terrain', 'elevation.f32', [dem_id], 'm', cfg.NATIVE_M, 'mean of valid 1 m pixels per cell',
              [dict(value=lo, label=f'{lo} m (lowest)', color='#3b2a20'), dict(value=hi, label=f'{hi} m (highest)', color='#e8dcc8')]),
        optical,
        *thermal_layers,
        layer('slope', 'Slope (derived)', 'slope', 'slope.f32', [dem_id, 'hazard-from-slope'], '°', cfg.NATIVE_M, 'Horn 3x3 at 1 m, max per cell',
              [dict(value=0, label='0° flat', color='#2f6f4f'), dict(value=15, label='15° moderate', color='#c9a227'), dict(value=25, label='25° model limit', color='#c0392b')]),
        mission,
    ]
    files = dict(elevation='elevation.f32', slope='slope.f32', walkable='walkable.u8', hazard='hazard.f32',
                 texture=texture, targets='targets.geojson', traverse='traverse.geojson')
    if gale:
        files['photos'] = 'photos/photos.geojson'
    files['elevationRender'] = 'elevation_render.f32'
    context, extra = read_context(out)
    region_doc = dict(schemaVersion=1, id=region, kind='eva', name=rc['name'], status='verified',
                      grid=dict(width=W, height=H, metersPerPixel=cfg.MPP, originM=list(origin), rowOrder='north-to-south',
                                boundsLonLat=list(bbox), crs='Mars 2000 geographic (Trek bboxSR 104905)'),
                      files=files, renderGrid=dict(width=cfg.RENDER_PX, height=cfg.RENDER_PX))
    if context:
        region_doc['context'] = context
    region_doc.update(noData=NODATA, base=base, model=model,
                      limits=limits, limitsEvidence=limits_evidence, layers=layers, sources=sources,
                      hazardFromSlope=HAZARD_MODEL)
    source = dict(accessedAt=day, bbox=list(bbox), center=list(center), inputs=f,
                  native=dict(width=nw, height=nh, mpp=cfg.NATIVE_M, tiffNoData=tiff_nd,
                              noDataFraction=round(1 - len(valid_native) / len(dem), 6),
                              elevMinM=round(min(valid_native), 3), elevMaxM=round(max(valid_native), 3)),
                  grid=dict(noDataCells=W * H - len(finite_e), slopeP50=round(fin_s[len(fin_s) // 2], 2), slopeP95=round(fin_s[len(fin_s) * 95 // 100], 2),
                            cellsOver25=sum(1 for s_ in fin_s if s_ > 25)),
                  render=dict(width=cfg.RENDER_PX, height=cfg.RENDER_PX, metersPerPixel=cfg.CELLS * cfg.MPP / cfg.RENDER_PX,
                              method='area-weighted mean of valid 1 m pixels (2.5 px per cell); 3D only, not used for planning',
                              noDataCells=len(render) - len(finite_r), elevMinM=round(min(finite_r), 3), elevMaxM=round(max(finite_r), 3)),
                  thermal=thermal_stats, hazardFromSlope=HAZARD_MODEL)
    if waypoints:
        source['waypoints'] = waypoints
    dump = lambda d: (json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8')  # noqa: E731
    out_files = {
        'elevation.f32': f32(elev), 'slope.f32': f32(slope), 'hazard.f32': f32(haz), 'walkable.u8': bytes(walk),
        texture: texture_bytes, 'traverse.geojson': dump(traverse), 'elevation_render.f32': f32(render),
        'region.json': dump(region_doc), 'source.json': dump(source), **overlays,
    }
    return out_files, extra


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('--region', default='gale', choices=cfg.EVA)
    p.add_argument('--cache')
    p.add_argument('--output')
    a = p.parse_args(argv)
    cache = Path(a.cache) if a.cache else Path(__file__).parent / '.cache' / a.region
    out = Path(a.output or f'public/data/{a.region}')
    out.mkdir(parents=True, exist_ok=True)
    files, extra = build(cache, a.region, out)
    for name, data in files.items():
        (out / name).parent.mkdir(parents=True, exist_ok=True)
        (out / name).write_bytes(data)
    # context.* (Іван, #113) теж у сумах, якщо лежать у папці; targets*, photos/ (F6) — ні, як і раніше.
    allf = dict(extra, **files)
    sums = ''.join(f'{hashlib.sha256(allf[n]).hexdigest()}  {n}\n' for n in sorted(allf))
    (out / 'SHA256SUMS').write_bytes(sums.encode('utf-8'))
    print(f'{a.region}: {cfg.CELLS}x{cfg.CELLS} @ {cfg.MPP} m, render {cfg.RENDER_PX}² -> {out}')


if __name__ == '__main__':
    main()
