# F3 — Дані й шари

Власник: Максим (@kingsneverdie17) · гілка `feat/F3` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Нові задачі (14.11): Abort map + «View from here»
План — #25, правила — `docs/SPEC.md` §7.8–7.9 (PR #24). До мержу contract-PR (#26, сб 16:00) — на mocks. Тести з AC → red → код → green.

| Задача | AC / правило | Issue | Залежить від |
|---|---|---|---|
| `DataLoader`: `region.files.photos` → `setRegionData({ …, photos })`, поза сіткою — відкинути з попередженням | F3-AC5, §6.0 | #35 | #26, #34 |
| `region.json`: `model.emergencyO2G` з `evidence` (без джерела — `assumption`) | F3-AC5, §7.6 | #35 | #26, #31 |
| Перевірити, що демо-цілі в ореолі (≈19.5 % реальної сітки) і є одна ближня для заміни | §12 | #35 | F6 цілі |

## Мета й обсяг
Pipeline у Docker вивантажує bbox (§8), рахує схил, walkable і hazard, валідує й пише `public/data/gale/`. `DataLoader` вантажить пакет і викликає `setRegionData`. `LayersPanel` перемикає шари й показує легенду та походження.

## Дозволені шляхи
`pipeline/**` (крім `pipeline/globe`), `public/data/gale/**` (крім `targets*`, `photos/`), `src/features/data/**`; плюс `specs/F3/**`, розділ `## F3` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: site, layers, region
- Пише: `setRegionData`, `toggleLayer`

## Acceptance criteria
- **F3-AC1. Given** обрано bbox; **When** `docker run … prepare` запущено двічі; **Then** файли в `public/data/gale/` мають однакові sha256, а TS-тест перевіряє схему `region.json`, розміри файлів (`w×h×4` / `w×h`) і те, що NoData = `NaN` + `walkable = 0`.
- **F3-AC2. Given** пакет Gale; **When** відкрито район; **Then** `grid` у store — реальна сітка (не mock), статус «verified», а висоти лежать у діапазоні, який повертає `exportImage` для bbox.
- **F3-AC3. Given** панель шарів; **When** перемикаються terrain, optical, thermal, slope, traverse (мишею чи клавіатурою); **Then** кожен шар має легенду з текстом, одиниці й рядок походження (product ID/URL, нативна й цільова роздільність, метод, credit).
- **F3-AC4. Given** файл шару відсутній або має інший розмір сітки; **When** вантажиться район; **Then** видно помилку саме цього шару, решта UI працює, а битий шар не потрапляє в `grid`. Якщо бита сама сітка — лишається mock з бейджем.

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## Звірка з contracts (T1, 14.11)
- `Region.files` має `elevation`, `slope`, `walkable`, `hazard`, `texture`, `targets`, `traverse?`. Окремого файлу для thermal немає, тому thermal-шар — це лише `layers[].url` (PNG-накладка, не вхід hazard).
- `LayerKind` = terrain | optical | thermal | slope | mission. Траверс — шар з `id: 'traverse'`, `kind: 'mission'`, `url` = `files.traverse`.
- Окремого поля для формули hazard немає. Тому `hazard.f32` рахує pipeline, а формулу й коефіцієнти пишемо в `Source` з `id: 'hazard-from-slope'` (`status: 'assumption'`). Contract-PR не потрібен.
- `Region` вимагає `model`, `limits`, `base`. До джерел від Влада (§7.6) і рішення про базу з Настею беремо значення з `src/mocks`, а статус — `assumption`/`mock` у `sources`.
- Помилки окремих шарів (AC4) — локальний стан F3, store не потрібен. Якщо бита сама сітка, `setRegionData` не викликаємо: у store лишається `mockGrid`, а в панелі видно `MockBadge`.
- NoData перевіряємо через `isNoDataValue` (є `region.noData` і `|h| ≥ 3e38`), URL файлів — через `dataUrl('gale/' + шлях)`. Шляхи у `files.*` і `layers[].url` — без префікса `gale/`.
- Перемикачі шарів — `<button aria-pressed>` (запит F7 в #7), висота ≥40 px, легенда текстом.
- Розбіжність: `source.json` (§8) не входить у contracts. Це артефакт pipeline для AC1 і AC2, frontend його не читає.

## План / задачі
Порядок пріоритетів: пакет даних у `main` до сб 14:00 (ним користуються F2, F4, F5, F6), далі UI до 21:00.

- [x] T1 Звірити spec із `src/contracts`, `src/store`, `src/mocks` і заглушками `src/features/data` (розділ вище).
- [x] T2 Bbox (до 14:00). Скрипт `pipeline/probe.py` перевіряє кандидата біля Curiosity і план Б за критеріями §8: скінченні висоти з `exportImage`, NoData <5%, ≥5 зупинок MMGIS усередині. Фото перевіряємо разом із Настею. Рішення й числа записуємо сюди і в `docs/SOURCES.md`.
  - **Рішення 14.11, змінено о 13:20 (#7, варіант B, підтвердив @xand0dev):** квадрат 2.56 км з центром у центроїді 8 цілей F6 (lon 137.40674, lat −4.73802), bbox 137.385072…137.428408, −4.759614…−4.716426; містить bbox SPEC §12. NoData 0 %, висоти −4217…−3734 м, 211 зупинок (sol 2788–3571), усі 8 цілей F6 на сітці. Від бази досяжно 52 295 клітинок і 7 з 8 цілей: клітинка `nontron-drill` має схил 29.7° > 25°.
  - Критерій §8 №3 (фото) перевірено 14.11 через raw images API: 12 солів рівномірно з 2788–3571, Navcam `NAV_LEFT_B`/`NAV_RIGHT_B`, `sample_type = full`, збіг `site`/`drive` із зупинками MMGIS у bbox — 12/12 солів, 30–58 кадрів на сол. `region.files.photos = 'photos/photos.geojson'` (файл робить F6; немає файла → `photos = []` і попередження).
  - Перший варіант (відхилено, бо цілі F6 поза сіткою): квадрат 2.56 км навколо Curiosity (sol 5073, lon 137.388886, lat −4.82602331), bbox 137.367215…137.410557, −4.847618…−4.804429. `probe.py` на сітці 256×256: NoData 0 %, висоти −3655…−3189 м, 104 зупинки (sol 4605–5073). План Б (137.400–137.422, −4.750…−4.728) теж проходить: NoData 0 %, 56 зупинок. Фото з повного кадру підтверджує Настя.
- [x] T3 Тести AC1 (red): TS-тест читає `public/data/gale` і перевіряє схему `region.json`, розміри (`w×h×4` / `w×h`), NoData = `NaN` + `walkable = 0`, sha256 із `source.json`.
- [x] T4 Pipeline: `fetch` (мережа, один раз, сирі файли в кеш) → `prepare` (офлайн, детермінований): висоти — mean до сітки ≤256×256 ≤10 м; схил на нативному 1 м → max; walkable; hazard = f(схил) (assumption); текстура HiRISE; THEMIS PNG; траверс з MMGIS у bbox; `region.json`, `source.json`, sha256. Два запуски → однакові sha256 (AC1 green). Dockerfile.
  - Зроблено 14.11. Thermal додано окремим кроком: THEMIS IR Night і Day (Trek WMTS, controlled mosaic 100 м v2, рівень 9, 1 тайл ≈ 32×31 нативних пікселів на bbox) → `layers/themis-{night,day}.png` 256², stretch p2–p98; шари `thermal` (ніч) і `thermal-day`. Bbox B — схил max з 1 м: медіана 13.3°, p95 38.4°, 18 % клітинок > 25°; від бази при `maxSlopeDeg = 25` досяжно 52 295 з 65 536 клітинок. Docker 29.9.3, 14.11: `docker run … prepare` двічі → однакові SHA256SUMS; пакет у репо — з Docker (локальний Python дає ті самі пікселі PNG, але інше стиснення zlib).
- [x] T5 Тести AC2 і AC4 → `DataLoader`: вантажить пакет, перевіряє сітку й кожен шар окремо, `targets.geojson` → `lonLatToXY`, `setRegionData` лише для актуального `site`. Бита сітка → mock з бейджем.
- [x] T6 Тести AC3 → `LayersPanel`: 5 шарів (terrain, optical, thermal, slope, traverse), `aria-pressed` → `toggleLayer`, легенда текстом, одиниці, походження (product ID/URL, нативна й цільова роздільність, метод, credit), статус словом.
  - 14.11: `loadRegion.ts` (чиста функція) + `DataLoader` + локальний `dataStatus`. Бита висота чи walkable → mock із причиною; битий slope/hazard → NaN (клітинки заблоковані) і помилка шару; бита накладка, текстура чи траверс → лише помилка шару. Відсутній `targets.geojson` (F6 ще не додала) → `targets = []` і попередження. Vite і SPA-fallback віддають `index.html` зі статусом 200 → `httpGet` вважає це відсутнім файлом.
  - AC5 (#35): `photos.geojson` парситься (`lonLatToXY`, поза сіткою — попередження) і передається в `setRegionData`; store прийме `photos` після contract-PR #26 (до того — локальний тип `LoadedPhoto` з TODO). `model.emergencyO2G = 360` з evidence (NTRS 20140009556, assumption). Перевірку «демо-цілі в ореолі» можна зробити лише після `targets.geojson` від F6.
- [x] T7 `npm run check`, браузер 400 px і десктоп, скриншоти, таблиця AC → доказ у PR, рядок у `docs/AI_LOG.md`, джерела в `docs/SOURCES.md`.

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| Docker і GDAL локально не встановлені — як запускати pipeline для AC1? | Максим | сб 12:00 | `exportImage` у сирому форматі (bip/bsq, перевірити) читається без GDAL; Docker — для відтворюваності |
| Bbox навколо Curiosity: NoData <5% і ≥5 зупинок з фото? | Максим, Настя | сб 14:00 | перевірений bbox 137.400–137.422 / −4.750…−4.728 |
| База (хабітат) у bbox | Максим, Настя | сб 14:00 | центр прохідної клітинки, assumption |
| Коефіцієнти hazard від схилу | Максим, Влад | сб 21:00 | малі коефіцієнти, assumption на екрані |

## Перевірка в браузері (14.11)
Edge через Playwright, dev-сервер, 1440×900 і 400×860. Відкрито Gale → «Real grid 256×256 · 10 m/cell · verified», 6 шарів; Thermal IR night вмикається мишею (`aria-pressed=true`), Slope — Enter і пробіл; кнопки 40 px; на 400 px немає горизонтального скролу. У консолі лише очікувані попередження «No targets/photos file yet».
- `screenshots/f3-desktop-gale.png` — реальний рельєф, ореол, blocked.
- `screenshots/f3-desktop-top-thermal-traverse.png` — THEMIS night + траверс, вид Top.
- `screenshots/f3-mobile400-layers-panel.png` — панель шарів на 400 px.
