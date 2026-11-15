"""F3 pipeline: PNG і THEMIS WMTS. Запуск з кореня: python -m unittest discover -s pipeline -p "test_*.py"
"""
import struct
import sys
import unittest
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import png  # noqa: E402
import themis  # noqa: E402


def gray_alpha_png(w, h, pixels, filt=0):
    """Тестовий PNG gray+alpha; filt=1 (Sub) перевіряє розфільтрування."""
    raw = b''
    for r in range(h):
        line = bytes(v for px in pixels[r * w:(r + 1) * w] for v in px)
        if filt == 1:
            line = bytes((line[i] - (line[i - 2] if i >= 2 else 0)) & 255 for i in range(len(line)))
        raw += bytes([filt]) + line

    def chunk(t, b):
        return struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xFFFFFFFF)
    return png.SIG + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 4, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


class Png(unittest.TestCase):
    def test_decode_sub_filter(self):
        px = [(10, 255), (30, 255), (200, 0), (7, 255)]
        self.assertEqual(png.decode(gray_alpha_png(2, 2, px, filt=1)), (2, 2, 2, bytes([10, 255, 30, 255, 200, 0, 7, 255])))

    def test_rgba_roundtrip_deterministic(self):
        rgba = bytes(range(16))
        a, b = png.encode_rgba(2, 2, rgba), png.encode_rgba(2, 2, rgba)
        self.assertEqual(a, b)
        self.assertEqual(png.decode(a), (2, 2, 4, rgba))


class Themis(unittest.TestCase):
    def test_gale_bbox_is_one_level9_tile(self):
        self.assertEqual(themis.tiles_for((137.385072, -4.759614, 137.428408, -4.716426)), [(269, 902)])

    def test_sample_nearest_and_alpha(self):
        # Тайл (0, 0) рівня 0 = 180°×180°, NW-кут (-180, 90). Ліва половина — DN 50, права — прозора.
        w = 256
        px = [(50, 255) if c < 128 else (99, 0) for r in range(w) for c in range(w)]
        tiles = {(0, 0): gray_alpha_png(w, w, px)}
        out = themis.sample(tiles, (-180, -90, 0, 90), 2, 1, level=0)
        self.assertEqual(out, [50, None])

    def test_stretch_and_colorize(self):
        lo, hi = themis.stretch(list(range(100)) + [None])
        self.assertEqual((lo, hi), (2, 98))
        rgba = themis.colorize([lo, hi, None], lo, hi)
        self.assertEqual(rgba[:4], bytes([0x1b, 0x1f, 0x5e, 255]))
        self.assertEqual(rgba[4:8], bytes([0xf7, 0xc5, 0x48, 255]))
        self.assertEqual(rgba[8:], bytes(4))


if __name__ == '__main__':
    unittest.main()
