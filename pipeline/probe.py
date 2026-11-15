"""T2: перевірка кандидата bbox за критеріями SPEC §8 (мережа; лише для вибору району).
  1) exportImage дає скінченні висоти; 2) NoData < 5 %; 3) ≥ 5 зупинок Curiosity усередині.
Запуск: python pipeline/probe.py --center 137.388886 -4.826023 --size 2560
        python pipeline/probe.py --bbox 137.400 -4.750 137.422 -4.728
"""
import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import trek  # noqa: E402

WAYPOINTS = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json'


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('--center', nargs=2, type=float)
    p.add_argument('--size', type=float, default=2560)
    p.add_argument('--bbox', nargs=4, type=float)
    p.add_argument('--cells', type=int, default=256)
    a = p.parse_args(argv)
    bbox = tuple(a.bbox) if a.bbox else trek.bbox_around(*a.center, a.size)
    w, h, vals, nd = trek.read_tiff_f32(trek.fetch(trek.export_url(trek.DEM, bbox, a.cells, a.cells)))
    bad = [v for v in vals if not math.isfinite(v) or abs(v) >= 3e38 or (nd is not None and v == nd)]
    good = [v for v in vals if v not in bad] if bad else vals
    stops = json.loads(trek.fetch(WAYPOINTS))['features']
    inside = [f['properties'] for f in stops
              if bbox[0] <= f['geometry']['coordinates'][0] <= bbox[2] and bbox[1] <= f['geometry']['coordinates'][1] <= bbox[3]]
    res = dict(bbox=[round(v, 6) for v in bbox], grid=f'{w}x{h}', tiffNoData=nd,
               noDataFraction=round(len(bad) / len(vals), 4), elevMinM=round(min(good), 1), elevMaxM=round(max(good), 1),
               stops=len(inside), sols=[min((s['sol'] for s in inside), default=None), max((s['sol'] for s in inside), default=None)])
    res['ok'] = res['noDataFraction'] < 0.05 and res['stops'] >= 5 and bool(good)
    print(json.dumps(res, ensure_ascii=False))
    return res


if __name__ == '__main__':
    main()
