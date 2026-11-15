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
| trek-spirit-waypoints | Центр «Columbia Hills (Gusev)» для маркера глобуса (#105). У IAU Gazetteer назви немає (неофіційна назва місії MER), тож центр — середина Husband Hill і Home Plate за зупинками Spirit, той самий, що в `public/data/columbia-hills/region.json` | https://trek.nasa.gov/mars/trekarcgis/rest/services/spirit_waypoints/MapServer/0 | NASA/JPL-Caltech, Mars Trek | 2026-11-14 | verified | −14.599°, 175.528°E; planetocentric +East |
| mars-viking-mdim21-clr | Текстура глобуса `public/data/mars/mars_viking_mdim21_clr_2048.jpg` | https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m · тайли: https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml (рівень 2) | NASA Ames / USGS Astrogeology, via NASA Mars Trek | 2026-11-14 | verified | Колір художній (USGS: «artistically colorized»); 2048×1024 еквірект., lon −180…180; Use Constraints: none; sha256 у `public/data/mars/source.json` |

## F2

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| quaternius-astronaut | Модель астронавта для демо-прогулянки (`src/features/terrain/assets/astronaut.glb`): сітка й скелет | https://poly.pizza/m/3hC2i0CTuO | Quaternius (Ultimate Modular Men Pack), Public Domain (CC0) | 2026-11-15 | verified | Оригінальні кліпи моделі не використовуються; скафандр перефарбовано в білий у коді. Не модель реального скафандра NASA |
| mixamo-motion | Рух астронавта: мокап Mixamo «Walking» (Male Standard Walk), «Slow Run», «Breathing Idle», експорт для X Bot на місці, 30 fps | https://www.mixamo.com | Adobe Mixamo (безкоштовні анімації для використання в проєктах) | 2026-11-15 | verified | Перенесено на скелет Quaternius у three.js (поворот кожної кістки відносно T-пози у світових координатах; IK-ступні — у кінці гомілки); gltf-transform: resample, prune, quantize → 0,76 МБ. Сирі FBX у репо не кладемо |
| assumption-stride | Цикл ходи Mixamo «Walking» ≈ 1,6 м (два кроки), цикл «Slow Run» ≈ 2,2 м — лише для темпу анімації, щоб ступні не ковзали | — | команда | 2026-11-15 | assumption | На швидкість і ресурси не впливає: їх дає модель F4. Вище темпу бігу — прискорене відтворення (fast-forward) |
| f2-eye-height | Висота очей для POV-камери, 1.7 м | — | — | 2026-11-14 | assumption | Без джерела; на екрані підпис «Eye height 1.7 m — assumption» |

## F3

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| trek-mola-hrsc-200m-context | Кільце рельєфу 61 км довкола Gale для 3D (`context.f32`, 256² по 240 м) | https://trek.nasa.gov/mars/trekarcgis/rest/services/Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw/ImageServer | NASA/JPL/GSFC (MOLA), ESA/DLR/FU Berlin (HRSC), USGS via Mars Trek | 2026-11-14 | verified | Білінійно з 200 м; −4633…+483 м; лише огляд, не планування |
| trek-gale-dem-1m | HiRISE DEM Gale, 1 м, float32 | https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer/exportImage · `Gale_DEM_SMG_1m` | NASA/JPL Mars Trek | 2026-11-14 | verified | 14.11: bbox B (#7) 137.385072…137.428408, −4.759614…−4.716426, 2560² nearest → −4217.4…−3733.8 м, NoData 0 %. Endpoint перевірено живим запитом; ранній пробний bbox 137.400–137.422, −4.750…−4.728 → −4108…−3817 м |
| trek-hirise-mosaic | HiRISE ортомозаїка Curiosity | https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_hirise_mosaic/ImageServer/exportImage · `curiosity_hirise_mosaic` | NASA/JPL Mars Trek | 2026-11-14 | verified | `format=jpg`, U8, native ≈0.25 м; 2048² на bbox → hirise.jpg |
| mmgis-msl-traverse | Маршрут Curiosity | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json | NASA/JPL-Caltech, MSL MMGIS | 2026-11-14 | verified | Обрізка по bbox → traverse.geojson (212 ліній) |
| gale-elevation-render | `elevation_render.f32` Gale, 1024² по 2.5 м, лише для 3D | з `trek-gale-dem-1m` (той самий `dem.tif`) | NASA/JPL Mars Trek | 2026-11-14 | похідне (з verified DEM) | #101 крок 2: файл зробив Олександр (#117, `render_hd.py`, джерело `trek-gale-dem-1m-render`); `prepare.py` тепер відтворює його байт-у-байт (sha256 3a252123…): середнє валідних 1-м пікселів, зважене площею перетину (2.5 пікселя на клітинку), NoData 0, −4217.2…−3734.4 м. Планування — лише за `grid` 256² |
| trek-columbia-hills-dem-1m | HiRISE DEM Columbia Hills (Gusev), 1 м, float32 | https://trek.nasa.gov/mars/trekarcgis/rest/services/DEM_1m_ColumbiaHills/ImageServer/exportImage · `DEM_1m_ColumbiaHills` | NASA/JPL Mars Trek | 2026-11-14 | verified | #101 крок 4: bbox 175.50568…175.55031, −14.620704…−14.577516 (2.56 км), 2560² nearest (нативно 1.7e-5° ≈ 1.01 м) → −1944.3…−1833.6 м, NoData 0.66 % (смуга по східному краю зйомки) |
| trek-spirit-waypoints | Точки Spirit: Husband Hill, Home Plate та ін. | https://trek.nasa.gov/mars/trekarcgis/rest/services/spirit_waypoints/MapServer/0/query · `spirit_waypoints` | NASA/JPL-Caltech, Mars Trek | 2026-11-14 | verified | Центр району — середина Husband Hill (175.52469, −14.59210) і Home Plate (175.53130, −14.60612). У bbox 6 точок; з бази по схилу ≤ 25° досяжні 5 (Husband Hill — ні: у клітинці 27°) |
| trek-spirit-path | Маршрут Spirit | https://trek.nasa.gov/mars/trekarcgis/rest/services/spirit_path/MapServer/0/query · `spirit_path` | NASA/JPL-Caltech, Mars Trek | 2026-11-14 | verified | Лише lon/lat; обрізка по bbox → traverse.geojson (1 лінія, 432 точки), висота — з elevation.f32 (середнє клітинки 10 м) |
| hillshade-from-dem | Texture Columbia Hills — hillshade з DEM | з `trek-columbia-hills-dem-1m` | команда | 2026-11-14 | assumption | HiRISE-ортомозаїки Gusev у Trek немає. Hillshade (сонце 315° / 45°, Horn 3×3 на 1 м) → 2048² PNG (сірий). Це затінення рельєфу, не фото |
| columbia-hills-elevation-render | `elevation_render.f32` Columbia Hills, 1024² по 2.5 м | з `trek-columbia-hills-dem-1m` | NASA/JPL Mars Trek | 2026-11-14 | похідне (з verified DEM) | Як у Gale: середнє валідних 1-м пікселів, зважене площею; NoData 0.64 % |
| hazard-from-slope | Hazard як похідна від схилу | — | команда | 2026-11-14 | assumption | min(1, slope/25) × 0.5; тестові коефіцієнти; F5 прийняв як `assumption-hazard` (`## F5`) |
| base-assumption | База (хабітат) | — | команда | 2026-11-14 | assumption | прохідна клітинка, найближча до центру bbox (центроїд цілей F6); не реальне місце хабітату |
| model-assumption | Коефіцієнти моделі без джерела в region.json (`uphillFactor`, `downhillFactor`, `maxSlopeDeg`, `hazardWeight`, `reserveFraction`, `energyWhPerM`, `doseUSvPerS`) | SPEC §7.3–7.4 | команда | 2026-11-14 | assumption | Значення SPEC; деталі — `## F5` (assumption-*) |
| trek-themis-night-ir | THEMIS IR Night, controlled mosaic 100 м v2 (Mars Odyssey) | https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/9/269/902.png · `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018` | NASA/JPL-Caltech/Arizona State University, Mars Odyssey THEMIS; Mars Trek | 2026-11-14 | verified | Каталог Trek `searchItems` (instrument THEMIS) → WMTS PNG, рівень 9 (≈81 м/пікс.), 1 тайл; на bbox ~32×31 нативних пікселів, nearest на клітинку 10 м. 8-біт яскравість, не температура; DN 135–255, stretch p2–p98 156–255 → `layers/themis-night.png`. Нічний IR показує різницю теплової інерції (опис продукту Trek). Лише відображення, не вхід hazard |
| trek-themis-day-ir | THEMIS IR Day, controlled mosaic 100 м v2 | …/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/… (той самий тайл 9/269/902) · `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018` | те саме | 2026-11-14 | verified | DN 102–224, stretch 113–215 → `layers/themis-day.png`; денний IR підкреслює рельєф (сонячні схили тепліші) |
| jones-apollo-walk | `model.o2GPerS = 0.031` г/с, `model.speedMps = 1.0` м/с у region.json | див. `## F5` (той самий id) | E. M. Jones, ALSJ | 2026-11-14 | assumption | Apollo, Moon; transferred to Mars (1/6 g → 0.38 g), рев'ю #63. Рішення #20. Раніше в F3 було `o2GPerS = 0.2` (mock) |
| emu-sop-30min | `model.emergencyO2G = 1800 с × 0.031 г/с = 55.8 ≈ 56 г` у region.json | див. `## F5` (той самий id) | NASA | 2026-11-14 | assumption | 30 хв SOP — цитата verified (`## F5`), але 0.031 г/с — Apollo, перенесено на Mars, тож грами — assumption (рев'ю #7). Замінює `emu-sop-emergency-o2` (360 г при 0.2 г/с), рішення #20 |
| limit-time-assumption | `limits.time = 3600 с`, `limitsEvidence.time` | SPEC §7.4 | команда | 2026-11-14 | assumption | Довідково: EMU — до 7 год виходу (emu-sop-30min) |
| limit-o2-assumption | `limits.o2 = 140 г`, `limitsEvidence.o2` | #20 (фінально, xand0dev 14:11), #64 | команда | 2026-11-14 | assumption | Година ходьби з витратою Apollo після резерву 20 %: 0.031 × 3600 ≈ 112 г, 112 / 0.8 = 140 г |
| limit-energy-assumption | `limits.energy = 600 Wh`, `limitsEvidence.energy` | — | команда | 2026-11-14 | assumption | У SPEC не задано |
| limit-dose-assumption | `limits.dose = null`, `limitsEvidence.dose` | SPEC §7.6 | команда | 2026-11-14 | assumption | Невідомо → null → статус incomplete |
| msl-raw-images-api | Сирі знімки Curiosity (перевірка критерію §8 №3) | https://mars.nasa.gov/api/v1/raw_image_items/?condition_1=msl:mission&condition_2={sol}:sol:gte&condition_3={sol}:sol:lte&condition_4=NAV_LEFT_B:instrument (сторінка: https://mars.nasa.gov/msl/multimedia/raw-images/) | NASA/JPL-Caltech | 2026-11-14 | verified | Інженерні камери мають `site`/`drive` = `RMC` зупинки MMGIS; `extended.sample_type = full`. Вибірка 12 солів із 2788–3571: у 12/12 є 30–58 повнокадрових Navcam на зупинках bbox. Mastcam — без site/drive. Фото й photos.geojson робить F6 (#34, #36) |
| mmgis-msl-waypoints | 1388 зупинок і поточна позиція Curiosity | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json, …/MSL_waypoints_current.json | NASA/JPL-Caltech | 2026-11-14 | verified | Використано для вибору bbox (#7: 211 зупинок, sol 2788–3571) і перевірки §8 №3 (site/drive). Поточна позиція 13.11: sol 5070, −4.8257, 137.3892 |
| trek-mola-hrsc-200m-context (Columbia Hills) | Кільце рельєфу 61 км довкола Columbia Hills (`context.f32`, 256² по 240 м), `pipeline/render_context.py --region columbia-hills` | https://trek.nasa.gov/mars/trekarcgis/rest/services/Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw/ImageServer | NASA/JPL/GSFC (MOLA), ESA/DLR/FU Berlin (HRSC), USGS via Mars Trek | 2026-11-15 | verified | Bbox 174.992439…176.063551, −15.117375…−14.080845; білінійно з 200 м; NoData 0 %; −2118…−1531 м; лише 3D, не планування (#113) |
| trek-mola-hrsc-200m | Рельєф overview Olympus Mons і Valles Marineris (`elevation.f32` 256² по 2400 м, `elevation_render.f32` 512² по 1200 м) | `Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw/ImageServer/exportImage`, 1024² білінійно | NASA/JPL/GSFC (MOLA), ESA/DLR/FU Berlin (HRSC), USGS via Mars Trek | 2026-11-15 | verified | Квадрат 614 км з центром IAU. Olympus: −2542…+21210 м (вершина ≈ 21,2 км — збігається з MOLA); Valles (Coprates): −5781…+6357 м; NoData 0 %. Схил на 600 м — derived (assumption) |
| trek-viking-mdim21-color | Колір overview (`texture.jpg` 2048², ≈ 300 м/пікс.) | `Mars_Viking_MDIM21_ClrMosaic_global_232m/ImageServer/exportImage`, `compressionQuality=80` | NASA/JPL (Viking), USGS Astrogeology (MDIM 2.1, колоризація) via Mars Trek | 2026-11-15 | verified | Колір художній (колоризація USGS), не справжній; лише відображення |

### NASA data for the Space Apps form (EN, 15.11)
Готова таблиця для поля «NASA data» у формі й для `docs/submission/SUBMISSION.md` (F8). Тут лише дані, які реально завантажені в пакети `public/data/*` (статус `verified` у рядках вище). Фото Curiosity — `## F6`, глобус Viking — `## F1`.

| Dataset | Mission / instrument | Where in MARS::404 | Source (NASA Mars Trek unless noted) | Credit | Licence / terms |
|---|---|---|---|---|---|
| Gale DEM 1 m (`Gale_DEM_SMG_1m`) | MRO HiRISE stereo | Gale EVA site: terrain, slope, walkability, route planning, 3D mesh (2.5 m) | https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer | NASA/JPL/University of Arizona, NASA Mars Trek | NASA media usage guidelines¹ |
| HiRISE orthomosaic of the Curiosity area (`curiosity_hirise_mosaic`) | MRO HiRISE | Gale: optical layer and 3D texture (4096²) | https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_hirise_mosaic/ImageServer | NASA/JPL/University of Arizona, NASA Mars Trek | NASA media usage guidelines¹ |
| Curiosity traverse (`MSL_traverse.json`) and waypoints | MSL Curiosity | Gale: rover path layer; choice of the site box (211 rover stops) | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json | NASA/JPL-Caltech, MSL MMGIS | NASA media usage guidelines¹ |
| Columbia Hills DEM 1 m (`DEM_1m_ColumbiaHills`) | MRO HiRISE stereo | Columbia Hills EVA site: terrain, slope, walkability, route planning, 3D mesh; hillshade texture is computed from it | https://trek.nasa.gov/mars/trekarcgis/rest/services/DEM_1m_ColumbiaHills/ImageServer | NASA/JPL/University of Arizona, NASA Mars Trek | NASA media usage guidelines¹ |
| Spirit traverse and waypoints (`spirit_path`, `spirit_waypoints`) | MER Spirit | Columbia Hills: rover path layer, site centre (Husband Hill – Home Plate), base check | https://trek.nasa.gov/mars/trekarcgis/rest/services/spirit_path/MapServer, …/spirit_waypoints/MapServer | NASA/JPL-Caltech, NASA Mars Trek | NASA media usage guidelines¹ |
| THEMIS IR day and night, controlled mosaics 100 m v2 | Mars Odyssey THEMIS | Gale and Columbia Hills: thermal layers (display only, not used for hazard) | https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/, …/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/ | NASA/JPL-Caltech/Arizona State University | NASA media usage guidelines¹ |
| MOLA + HRSC blended DEM 200 m v2 | MGS MOLA (NASA) + Mars Express HRSC (ESA) | 61 km terrain ring around Gale and Columbia Hills (3D only); Olympus Mons and Valles Marineris overview terrain | https://trek.nasa.gov/mars/trekarcgis/rest/services/Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw/ImageServer; record: https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m | NASA/GSFC (MOLA), ESA/DLR/FU Berlin (HRSC), USGS Astrogeology | **MOLA: CC0; HRSC: CC BY-SA 3.0 IGO**² — credit ESA/DLR/FU Berlin; derived files (`context.f32`, overview `elevation*.f32`) carry the same terms |
| Viking MDIM 2.1 colorized global mosaic 232 m | Viking Orbiters | Olympus Mons and Valles Marineris overview texture (artistic colour) | https://trek.nasa.gov/mars/trekarcgis/rest/services/Mars_Viking_MDIM21_ClrMosaic_global_232m/ImageServer; record: https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m | NASA/JPL (Viking), USGS Astrogeology | Public domain, use constraints: none² |

¹ Trek ImageServer / MapServer не мають `copyrightText` (перевірено 15.11 запитом `?f=json` до кожного сервісу). Тому діє загальне правило NASA (https://www.nasa.gov/nasa-brand-center/images-and-media/, перевірено 15.11): NASA content, «including texture maps and polygon data in any format», «generally are not subject to copyright in the United States»; без натяку на схвалення NASA.
² Записи USGS Astropedia, поля «Access Constraints» / «Use Constraints», перевірено 15.11. Для MOLA + HRSC: «MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)», «Please cite authors».

Short form for the «NASA data» field:
> Terrain and imagery from NASA Mars Trek: HiRISE 1 m elevation models of Gale crater (Curiosity) and the Columbia Hills (Spirit), the HiRISE orthomosaic of the Curiosity area, THEMIS day and night infrared mosaics (Mars Odyssey), the MOLA + HRSC 200 m global elevation model and the Viking MDIM 2.1 colour mosaic. Rover traverses and stops from NASA/JPL-Caltech (MSL MMGIS, Mars Trek Spirit layers) and Curiosity raw images. All data is cropped and resampled offline by our reproducible pipeline; every layer in the app shows its source and resolution.

## F4

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|

## F5

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| nasa-bvad-rev2 | Life Support Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570/REV2 | https://ntrs.nasa.gov/citations/20210024855 | NASA (Ewert, Chen, Powell, 2022) | 2026-11-14 | pending | Повний текст не звірено; довідкове джерело для життєзабезпечення |
| nasa-o2-daily | «Metabolic oxygen consumption: 0.49–1.25 kg/person-day, 0.84 kg/person-day average» | https://ntrs.nasa.gov/api/citations/20120015343/downloads/20120015343.pdf | NASA | 2026-11-14 | verified | Добова норма в спокої ≈0.0097 г/с — нижня межа для перевірки `o2GPerS` |
| jones-apollo-walk | Apollo: «Oxygen use was about 0.16 lb/hr per 1000 BTU/hr»; «1290 BTU/hr while walking at 2.7 km/hr, and 1560 BTU/hr at 3.5 km/hr»; аварійне повернення — «3.6 km/hr for periods of up to an hour, and 2.5 km/hr for longer» | https://www.osti.gov/servlets/purl/7168757 (E. M. Jones, «Working on the Moon: The Apollo Experience», LA-UR-89-3858) | E. M. Jones (Apollo Lunar Surface Journal) | 2026-11-14 | assumption | **`o2GPerS` ≈ 0.031 г/с** (1560 × 0.16 / 1000 = 0.25 lb/год ≈ 113 г/год при 3.5 км/год); **`speedMps` = 1.0 м/с** (3.6 км/год до 1 год). цитати звірено, але це Apollo на Місяці (1/6 g), перенесено на Марс (0.38 g) — assumption (рев'ю #63, #70) |
| apollo-eva-metabolic | «average lunar EVA metabolic rate of 234 kcal/hr» | https://ntrs.nasa.gov/citations/19910001262 (T. P. Moore, «U.S. Space Flight Experience: Physical Exertion and Metabolic Demand of EVA») | NASA | 2026-11-14 | verified | Перевірка: 234 kcal/год ÷ 5 kcal/л × 1.429 г/л ≈ 0.019 г/с — середнє за весь вихід, разом зі стоянками; ходьба — 0.031 (рядок вище) |
| nasa-o2-kcal | «approximately 5 kcal of energy must be liberated to consume 1 liter of oxygen» | https://ntrs.nasa.gov/api/citations/20120003917/downloads/20120003917.pdf | NASA | 2026-11-14 | verified | Коефіцієнт для перерахунку рядка вище |
| emu-sop-30min | EMU: «Secondary Oxygen Package (SOP) — Provides a minimum of 30 minutes of emergency O2 in open-loop purge mode»; ресурс виходу 7 год, з них «30 minutes for reserve» | https://ntrs.nasa.gov/api/citations/20140009556/downloads/20140009556.pdf | NASA | 2026-11-14 | verified | `emergencyO2G = 1800 с × o2GPerS`: при 0.031 г/с ≈ 56 г (mock 360 г = 1800 × 0.2) |
| assumption-slope-factors | `uphillFactor = 2`, `downhillFactor = 0.5` | — | — | — | assumption | Еталонне ребро SPEC §7.3; джерела немає |
| assumption-max-slope | `maxSlopeDeg = 25` | — | — | — | assumption | На пакеті F3 блокує 27 % клітинок, маршрути будуються (#8) |
| assumption-hazard | `hazardWeight = 0.5`, hazard = `min(1, slope/25) × 0.5` (F3) | — | — | — | assumption | Впливає лише на вибір маршруту, не на час і O₂ (#8) |
| assumption-reserve | `reserveFraction = 0.2` | — | — | — | assumption | SPEC §7.4 |
| assumption-energy | `energyWhPerM = 0.05`, `limits.energy = 600 Wh` | — | — | — | assumption | У SPEC не задано |
| assumption-limits | `limits.time = 3600 с`, `limits.o2 = 140 г` (`region.json`) | — | — | — | assumption | Рішення #20, SPEC §7.6: 140 г = година ходьби з витратою Apollo після резерву 20 % (0.031 × 3600 / 0.8). 720 г — лише mock-фікстура тестів SPEC §7.4. Довідково: EMU — до 7 год виходу (emu-sop-30min) |

## F6

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| msl-raw-images | 8 локальних Left Navcam фото з точних rover stops | https://mars.nasa.gov/api/v1/raw_image_items/?condition_1=msl:mission · raw IDs `886246`, `894938`, `908724`, `920315`, `928696`, `948930`, `955046`, `958556` | NASA/JPL-Caltech | 2026-11-14 | verified | `site`+`drive` збігаються з MMGIS RMC; `is_thumbnail=false`; фото показують вид із зупинки, не точне місце каменя |
| msl-blog-nontron-quadrant | Nontron quadrant, локальна варіативність і рух до sulfate unit | https://science.nasa.gov/blog/sols-3010-3012-bonjour-nontron-mars/ | NASA Science · Ashley Stroupe/JPL | 2026-11-14 | verified | Rover stop: sol 3008, RMC `85_1072`; координати з `mmgis-msl-waypoints` |
| msl-blog-brantome | Brantôme, перехід clay-bearing → sulfate-bearing strata | https://science.nasa.gov/blog/sol-3027-a-new-hope/ | NASA Science · Abigail Fraeman/JPL | 2026-11-14 | verified | Rover stop: sol 3025, RMC `86_480`; координати з `mmgis-msl-waypoints` |
| msl-blog-nontron-drill | Nontron drill, глини й минула придатність середовища | https://science.nasa.gov/blog/sol-3056-3057-perched-on-top/ | NASA Science · Susanne Schwenzer | 2026-11-14 | verified | Rover stop: sol 3052, RMC `87_792`; координати з `mmgis-msl-waypoints` |
| msl-blog-mont-mercou | Верх Mont Mercou, хімія, мінералогія й осадові структури | https://science.nasa.gov/blog/sol-3088-3089-a-beautiful-view-from-the-top-of-mont-mercou/ | NASA Science · Lauren Edgar/USGS | 2026-11-14 | verified | Rover stop: sol 3086, RMC `87_2536`; координати з `mmgis-msl-waypoints` |
| msl-blog-gourdon | Gourdon, жили, свіжий злам і tiger-stripe textures | https://science.nasa.gov/blog/sols-3112-3114-always-a-silver-lining/ | NASA Science · Catherine O’Connell-Cooper | 2026-11-14 | verified | Rover stop: sol 3110, RMC `87_2902`; координати з `mmgis-msl-waypoints` |
| msl-blog-gardonne | Gardonne, склад bedrock біля наступної drill campaign | https://science.nasa.gov/blog/sols-3163-3164-preparing-for-our-next-drill-campaign/ | NASA Science · Ashley Stroupe/JPL | 2026-11-14 | verified | Rover stop: sol 3161, RMC `89_1862`; координати з `mmgis-msl-waypoints` |
| msl-blog-linear-ridge | Chalagnac/Chauffour, хімія й текстури low linear ridge | https://science.nasa.gov/blog/sols-3187-3189-examining-a-linear-ridge/ | NASA Science · Ken Herkenhoff/USGS | 2026-11-14 | verified | Rover stop: sol 3185, RMC `89_2380`; координати з `mmgis-msl-waypoints` |
| msl-blog-champeaux | Champeaux, nodular bedrock у clay-to-sulfate transition | https://science.nasa.gov/blog/sols-3192-3193-whimsical-rock-textures/ | NASA Science · Abigail Fraeman/JPL | 2026-11-14 | verified | Rover stop: sol 3192, RMC `90_232`; координати з `mmgis-msl-waypoints` |
| trek-spirit-husband-hill | Husband Hill: Summit of the tallest of the Columbia Hills | https://trek.nasa.gov/mars/jpl/assets/features/spirit/husband_hill.html | NASA/JPL-Caltech, Mars Trek | 2026-11-15 | verified | Ціль Columbia Hills; координати — Trek `spirit_waypoints` (-14.5920973, 175.5246892 E); опис цілі переказано зі сторінки |
| trek-spirit-pot-of-gold | Pot of Gold: Hematite-bearing rock on the climb into the hills | https://trek.nasa.gov/mars/jpl/assets/features/spirit/pot_of_gold.html | NASA/JPL-Caltech, Mars Trek | 2026-11-15 | verified | Ціль Columbia Hills; координати — Trek `spirit_waypoints` (-14.5889568, 175.5157239 E); опис цілі переказано зі сторінки |
| trek-spirit-comanche | Comanche Outcrop: Carbonate-rich outcrop | https://trek.nasa.gov/mars/jpl/assets/features/spirit/comanche.html | NASA/JPL-Caltech, Mars Trek | 2026-11-15 | verified | Ціль Columbia Hills; координати — Trek `spirit_waypoints` (-14.5940046, 175.5287452 E); опис цілі переказано зі сторінки |
| trek-spirit-home-plate | Home Plate: Layered plateau that may come from a hydrovolcanic explosion | https://trek.nasa.gov/mars/jpl/assets/features/spirit/home_plate.html | NASA/JPL-Caltech, Mars Trek | 2026-11-15 | verified | Ціль Columbia Hills; координати — Trek `spirit_waypoints` (-14.60612, 175.5312971 E); опис цілі переказано зі сторінки |
| trek-spirit-silica-valley | Silica Valley: Bright silica-rich soil under the dark surface | https://trek.nasa.gov/mars/jpl/assets/features/spirit/silica_valley.html | NASA/JPL-Caltech, Mars Trek | 2026-11-15 | verified | Ціль Columbia Hills; координати — Trek `spirit_waypoints` (-14.60651, 175.5322396 E); опис цілі переказано зі сторінки |
| trek-spirit-troy | Troy: Soft soil at the western edge of Home Plate where Spirit got | https://trek.nasa.gov/mars/jpl/assets/features/spirit/troy.html | NASA/JPL-Caltech, Mars Trek | 2026-11-15 | verified | Ціль Columbia Hills; координати — Trek `spirit_waypoints` (-14.6059948, 175.5307387 E); опис цілі переказано зі сторінки |
| iau-gazetteer-2071 | Центр Gale для preview-картки | https://planetarynames.wr.usgs.gov/Feature/2071 | IAU WGPSN / USGS Astrogeology | 2026-11-15 | verified | Центр −5.44°, 137.70°E; planetocentric +East |
| nasa-gale-cradled | Gale, Mount Sharp, relief і орбітальне preview-фото | https://science.nasa.gov/resource/curiosity-cradled-by-gale-crater/ | NASA/JPL-Caltech/ESA/DLR/FU Berlin/MSSS | 2026-11-15 | verified | Mount Sharp ~5.5 км над дном; фото кадровано до 1200×750 без домальовування |
| trek-spirit-waypoints | Центр Columbia Hills для preview-картки | https://trek.nasa.gov/mars/trekarcgis/rest/services/spirit_waypoints/MapServer/0 | NASA/JPL-Caltech, Mars Trek | 2026-11-15 | verified | Середина Husband Hill і Home Plate: −14.59911°, 175.527995°E |
| nasa-husband-hill-top | Spirit, Husband Hill, Pancam і preview-панорама | https://science.nasa.gov/photojournal/top-of-the-world/ | NASA/JPL-Caltech/Cornell | 2026-11-15 | verified | PIA04181; фото кадровано до 1200×750 без домальовування |
| iau-gazetteer-4453 | Центр Olympus Mons для preview-картки | https://planetarynames.wr.usgs.gov/Feature/4453 | IAU WGPSN / USGS Astrogeology | 2026-11-15 | verified | Центр 18.40°, 226.00°E; planetocentric +East |
| nasa-olympus-viking | Висота, основа, кальдера і Viking preview-фото Olympus Mons | https://science.nasa.gov/resource/viking-1-orbiter-image-olympus-mons/ | NASA/JPL-Caltech/USGS | 2026-11-15 | verified | 27 км заввишки, >600 км в основі, кальдера ~3 км × 25 км; фото 1200×750 |
| iau-gazetteer-6288 | Центр Valles Marineris для preview-картки | https://planetarynames.wr.usgs.gov/Feature/6288 | IAU WGPSN / USGS Astrogeology | 2026-11-15 | verified | Центр −13.74°, 300.80°E; planetocentric +East |
| nasa-valles-viking | Довжина, глибина і Viking preview-фото Valles Marineris | https://science.nasa.gov/photojournal/valles-marineris/ | NASA/JPL/USGS | 2026-11-15 | verified | PIA00422; >3000 км, середня глибина 8 км; фото 1200×750 |
| iau-gazetteer-14300 | Центр Jezero для preview-картки | https://planetarynames.wr.usgs.gov/Feature/14300 | IAU WGPSN / USGS Astrogeology | 2026-11-15 | verified | Центр 18.41°, 77.69°E; planetocentric +East |
| jpl-jezero-ellipse | Дельта, landing ellipse і preview-фото Jezero | https://www.jpl.nasa.gov/images/pia24350-perseverance-rover-landing-ellipse-in-jezero-crater/ | ESA/DLR/FU-Berlin/NASA/JPL-Caltech | 2026-11-15 | verified | PIA24350; ellipse 7.7 × 6.6 км; фото 1200×750 |
| iau-gazetteer-3854 | Центр Meridiani Planum для preview-картки | https://planetarynames.wr.usgs.gov/Feature/3854 | IAU WGPSN / USGS Astrogeology | 2026-11-15 | verified | Центр 0.20°, 357.50°E; planetocentric +East |
| nasa-meridiani-water | Opportunity, hematite, layered sandstone і preview-фото | https://science.nasa.gov/resource/meridiani-planum-2/ | NASA/JPL-Caltech/Arizona State University | 2026-11-15 | verified | До 20% гематиту на поверхні; фото кадровано до 1200×750 |
| photojournal-pia02055 | Фото Home Plate для цілі Columbia Hills: шаруваті породи, Spirit Pancam, sol 774 | https://photojournal.jpl.nasa.gov/catalog/PIA02055 | NASA/JPL-Caltech/Cornell | 2026-11-15 | verified | Майже true color; JPEG 1021×1024, 200 КБ, без змін; вид з краю Home Plate, не точна точка цілі |
| photojournal-pia13175 | Фото Comanche для цілі Columbia Hills: карбонатне відслонення, Spirit Pancam, sol 689 | https://photojournal.jpl.nasa.gov/catalog/PIA13175 | NASA/JPL-Caltech/Cornell University | 2026-11-15 | verified | False color (753/535/432 нм); JPEG 907×678, 114 КБ, без змін |
| photojournal-pia12473 | Фото Troy для цілі Columbia Hills: колії Spirit у м'якому піску, Navcam, sol 2092 | https://photojournal.jpl.nasa.gov/catalog/PIA12473 | NASA/JPL-Caltech | 2026-11-15 | verified | Grayscale; JPEG 1024×1024, 251 КБ, без змін; фото з місця, де ровер застряг |

## F7

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|

## F8

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
