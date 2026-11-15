"""Mars Trek ImageServer: bbox у градусах (Mars 2000, bboxSR 104905) і читання float32 TIFF без GDAL.
Trek віддає нестиснений тайловий TIFF (теги 322–325); тут лише такий випадок, інше — помилка.
"""
import math
import struct
import urllib.parse
import urllib.request

TREK = 'https://trek.nasa.gov/mars/trekarcgis/rest/services'
DEM = 'Gale_DEM_SMG_1m'
HIRISE = 'curiosity_hirise_mosaic'
MARS_R = 3_396_190.0
M_PER_DEG = math.pi * MARS_R / 180  # SPEC §7.1: ≈ 59.27 км


def bbox_around(lon, lat, size_m):
    """Квадрат size_m × size_m з центром (lon, lat); довгота з cos(lat) (SPEC §7.1)."""
    dlat = size_m / M_PER_DEG / 2
    dlon = size_m / (M_PER_DEG * math.cos(math.radians(lat))) / 2
    return (lon - dlon, lat - dlat, lon + dlon, lat + dlat)


def export_url(service, bbox, w, h, fmt='tiff', pixel_type='F32', interpolation=''):
    q = dict(bbox=','.join(f'{v:.6f}' for v in bbox), bboxSR=104905, imageSR=104905, size=f'{w},{h}',
             format=fmt, pixelType=pixel_type, interpolation=interpolation, f='image')
    return f'{TREK}/{service}/ImageServer/exportImage?' + urllib.parse.urlencode({k: v for k, v in q.items() if v != ''})


def fetch(url, timeout=180):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def read_tiff_f32(data):
    """→ (width, height, values[], gdal_nodata | None). Лише uncompressed float32, 1 канал."""
    bo = {b'II': '<', b'MM': '>'}[data[:2]]
    if struct.unpack_from(bo + 'H', data, 2)[0] != 42:
        raise ValueError('не classic TIFF')
    ifd = struct.unpack_from(bo + 'I', data, 4)[0]
    tags = {}
    sizes = {1: 1, 2: 1, 3: 2, 4: 4, 12: 8, 16: 8}
    fmt = {1: 'B', 2: 's', 3: 'H', 4: 'I', 12: 'd', 16: 'Q'}
    for i in range(struct.unpack_from(bo + 'H', data, ifd)[0]):
        tag, typ, cnt = struct.unpack_from(bo + 'HHI', data, ifd + 2 + 12 * i)
        n = sizes[typ] * cnt
        off = ifd + 2 + 12 * i + 8 if n <= 4 else struct.unpack_from(bo + 'I', data, ifd + 2 + 12 * i + 8)[0]
        tags[tag] = data[off:off + cnt] if typ == 2 else struct.unpack_from(bo + fmt[typ] * cnt, data, off)
    w, h = tags[256][0], tags[257][0]
    if tags.get(259, (1,))[0] != 1 or tags[258][0] != 32 or tags.get(339, (1,))[0] != 3 or tags.get(277, (1,))[0] != 1:
        raise ValueError('очікується нестиснений float32, 1 канал')
    out = [0.0] * (w * h)
    if 322 in tags:
        tw, th = tags[322][0], tags[323][0]
        across = math.ceil(w / tw)
        for t, (off, _) in enumerate(zip(tags[324], tags[325])):
            r0, c0 = (t // across) * th, (t % across) * tw
            tile = struct.unpack_from(f'{bo}{tw * th}f', data, off)
            for r in range(min(th, h - r0)):
                row = (r0 + r) * w + c0
                n = min(tw, w - c0)
                out[row:row + n] = tile[r * tw:r * tw + n]
    else:
        rows = tags.get(278, (h,))[0]
        for s, (off, cnt) in enumerate(zip(tags[273], tags[279])):
            vals = struct.unpack_from(f'{bo}{cnt // 4}f', data, off)
            out[s * rows * w:s * rows * w + len(vals)] = vals
    nd = tags.get(42113)
    nodata = float(nd.rstrip(b'\0').decode()) if nd else None
    return w, h, out, nodata
