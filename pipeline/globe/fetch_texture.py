#!/usr/bin/env python3
"""Текстура глобуса F1: глобальна мозаїка Viking MDIM 2.1 (colorized) з NASA Mars Trek WMTS.

Збирає рівень 2 (8×4 тайли по 256 px) в еквірект. JPEG 2048×1024, lon −180…180 зліва направо,
lat 90…−90 згори вниз — саме так його очікує latLonToSphere / UV SphereGeometry (F1-AC4).
Пише public/data/mars/<file> і public/data/mars/source.json (file, credit, sourceUrl, sha256, …).

Запуск з кореня репо:  python3 pipeline/globe/fetch_texture.py
Залежності: Python 3.10+, Pillow (pipeline/globe/requirements.txt). Мережа потрібна лише тут, не в застосунку.
"""
from __future__ import annotations

import hashlib
import io
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

from PIL import Image

LAYER = "Mars_Viking_MDIM21_ClrMosaic_global_232m"
BASE = f"https://trek.nasa.gov/tiles/Mars/EQ/{LAYER}/1.0.0"
CAPABILITIES = f"{BASE}/WMTSCapabilities.xml"
TILE = BASE + "/default/default028mm/{z}/{row}/{col}.jpg"
PRODUCT_URL = "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m"

LEVEL = 2          # MatrixWidth 8, MatrixHeight 4 (з WMTSCapabilities), TopLeftCorner −180, 90
COLS, ROWS, TILE_PX = 8, 4, 256
OUT_DIR = Path("public/data/mars")
OUT_FILE = "mars_viking_mdim21_clr_2048.jpg"
JPEG_QUALITY = 85


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "mars404-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status != 200:
            raise RuntimeError(f"{url}: HTTP {r.status}")
        return r.read()


def main() -> int:
    if not Path("package.json").exists():
        print("Запускай з кореня репо", file=sys.stderr)
        return 2
    mosaic = Image.new("RGB", (COLS * TILE_PX, ROWS * TILE_PX))
    for row in range(ROWS):
        for col in range(COLS):
            url = TILE.format(z=LEVEL, row=row, col=col)
            tile = Image.open(io.BytesIO(fetch(url))).convert("RGB")
            if tile.size != (TILE_PX, TILE_PX):
                raise RuntimeError(f"{url}: очікував {TILE_PX}², отримав {tile.size}")
            mosaic.paste(tile, (col * TILE_PX, row * TILE_PX))
            print(f"tile {LEVEL}/{row}/{col} ok")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    buf = io.BytesIO()
    mosaic.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    data = buf.getvalue()
    (OUT_DIR / OUT_FILE).write_bytes(data)

    meta = {
        "file": OUT_FILE,
        "credit": "Viking MDIM 2.1 colorized mosaic — NASA Ames / USGS Astrogeology, via NASA Mars Trek",
        "sourceUrl": PRODUCT_URL,
        "title": "Mars Viking Colorized Global Mosaic 232m",
        "status": "verified",
        "note": "Artistically colorized (USGS). Downsampled: WMTS level 2 tiles, 2048×1024 equirectangular, "
        "lon −180…180, lat 90…−90, Mars 2000 (EPSG 104905). Use constraints: none (USGS record).",
        "tiles": TILE.replace("{z}", str(LEVEL)),
        "capabilities": CAPABILITIES,
        "width": mosaic.width,
        "height": mosaic.height,
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "accessedAt": date.today().isoformat(),
    }
    (OUT_DIR / "source.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{OUT_DIR / OUT_FILE}: {mosaic.width}×{mosaic.height}, {len(data)} B, sha256 {meta['sha256']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
