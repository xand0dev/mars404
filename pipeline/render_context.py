"""F3 (15.11, #113 для Gale): кільце рельєфу довкола EVA-району для 3D (SPEC §6.0 `Region.context`).

Квадрат 61,44 км з центром у центрі району, 256×256 по 240 м, з глобальної мозаїки
Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw (200 м/піксель, білінійна інтерполяція сервера Trek).
Лише для огляду: Mount Sharp, борт кратера. Планування його не бачить.

Запуск: python pipeline/render_context.py [--region gale] [--cache pipeline/.cache/<region>]
Пише public/data/<region>/context.f32 і друкує блок `context` для region.json.
"""
import argparse
import hashlib
import json
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import trek  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SERVICE = 'Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw'
CELLS = 256
SIDE_M = 61440.0
NODATA = -9999.0


def context_origin(grid):
    """NW-кут контексту в локальних метрах району: той самий центр, що й у сітки планування."""
    gw = grid['width'] * grid['metersPerPixel']
    gh = grid['height'] * grid['metersPerPixel']
    ox, oy = grid['originM']
    cx, cy = ox + gw / 2, oy - gh / 2
    return [cx - SIDE_M / 2, cy + SIDE_M / 2]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--region', default='gale')
    ap.add_argument('--cache')
    a = ap.parse_args()
    out_dir = ROOT / 'public' / 'data' / a.region
    region = json.loads((out_dir / 'region.json').read_text())
    w, s, e, n = region['grid']['boundsLonLat']
    center = ((w + e) / 2, (s + n) / 2)
    bbox = tuple(round(v, 6) for v in trek.bbox_around(*center, SIDE_M))
    url = trek.export_url(SERVICE, bbox, CELLS, CELLS, interpolation='RSP_BilinearInterpolation')
    cache = Path(a.cache) if a.cache else Path(__file__).parent / '.cache' / a.region
    raw = cache / 'context_mola.tif'
    if not raw.exists():
        cache.mkdir(parents=True, exist_ok=True)
        raw.write_bytes(trek.fetch(url))
    data = raw.read_bytes()
    cw, ch, vals, nd = trek.read_tiff_f32(data)
    assert (cw, ch) == (CELLS, CELLS), (cw, ch)
    out = [NODATA if (v != v or (nd is not None and v == nd) or v < -20000) else v for v in vals]
    blob = struct.pack(f'<{len(out)}f', *out)
    (out_dir / 'context.f32').write_bytes(blob)
    good = [v for v in out if v != NODATA]
    block = {
        'file': 'context.f32',
        'width': CELLS,
        'height': CELLS,
        'metersPerPixel': SIDE_M / CELLS,
        'originM': [round(v, 3) for v in context_origin(region['grid'])],
        'noData': NODATA,
    }
    print(json.dumps({'context': block, 'bboxLonLat': bbox, 'url': url, 'rawSha256': hashlib.sha256(data).hexdigest(),
                      'sha256': hashlib.sha256(blob).hexdigest(), 'bytes': len(blob),
                      'noDataPct': round(100 * (1 - len(good) / len(out)), 3), 'minM': round(min(good), 1), 'maxM': round(max(good), 1)}, indent=2))


if __name__ == '__main__':
    main()
