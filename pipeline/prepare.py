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
import trek  # noqa: E402
import region_config as cfg  # noqa: E402

NODATA = -9999.0
HAZARD_MODEL = dict(kind='slope-linear', slopeDegAtMax=25, maxHazard=0.5)


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
    cur = json.loads((cache / 'MSL_waypoints_current.json').read_text(encoding='utf-8'))['features'][0]['properties']
    bx, by = lonlat_to_xy(cur['lon'], cur['lat'], bbox, origin)
    bc, br = int(bx // cfg.MPP), int((origin[1] - by) // cfg.MPP)
    cells = sorted(range(W * H), key=lambda i: ((i // W - br) ** 2 + (i % W - bc) ** 2, i))
    bi = next(i for i in cells if walk[i])
    base = [round(origin[0] + (bi % W + .5) * cfg.MPP, 3), round(origin[1] - (bi // W + .5) * cfg.MPP, 3)]

    trav = json.loads((cache / 'MSL_traverse.json').read_text(encoding='utf-8'))
    lines = [ln for f in trav['features'] for ln in (f['geometry']['coordinates'] if f['geometry']['type'] == 'MultiLineString' else [f['geometry']['coordinates']])]
    parts = clip_lines([[[round(c, 7) for c in p[:3]] for p in ln] for ln in lines], bbox)
    traverse = dict(type='FeatureCollection', features=[dict(type='Feature', geometry=dict(type='LineString', coordinates=p), properties={}) for p in parts])

    finite_e = [v for v in elev if not _invalid(v)]
    fin_s = sorted(s for s in slope if math.isfinite(s))
    trek_credit = 'NASA/JPL-Caltech, Mars Trek'
    f = meta['files']
    sources = [
        src('trek-gale-dem-1m', 'Gale DEM 1 m (HiRISE stereo)', 'verified', 'Float32 TIFF via exportImage, nearest neighbour at native 1 m; mean of valid pixels per 10 m cell.', f['dem.tif']['url'], trek.DEM, trek_credit, day),
        src('trek-hirise-mosaic', 'HiRISE mosaic, Curiosity area', 'verified', 'Grayscale JPEG 2048², same bbox; display only.', f['hirise.jpg']['url'], trek.HIRISE, trek_credit, day),
        src('mmgis-msl-traverse', 'Curiosity traverse (MMGIS)', 'verified', 'MSL_traverse.json clipped to bbox; line leaves bbox → split.', f['MSL_traverse.json']['url'], 'MSL_traverse', 'NASA/JPL-Caltech, MSL MMGIS', day),
        src('mmgis-msl-current', 'Curiosity current position (MMGIS)', 'verified', f"sol {cur['sol']}, lon {cur['lon']}, lat {cur['lat']}: bbox centre.", f['MSL_waypoints_current.json']['url'], 'MSL_waypoints_current', 'NASA/JPL-Caltech, MSL MMGIS', day),
        src('hazard-from-slope', 'Hazard derived from slope', 'assumption', f"hazard = min(1, slopeDeg / {HAZARD_MODEL['slopeDegAtMax']}) x {HAZARD_MODEL['maxHazard']}; NoData = 1. Test coefficients, not measured hazard."),
        src('base-assumption', 'Habitat base', 'assumption', "Walkable cell nearest to Curiosity's current position; not a real habitat site."),
        src('model-assumption', 'Walk model and limits', 'assumption', 'Values of SPEC §7.3–7.4 reference example (src/mocks); sources pending (F4/F5).'),
    ]
    model_vals = dict(speedMps=1, uphillFactor=2, downhillFactor=0.5, o2GPerS=0.2, energyWhPerM=0.05, doseUSvPerS=None, maxSlopeDeg=25, hazardWeight=0.5, reserveFraction=0.2)
    model = dict(model_vals, evidence={key: sources[-1] for key in model_vals})
    lo, hi = math.floor(min(finite_e)), math.ceil(max(finite_e))

    def layer(id, name, kind, url, srcs, units, native, method, legend):
        return dict(id=id, name=name, kind=kind, url=url, sourceIds=srcs, status='verified' if 'hazard-from-slope' not in srcs else 'assumption',
                    units=units, nativeResolutionM=native, gridResolutionM=cfg.MPP, method=method, legend=legend)
    layers = [
        layer('terrain', 'Terrain (DEM)', 'terrain', 'elevation.f32', ['trek-gale-dem-1m'], 'm', cfg.NATIVE_M, 'mean of valid 1 m pixels per cell',
              [dict(value=lo, label=f'{lo} m (lowest)', color='#3b2a20'), dict(value=hi, label=f'{hi} m (highest)', color='#e8dcc8')]),
        layer('optical', 'Optical (HiRISE)', 'optical', 'hirise.jpg', ['trek-hirise-mosaic'], 'grayscale', 0.25, 'exportImage resample to 2048²',
              [dict(value=0, label='dark', color='#000000'), dict(value=255, label='bright', color='#ffffff')]),
        layer('slope', 'Slope (derived)', 'slope', 'slope.f32', ['trek-gale-dem-1m', 'hazard-from-slope'], '°', cfg.NATIVE_M, 'Horn 3x3 at 1 m, max per cell',
              [dict(value=0, label='0° flat', color='#2f6f4f'), dict(value=15, label='15° moderate', color='#c9a227'), dict(value=25, label='25° model limit', color='#c0392b')]),
        layer('traverse', 'Curiosity traverse', 'mission', 'traverse.geojson', ['mmgis-msl-traverse'], 'path', None, 'clip to bbox',
              [dict(value=1, label='rover path', color='#4fc3f7')]),
    ]
    region = dict(schemaVersion=1, id='gale', name='Gale · Mount Sharp (Curiosity area)', status='verified',
                  grid=dict(width=W, height=H, metersPerPixel=cfg.MPP, originM=list(origin), rowOrder='north-to-south',
                            boundsLonLat=list(bbox), crs='Mars 2000 geographic (Trek bboxSR 104905)'),
                  files=dict(elevation='elevation.f32', slope='slope.f32', walkable='walkable.u8', hazard='hazard.f32',
                             texture='hirise.jpg', targets='targets.geojson', traverse='traverse.geojson'),
                  noData=NODATA, base=base, model=model,
                  limits=dict(time=3600, o2=720, energy=600, dose=None), layers=layers, sources=sources,
                  hazardFromSlope=HAZARD_MODEL)
    source = dict(accessedAt=day, bbox=list(bbox), center=list(cfg.CENTER), inputs=f,
                  native=dict(width=nw, height=nh, mpp=cfg.NATIVE_M, tiffNoData=tiff_nd,
                              noDataFraction=round(1 - len(valid_native) / len(dem), 6),
                              elevMinM=round(min(valid_native), 3), elevMaxM=round(max(valid_native), 3)),
                  grid=dict(noDataCells=W * H - len(finite_e), slopeP50=round(fin_s[len(fin_s) // 2], 2), slopeP95=round(fin_s[len(fin_s) * 95 // 100], 2),
                            cellsOver25=sum(1 for s in fin_s if s > 25)),
                  hazardFromSlope=HAZARD_MODEL)
    dump = lambda d: (json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8')  # noqa: E731
    return {
        'elevation.f32': f32(elev), 'slope.f32': f32(slope), 'hazard.f32': f32(haz), 'walkable.u8': bytes(walk),
        'hirise.jpg': (cache / 'hirise.jpg').read_bytes(), 'traverse.geojson': dump(traverse),
        'region.json': dump(region), 'source.json': dump(source),
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
        (out / name).write_bytes(data)
    sums = ''.join(f'{hashlib.sha256(files[n]).hexdigest()}  {n}\n' for n in sorted(files))
    (out / 'SHA256SUMS').write_bytes(sums.encode('utf-8'))
    print(f'gale: {cfg.CELLS}x{cfg.CELLS} @ {cfg.MPP} m -> {out}')


if __name__ == '__main__':
    main()
