"""Обраний район (T2, specs/F3/spec.md, рішення команди в #7, варіант B): квадрат 2.56 км
з центром у центроїді 8 перевірених цілей F6 (sol 3008–3192); містить bbox SPEC §12
(137.400–137.422, −4.750…−4.728). Перевірка probe.py 14.11: NoData 0 %, висоти −4218…−3742 м,
211 зупинок Curiosity (sol 2788–3571).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import trek  # noqa: E402

CENTER = (137.40674, -4.73802)
CELLS = 256          # планувальна сітка CELLS × CELLS (SPEC §8: ≤256×256)
MPP = 10             # м на клітинку (≤10 м)
NATIVE_M = 1         # Gale_DEM_SMG_1m: pixelSize 1.687e-5° ≈ 1 м
NATIVE_PX = CELLS * MPP // NATIVE_M
TEXTURE_PX = 2048
# Округлено до 6 знаків — так само, як у запиті exportImage.
BBOX = tuple(round(v, 6) for v in trek.bbox_around(*CENTER, CELLS * MPP))
