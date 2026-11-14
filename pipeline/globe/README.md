# pipeline/globe (F1)

`fetch_texture.py` збирає текстуру глобуса з NASA Mars Trek WMTS (`Mars_Viking_MDIM21_ClrMosaic_global_232m`, рівень 2 = 8×4 тайли по 256 px) у `public/data/mars/mars_viking_mdim21_clr_2048.jpg` і пише `public/data/mars/source.json`.

```bash
python3 -m venv .venv && .venv/bin/pip install -r pipeline/globe/requirements.txt
.venv/bin/python pipeline/globe/fetch_texture.py   # з кореня репо
```

- macOS + Python з python.org: якщо `CERTIFICATE_VERIFY_FAILED` — `pip install certifi` і `SSL_CERT_FILE=$(.venv/bin/python -c "import certifi;print(certifi.where())")`.
- Джерело й ліцензія: USGS «Mars Viking Colorized Global Mosaic 232m», Use Constraints: none — https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m. Колір художній, не спектральний.
- Перевірка: `sha256` у `source.json`; орієнтація — Olympus Mons ≈ (262, 407) px, Hellas ≈ (1422, 750) px.
