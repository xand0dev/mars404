# F2 — 3D-рельєф і 2D-план

Власник: Олександр (@xand0dev) · гілка `feat/F2` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Мета й обсяг
`MapView`: єдиний Canvas, рельєф із `grid`, текстура HiRISE, накладки шарів, цілі, маршрут, підсвітка відрізка, ореол; камери «Orbit», «Top», «POV»; 2D-план Б.

## Дозволені шляхи
`src/features/terrain/**`; плюс `specs/F2/**`, розділ `## F2` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: site, grid, region, layers, targets, selectedTargetIds, plan, selectedSegment, reach, base, position
- Пише: —

## Acceptance criteria
- **F2-AC1. Given** `site = 'gale'` і сітка; **When** відкрито рельєф; **Then** вершини, маркери цілей і маршрут беруть висоту з тієї самої сітки за `(x, h×3, −y)`, а на екрані видно розмір сітки, м/клітинку, «height ×3» і статус даних (verified / MOCK).
- **F2-AC2. Given** сітка з `walkable = 0`, `NaN` і сирим `noData`; **When** відкрито 3D або 2D; **Then** жодна з цих клітинок не має кольору прохідної поверхні чи ореолу, а 2D показує лічильник «Blocked / NoData cells».
- **F2-AC3. Given** є маршрут і `selectedSegment = i`; **When** перемальовано; **Then** відрізок `i` підсвічено окремо на висоті поверхні, а при `null` підсвітки немає. F2 нічого не пише в store.
- **F2-AC4. Given** WebGL недоступний, контекст втрачено або сітка невалідна; **When** відкрито Gale; **Then** видно причину і 2D-план з blocked, цілями й маршрутом.
- **F2-AC5. Given** 3D з увімкненими шарами на ноутбуці демо; **When** зроблено 60-секундний замір; **Then** у PR записано пристрій, браузер, роздільність і медіанний FPS ≥30 (або чесно «не пройдено»).

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## Звірка з contracts і кодом (T1, 2026-11-14)
- Усе потрібне для AC1–AC4 у `src/contracts` і `useMission` уже є: `grid`, `region` (`noData`, `status`, `files.texture`, `layers`), `targets`, `selectedTargetIds`, `plan.path/segments`, `selectedSegment`, `reach.mask`, `base`, `position`; ядро `toR3F`, `cellCenter`, `xyToCell`, `isBlocked`, `isNoDataValue`, `validateGrid`, `dataUrl`, `lonLatToXY`. Issue `contract` поки не потрібен.
- `mockGrid` 128×128 по 10 м: стіна (col 90), NoData (3,3) з `walkable = 0`, «підступна» NaN (4,4) з `walkable = 1`. Сирого `noData` у mock немає, а `region = null` → для AC2 тести будують власну фікстуру з `region.noData`.
- `CameraModes` і `MapView` монтуються в `src/app` як сусіди → режим камери — маленький локальний стан у `src/features/terrain` (не в `useMission`).
- `App.test` шукає регіони «Mars globe» / «Gale terrain» — заголовки Panel лишаються.
- Поріг схилу для `isBlocked`: `region?.model.maxSlopeDeg`, до завантаження — `mockModel.maxSlopeDeg` (обидва в межах дозволених читань §9).
- `files.texture` — шлях відносно папки регіону → `dataUrl(\`${region.id}/${files.texture}\`)`.

## План / задачі
Кожна задача: тест з AC (red) → код → green. Логіка — чисті функції в `src/features/terrain/lib/*`, тести поруч; R3F-компоненти лише споживають їх.

| # | Задача | AC | Файли (у `terrain/`) | До |
|---|---|---|---|---|
| T1 | Звірка spec ↔ contracts/код, план (цей розділ) | — | `specs/F2/spec.md` | ✅ |
| T2 | **Маска клітинок**: `classifyCells(grid, { noData, maxSlopeDeg })` → `Uint8Array` (walkable / blocked / nodata) + лічильник; `walkable = 0`, NaN, ±Inf, сирий `noData`, `\|h\| ≥ 3e38`, схил > max → не прохідні | AC2 | `lib/cells.ts` | сб 14:00 · ✅ код, тест |
| T3 | **Геометрія рельєфу**: `buildTerrainGeometry(grid, noData)` → positions (вершина = центр клітинки через `toR3F`), indices, uv; NoData-вершини отримують висоту сусідів лише для форми (без NaN у буфері), числа на екрані — справжні метри; `surfaceHeight(grid, xy)` → `number \| null` (той самий шлях для цілей і маршруту) | AC1 | `lib/geometry.ts` | сб 14:00 · ✅ код, тест |
| T4 | **Кольори/накладка**: RGBA-текстура по клітинці (NearestFilter): колір за висотою або прозоро під HiRISE; blocked/NoData — окремий колір; ореол `reach.mask` лише на прохідних клітинках; невідповідна довжина маски → без ореолу + попередження | AC2 | `lib/overlay.ts` | сб 14:00 · ✅ код, тест |
| T5 | **Сцена рельєфу** в `MapView`: меш з T3 + накладка T4, текстура `region.files.texture` через `dataUrl()` (без неї — колір за висотою), освітлення, `Redraw` на зміну grid/region; підпис: `W×H`, `N m/cell`, «height ×3», статус verified / MOCK / assumption | AC1, AC2 | `MapView.tsx`, `TerrainScene.tsx`, `TerrainInfo.tsx` | сб 14:00 · ✅ мок; HiRISE — чекає F3 |
| T6 | **Цілі, база, позиція, маршрут**: точки → `toR3F(xy, surfaceHeight)`; `plan.path` — лінія над поверхнею; `plan.segments[selectedSegment]` — окрема лінія іншого кольору й товщини; `null` → без підсвітки; обрані цілі виділено; невідома висота — підпис «elev. unknown», не 0 | AC1, AC3 | `lib/geometry.ts` (`surfacePoint`), `TerrainScene.tsx`, `Label3D.tsx` | сб 21:00 · ✅ |
| T7 | **Камери** Orbit / Top / POV: локальний стан режиму (`cameraStore.ts`), кнопки `aria-pressed`, клавіатура, вимкнені на глобусі; кадрування за межами сітки; POV — з `position ?? base` на висоті очей (assumption, підписано); прибрати рядок «// F2: контроль automerge…» | — | `CameraModes.tsx`, `cameraStore.ts`, `lib/camera.ts`, `TerrainScene.tsx` | сб 21:00 · ✅ |
| T8 | **2D-план Б** (SVG): `planReason()` → `no-webgl` / `context-lost` / `invalid-grid` (`validateGrid`) з текстом; blocked/NoData одним path, ореол, цілі з підписами, маршрут, підсвічений відрізок, лічильник «Blocked / NoData cells: N»; масштаб під 400 px | AC2, AC4 | `lib/plan2d.ts`, `Plan2D.tsx` | сб 21:00 · ✅ |
| T9 | **Шари**: увімкнені в `layers` растри `region.layers[].url` — накладки на рельєф (3D) і `<image>` у 2D, з підписом статусу шару | — (AC5 «з шарами») | `TerrainScene.tsx` (`LayerOverlay`), `Plan2D.tsx`, `useRegionTexture.ts` | сб 21:00 · ✅ код; перевірка — з шарами F3 |
| T10 | **Реальна сітка**: інтеграційний тест — після `setRegionData` той самий код бере нову сітку/регіон (розмір, статус, noData), бейдж MOCK зникає лише при `region.status ≠ 'mock'` | AC1 | `MapView.test.tsx` | сб 21:00 · ✅ тест |
| T11 | **«F2 нічого не пише»**: тест-шпигун на всі дії store під час рендеру 3D/2D і перемикання камер | AC3 | `MapView.test.tsx` | сб 21:00 · ✅ тест |
| T12 | **Траверс марсохода**: `region.files.traverse` (geojson LineString `[lon, lat, elev]`) → `lonLatToXY` → пунктирна лінія на поверхні в 3D і 2D; висоту з файлу не беремо (та сама сітка, що й рельєф); точки поза сіткою розривають лінію з попередженням; помилка завантаження — попередження, без лінії; якщо F3 оголосив шар `traverse` — за його перемикачем, інакше видно, коли є файл; geojson-шари не вантажимо як растр | — | `lib/traverse.ts`, `useTraverse.ts`, `TerrainScene.tsx`, `Plan2D.tsx`, `TerrainInfo.tsx` | нд 12:00 · ✅ код, тест; реальний файл — чекає F3 |
| T13 | **FPS-замір**: `?fps` вмикає лічильник кадрів (60 с після прогріву, медіана) з шарами; у PR: пристрій, браузер, роздільність, медіана | AC5 | `FpsProbe.tsx` | нд 12:00 · ✅ проба; замір — нд |
| T14 | `npm run check`, перегляд 400 px і десктоп, скриншоти, таблиця AC → доказ, draft PR, рядок у `## F2` AI_LOG | усі | — | сб 21:00 / нд 12:00 · 🔄 draft PR |

### Рішення під час реалізації (2026-11-14)
- `surfaceHeight` став `surfacePoint(grid, heights, noData, xy, lift)`: позиція на формі меша + справжня висота або `null` («elev. unknown»).
- Підписи в 3D — спрайти з canvas-текстурою (`Label3D`), не drei `Html`: `Html` створює React-root на кожен підпис і сипле помилки в консоль при перемонтуванні.
- Ореол — верхня накладка лише на прохідних клітинках; blocked/NoData малюються поверх усього (і поверх HiRISE та шарів). Колір насичений блакитний `[0, 190, 255]`: усередині напівпрозорий (α 150), на краю зони — непрозорий контур (`haloCells`, спільна для 3D і 2D). Перевірено на ореолі F5 з `main`: попередній варіант (α 110, `[64, 196, 255]`) поверх ґрунту виглядав сірим.
- Підсвічений відрізок — маджента (`#ff3df2`), поверх рельєфу (без depth test); у легенді «Route» і «Selected segment».
- Відрізок F4 — один крок сітки (~10–14 м), на карті 1.3 км майже непомітний. Тому поруч маркер (`lib/segment.ts`): у 3D — кільце на поверхні, маяк вищий за маркери цілей і підпис «Segment N · leg K» (нумерація як у таблиці F4); у 2D — кільце й підпис над ним у межах плану. Формат `segments` не змінюється.
- У 2D-плані камери вимкнені з підписом «Camera modes need 3D» (локальний стан `view3D` у `cameraStore`).
- `?fps` перемикає Canvas на `frameloop="always"` лише на час заміру; без параметра — `demand` (SPEC §7.5).
- На вузькому полотні (400 px) Orbit/Top відходять далі за пропорцією полотна, щоб район влазив.
- Траверс: статус у легенді — зі шару `traverse` у `region.layers`, інакше `region.status`; растрові накладки — лише `.png/.jpg/.webp` (`isRasterUrl`).
- Тест «F2 нічого не пише» відновлює справжні дії store після себе (`resetMission` повертає лише дані).
- Сумісність з F1 (#19): F1 рахує масштаб глобуса з `camera.position` під час рендеру. Тому F2 повертає камеру на позу глобуса (`applyGlobeCamera`) в `GlobeStage` до рендеру глобуса, а не в ефекті після нього. Без цього після «Back to globe» масштаб брався з камери рельєфу (на 400 px глобус ставав на ~35 % більшим).
- План Б для демо (SPEC §12, низький FPS): `?2d` в адресі вмикає 2D-план на Gale навіть з робочим WebGL (глобус лишається 3D). Справжні причини (невалідна сітка, втрата контексту, немає WebGL) показуються першими; для `?2d` підпис інформаційний, без «3D unavailable».
- Слухач `webglcontextlost` живе всередині Canvas (`ContextLossWatcher`) і знімається при розмонтуванні: коли F2 сам прибирає Canvas, браузер теж шле цю подію, і раніше вона залипала як «context lost» (3D не повертався після виправлення сітки).
- Глобус без WebGL лишає обгортку `role="img"` «2D plan B» (на неї спирається `App.test`).

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| `files.texture` покриває рівно `boundsLonLat` сітки й орієнтована північчю вгору? | Максим (F3) | сб 14:00 | Вважаємо так; без текстури — колір за висотою |
| Шляхи у `files.*` / `layers[].url` — відносно `public/data/gale/` чи вже з `gale/`? | Максим (F3) | сб 14:00 | `dataUrl(\`${region.id}/${path}\`)`, якщо шлях не починається з `region.id/` |
| Висота очей для POV (~1.7 м) | Олександр | сб 21:00 | Константа з позначкою «assumption» на екрані (зроблено; рядок у SOURCES) |
| Ціль/точка маршруту на NoData-клітинці | F4/F6 | сб 21:00 | Маркер з «elev. unknown», висота не підставляється нулем (зроблено) |
| Чи буде `traverse` шаром у `region.layers` (і з яким `url`)? | Максим (F3) | сб 21:00 | Без шару — лінія видна, коли є `files.traverse` |
| FPS-замір AC5 на ноутбуці демо | Олександр | нд 12:00 | `?fps`, 60 с після 5 с прогріву, медіана на екрані → у PR |
