"""Райони даних (SPEC §6.0, #101). Ключ — SiteId і папка public/data/<id>/.

gale — T2, specs/F3/spec.md, рішення команди в #7, варіант B: квадрат 2.56 км з центром у центроїді
8 перевірених цілей F6 (sol 3008–3192); містить bbox SPEC §12 (137.400–137.422, −4.750…−4.728).
Перевірка probe.py 14.11: NoData 0 %, висоти −4218…−3742 м, 211 зупинок Curiosity (sol 2788–3571).

columbia-hills — #101 крок 4: квадрат 2.56 км з центром посередині між точками Trek `spirit_waypoints`
«Husband Hill» (175.52469, −14.59210) і «Home Plate» (175.53130, −14.60612), перевірено 14.11.
DEM_1m_ColumbiaHills: pixelSize 1.7e-5° ≈ 1.01 м, extent 175.4437…175.5607 E, −14.6817…−14.4953.

olympus-mons, valles-marineris — overview (kind 'overview'); пакет будує overview.py (Іван, #113),
prepare.py їх не обробляє. Центри — IAU Gazetteer, як у src/features/globe/sites.ts.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import trek  # noqa: E402

CELLS = 256          # планувальна сітка CELLS × CELLS (SPEC §8: ≤256×256)
MPP = 10             # м на клітинку (≤10 м)
NATIVE_M = 1         # обидва DEM ≈ 1 м; exportImage запитується рівно по 1 м (nearest neighbour)
NATIVE_PX = CELLS * MPP // NATIVE_M
TEXTURE_PX = 2048
TEXTURE_HD_PX = 4096  # hirise_4096.jpg для 3D (Gale, #117)
RENDER_PX = 1024     # elevation_render.f32: 1024² по 2.5 м (#101 крок 2), лише для 3D


def _bbox(center):
    # Округлено до 6 знаків — так само, як у запиті exportImage.
    return tuple(round(v, 6) for v in trek.bbox_around(*center, CELLS * MPP))


HUSBAND_HILL = (175.52469, -14.5921)
HOME_PLATE = (175.5313, -14.60612)

REGIONS = {
    'gale': dict(
        kind='eva', center=(137.40674, -4.73802), dem=trek.DEM, texture=trek.HIRISE,
        name='Gale · Mount Sharp (Curiosity stops, sol 3008–3192)',
        centerNote='centroid of F6 targets',
    ),
    'columbia-hills': dict(
        kind='eva',
        center=(round((HUSBAND_HILL[0] + HOME_PLATE[0]) / 2, 6), round((HUSBAND_HILL[1] + HOME_PLATE[1]) / 2, 6)),
        dem='DEM_1m_ColumbiaHills', texture=None,
        name='Gusev · Columbia Hills (Spirit, Husband Hill – Home Plate)',
        centerNote='midpoint of Trek spirit_waypoints Husband Hill and Home Plate',
    ),
    'olympus-mons': dict(kind='overview', center=(226.0 - 360, 18.4)),
    'valles-marineris': dict(kind='overview', center=(300.8 - 360, -13.74)),
}
for _r in REGIONS.values():
    _r['bbox'] = _bbox(_r['center'])

EVA = [k for k, v in REGIONS.items() if v['kind'] == 'eva']

# Сумісність зі старими імпортами (Gale).
CENTER = REGIONS['gale']['center']
BBOX = REGIONS['gale']['bbox']
