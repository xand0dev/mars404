"""Обраний район (T2, specs/F3/spec.md): квадрат 2.56 км навколо Curiosity, sol 5073
(MMGIS MSL_waypoints_current: lon 137.388886, lat −4.82602331). Перевірка probe.py 14.11:
NoData 0 %, висоти −3655…−3189 м, 104 зупинки (sol 4605–5073).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import trek  # noqa: E402

CENTER = (137.388886, -4.82602331)
CELLS = 256          # планувальна сітка CELLS × CELLS (SPEC §8: ≤256×256)
MPP = 10             # м на клітинку (≤10 м)
NATIVE_M = 1         # Gale_DEM_SMG_1m: pixelSize 1.687e-5° ≈ 1 м
NATIVE_PX = CELLS * MPP // NATIVE_M
TEXTURE_PX = 2048
# Округлено до 6 знаків — так само, як у запиті exportImage.
BBOX = tuple(round(v, 6) for v in trek.bbox_around(*CENTER, CELLS * MPP))
