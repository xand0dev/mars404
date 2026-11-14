"""F2/F3 (15.11, рев'ю рельєфу): щільний рельєф і текстура лише для 3D (SPEC §6.0 `files.elevationRender`).

Планування не змінюється: сітка 256×256 по 10 м лишається в elevation.f32. Тут:
- elevation_render.f32 — 1024×1024 по 2,5 м: площинне середнє валідних 1-м пікселів Gale_DEM_SMG_1m
  (кожна клітинка покриває 2,5 × 2,5 пікселя — часткові пікселі з вагою), NoData → -9999;
- hirise_4096.jpg — curiosity_hirise_mosaic 4096×4096 (≈ 0,6 м/піксель) на тому самому bbox.

Запуск: python pipeline/render_hd.py [--cache pipeline/.cache/gale]
Мережа — лише якщо сирих файлів немає в кеші. Вихід детермінований (без часу й випадковості).
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

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'gale'
BBOX = (137.385072, -4.759614, 137.428408, -4.716426)
NATIVE_PX = 2560
RENDER_PX = 1024
TEXTURE_PX = 4096
NODATA = -9999.0


def weights(n_in, n_out):
    """Для кожного вихідного індексу — [(вхідний індекс, вага)], ваги в сумі 1 (площинне усереднення)."""
    step = n_in / n_out
    out = []
    for o in range(n_out):
        a, b = o * step, (o + 1) * step
        ws = []
        i = math.floor(a)
        while i < b - 1e-9:
            w = min(b, i + 1) - max(a, i)
            if w > 1e-12:
                ws.append((i, w / step))
            i += 1
        out.append(ws)
    return out


def area_resample(vals, n_in, n_out, nodata_in):
    """Площинне середнє n_in² → n_out² з пропуском NoData (вага NoData не рахується)."""
    wx = weights(n_in, n_out)
    valid = [v is not None and math.isfinite(v) and (nodata_in is None or v != nodata_in) for v in vals]
    # Спершу по рядках: n_in рядків × n_out стовпців (сума і вага окремо).
    sums = [0.0] * (n_in * n_out)
    wts = [0.0] * (n_in * n_out)
    for r in range(n_in):
        base = r * n_in
        orow = r * n_out
        for o, ws in enumerate(wx):
            s = 0.0
            t = 0.0
            for i, w in ws:
                k = base + i
                if valid[k]:
                    s += vals[k] * w
                    t += w
            sums[orow + o] = s
            wts[orow + o] = t
    out = [NODATA] * (n_out * n_out)
    for o_r, ws in enumerate(wx):
        for c in range(n_out):
            s = 0.0
            t = 0.0
            for i, w in ws:
                k = i * n_out + c
                s += sums[k] * w
                t += wts[k] * w
            if t > 1e-9:
                out[o_r * n_out + c] = s / t
    return out


def sha(b):
    return hashlib.sha256(b).hexdigest()


def get(cache, name, url):
    p = cache / name
    if not p.exists():
        cache.mkdir(parents=True, exist_ok=True)
        p.write_bytes(trek.fetch(url))
    return p.read_bytes()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default=str(Path(__file__).parent / '.cache' / 'gale'))
    a = ap.parse_args()
    cache = Path(a.cache)

    dem_url = trek.export_url(trek.DEM, BBOX, NATIVE_PX, NATIVE_PX, interpolation='RSP_NearestNeighbor')
    tex_url = trek.export_url(trek.HIRISE, BBOX, TEXTURE_PX, TEXTURE_PX, fmt='jpg', pixel_type='U8')
    dem = get(cache, 'dem.tif', dem_url)
    tex = get(cache, f'hirise_{TEXTURE_PX}.jpg', tex_url)

    w, h, vals, nd = trek.read_tiff_f32(dem)
    assert (w, h) == (NATIVE_PX, NATIVE_PX), (w, h)
    out = area_resample(vals, NATIVE_PX, RENDER_PX, nd)
    elev = struct.pack(f'<{len(out)}f', *out)
    (OUT / 'elevation_render.f32').write_bytes(elev)
    (OUT / f'hirise_{TEXTURE_PX}.jpg').write_bytes(tex)

    good = [v for v in out if v != NODATA]
    report = {
        'elevation_render.f32': {'bytes': len(elev), 'sha256': sha(elev), 'noDataPct': round(100 * (1 - len(good) / len(out)), 3),
                                 'minM': round(min(good), 2), 'maxM': round(max(good), 2)},
        f'hirise_{TEXTURE_PX}.jpg': {'bytes': len(tex), 'sha256': sha(tex)},
        'inputs': {'dem.tif': {'url': dem_url, 'bytes': len(dem), 'sha256': sha(dem)},
                   f'hirise_{TEXTURE_PX}.jpg': {'url': tex_url, 'bytes': len(tex), 'sha256': sha(tex)}},
    }
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
