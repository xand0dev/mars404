"""F3 крок 1 (мережа, один раз): сирі файли bbox у pipeline/.cache/gale + fetch.json (URL, дата, розмір, sha256).
Далі prepare.py працює офлайн лише з кешем — тому два запуски prepare дають однакові байти (AC1).
Файли, що вже є в кеші й у fetch.json, не перекачуються (дата доступу лишається їхня); --force — усе заново.
Запуск з кореня: python pipeline/fetch.py [каталог] [--force]
"""
import datetime
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import themis  # noqa: E402
import trek  # noqa: E402
from region_config import BBOX, NATIVE_PX, TEXTURE_PX  # noqa: E402

MMGIS = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/'


def items():
    out = {
        'dem.tif': trek.export_url(trek.DEM, BBOX, NATIVE_PX, NATIVE_PX, interpolation='RSP_NearestNeighbor'),
        'hirise.jpg': trek.export_url(trek.HIRISE, BBOX, TEXTURE_PX, TEXTURE_PX, fmt='jpg', pixel_type='U8'),
        'MSL_traverse.json': MMGIS + 'MSL_traverse.json',
    }
    for key, product in themis.PRODUCTS.items():
        for r, c in themis.tiles_for(BBOX):
            out[themis.tile_name(key, r, c)] = themis.tile_url(product, r, c)
    return out


def main(argv):
    force = '--force' in argv
    args = [a for a in argv if a != '--force']
    cache = Path(args[0]) if args else Path(__file__).parent / '.cache' / 'gale'
    cache.mkdir(parents=True, exist_ok=True)
    meta_path = cache / 'fetch.json'
    old = json.loads(meta_path.read_text(encoding='utf-8')) if meta_path.exists() and not force else {'files': {}}
    today = datetime.date.today().isoformat()
    files = {}
    for name, url in items().items():
        prev = old['files'].get(name)
        if prev and prev['url'] == url and (cache / name).exists():
            files[name] = dict(prev, accessedAt=prev.get('accessedAt', old.get('accessedAt', today)))
            print(f'{name}: cached')
            continue
        data = trek.fetch(url)
        (cache / name).write_bytes(data)
        files[name] = dict(url=url, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), accessedAt=today)
        print(f'{name}: {len(data)} B')
    meta = dict(accessedAt=old.get('accessedAt', today), files=files)
    meta_path.write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main(sys.argv[1:])
