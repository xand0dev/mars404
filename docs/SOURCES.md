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
| trek-gale-dem-1m | HiRISE DEM Gale, 1 м, float32 | https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer/exportImage · `Gale_DEM_SMG_1m` | NASA/JPL Mars Trek | 2026-11-14 | verified | 14.11: bbox B (#7) 137.385072…137.428408, −4.759614…−4.716426, 2560² nearest → −4217.4…−3733.8 м, NoData 0 %. Endpoint перевірено живим запитом; ранній пробний bbox 137.400–137.422, −4.750…−4.728 → −4108…−3817 м |
| trek-hirise-mosaic | HiRISE ортомозаїка Curiosity | https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_hirise_mosaic/ImageServer/exportImage · `curiosity_hirise_mosaic` | NASA/JPL Mars Trek | 2026-11-14 | verified | `format=jpg`, U8, native ≈0.25 м; 2048² на bbox → hirise.jpg |
| mmgis-msl-traverse | Маршрут Curiosity | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json | NASA/JPL-Caltech, MSL MMGIS | 2026-11-14 | verified | Обрізка по bbox → traverse.geojson (212 ліній) |
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

## F7

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|

## F8

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
