# pipeline/globe (F1)

`fetch_texture.py` збирає текстуру глобуса з NASA Mars Trek WMTS (`Mars_Viking_MDIM21_ClrMosaic_global_232m`, рівень 2 = 8×4 тайли по 256 px) у `public/data/mars/mars_viking_mdim21_clr_2048.jpg` і пише `public/data/mars/source.json`.

```bash
python3 -m venv .venv && .venv/bin/pip install -r pipeline/globe/requirements.txt
.venv/bin/python pipeline/globe/fetch_texture.py   # з кореня репо
```

- macOS + Python з python.org: якщо `CERTIFICATE_VERIFY_FAILED` — `pip install certifi` і `SSL_CERT_FILE=$(.venv/bin/python -c "import certifi;print(certifi.where())")`.
- Джерело й ліцензія: USGS «Mars Viking Colorized Global Mosaic 232m», Use Constraints: none — https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m. Колір художній, не спектральний.
- Перевірка: `sha256` у `source.json`; орієнтація — Olympus Mons ≈ (262, 407) px, Hellas ≈ (1422, 750) px.

## `bind_photos.py` — знімки Navcam → зупинки MMGIS (#36, SPEC §6.0, F6-AC5)

Лише stdlib. Знімок отримує координати зупинки, якщо його `site`/`drive` з raw images API збігаються з `RMC` зупинки в MMGIS `MSL_waypoints.json`. Прив'язувати лише за sol не можна: за один sol Navcam знімає і під час руху (sol 3008: drive 1048 — у русі, 1072 — зупинка `85_1072`). Координати означають місце ровера, а не місце кадру (`locationAccuracy: 'rover-stop'`).

```bash
# з кореня репо; bbox — grid.boundsLonLat з public/data/gale/region.json або --bbox
python3 pipeline/globe/bind_photos.py verify                     # звірити photos.geojson з API (exit 1 — є розбіжності)
python3 pipeline/globe/bind_photos.py build --max 20 --out /tmp/photos.geojson --download /tmp/photos
python3 -m unittest discover -s pipeline/globe -v                # тести на справжніх фікстурах MMGIS / raw images
```

- `build` видає чернетку: по одному найранішому повнокадровому знімку на зупинку, рівномірно вздовж маршруту в bbox. `alt` фактичний (камера, RMC, sol). Змістовний опис, відбір кадрів і запис у `public/data/gale/photos/` робить F6.
- Джерела вже є в `docs/SOURCES.md`: `mmgis-msl-waypoints`, `msl-raw-images`.
- macOS + Python з python.org: `SSL_CERT_FILE=/etc/ssl/cert.pem` (або certifi, див. вище).
