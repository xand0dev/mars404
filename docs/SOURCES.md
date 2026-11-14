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

## F2

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|

## F3

| id | Що | URL / product ID | Credit | Доступ | Статус | Примітка |
|---|---|---|---|---|---|---|
| trek-gale-dem-1m | HiRISE DEM Gale, 1 м, float32 | https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer/exportImage · `Gale_DEM_SMG_1m` | NASA/JPL Mars Trek | 2026-11-14 | verified | 14.11: bbox навколо Curiosity 137.367215…137.410557, −4.847618…−4.804429, 2560² nearest → −3654.7…−3186.4 м, NoData 0 %. Раніше: | Endpoint перевірено живим запитом; bbox 137.400–137.422, −4.750…−4.728 → −4108…−3817 м |
| trek-hirise-mosaic | HiRISE ортомозаїка Curiosity | https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_hirise_mosaic/ImageServer/exportImage · `curiosity_hirise_mosaic` | NASA/JPL Mars Trek | 2026-11-14 | verified | `format=jpg`, U8, native ≈0.25 м; 2048² на bbox → hirise.jpg |
| mmgis-msl-traverse | Маршрут Curiosity | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json | NASA/JPL-Caltech, MSL MMGIS | 2026-11-14 | verified | Обрізка по bbox → traverse.geojson (103 лінії, 826 точок) |
| mmgis-msl-current | Поточна позиція Curiosity | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints_current.json | NASA/JPL-Caltech, MSL MMGIS | 2026-11-14 | verified | sol 5073, lon 137.388886, lat −4.82602331 — центр bbox |
| hazard-from-slope | Hazard як похідна від схилу | — | команда | 2026-11-14 | assumption | min(1, slope/25) × 0.5; тестові коефіцієнти, погодити з Владом |
| base-assumption | База (хабітат) | — | команда | 2026-11-14 | assumption | прохідна клітинка, найближча до Curiosity; погодити з Настею |
| model-assumption | Модель ходи й ліміти в region.json | SPEC §7.3–7.4 | команда | 2026-11-14 | assumption | значення з src/mocks; джерела — Влад (F4/F5) |
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
