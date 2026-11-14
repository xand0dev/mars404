"""F3 pipeline: агрегація, схил, hazard, обрізка траверсу. Запуск з кореня:
python -m unittest discover -s pipeline -p "test_*.py"
"""
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import prepare  # noqa: E402

ND = prepare.NODATA


class Grid(unittest.TestCase):
    def test_mean_only_valid_and_nodata_if_none(self):
        native = [1, 3, ND, ND,
                  5, ND, ND, ND]
        self.assertEqual(prepare.block_mean(native, 4, 2, 2), [3.0, ND])

    def test_max_keeps_steep_pixel(self):
        self.assertEqual(prepare.block_max([5, 5, 5, 40, 5, 5, 5, math.nan], 4, 2, 2), [5, 40])

    def test_max_all_invalid_is_nan(self):
        self.assertTrue(math.isnan(prepare.block_max([math.nan] * 4, 2, 2, 2)[0]))

    def test_slope_of_plane(self):
        # Площина з підйомом 1 м на 1 м на схід → 45°.
        w = h = 4
        dem = [float(c) for r in range(h) for c in range(w)]
        s = prepare.horn_slope(dem, w, h, 1.0)
        self.assertAlmostEqual(s[1 * w + 1], 45.0, places=6)

    def test_slope_nan_near_nodata(self):
        dem = [0.0] * 9
        dem[0] = ND
        s = prepare.horn_slope(dem, 3, 3, 1.0)
        self.assertTrue(math.isnan(s[4]))

    def test_hazard(self):
        m = dict(slopeDegAtMax=30, maxHazard=0.5)
        self.assertAlmostEqual(prepare.hazard(15, m), 0.25)
        self.assertEqual(prepare.hazard(90, m), 0.5)
        self.assertEqual(prepare.hazard(math.nan, m), 1)


class Traverse(unittest.TestCase):
    def test_clip_splits_on_exit(self):
        bbox = (0, 0, 1, 1)
        line = [[0.5, 0.5, -1], [0.6, 0.6, -2], [2, 2, -3], [0.7, 0.7, -4], [0.8, 0.8, -5]]
        self.assertEqual(prepare.clip_lines([line], bbox), [[[0.5, 0.5, -1], [0.6, 0.6, -2]], [[0.7, 0.7, -4], [0.8, 0.8, -5]]])


if __name__ == '__main__':
    unittest.main()
