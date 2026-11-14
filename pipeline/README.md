# F3 · pipeline даних Gale (Максим)

Два кроки. Лише стандартна бібліотека Python 3, numpy і GDAL не потрібні: float32 TIFF з Trek читає `trek.py`.

1. **fetch** (мережа, один раз) — `python pipeline/fetch.py [каталог]` → `pipeline/.cache/gale/`:
   - `dem.tif` — `Gale_DEM_SMG_1m/exportImage`, 2560², nearest neighbour, ≈1 м;
   - `hirise.jpg` — `curiosity_hirise_mosaic/exportImage`, 2048²;
   - `MSL_traverse.json`, `MSL_waypoints_current.json` (MMGIS);
   - `fetch.json` — URL, дата, розмір, sha256 кожного файлу.
2. **prepare** (офлайн, детермінований) — `python pipeline/prepare.py` → `public/data/gale/`:
   - сітка 256×256 по 10 м; висоти — mean з валідних пікселів 1 м (без валідних → NoData `-9999`);
   - схил — Horn 3×3 на 1 м → max по клітинці; hazard = `min(1, slope/25) × 0.5` (assumption);
   - `walkable = 0` для NoData; поріг схилу застосовує F4 (`maxSlopeDeg`);
   - `region.json`, `source.json` (входи + статистика), `traverse.geojson`, `SHA256SUMS`.

Район — `region_config.py` (квадрат 2.56 км навколо Curiosity, sol 5073). Вибір перевіряв `probe.py` (критерії SPEC §8).

```sh
python -m unittest discover -s pipeline -p "test_*.py"
# Docker (з кореня):
docker build -f pipeline/Dockerfile -t mars404-data .
docker run --rm -v "$PWD/pipeline/.cache/gale:/cache" mars404-data /work/fetch.py /cache   # лише без кешу
docker run --rm --network none -v "$PWD/pipeline/.cache/gale:/cache:ro" -v "$PWD/public/data/gale:/out" mars404-data
```

Два запуски prepare дають однакові `SHA256SUMS` (F3-AC1). `public/data/gale/.gitattributes` вимикає CRLF, щоб суми збігалися на Windows.
