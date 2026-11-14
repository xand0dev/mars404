# F3 · pipeline даних районів (Максим)

Два кроки. Лише стандартна бібліотека Python 3, numpy і GDAL не потрібні: float32 TIFF з Trek читає `trek.py`.

1. **fetch** (мережа, один раз) — `python pipeline/fetch.py [каталог]` → `pipeline/.cache/gale/`:
   - `dem.tif` — `Gale_DEM_SMG_1m/exportImage`, 2560², nearest neighbour, ≈1 м;
   - `hirise.jpg` — `curiosity_hirise_mosaic/exportImage`, 2048²;
   - `MSL_traverse.json` (MMGIS);
   - `themis-{night,day}-9-R-C.png` — тайли THEMIS IR (Trek WMTS, рівень 9 ≈ 81 м/пікс.), що покривають bbox;
   - `fetch.json` — URL, дата, розмір, sha256 кожного файлу. Наявні в кеші файли не перекачуються (`--force` — усе заново).
2. **prepare** (офлайн, детермінований) — `python pipeline/prepare.py` → `public/data/gale/`:
   - сітка 256×256 по 10 м; висоти — mean з валідних пікселів 1 м (без валідних → NoData `-9999`);
   - схил — Horn 3×3 на 1 м → max по клітинці; hazard = `min(1, slope/25) × 0.5` (assumption);
   - `walkable = 0` для NoData; поріг схилу застосовує F4 (`maxSlopeDeg`);
   - `layers/themis-{night,day}.png` — 256², nearest на клітинку, лінійний stretch p2–p98 у кольорову шкалу; лише відображення (SPEC §8);
   - модель за рішенням #20: `o2GPerS = 0.031` г/с і `speedMps = 1.0` (`jones-apollo-walk`, assumption: Apollo, Місяць → Марс), `emergencyO2G` = 30 хв SOP EMU × `o2GPerS` ≈ 56 г (`emu-sop-30min`, verified);
   - `limits` = 3600 с / 140 г (112 / 0.8, #64) / 600 Wh / null і `limitsEvidence` на кожен ліміт (усі assumption, SPEC §7.6);
   - `region.json`, `source.json` (входи + статистика), `traverse.geojson`, `SHA256SUMS`.

Райони — `region_config.REGIONS` (#101): `gale`, `columbia-hills` — EVA, будує `prepare.py --region <id>` з кешу `pipeline/.cache/<id>/` (`fetch.py --region <id>`); `olympus-mons`, `valles-marineris` — overview, будує `overview.py` (Іван, #113). Для кожного EVA-району `prepare` пише ще `elevation_render.f32` — 1024² по 2.5 м (середнє валідних 1-м пікселів, зважене площею перетину; лише 3D) — і `renderGrid` у `region.json`. Для Gale `files.texture` — `hirise_4096.jpg` (#117), шар optical — `hirise.jpg`. `prepare` не губить того, що додали інші скрипти: `context` (з `context.json` Івана або з наявного `region.json`, #118), чужі джерела в `region.json` і входи в `source.json`; `context.*` входять у `SHA256SUMS`.

Gale — `region_config.py` (bbox B з #7: квадрат 2.56 км з центром у центроїді цілей F6). Вибір перевіряв `probe.py` (критерії SPEC §8).

```sh
python -m unittest discover -s pipeline -p "test_*.py"
# Docker (з кореня):
docker build -f pipeline/Dockerfile -t mars404-data .
docker run --rm -v "$PWD/pipeline/.cache/gale:/cache" mars404-data /work/fetch.py /cache   # лише без кешу
docker run --rm --network none -v "$PWD/pipeline/.cache/gale:/cache:ro" -v "$PWD/public/data/gale:/out" mars404-data
# інший район: … mars404-data /work/prepare.py --region columbia-hills --cache /cache --output /out
```

Два запуски prepare у Docker дають однакові `SHA256SUMS` (F3-AC1, перевірено 14.11, Docker 29.9.3). Пакет у репо — з Docker. Локальний Python дає ті самі пікселі PNG, але інші байти (інша версія zlib), тому канонічний — Docker.
PNG і тайли читає `png.py` (стандартна бібліотека). `public/data/gale/.gitattributes` вимикає CRLF, щоб суми збігалися на Windows.
