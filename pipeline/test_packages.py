"""#101: перевірка готових EVA-пакетів у public/data/<region> (розміри, NoData %, межі висот, SHA256SUMS).
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
        self.assertEqual(reg['files']['texture'], 'hirise.jpg')

    def test_columbia_hills(self):
        reg, src = self.check('columbia-hills')
        self.assertEqual(reg['files']['texture'], 'hillshade.png')
        # Похідні шари — не verified (урок #63).
        layers = {l['id']: l for l in reg['layers']}
        self.assertEqual(layers['optical']['status'], 'assumption')
        self.assertEqual(layers['slope']['status'], 'assumption')
        self.assertGreaterEqual(sum(w['reachableFromBase'] for w in src['waypoints']), 3)
        self.assertEqual((reg['limits']['o2'], reg['limits']['time'], reg['model']['emergencyO2G']), (140, 3600, 56))


if __name__ == '__main__':
    unittest.main()
