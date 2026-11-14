"""F3 крок 1 (мережа, один раз): сирі файли bbox у pipeline/.cache/gale + fetch.json (URL, дата, розмір, sha256).
Далі prepare.py працює офлайн лише з кешем — тому два запуски prepare дають однакові байти (AC1).
Запуск з кореня: python pipeline/fetch.py
"""
import datetime
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import trek  # noqa: E402
from region_config import BBOX, NATIVE_PX, TEXTURE_PX  # noqa: E402

CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / '.cache' / 'gale'
MMGIS = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/'


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    items = {
        'dem.tif': trek.export_url(trek.DEM, BBOX, NATIVE_PX, NATIVE_PX, interpolation='RSP_NearestNeighbor'),
        'hirise.jpg': trek.export_url(trek.HIRISE, BBOX, TEXTURE_PX, TEXTURE_PX, fmt='jpg', pixel_type='U8'),
        'MSL_traverse.json': MMGIS + 'MSL_traverse.json',
        'MSL_waypoints_current.json': MMGIS + 'MSL_waypoints_current.json',
    }
    meta = dict(accessedAt=datetime.date.today().isoformat(), files={})
    for name, url in items.items():
        data = trek.fetch(url)
        (CACHE / name).write_bytes(data)
        meta['files'][name] = dict(url=url, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        print(f'{name}: {len(data)} B')
    (CACHE / 'fetch.json').write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
