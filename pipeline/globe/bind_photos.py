#!/usr/bin/env python3
"""Прив'язка знімків Curiosity до зупинок MMGIS для photos/photos.geojson (#36, SPEC §6.0, F6-AC5).

Правило: знімок отримує координати зупинки, якщо його `site`/`drive` збігаються з RMC зупинки в
MMGIS MSL_waypoints.json. Прив'язка лише за sol хибна: за один sol Navcam знімає і під час руху
(напр. sol 3008: drive 1048 — у русі, 1072 — зупинка). Координати — місце ровера, не місце кадру.

Команди (з кореня репо, лише stdlib, Python 3.10+):
  python3 pipeline/globe/bind_photos.py verify  [--photos public/data/gale/photos/photos.geojson] [--region R | --bbox ...]
      Звіряє кожен запис photos.geojson з raw images API і MMGIS. Код виходу 1 — є розбіжності.
  python3 pipeline/globe/bind_photos.py build   [--region R | --bbox ...] [--max 20] [--camera NAV_LEFT_B]
                                                [--out FILE] [--download DIR]
      Збирає чернетку FeatureCollection: по одному повнокадровому знімку на зупинку в bbox,
      рівномірно вздовж маршруту. `alt` — фактичний (камера, RMC, sol); змістовний опис дописує F6.

bbox за замовчуванням — grid.boundsLonLat з public/data/gale/region.json (F3).
Джерела: docs/SOURCES.md, рядки mmgis-msl-waypoints і msl-raw-images (розділ F6).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Iterable

WAYPOINTS_URL = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json"
RAW_API = "https://mars.nasa.gov/api/v1/raw_image_items/"
RAW_PAGE = "https://mars.nasa.gov/raw_images/{id}"
CREDIT = "NASA/JPL-Caltech"
LOCAL_URL = "./data/gale/photos/{name}"
COORD_TOL_DEG = 1e-6
CAMERA_NAMES = {"NAV_LEFT_B": "Left Navcam", "NAV_RIGHT_B": "Right Navcam", "NAV_LEFT_A": "Left Navcam", "NAV_RIGHT_A": "Right Navcam"}

BBox = tuple[float, float, float, float]  # lonMin, latMin, lonMax, latMax


# ---------- чисті функції (тести: test_bind_photos.py) ----------

def rmc(site: int, drive: int) -> str:
    return f"{int(site)}_{int(drive)}"


def index_stops(waypoints: dict) -> dict[str, dict]:
    """RMC → properties зупинки, у порядку маршруту (sol, site, drive)."""
    props = [f["properties"] for f in waypoints["features"]]
    props.sort(key=lambda p: (p["sol"], p["site"], p["drive"]))
    return {p["RMC"]: p for p in props}


def in_bbox(lon: float, lat: float, bbox: BBox) -> bool:
    return bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]


def stops_in_bbox(waypoints: dict, bbox: BBox) -> list[dict]:
    return [p for p in index_stops(waypoints).values() if in_bbox(p["lon"], p["lat"], bbox)]


def sol_window(idx: dict[str, dict], key: str) -> tuple[int, int]:
    """Соли, коли ровер міг стояти на зупинці: від приїзду до sol наступної зупинки включно."""
    keys = list(idx)
    i = keys.index(key)
    start = idx[key]["sol"]
    end = idx[keys[i + 1]]["sol"] if i + 1 < len(keys) else start
    return start, max(start, end)


def _is_full(item: dict) -> bool:
    return not item.get("is_thumbnail") and (item.get("extended") or {}).get("sample_type") == "full"


def photo_feature(item: dict, stop: dict) -> dict:
    cam = item["instrument"]
    key = rmc(item["site"], item["drive"])
    return {
        "type": "Feature",
        "id": f"navcam-{item['id']}",
        "geometry": {"type": "Point", "coordinates": [stop["lon"], stop["lat"]]},
        "properties": {
            "id": f"navcam-{item['id']}",
            "url": LOCAL_URL.format(name=f"navcam-{item['id']}.jpg"),
            "alt": f"{CAMERA_NAMES.get(cam, cam)} view from Curiosity rover stop RMC {key}, sol {item['sol']}",
            "sourceUrl": RAW_PAGE.format(id=item["id"]),
            "credit": CREDIT,
            "sol": item["sol"],
            "camera": cam,
            "locationAccuracy": "rover-stop",
            "status": "verified",
        },
    }


def bind(item: dict, idx: dict[str, dict]) -> tuple[dict | None, str | None]:
    if not _is_full(item):
        return None, "not-full"
    stop = idx.get(rmc(item["site"], item["drive"]))
    if stop is None:
        return None, "not-a-stop"
    return photo_feature(item, stop), None


def check_feature(feature: dict, item: dict | None, idx: dict[str, dict], bbox: BBox) -> list[str]:
    """Розбіжності запису photos.geojson з API; порожній список — прив'язку підтверджено."""
    if item is None:
        return ["raw image not found"]
    p = feature["properties"]
    lon, lat = feature["geometry"]["coordinates"][:2]
    probs: list[str] = []
    key = rmc(item["site"], item["drive"])
    stop = idx.get(key)
    if stop is None:
        probs.append(f"site/drive {key} is not a MMGIS stop (photo taken mid-drive?)")
    elif abs(lon - stop["lon"]) > COORD_TOL_DEG or abs(lat - stop["lat"]) > COORD_TOL_DEG:
        probs.append(f"coordinates {lon},{lat} ≠ stop {key} {stop['lon']},{stop['lat']}")
    if p.get("sol") != item["sol"]:
        probs.append(f"sol {p.get('sol')} ≠ raw {item['sol']}")
    if p.get("camera") != item["instrument"]:
        probs.append(f"camera {p.get('camera')} ≠ raw {item['instrument']}")
    if p.get("sourceUrl") != RAW_PAGE.format(id=item["id"]):
        probs.append(f"sourceUrl {p.get('sourceUrl')} ≠ {RAW_PAGE.format(id=item['id'])}")
    if p.get("locationAccuracy") != "rover-stop":
        probs.append(f"locationAccuracy {p.get('locationAccuracy')} ≠ rover-stop")
    if not in_bbox(lon, lat, bbox):
        probs.append("outside bbox")
    return probs


def pick_spread(seq: list, n: int) -> list:
    """n елементів рівномірно (з першим і останнім), порядок зберігається."""
    if n <= 0 or not seq:
        return []
    if len(seq) <= n:
        return list(seq)
    if n == 1:
        return [seq[0]]
    return [seq[round(i * (len(seq) - 1) / (n - 1))] for i in range(n)]


# ---------- мережа й CLI ----------

def fetch(url: str, attempts: int = 3) -> bytes:
    """GET з повтором: raw images API відповідає ~20 с і часом рве з'єднання."""
    req = urllib.request.Request(url, headers={"User-Agent": "mars404-pipeline/1.0"})
    for n in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                if r.status != 200:
                    raise RuntimeError(f"{url}: HTTP {r.status}")
                return r.read()
        except OSError as e:  # URLError, timeout, мережа
            if n == attempts:
                raise
            print(f"retry {n}/{attempts - 1}: {e}", file=sys.stderr)
            time.sleep(5 * n)
    raise AssertionError("unreachable")


def raw_items(conditions: Iterable[str]) -> list[dict]:
    """Усі сторінки raw_image_items з умовами `value:field[:op]` (як у самому API)."""
    out: list[dict] = []
    page = 0
    while True:
        q = [("order", "sol asc"), ("per_page", "100"), ("page", str(page)), ("condition_1", "msl:mission")]
        q += [(f"condition_{i + 2}", c) for i, c in enumerate(conditions)]
        data = json.loads(fetch(RAW_API + "?" + urllib.parse.urlencode(q)))
        out += data["items"]
        if not data.get("more"):
            return out
        page += 1


def load_bbox(args: argparse.Namespace) -> BBox:
    if args.bbox:
        return tuple(args.bbox)  # type: ignore[return-value]
    region = Path(args.region)
    if not region.exists():
        sys.exit(f"{region} не знайдено — передай --bbox lonMin latMin lonMax latMax")
    return tuple(json.loads(region.read_text())["grid"]["boundsLonLat"])  # type: ignore[return-value]


def cmd_verify(args: argparse.Namespace) -> int:
    bbox = load_bbox(args)
    idx = index_stops(json.loads(fetch(WAYPOINTS_URL)))
    photos = json.loads(Path(args.photos).read_text())
    bad = 0
    for f in photos["features"]:
        raw_id = f["properties"]["id"].removeprefix("navcam-")
        items = raw_items([f"{raw_id}:id"]) if raw_id.isdigit() else []
        probs = check_feature(f, items[0] if items else None, idx, bbox)
        bad += bool(probs)
        print(f"{'FAIL' if probs else 'ok  '} {f['properties']['id']}" + "".join(f"\n     - {p}" for p in probs))
    print(f"{len(photos['features']) - bad}/{len(photos['features'])} verified")
    return 1 if bad else 0


def cmd_build(args: argparse.Namespace) -> int:
    bbox = load_bbox(args)
    idx = index_stops(json.loads(fetch(WAYPOINTS_URL)))
    stops = [s for s in idx.values() if in_bbox(s["lon"], s["lat"], bbox)]
    print(f"{len(stops)} MMGIS stops in bbox", file=sys.stderr)
    features: list[dict] = []
    for s in pick_spread(stops, args.max * 3):  # із запасом: не на кожній зупинці є повний кадр
        lo, hi = sol_window(idx, s["RMC"])
        items = raw_items([f"{lo}:sol:gte", f"{hi}:sol:lte", f"{args.camera}:instrument"])
        here = [i for i in items if rmc(i["site"], i["drive"]) == s["RMC"]]
        bound = [f for f, _ in (bind(i, idx) for i in here) if f]
        print(f"  {s['RMC']} (sol {lo}–{hi}): {len(bound)} full frames", file=sys.stderr)
        if bound:
            features.append(bound[0])  # найраніший повний кадр на цій зупинці
    features = pick_spread(features, args.max)
    fc = {"type": "FeatureCollection", "features": features}
    text = json.dumps(fc, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text)
    else:
        sys.stdout.write(text)
    if args.download:
        d = Path(args.download)
        d.mkdir(parents=True, exist_ok=True)
        for f in features:
            raw_id = f["properties"]["id"].removeprefix("navcam-")
            item = raw_items([f"{raw_id}:id"])[0]
            (d / f"navcam-{raw_id}.jpg").write_bytes(fetch(item["url"]))
    print(f"{len(features)} photos", file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("verify", "build"):
        sp = sub.add_parser(name)
        sp.add_argument("--region", default="public/data/gale/region.json")
        sp.add_argument("--bbox", type=float, nargs=4, metavar=("LON_MIN", "LAT_MIN", "LON_MAX", "LAT_MAX"))
    sub.choices["verify"].add_argument("--photos", default="public/data/gale/photos/photos.geojson")
    b = sub.choices["build"]
    b.add_argument("--max", type=int, default=20)
    b.add_argument("--camera", default="NAV_LEFT_B")
    b.add_argument("--out")
    b.add_argument("--download", metavar="DIR")
    args = ap.parse_args(argv)
    return cmd_verify(args) if args.cmd == "verify" else cmd_build(args)


if __name__ == "__main__":
    sys.exit(main())
