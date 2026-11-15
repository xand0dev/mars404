"""F3 #113: overview-пакет (Olympus Mons, Valles Marineris) з кешу fetch.py → public/data/<region>. Офлайн, детерміновано.

Квадрат 614,4 км з центром IAU Gazetteer (region_config.py пояснює, чому не 51 км).
- dem.tif — exportImage MOLA + HRSC 200 м, 1024² по 600 м (білінійна інтерполяція сервера Trek).
- elevation.f32 — середнє валідних 4×4 → 256² по 2400 м; elevation_render.f32 — середнє 2×2 → 512² по 1200 м (лише 3D).
- slope.f32 — Horn 3×3 на 600 м, max по клітинці (схил на 600 м, не локальний: скелі тут м'якші, ніж насправді).
- walkable.u8 = схил ≤ maxSlopeDeg і висота є; hazard.f32 — та сама формула, що в EVA (assumption).
- texture.jpg — Viking MDIM 2.1 (колоризований USGS) 2048², той самий bbox, байти як віддав Trek.
- targets.geojson не пишемо (path guard: targets* — F6); завантажувач без файла дає targets = [] з попередженням.
Модель і ліміти — ті самі числа, що в EVA, але всі джерела зі статусом assumption: overview не для планування.
Масштаб: довгота в метри через cos(центральної широти), як lonLatToXY; на краях bbox (±5,2° широти)
похибка схід–захід до ~3,5 % (Olympus) і ~2,5 % (Valles) — для огляду прийнятно.

Запуск з кореня: python pipeline/overview.py --region olympus-mons [--cache pipeline/.cache/<id>] [--output public/data/<id>]
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import prepare as pp  # noqa: E402
import region_config as cfg  # noqa: E402
import trek  # noqa: E402

DEM_NATIVE_M = 200
VIKING_NATIVE_M = 232
RENDER_PX = 512
OVERVIEW_NOTE = 'Overview: not used for planning.'
MOLA_CREDIT = 'NASA/JPL/GSFC (MOLA), ESA/DLR/FU Berlin (HRSC), USGS Astrogeology, via NASA Mars Trek'
VIKING_CREDIT = 'NASA/JPL (Viking), USGS Astrogeology (MDIM 2.1, colorized), via NASA Mars Trek'


def build(cache, region):
    rc = cfg.REGIONS[region]
    if rc['kind'] != 'overview':
        raise ValueError(f'{region}: EVA-район — пакет будує prepare.py')
    bbox, center, mpp = rc['bbox'], rc['center'], rc['mpp']
    meta = json.loads((cache / 'fetch.json').read_text(encoding='utf-8'))
    f = meta['files']
    at = lambda name: f[name].get('accessedAt', meta['accessedAt'])  # noqa: E731
    nw, nh, dem, tiff_nd = trek.read_tiff_f32((cache / 'dem.tif').read_bytes())
    if (nw, nh) != (cfg.OVERVIEW_DEM_PX, cfg.OVERVIEW_DEM_PX):
        raise ValueError(f'DEM {nw}x{nh}, expected {cfg.OVERVIEW_DEM_PX}')
    dem = [pp.NODATA if (tiff_nd is not None and v == tiff_nd) or v < -20000 else v for v in dem]
    native_m = cfg.CELLS * mpp / nw
    W = H = cfg.CELLS
    k = nw // W
    valid_native = [v for v in dem if not pp._invalid(v)]
    elev = pp.block_mean(dem, nw, nh, k)
    render = pp.block_mean(dem, nw, nh, nw // RENDER_PX)
    slope = pp.block_max(pp.horn_slope(dem, nw, nh, native_m), nw, nh, k)
    walk = [0 if pp._invalid(z) or not math.isfinite(s) or s > pp.MAX_SLOPE_DEG else 1 for z, s in zip(elev, slope)]
    haz = [1.0 if not math.isfinite(s) else pp.hazard(s, pp.HAZARD_MODEL) for s in slope]
    origin = (0, H * mpp)
    base = [origin[0] + (W // 2 + .5) * mpp, origin[1] - (H // 2 + .5) * mpp]

    dem_id, tex_id = 'trek-mola-hrsc-200m', 'trek-viking-mdim21-color'
    model_srcs = [dict(s_, status='assumption', note=f"{s_['note']} {OVERVIEW_NOTE}") for s_ in pp.model_sources()]
    sources = [
        pp.src(dem_id, 'Mars MOLA + HRSC blended DEM 200 m', 'verified',
               f'Float32 TIFF via exportImage {nw}² ({native_m:g} m cells, bilinear by Trek) on the {cfg.CELLS * mpp / 1000:g} km bbox; '
               f'mean of valid pixels per {mpp} m cell.', f['dem.tif']['url'], rc['dem'], MOLA_CREDIT, at('dem.tif')),
        pp.src(tex_id, 'Viking MDIM 2.1 colorized global mosaic 232 m', 'verified',
               f'JPEG {cfg.OVERVIEW_TEXTURE_PX}² via exportImage (quality {cfg.OVERVIEW_JPEG_Q}), same bbox; colours are artistic (USGS colorization), not true colour. Display only.',
               f['texture.jpg']['url'], rc['texture'], VIKING_CREDIT, at('texture.jpg')),
        pp.src('hazard-from-slope', 'Hazard derived from slope', 'assumption',
               f"hazard = min(1, slopeDeg / {pp.HAZARD_MODEL['slopeDegAtMax']}) x {pp.HAZARD_MODEL['maxHazard']}; NoData = 1. "
               f'Slope over {native_m:g} m, so cliffs look gentler than they are. {OVERVIEW_NOTE}'),
        pp.src('base-assumption', 'Map centre', 'assumption',
               f"Centre cell of the grid (lon {center[0]}, lat {center[1]}, {rc['centerNote']}); no habitat. {OVERVIEW_NOTE}"),
        *model_srcs,
    ]
    by_id = {s_['id']: s_ for s_ in sources}
    model, limits, limits_evidence = pp.model_and_limits(by_id)
    fin_e = [v for v in elev if not pp._invalid(v)]
    fin_r = [v for v in render if not pp._invalid(v)]
    fin_s = sorted(s for s in slope if math.isfinite(s))
    lo, hi = math.floor(min(fin_e)), math.ceil(max(fin_e))

    def layer(id, name, kind, url, srcs, units, native, method, legend):
        status = 'verified' if all(by_id[s_]['status'] == 'verified' for s_ in srcs) else 'assumption'
        return dict(id=id, name=name, kind=kind, url=url, sourceIds=srcs, status=status,
                    units=units, nativeResolutionM=native, gridResolutionM=mpp, method=method, legend=legend)
    layers = [
        layer('terrain', 'Terrain (MOLA + HRSC)', 'terrain', 'elevation.f32', [dem_id], 'm', DEM_NATIVE_M,
              f'Trek bilinear to {native_m:g} m, mean of valid pixels per {mpp} m cell',
              [dict(value=lo, label=f'{lo} m (lowest)', color='#3b2a20'), dict(value=hi, label=f'{hi} m (highest)', color='#e8dcc8')]),
        layer('optical', 'Colour (Viking MDIM 2.1)', 'optical', 'texture.jpg', [tex_id], 'colorized RGB', VIKING_NATIVE_M,
              f'exportImage resample to {cfg.OVERVIEW_TEXTURE_PX}² (~{round(cfg.CELLS * mpp / cfg.OVERVIEW_TEXTURE_PX)} m/px); artistic colour',
              [dict(value=0, label='dark', color='#3a2418'), dict(value=255, label='bright', color='#e6c9a8')]),
        layer('slope', 'Slope (derived)', 'slope', 'slope.f32', [dem_id, 'hazard-from-slope'], '°', native_m,
              f'Horn 3x3 at {native_m:g} m, max per cell',
              [dict(value=0, label='0° flat', color='#2f6f4f'), dict(value=15, label='15° moderate', color='#c9a227'), dict(value=25, label='25° model limit', color='#c0392b')]),
    ]
    files = dict(elevation='elevation.f32', slope='slope.f32', walkable='walkable.u8', hazard='hazard.f32',
                 texture='texture.jpg', targets='targets.geojson', elevationRender='elevation_render.f32')
    region_doc = dict(schemaVersion=1, id=region, kind='overview', name=rc['name'], status='verified',
                      grid=dict(width=W, height=H, metersPerPixel=mpp, originM=list(origin), rowOrder='north-to-south',
                                boundsLonLat=list(bbox), crs='Mars 2000 geographic (Trek bboxSR 104905)'),
                      files=files, renderGrid=dict(width=RENDER_PX, height=RENDER_PX),
                      noData=pp.NODATA, base=base, model=model, limits=limits, limitsEvidence=limits_evidence,
                      layers=layers, sources=sources, hazardFromSlope=pp.HAZARD_MODEL)
    source = dict(accessedAt=meta['accessedAt'], bbox=list(bbox), center=list(center), inputs=f,
                  native=dict(width=nw, height=nh, mpp=native_m, sourceMpp=DEM_NATIVE_M, tiffNoData=tiff_nd,
                              noDataFraction=round(1 - len(valid_native) / len(dem), 6),
                              elevMinM=round(min(valid_native), 3), elevMaxM=round(max(valid_native), 3)),
                  grid=dict(noDataCells=W * H - len(fin_e), slopeP50=round(fin_s[len(fin_s) // 2], 2),
                            slopeP95=round(fin_s[len(fin_s) * 95 // 100], 2), cellsOver25=sum(1 for s_ in fin_s if s_ > 25)),
                  render=dict(width=RENDER_PX, height=RENDER_PX, metersPerPixel=cfg.CELLS * mpp / RENDER_PX,
                              method=f'mean of valid {native_m:g} m pixels, 2x2 per cell; 3D only',
                              noDataCells=len(render) - len(fin_r), elevMinM=round(min(fin_r), 3), elevMaxM=round(max(fin_r), 3)),
                  hazardFromSlope=pp.HAZARD_MODEL)
    dump = lambda d: (json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8')  # noqa: E731
    return {
        'elevation.f32': pp.f32(elev), 'slope.f32': pp.f32(slope), 'hazard.f32': pp.f32(haz), 'walkable.u8': bytes(walk),
        'elevation_render.f32': pp.f32(render), 'texture.jpg': (cache / 'texture.jpg').read_bytes(),
        'region.json': dump(region_doc), 'source.json': dump(source),
    }


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('--region', required=True, choices=cfg.OVERVIEW)
    p.add_argument('--cache')
    p.add_argument('--output')
    a = p.parse_args(argv)
    cache = Path(a.cache) if a.cache else Path(__file__).parent / '.cache' / a.region
    out = Path(a.output or f'public/data/{a.region}')
    files = build(cache, a.region)
    for name, data in files.items():
        (out / name).parent.mkdir(parents=True, exist_ok=True)
        (out / name).write_bytes(data)
    sums = ''.join(f'{hashlib.sha256(files[n]).hexdigest()}  {n}\n' for n in sorted(files))
    (out / 'SHA256SUMS').write_bytes(sums.encode('utf-8'))
    print(f'{a.region}: {cfg.CELLS}x{cfg.CELLS} @ {cfg.REGIONS[a.region]["mpp"]} m, render {RENDER_PX}² -> {out}')


if __name__ == '__main__':
    main()
