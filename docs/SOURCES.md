# Джерела даних і моделі

Кожне джерело — рядок у розділі **своєї** фічі. Статус: `verified` (перевірено й використано), `pending` (точка входу відома, у пакеті ще немає), `assumption`, `mock`. Веде й звіряє — Настя (F6).

Формат: `| id | що | URL / product ID | credit | дата доступу | статус | примітка |`

## F0

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| mock | Синтетична сітка, цілі й модель `src/mocks` | — | — | — | mock | Лише для тестів і до появи пакета даних |

## F1

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| iau-gazetteer-2071 | Центр «Gale» для маркера глобуса | https://planetarynames.wr.usgs.gov/Feature/2071 | IAU WGPSN / USGS Astrogeology | 2026-11-14 | verified | −5.44°, 137.70°E; MDIM 2.1, planetocentric +East 0–360 |
| iau-gazetteer-14300 | Центр «Jezero» для маркера глобуса | https://planetarynames.wr.usgs.gov/Feature/14300 | IAU WGPSN / USGS Astrogeology | 2026-11-14 | verified | 18.41°, 77.69°E; MDIM 2.1, planetocentric +East 0–360 |
| iau-gazetteer-3854 | Центр «Meridiani Planum» для маркера глобуса | https://planetarynames.wr.usgs.gov/Feature/3854 | IAU WGPSN / USGS Astrogeology | 2026-11-14 | verified | 0.20°, 357.50°E; MDIM 2.1, planetocentric +East 0–360 |
| iau-gazetteer-4453 | Центр «Olympus Mons» для маркера глобуса | https://planetarynames.wr.usgs.gov/Feature/4453 | IAU WGPSN / USGS Astrogeology | 2026-11-14 | verified | 18.40°, 226.00°E; MDIM 2.1, planetocentric +East 0–360 |
| iau-gazetteer-6288 | Центр «Valles Marineris» для маркера глобуса | https://planetarynames.wr.usgs.gov/Feature/6288 | IAU WGPSN / USGS Astrogeology | 2026-11-14 | verified | −13.74°, 300.80°E; MDIM 2.1, planetocentric +East 0–360 |
| mars-viking-mdim21-clr | Текстура глобуса `public/data/mars/mars_viking_mdim21_clr_2048.jpg` | https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m · тайли: https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml (рівень 2) | NASA Ames / USGS Astrogeology, via NASA Mars Trek | 2026-11-14 | verified | Колір художній (USGS: «artistically colorized»); 2048×1024 еквірект., lon −180…180; Use Constraints: none; sha256 у `public/data/mars/source.json` |

## F2

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| f2-eye-height | Висота очей для POV-камери, 1.7 м | — | — | 2026-11-14 | assumption | Без джерела; на екрані підпис «Eye height 1.7 m — assumption» |

## F3

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| trek-gale-dem-1m | HiRISE DEM Gale, 1 м, float32 | https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer/exportImage · `Gale_DEM_SMG_1m` | NASA/JPL Mars Trek | 2026-11-13 | pending | Endpoint перевірено живим запитом; bbox 137.400–137.422, −4.750…−4.728 → −4108…−3817 м |
| trek-hirise-mosaic | HiRISE ортомозаїка Curiosity | https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_hirise_mosaic/ImageServer/exportImage · `curiosity_hirise_mosaic` | NASA/JPL Mars Trek | 2026-11-13 | pending | `format=jpg` |
| trek-themis-ir | THEMIS Day/Night IR, ~100 м (WMTS) | https://trek.nasa.gov/tiles/Mars/EQ/{layer}/1.0.0/WMTSCapabilities.xml | NASA/JPL Mars Trek | 2026-11-13 | pending | Картинка, не значення; лише відображення |
| mmgis-msl-traverse | Маршрут Curiosity | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json | NASA/JPL-Caltech | 2026-11-13 | pending | `[lon, lat, elev]` |
| mmgis-msl-waypoints | 1388 зупинок і поточна позиція Curiosity | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json, …/MSL_waypoints_current.json | NASA/JPL-Caltech | 2026-11-13 | pending | Поточна: sol 5070, −4.8257, 137.3892 |

## F4

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|

## F5

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|

## F6

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| msl-raw-images | Фото Curiosity (Navcam тощо) | https://mars.nasa.gov/api/v1/raw_image_items/?condition_1=msl:mission | NASA/JPL-Caltech | 2026-11-13 | pending | `site`+`drive` = `RMC` зупинки; `is_thumbnail=false` |

## F7

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|

## F8

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
