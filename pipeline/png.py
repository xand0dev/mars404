"""Мінімальні PNG decode/encode на стандартній бібліотеці (zlib): 8 біт, без interlace.
Потрібно для тайлів THEMIS WMTS (gray+alpha) і накладок layers/*.png. Інше — помилка.
"""
import struct
import zlib

SIG = b'\x89PNG\r\n\x1a\n'
CHANNELS = {0: 1, 2: 3, 4: 2, 6: 4}  # gray, RGB, gray+alpha, RGBA


def _paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    return a if pa <= pb and pa <= pc else (b if pb <= pc else c)


def decode(data):
    """→ (width, height, channels, bytes row-major)."""
    if data[:8] != SIG:
        raise ValueError('не PNG')
    pos, idat, hdr = 8, [], None
    while pos < len(data):
        n, typ = struct.unpack_from('>I4s', data, pos)
        body = data[pos + 8:pos + 8 + n]
        pos += 12 + n
        if typ == b'IHDR':
            hdr = struct.unpack('>IIBBBBB', body)
        elif typ == b'IDAT':
            idat.append(body)
        elif typ == b'IEND':
            break
    w, h, depth, ctype, _, _, interlace = hdr
    if depth != 8 or interlace or ctype not in CHANNELS:
        raise ValueError(f'PNG depth={depth} color={ctype} interlace={interlace} не підтримано')
    ch = CHANNELS[ctype]
    raw = zlib.decompress(b''.join(idat))
    stride = w * ch
    out = bytearray(h * stride)
    prev = bytearray(stride)
    for r in range(h):
        f = raw[r * (stride + 1)]
        line = bytearray(raw[r * (stride + 1) + 1:(r + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - ch] if i >= ch else 0
            b = prev[i]
            c = prev[i - ch] if i >= ch else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                line[i] = (line[i] + _paeth(a, b, c)) & 255
            elif f != 0:
                raise ValueError(f'фільтр {f}')
        out[r * stride:(r + 1) * stride] = line
        prev = line
    return w, h, ch, bytes(out)


def _chunk(typ, body):
    return struct.pack('>I', len(body)) + typ + body + struct.pack('>I', zlib.crc32(typ + body) & 0xFFFFFFFF)


def encode_rgba(w, h, rgba):
    """RGBA 8 біт, фільтр 0, zlib рівня 9 — детерміновано для тієї самої версії zlib."""
    if len(rgba) != w * h * 4:
        raise ValueError('розмір RGBA')
    raw = b''.join(b'\x00' + bytes(rgba[r * w * 4:(r + 1) * w * 4]) for r in range(h))
    return SIG + _chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + _chunk(b'IDAT', zlib.compress(raw, 9)) + _chunk(b'IEND', b'')
