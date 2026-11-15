"""F3 крок 1 (мережа, один раз): сирі файли bbox у pipeline/.cache/<region> + fetch.json (URL, дата, розмір, sha256).
Далі prepare.py працює офлайн лише з кешем — тому два запуски prepare дають однакові байти (AC1).
Файли, що вже є в кеші й у fetch.json, не перекачуються (дата доступу лишається їхня); --force — усе заново.
Запуск з кореня: python pipeline/fetch.py [--region gale|columbia-hills|olympus-mons|valles-marineris] [каталог] [--force]
"""
import argparse
import datetime
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import themis  # noqa: E402
import trek  # noqa: E402
import region_config as cfg  # noqa: E402

MMGIS = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/'


def _query(service):
    """Усі об'єкти шару 0 MapServer Trek у градусах (bboxSR 104905), JSON Esri."""
    return f'{trek.TREK}/{service}/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=104905&f=json'


def items(region='gale'):
    r = cfg.REGIONS[region]
    bbox = r['bbox']
    if r['kind'] == 'overview':
        # #113: рельєф MOLA/HRSC 600 м (білінійно, сервер) і колір Viking 2048², той самий bbox; THEMIS не треба.
        px, tx = cfg.OVERVIEW_DEM_PX, cfg.OVERVIEW_TEXTURE_PX
        return {'dem.tif': trek.export_url(r['dem'], bbox, px, px, interpolation='RSP_BilinearInterpolation'),
                'texture.jpg': trek.export_url(r['texture'], bbox, tx, tx, fmt='jpg', pixel_type='U8')
                + f'&compressionQuality={cfg.OVERVIEW_JPEG_Q}'}
    out = {'dem.tif': trek.export_url(r['dem'], bbox, cfg.NATIVE_PX, cfg.NATIVE_PX, interpolation='RSP_NearestNeighbor')}
    if region == 'gale':
        out['hirise.jpg'] = trek.export_url(trek.HIRISE, bbox, cfg.TEXTURE_PX, cfg.TEXTURE_PX, fmt='jpg', pixel_type='U8')
        out['hirise_4096.jpg'] = trek.export_url(trek.HIRISE, bbox, cfg.TEXTURE_HD_PX, cfg.TEXTURE_HD_PX, fmt='jpg', pixel_type='U8')
        out['MSL_traverse.json'] = MMGIS + 'MSL_traverse.json'
    elif region == 'columbia-hills':
        out['spirit_waypoints.json'] = _query('spirit_waypoints')
        out['spirit_path.json'] = _query('spirit_path')
    for key, product in themis.PRODUCTS.items():
        for row, col in themis.tiles_for(bbox):
            out[themis.tile_name(key, row, col)] = themis.tile_url(product, row, col)
    return out


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('cache', nargs='?')
    p.add_argument('--region', default='gale', choices=list(cfg.REGIONS))
    p.add_argument('--force', action='store_true')
    a = p.parse_args(argv)
    cache = Path(a.cache) if a.cache else Path(__file__).parent / '.cache' / a.region
    cache.mkdir(parents=True, exist_ok=True)
    meta_path = cache / 'fetch.json'
    old = json.loads(meta_path.read_text(encoding='utf-8')) if meta_path.exists() and not a.force else {'files': {}}
    today = datetime.date.today().isoformat()
    files = {}
    for name, url in items(a.region).items():
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
