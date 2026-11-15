"""THEMIS IR (Mars Odyssey) з Mars Trek WMTS → накладка thermal на bbox (SPEC §8: лише відображення, не вхід hazard).
Тайли default028mm (EPSG 104905): рівень z має 2^(z+1) × 2^z тайлів по 256 px, тайл = 180/2^z градусів.
Рівень 9 ≈ 1.37e-3 °/px ≈ 81 м — найближчий до нативних 100 м; на bbox 2.56 км це ~31×31 нативних пікселів.
"""
import math

import png

TILES = 'https://trek.nasa.gov/tiles/Mars/EQ'
LEVEL = 9
PRODUCTS = {
    'night': 'THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018',
    'day': 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018',
}
NATIVE_M = 100
# Кольорова шкала відображення (лише для наочності): холодніше → тепліше.
RAMP = ('#1b1f5e', '#b0306a', '#f7c548')


def tile_deg(level=LEVEL):
    return 180 / 2 ** level


def tiles_for(bbox, level=LEVEL):
    """[(row, col)] тайлів, що покривають bbox (west, south, east, north)."""
    w, s, e, n = bbox
    t = tile_deg(level)
    c0, c1 = math.floor((w + 180) / t), math.floor((e + 180) / t)
    r0, r1 = math.floor((90 - n) / t), math.floor((90 - s) / t)
    return [(r, c) for r in range(r0, r1 + 1) for c in range(c0, c1 + 1)]


def tile_url(product, row, col, level=LEVEL):
    return f'{TILES}/{product}/1.0.0/default/default028mm/{level}/{row}/{col}.png'


def tile_name(key, row, col, level=LEVEL):
    return f'themis-{key}-{level}-{row}-{col}.png'


def sample(tiles, bbox, out_w, out_h, level=LEVEL):
    """Найближчий піксель тайла для центру кожної клітинки. tiles: {(row, col): png bytes}.
    → список DN або None (alpha = 0 / немає тайла), рядки з півночі на південь."""
    w, s, e, n = bbox
    t = tile_deg(level)
    px = t / 256
    dec = {k: png.decode(v) for k, v in tiles.items()}
    out = []
    for r in range(out_h):
        lat = n - (r + .5) * (n - s) / out_h
        gy = math.floor((90 - lat) / px)
        for c in range(out_w):
            lon = w + (c + .5) * (e - w) / out_w
            gx = math.floor((lon + 180) / px)
            tw, th, ch, data = dec.get((gy // 256, gx // 256), (0, 0, 0, None))
            if data is None:
                out.append(None)
                continue
            i = ((gy % 256) * tw + gx % 256) * ch
            alpha = data[i + ch - 1] if ch in (2, 4) else 255
            out.append(data[i] if alpha else None)
    return out


def native_count(bbox, level=LEVEL):
    """Скільки пікселів тайла рівня level припадає на bbox (по ширині, висоті)."""
    w, s, e, n = bbox
    px = tile_deg(level) / 256
    return round((e - w) / px), round((n - s) / px)


def _hex(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


def stretch(values):
    """Лінійне розтягнення p2…p98 валідних DN (детерміновано). → (lo, hi)."""
    v = sorted(x for x in values if x is not None)
    if not v:
        raise ValueError('THEMIS: немає валідних пікселів у bbox')
    lo, hi = v[len(v) * 2 // 100], v[min(len(v) - 1, len(v) * 98 // 100)]
    return (lo, hi) if hi > lo else (lo, lo + 1)


def colorize(values, lo, hi):
    """DN → RGBA за RAMP (лінійно між 3 зупинками); None → прозоро."""
    stops = [_hex(c) for c in RAMP]
    out = bytearray()
    for v in values:
        if v is None:
            out += b'\x00\x00\x00\x00'
            continue
        t = min(1.0, max(0.0, (v - lo) / (hi - lo))) * (len(stops) - 1)
        k = min(int(t), len(stops) - 2)
        f = t - k
        a, b = stops[k], stops[k + 1]
        out += bytes(round(a[i] + (b[i] - a[i]) * f) for i in range(3)) + b'\xff'
    return bytes(out)
