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


class Resample(unittest.TestCase):
    def test_box_resample_fractional_area_weights(self):
        # 5 пікселів → 2 клітинки по 2.5: клітинка 0 = (1·1 + 1·2 + 0.5·3) / 2.5
        v = [1.0, 2.0, 3.0, 4.0, 5.0]
        out = prepare.box_resample(v, 5, 1, 2, 1)
        self.assertAlmostEqual(out[0], (1 + 2 + 1.5) / 2.5)
        self.assertAlmostEqual(out[1], (1.5 + 4 + 5) / 2.5)

    def test_box_resample_skips_nodata_and_keeps_integer_case(self):
        self.assertEqual(prepare.box_resample([1, 3, ND, ND, 5, ND, ND, ND], 4, 2, 2, 1), [3.0, ND])
        native = [float(i) for i in range(16)]
        self.assertEqual(prepare.box_resample(native, 4, 4, 2, 2), prepare.block_mean(native, 4, 4, 2))

    def test_hillshade_flat_is_cos_zenith(self):
        s = prepare.hillshade([0.0] * 9, 3, 3, 1.0)
        self.assertAlmostEqual(s[4], math.cos(math.radians(45)))

    def test_hillshade_lit_from_north_west(self):
        # Схил, що спадає на північний захід (до сонця), світліший за протилежний.
        w = h = 3
        to_sun = [float(r + c) for r in range(h) for c in range(w)]
        away = [-v for v in to_sun]
        self.assertGreater(prepare.hillshade(to_sun, w, h, 1.0)[4], prepare.hillshade(away, w, h, 1.0)[4])


class Base(unittest.TestCase):
    def test_reachable_respects_slope_and_walkable(self):
        walk = [1, 1, 1,
                1, 0, 1,
                1, 1, 1]
        slope = [0, 40, 0,
                 0, 0, 0,
                 0, 0, 0]
        got = prepare.reachable(walk, slope, 3, 3, 0, 25)
        self.assertNotIn(1, got)
        self.assertNotIn(4, got)
        self.assertIn(2, got)  # навколо через нижній ряд

    def test_pick_base_needs_three_points(self):
        walk = [1, 0, 1, 1]
        slope = [0.0] * 4
        # клітинка 0 ізольована (1 = 0, діагональ 3 — сусід), тож з 0 досяжні 0 і 3
        cell, reach = prepare.pick_base(walk, slope, 2, 2, [0, 1, 2, 3], [0, 2, 3], need=3)
        self.assertEqual(cell, 0)
        with self.assertRaises(ValueError):
            prepare.pick_base([1, 0, 0, 0], slope, 2, 2, [0], [0, 3], need=2)


class Traverse(unittest.TestCase):
    def test_clip_splits_on_exit(self):
        bbox = (0, 0, 1, 1)
        line = [[0.5, 0.5, -1], [0.6, 0.6, -2], [2, 2, -3], [0.7, 0.7, -4], [0.8, 0.8, -5]]
        self.assertEqual(prepare.clip_lines([line], bbox), [[[0.5, 0.5, -1], [0.6, 0.6, -2]], [[0.7, 0.7, -4], [0.8, 0.8, -5]]])


if __name__ == '__main__':
    unittest.main()
