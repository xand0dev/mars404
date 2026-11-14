"""F3 крок 2 (офлайн, детермінований): кеш fetch.py → public/data/gale.
DEM 1 м → сітка 256×256 по 10 м: висоти — mean з валідних пікселів (без валідних — NoData),
схил — Horn 3×3 на нативному 1 м → max по клітинці, hazard = f(схил) (assumption), walkable.
Без часових міток і випадковості; SHA256SUMS у кінці (F3-AC1).
Запуск з кореня: python pipeline/prepare.py [--cache pipeline/.cache/gale] [--output public/data/gale]
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


def build(cache):
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
    slope = block_max(horn_slope(dem, nw, nh, cfg.NATIVE_M), nw, nh, k)
    walk = [0 if _invalid(z) or not math.isfinite(s) else 1 for z, s in zip(elev, slope)]
    haz = [1.0 if not w else hazard(s, HAZARD_MODEL) for s, w in zip(slope, walk)]
    slope = [s if w else math.nan for s, w in zip(slope, walk)]

    bbox = cfg.BBOX
    origin = (0, H * cfg.MPP)
    bx, by = lonlat_to_xy(*cfg.CENTER, bbox, origin)
    bc, br = int(bx // cfg.MPP), int((origin[1] - by) // cfg.MPP)
    cells = sorted(range(W * H), key=lambda i: ((i // W - br) ** 2 + (i % W - bc) ** 2, i))
    bi = next(i for i in cells if walk[i])
    base = [round(origin[0] + (bi % W + .5) * cfg.MPP, 3), round(origin[1] - (bi // W + .5) * cfg.MPP, 3)]

    trav = json.loads((cache / 'MSL_traverse.json').read_text(encoding='utf-8'))
    lines = [ln for f in trav['features'] for ln in (f['geometry']['coordinates'] if f['geometry']['type'] == 'MultiLineString' else [f['geometry']['coordinates']])]
    parts = clip_lines([[[round(c, 7) for c in p[:3]] for p in ln] for ln in lines], bbox)
    traverse = dict(type='FeatureCollection', features=[dict(type='Feature', geometry=dict(type='LineString', coordinates=p), properties={}) for p in parts])

    overlays, thermal_layers, thermal_sources, thermal_stats = {}, [], [], {}
    nat_w, nat_h = themis.native_count(bbox)
    for key, product in themis.PRODUCTS.items():
        names = {(r, c): themis.tile_name(key, r, c) for r, c in themis.tiles_for(bbox)}
        dn = themis.sample({rc: (cache / n).read_bytes() for rc, n in names.items()}, bbox, W, H)
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
    fin_s = sorted(s for s in slope if math.isfinite(s))
    trek_credit = 'NASA/JPL-Caltech, Mars Trek'
    sources = [
        src('trek-gale-dem-1m', 'Gale DEM 1 m (HiRISE stereo)', 'verified', 'Float32 TIFF via exportImage, nearest neighbour at native 1 m; mean of valid pixels per 10 m cell.', f['dem.tif']['url'], trek.DEM, trek_credit, at('dem.tif')),
        src('trek-hirise-mosaic', 'HiRISE mosaic, Curiosity area', 'verified', 'Grayscale JPEG 2048², same bbox; display only.', f['hirise.jpg']['url'], trek.HIRISE, trek_credit, at('hirise.jpg')),
        src('mmgis-msl-traverse', 'Curiosity traverse (MMGIS)', 'verified', 'MSL_traverse.json clipped to bbox; line leaves bbox → split.', f['MSL_traverse.json']['url'], 'MSL_traverse', 'NASA/JPL-Caltech, MSL MMGIS', at('MSL_traverse.json')),
        *thermal_sources,
        src('hazard-from-slope', 'Hazard derived from slope', 'assumption', f"hazard = min(1, slopeDeg / {HAZARD_MODEL['slopeDegAtMax']}) x {HAZARD_MODEL['maxHazard']}; NoData = 1. Test coefficients, not measured hazard."),
        src('base-assumption', 'Habitat base', 'assumption', f"Walkable cell nearest to bbox centre (lon {cfg.CENTER[0]}, lat {cfg.CENTER[1]}, centroid of F6 targets); not a real habitat site."),
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
    by_id = {s['id']: s for s in sources}
    model_vals = dict(speedMps=SPEED_MPS, uphillFactor=2, downhillFactor=0.5, o2GPerS=O2_G_PER_S, energyWhPerM=0.05, doseUSvPerS=None, maxSlopeDeg=25, hazardWeight=0.5, reserveFraction=RESERVE_FRACTION)
    evidence = {key: by_id['model-assumption'] for key in model_vals}
    evidence.update(speedMps=by_id['jones-apollo-walk'], o2GPerS=by_id['jones-apollo-walk'], emergencyO2G=by_id['emu-sop-30min'])
    model = dict(model_vals, emergencyO2G=EMERGENCY_O2_G, evidence=evidence)
    limits = dict(time=LIMIT_TIME_S, o2=LIMIT_O2_G, energy=600, dose=None)
    limits_evidence = {k: by_id[f'limit-{k}-assumption'] for k in limits}
    lo, hi = math.floor(min(finite_e)), math.ceil(max(finite_e))

    def layer(id, name, kind, url, srcs, units, native, method, legend):
        return dict(id=id, name=name, kind=kind, url=url, sourceIds=srcs, status='verified' if 'hazard-from-slope' not in srcs else 'assumption',
                    units=units, nativeResolutionM=native, gridResolutionM=cfg.MPP, method=method, legend=legend)
    layers = [
        layer('terrain', 'Terrain (DEM)', 'terrain', 'elevation.f32', ['trek-gale-dem-1m'], 'm', cfg.NATIVE_M, 'mean of valid 1 m pixels per cell',
              [dict(value=lo, label=f'{lo} m (lowest)', color='#3b2a20'), dict(value=hi, label=f'{hi} m (highest)', color='#e8dcc8')]),
        layer('optical', 'Optical (HiRISE)', 'optical', 'hirise.jpg', ['trek-hirise-mosaic'], 'grayscale', 0.25, 'exportImage resample to 2048²',
              [dict(value=0, label='dark', color='#000000'), dict(value=255, label='bright', color='#ffffff')]),
        *thermal_layers,
        layer('slope', 'Slope (derived)', 'slope', 'slope.f32', ['trek-gale-dem-1m', 'hazard-from-slope'], '°', cfg.NATIVE_M, 'Horn 3x3 at 1 m, max per cell',
              [dict(value=0, label='0° flat', color='#2f6f4f'), dict(value=15, label='15° moderate', color='#c9a227'), dict(value=25, label='25° model limit', color='#c0392b')]),
        layer('traverse', 'Curiosity traverse', 'mission', 'traverse.geojson', ['mmgis-msl-traverse'], 'path', None, 'clip to bbox',
              [dict(value=1, label='rover path', color='#e8b84a')]),
    ]
    region = dict(schemaVersion=1, id='gale', name='Gale · Mount Sharp (Curiosity stops, sol 3008–3192)', status='verified',
                  grid=dict(width=W, height=H, metersPerPixel=cfg.MPP, originM=list(origin), rowOrder='north-to-south',
                            boundsLonLat=list(bbox), crs='Mars 2000 geographic (Trek bboxSR 104905)'),
                  files=dict(elevation='elevation.f32', slope='slope.f32', walkable='walkable.u8', hazard='hazard.f32',
                             texture='hirise.jpg', targets='targets.geojson', traverse='traverse.geojson', photos='photos/photos.geojson'),
                  noData=NODATA, base=base, model=model,
                  limits=limits, limitsEvidence=limits_evidence, layers=layers, sources=sources,
                  hazardFromSlope=HAZARD_MODEL)
    source = dict(accessedAt=day, bbox=list(bbox), center=list(cfg.CENTER), inputs=f,
                  native=dict(width=nw, height=nh, mpp=cfg.NATIVE_M, tiffNoData=tiff_nd,
                              noDataFraction=round(1 - len(valid_native) / len(dem), 6),
                              elevMinM=round(min(valid_native), 3), elevMaxM=round(max(valid_native), 3)),
                  grid=dict(noDataCells=W * H - len(finite_e), slopeP50=round(fin_s[len(fin_s) // 2], 2), slopeP95=round(fin_s[len(fin_s) * 95 // 100], 2),
                            cellsOver25=sum(1 for s in fin_s if s > 25)),
                  thermal=thermal_stats, hazardFromSlope=HAZARD_MODEL)
    dump = lambda d: (json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8')  # noqa: E731
    return {
        'elevation.f32': f32(elev), 'slope.f32': f32(slope), 'hazard.f32': f32(haz), 'walkable.u8': bytes(walk),
        'hirise.jpg': (cache / 'hirise.jpg').read_bytes(), 'traverse.geojson': dump(traverse),
        'region.json': dump(region), 'source.json': dump(source), **overlays,
    }


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('--cache', default=str(Path(__file__).parent / '.cache' / 'gale'))
    p.add_argument('--output', default='public/data/gale')
    a = p.parse_args(argv)
    out = Path(a.output)
    out.mkdir(parents=True, exist_ok=True)
    files = build(Path(a.cache))
    for name, data in files.items():
        (out / name).parent.mkdir(parents=True, exist_ok=True)
        (out / name).write_bytes(data)
    sums = ''.join(f'{hashlib.sha256(files[n]).hexdigest()}  {n}\n' for n in sorted(files))
    (out / 'SHA256SUMS').write_bytes(sums.encode('utf-8'))
    print(f'gale: {cfg.CELLS}x{cfg.CELLS} @ {cfg.MPP} m -> {out}')


if __name__ == '__main__':
    main()
