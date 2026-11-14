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
| trek-gale-dem-1m | HiRISE DEM Gale, 1 м, float32 | https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer/exportImage · `Gale_DEM_SMG_1m` | NASA/JPL Mars Trek | 2026-11-14 | verified | 14.11: bbox B (#7) 137.385072…137.428408, −4.759614…−4.716426, 2560² nearest → −4217.4…−3733.8 м, NoData 0 %. Раніше: | Endpoint перевірено живим запитом; bbox 137.400–137.422, −4.750…−4.728 → −4108…−3817 м |
| trek-hirise-mosaic | HiRISE ортомозаїка Curiosity | https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_hirise_mosaic/ImageServer/exportImage · `curiosity_hirise_mosaic` | NASA/JPL Mars Trek | 2026-11-14 | verified | `format=jpg`, U8, native ≈0.25 м; 2048² на bbox → hirise.jpg |
| mmgis-msl-traverse | Маршрут Curiosity | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json | NASA/JPL-Caltech, MSL MMGIS | 2026-11-14 | verified | Обрізка по bbox → traverse.geojson (212 ліній) |
| hazard-from-slope | Hazard як похідна від схилу | — | команда | 2026-11-14 | assumption | min(1, slope/25) × 0.5; тестові коефіцієнти, погодити з Владом |
| base-assumption | База (хабітат) | — | команда | 2026-11-14 | assumption | прохідна клітинка, найближча до центру bbox (центроїд цілей F6); погодити з Настею |
| model-assumption | Модель ходи й ліміти в region.json | SPEC §7.3–7.4 | команда | 2026-11-14 | assumption | значення з src/mocks; джерела — Влад (F4/F5) |
| trek-themis-night-ir | THEMIS IR Night, controlled mosaic 100 м v2 (Mars Odyssey) | https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/9/269/902.png · `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018` | NASA/JPL-Caltech/Arizona State University, Mars Odyssey THEMIS; Mars Trek | 2026-11-14 | verified | Каталог Trek `searchItems` (instrument THEMIS) → WMTS PNG, рівень 9 (≈81 м/пікс.), 1 тайл; на bbox ~32×31 нативних пікселів, nearest на клітинку 10 м. 8-біт яскравість, не температура; DN 135–255, stretch p2–p98 156–255 → `layers/themis-night.png`. Нічний IR показує різницю теплової інерції (опис продукту Trek). Лише відображення, не вхід hazard |
| trek-themis-day-ir | THEMIS IR Day, controlled mosaic 100 м v2 | …/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/… (той самий тайл 9/269/902) · `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018` | те саме | 2026-11-14 | verified | DN 102–224, stretch 113–215 → `layers/themis-day.png`; денний IR підкреслює рельєф (сонячні схили тепліші) |
| emu-sop-emergency-o2 | Аварійний запас O₂ `model.emergencyO2G` | https://ntrs.nasa.gov/citations/20140009556 · NTRS 20140009556 (EVA Hardware & Operations Overview, 2014, с. «Secondary Oxygen Package») | NASA / United Space Alliance (Moore, Marmolejo) | 2026-11-14 | assumption | Цитата: SOP «provides a minimum of 30 minutes of emergency O2». 30 хв × o2GPerS 0.2 г/с (assumption) = 360 г. Скафандр МКС, не марсіанський → assumption (#35, SPEC §7.6) |
| msl-raw-images-api | Сирі знімки Curiosity (перевірка критерію §8 №3) | https://mars.nasa.gov/api/v1/raw_image_items/?condition_1=msl:mission&condition_2={sol}:sol:gte&condition_3={sol}:sol:lte&condition_4=NAV_LEFT_B:instrument (сторінка: https://mars.nasa.gov/msl/multimedia/raw-images/) | NASA/JPL-Caltech | 2026-11-14 | verified | Інженерні камери мають `site`/`drive` = `RMC` зупинки MMGIS; `extended.sample_type = full`. Вибірка 12 солів із 2788–3571: у 12/12 є 30–58 повнокадрових Navcam на зупинках bbox. Mastcam — без site/drive. Фото й photos.geojson робить F6 (#34, #36) |
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
