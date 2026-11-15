"""#101, #113: перевірка готових EVA- і overview-пакетів у public/data/<region> (розміри, NoData %, межі висот, SHA256SUMS).
Пакета ще немає в репо — тест для нього пропускається. Запуск з кореня:
python -m unittest discover -s pipeline -p "test_*.py"
"""
import hashlib
import json
import math
import struct
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import region_config as cfg  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent / 'public' / 'data'
MB = 1024 * 1024
# Обмеження #101: файл ≤ 4.5 МБ, район ≤ 8 МБ, NoData у EVA ≤ 2 %.
MAX_FILE, MAX_REGION, MAX_NODATA = 4.5 * MB, 8 * MB, 0.02
# Файли F6 і Івана (#113) — не наші, у ліміт району не рахуємо.
NOT_OURS = ('targets', 'photos', 'context', 'README')


def f32(path):
    b = path.read_bytes()
    return list(struct.unpack(f'<{len(b) // 4}f', b))


class Packages(unittest.TestCase):
    def check(self, region):
        d = ROOT / region
        if not (d / 'region.json').exists():
            self.skipTest(f'{region}: пакета ще немає')
        reg = json.loads((d / 'region.json').read_text(encoding='utf-8'))
        src = json.loads((d / 'source.json').read_text(encoding='utf-8'))
        self.assertEqual((reg['id'], reg['kind']), (region, 'eva'))
        g, rg = reg['grid'], reg['renderGrid']
        self.assertEqual((g['width'], g['height'], g['metersPerPixel']), (256, 256, 10))
        self.assertEqual((rg['width'], rg['height']), (cfg.RENDER_PX, cfg.RENDER_PX))
        self.assertEqual(g['boundsLonLat'], list(cfg.REGIONS[region]['bbox']))
        n = g['width'] * g['height']
        sizes = {reg['files']['elevation']: n * 4, reg['files']['slope']: n * 4, reg['files']['hazard']: n * 4,
                 reg['files']['walkable']: n, reg['files']['elevationRender']: rg['width'] * rg['height'] * 4}
        for name, size in sizes.items():
            self.assertEqual((d / name).stat().st_size, size, name)
        ours = [p for p in d.rglob('*') if p.is_file() and not p.name.startswith(NOT_OURS) and 'photos' not in p.parts]
        for p in ours:
            self.assertLessEqual(p.stat().st_size, MAX_FILE, p.name)
        self.assertLessEqual(sum(p.stat().st_size for p in ours), MAX_REGION)
        lo, hi = src['native']['elevMinM'], src['native']['elevMaxM']
        for name in (reg['files']['elevation'], reg['files']['elevationRender']):
            vals = f32(d / name)
            bad = [v for v in vals if v == reg['noData'] or not math.isfinite(v)]
            self.assertLessEqual(len(bad) / len(vals), MAX_NODATA, name)
            good = [v for v in vals if v != reg['noData'] and math.isfinite(v)]
            # Середнє пікселів лежить між мін. і макс. нативного DEM (float32 → допуск 1 мм).
            self.assertGreaterEqual(min(good), lo - 1e-3, name)
            self.assertLessEqual(max(good), hi + 1e-3, name)
        x, y = reg['base']
        cell = int((g['originM'][1] - y) // 10) * 256 + int((x - g['originM'][0]) // 10)
        self.assertEqual((d / reg['files']['walkable']).read_bytes()[cell], 1, 'base не walkable')
        for line in (d / 'SHA256SUMS').read_text(encoding='utf-8').splitlines():
            digest, name = line.split('  ', 1)
            self.assertEqual(hashlib.sha256((d / name).read_bytes()).hexdigest(), digest, name)
        return reg, src

    def test_gale(self):
        reg, _ = self.check('gale')
        self.assertEqual(reg['files']['texture'], 'hirise_4096.jpg')  # #117; шар optical — hirise.jpg
        self.assertEqual(reg['context']['file'], 'context.f32')  # #118 не губиться після prepare

    def test_columbia_hills(self):
        reg, src = self.check('columbia-hills')
        self.assertEqual(reg['files']['texture'], 'hillshade.jpg')  # QA 15.11: PNG 3,2 МБ → JPEG q82
        self.assertLessEqual((ROOT / 'columbia-hills' / 'hillshade.jpg').stat().st_size, 1.5 * MB)
        self.assertFalse((ROOT / 'columbia-hills' / 'hillshade.png').exists(), 'старий PNG не лишився')
        # Похідні шари — не verified (урок #63).
        layers = {l['id']: l for l in reg['layers']}
        self.assertEqual(layers['optical']['status'], 'assumption')
        self.assertEqual(layers['slope']['status'], 'assumption')
        self.assertGreaterEqual(sum(w['reachableFromBase'] for w in src['waypoints']), 3)
        self.assertEqual((reg['limits']['o2'], reg['limits']['time'], reg['model']['emergencyO2G']), (140, 3600, 56))
        # #113: кільце контексту з render_context.py, той самий центр, що й у сітки (originM як у Gale).
        ctx = reg['context']
        self.assertEqual((ctx['file'], ctx['width'], ctx['metersPerPixel'], ctx['originM']), ('context.f32', 256, 240.0, [-29440.0, 32000.0]))
        vals = f32(ROOT / 'columbia-hills' / ctx['file'])
        self.assertEqual(len(vals), 256 * 256)
        good = [v for v in vals if v != ctx['noData']]
        self.assertLessEqual(1 - len(good) / len(vals), 0.05)
        # Кільце ширше за EVA-район: його висоти мають покривати діапазон району.
        self.assertLess(min(good), src['native']['elevMinM'])
        self.assertGreater(max(good), src['native']['elevMaxM'])


class Overview(unittest.TestCase):
    """#113: overview-пакети — 256² по 2400 м, NoData ≤ 5 %, район ≤ 3 МБ, модель лише assumption."""

    def check(self, region):
        d = ROOT / region
        if not (d / 'region.json').exists():
            self.skipTest(f'{region}: пакета ще немає')
        reg = json.loads((d / 'region.json').read_text(encoding='utf-8'))
        src = json.loads((d / 'source.json').read_text(encoding='utf-8'))
        self.assertEqual((reg['id'], reg['kind']), (region, 'overview'))
        g = reg['grid']
        self.assertEqual((g['width'], g['height'], g['metersPerPixel'], g['originM']), (256, 256, 2400, [0, 614400]))
        self.assertEqual(g['boundsLonLat'], list(cfg.REGIONS[region]['bbox']))
        n = 256 * 256
        for key, size in (('elevation', n * 4), ('slope', n * 4), ('hazard', n * 4), ('walkable', n), ('elevationRender', 512 * 512 * 4)):
            self.assertEqual((d / reg['files'][key]).stat().st_size, size, key)
        self.assertLessEqual((d / 'texture.jpg').stat().st_size, 1.5 * MB)
        self.assertEqual((d / 'texture.jpg').read_bytes()[:3], bytes([0xFF, 0xD8, 0xFF]))
        self.assertLessEqual(sum(p.stat().st_size for p in d.rglob('*') if p.is_file()), 3 * MB)
        elev = f32(d / 'elevation.f32')
        good = [v for v in elev if v != reg['noData'] and math.isfinite(v)]
        self.assertLessEqual(1 - len(good) / n, 0.05)
        self.assertGreaterEqual(min(good), src['native']['elevMinM'] - 1e-3)
        self.assertLessEqual(max(good), src['native']['elevMaxM'] + 1e-3)
        # walkable = схил ≤ maxSlopeDeg (#113); NaN-схил — не walkable.
        slope, walk = f32(d / 'slope.f32'), (d / 'walkable.u8').read_bytes()
        lim = reg['model']['maxSlopeDeg']
        self.assertEqual(list(walk), [1 if math.isfinite(s_) and s_ <= lim else 0 for s_ in slope])
        self.assertFalse((d / 'targets.geojson').exists(), 'targets* — шлях F6')
        # Чесність: модель і ліміти — assumption; verified лише сирі дані Trek.
        by_id = {s_['id']: s_ for s_ in reg['sources']}
        for e in [*reg['model']['evidence'].values(), *reg['limitsEvidence'].values()]:
            self.assertEqual(e['status'], 'assumption', e['id'])
        self.assertEqual({k for k, s_ in by_id.items() if s_['status'] == 'verified'}, {'trek-mola-hrsc-200m', 'trek-viking-mdim21-color'})
        for line in (d / 'SHA256SUMS').read_text(encoding='utf-8').splitlines():
            digest, name = line.split('  ', 1)
            self.assertEqual(hashlib.sha256((d / name).read_bytes()).hexdigest(), digest, name)
        return good

    def test_olympus_mons(self):
        good = self.check('olympus-mons')
        # Вершина ≈ 21,2 км над ареоїдом (MOLA); середнє 4×4 по 600 м трохи нижче.
        self.assertTrue(20000 < max(good) < 22000, max(good))
        self.assertLess(min(good), 0)

    def test_valles_marineris(self):
        good = self.check('valles-marineris')
        # Дно Coprates Chasma нижче −4 км, плато вище +2 км: перепад > 8 км.
        self.assertLess(min(good), -4000)
        self.assertGreater(max(good) - min(good), 8000)


if __name__ == '__main__':
    unittest.main()
