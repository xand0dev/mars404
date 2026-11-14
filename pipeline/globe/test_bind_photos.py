"""Тести прив'язки знімків до зупинок (#36, SPEC §6.0, F6-AC5).

Запуск з кореня репо:  python3 -m unittest discover -s pipeline/globe -v
Фікстури — справжні записи MMGIS MSL_waypoints.json і raw_image_items (sol 3008, 3025), обрізані до потрібних полів.
"""
from __future__ import annotations

import unittest

from bind_photos import (
    bind,
    check_feature,
    in_bbox,
    index_stops,
    pick_spread,
    rmc,
    sol_window,
    stops_in_bbox,
)

# Gale, grid.boundsLonLat з region.json F3: [lonMin, latMin, lonMax, latMax]
BBOX = (137.385072, -4.759614, 137.428408, -4.716426)


def stop(rmc_: str, sol: int, lon: float, lat: float) -> dict:
    site, drive = (int(x) for x in rmc_.split("_"))
    return {
        "type": "Feature",
        "properties": {"RMC": rmc_, "site": site, "drive": drive, "sol": sol, "lon": lon, "lat": lat, "drive_type": "final"},
        "geometry": {"type": "Point", "coordinates": [lon, lat, -4000.0]},
    }


WAYPOINTS = {
    "type": "FeatureCollection",
    "features": [
        stop("2_0", 3, 137.441633, -4.589467),  # місце посадки — поза bbox Gale-району
        stop("85_1072", 3008, 137.4011643, -4.73350736),
        stop("86_480", 3025, 137.4060989, -4.73349744),
    ],
}


def item(id_: int, sol: int, site: int, drive: int, sample: str = "full", thumb: bool = False, cam: str = "NAV_LEFT_B") -> dict:
    return {
        "id": id_, "sol": sol, "site": site, "drive": drive, "instrument": cam, "is_thumbnail": thumb,
        "url": f"https://mars.nasa.gov/msl-raw-images/x/{id_}.JPG", "extended": {"sample_type": sample},
    }


AT_STOP = item(886246, 3008, 85, 1072)                       # NLB_664533881EDR_F0851072NCAM00354M_
MID_DRIVE = item(886145, 3008, 85, 1048)                     # той самий sol, але під час руху — не зупинка MMGIS
DOWNSAMPLED = item(886842, 3008, 85, 1072, sample="downsampled")


class RmcAndIndex(unittest.TestCase):
    def test_rmc_is_site_underscore_drive(self):
        self.assertEqual(rmc(85, 1072), "85_1072")

    def test_index_by_rmc(self):
        idx = index_stops(WAYPOINTS)
        self.assertEqual(idx["85_1072"]["sol"], 3008)
        self.assertNotIn("85_1048", idx)

    def test_bbox_inclusive(self):
        self.assertTrue(in_bbox(137.4011643, -4.73350736, BBOX))
        self.assertFalse(in_bbox(137.441633, -4.589467, BBOX))

    def test_stops_in_bbox_sorted_by_sol(self):
        self.assertEqual([s["RMC"] for s in stops_in_bbox(WAYPOINTS, BBOX)], ["85_1072", "86_480"])

    def test_sol_window_until_next_stop(self):
        # ровер стоїть на 85_1072 від sol 3008 до від'їзду в sol 3025 включно
        idx = index_stops(WAYPOINTS)
        self.assertEqual(sol_window(idx, "85_1072"), (3008, 3025))
        self.assertEqual(sol_window(idx, "86_480"), (3025, 3025))


class Bind(unittest.TestCase):
    """Given знімок raw images; When прив'язуємо; Then лише за RMC зупинки, не за sol."""

    def setUp(self):
        self.idx = index_stops(WAYPOINTS)

    def test_given_photo_at_stop_then_feature_with_stop_coordinates(self):
        f, reason = bind(AT_STOP, self.idx)
        self.assertIsNone(reason)
        self.assertEqual(f["geometry"]["coordinates"], [137.4011643, -4.73350736])
        p = f["properties"]
        self.assertEqual(p["id"], "navcam-886246")
        self.assertEqual(p["sol"], 3008)
        self.assertEqual(p["camera"], "NAV_LEFT_B")
        self.assertEqual(p["locationAccuracy"], "rover-stop")
        self.assertEqual(p["sourceUrl"], "https://mars.nasa.gov/raw_images/886246")
        self.assertEqual(p["credit"], "NASA/JPL-Caltech")
        self.assertEqual(p["url"], "./data/gale/photos/navcam-886246.jpg")
        self.assertIn("85_1072", p["alt"])
        self.assertIn("Left Navcam", p["alt"])

    def test_given_same_sol_mid_drive_then_rejected(self):
        f, reason = bind(MID_DRIVE, self.idx)
        self.assertIsNone(f)
        self.assertEqual(reason, "not-a-stop")

    def test_given_downsampled_or_thumbnail_then_rejected(self):
        self.assertEqual(bind(DOWNSAMPLED, self.idx), (None, "not-full"))
        self.assertEqual(bind(item(1, 3008, 85, 1072, thumb=True), self.idx), (None, "not-full"))


class Check(unittest.TestCase):
    """Given запис photos.geojson; When звіряємо з API; Then список розбіжностей (порожній = verified)."""

    def setUp(self):
        self.idx = index_stops(WAYPOINTS)
        self.good, _ = bind(AT_STOP, self.idx)

    def test_good_feature_has_no_problems(self):
        self.assertEqual(check_feature(self.good, AT_STOP, self.idx, BBOX), [])

    def test_missing_raw_item(self):
        self.assertEqual(check_feature(self.good, None, self.idx, BBOX), ["raw image not found"])

    def test_coordinates_not_at_stop(self):
        bad = {**self.good, "geometry": {"type": "Point", "coordinates": [137.40, -4.73]}}
        self.assertTrue(any("coordinates" in p for p in check_feature(bad, AT_STOP, self.idx, BBOX)))

    def test_photo_taken_mid_drive(self):
        bad = {**self.good, "properties": {**self.good["properties"], "id": "navcam-886145"}}
        self.assertTrue(any("not a MMGIS stop" in p for p in check_feature(bad, MID_DRIVE, self.idx, BBOX)))

    def test_sol_and_camera_mismatch(self):
        bad = {**self.good, "properties": {**self.good["properties"], "sol": 3009, "camera": "NAV_RIGHT_B"}}
        probs = check_feature(bad, AT_STOP, self.idx, BBOX)
        self.assertTrue(any("sol" in p for p in probs))
        self.assertTrue(any("camera" in p for p in probs))

    def test_out_of_bbox(self):
        self.assertTrue(any("bbox" in p for p in check_feature(self.good, AT_STOP, self.idx, (0, 0, 1, 1))))


class Spread(unittest.TestCase):
    def test_pick_spread_keeps_order_and_ends(self):
        self.assertEqual(pick_spread(list(range(10)), 4), [0, 3, 6, 9])
        self.assertEqual(pick_spread([1, 2], 5), [1, 2])
        self.assertEqual(pick_spread([], 3), [])


if __name__ == "__main__":
    unittest.main()
