# F4 — Маршрут A*

Власник: Влад (@froozy3) · гілка `feat/F4` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Нові задачі (14.11): Abort map + «View from here»
План — #25, правила — `docs/SPEC.md` §7.8–7.9 (PR #24). До мержу contract-PR (#26, сб 16:00) — на mocks. Тести з AC → red → код → green.

| Задача | AC / правило | Issue | Залежить від |
|---|---|---|---|
| «View from here»: найближчий знімок до середини відрізка, поріг 300 м, запасний варіант — фото цілей, чесний підпис | F4-AC6, §7.9 | #30 | #26 (`photos`); до того — фото цілей |
| Позначка «no return» у таблиці відрізків (іконка + текст) | F4-AC6, §7.8 | #30 | #26, #29 |

## Мета й обсяг
Ядро `src/core` (ребра, вартість, A*, дерева) за §7.3; Worker; `RoutePanel` з кнопкою «Build route», порядком цілей, профілем висоти й таблицею відрізків.

## Дозволені шляхи
`src/features/route/**`, `src/core/**`; плюс `specs/F4/**`, розділ `## F4` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: grid, model, limits, waypoints, base, position, plan
- Пише: `setPlan`, `setWaypoints`, `setSelectedSegment`

## Acceptance criteria
- **F4-AC1. Given** контрольна сітка з проходом і заблокованою стіною та 2 цілі; **When** «Build route»; **Then** шлях іде база → цілі в заданому порядку → база, без blocked, NoData, зрізаних кутів і ребер зі схилом > `maxSlopeDeg`.
- **F4-AC2. Given** короткий крутий підйом і довший пологий обхід; **When** будується маршрут; **Then** обрано шлях з меншою модельною вартістю, і зворотний шлях може відрізнятися від прямого.
- **F4-AC3. Given** ціль поза сіткою, на blocked, в ізольованій області або нога без шляху; **When** «Build route»; **Then** видно код причини з номером точки або ноги, `plan.status ≠ 'ok'`, і старий маршрут не показано як чинний.
- **F4-AC4. Given** маршрут; **When** обрано відрізок у профілі або таблиці; **Then** `setSelectedSegment(i)`, і видно dist, slope, time, O₂, energy та dose з одиницями (dose `null` → «no data»).
- **F4-AC5. Given** сітка 256×256 і 2 цілі; **When** «Build route»; **Then** результат є за ≤2 с, UI не блокується (статус «pending»), а застарілі відповіді Worker відкинуто.

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## План / задачі
Звірка (T1): spec ↔ SPEC §7.3 ↔ `src/contracts` узгоджені; `RoutePlan`, `Segment`, `RouteFailure` (pointIndex 0 = position, 1…n = цілі, n+1 = база) покривають усі AC без змін контракту. Заглушка `RoutePanel` лише показує кількість точок.

Ядро в `src/core` спільне з F5, тому F4 мерджиться першим — F5 бере з нього ребра й дерева.

| # | Задача | Файли | AC |
|---|---|---|---|
| T1 | Звірка spec ↔ contracts ↔ заглушка, план | `specs/F4/spec.md` | — |
| T2 | Ребро: 8 сусідів у фіксованому порядку, без зрізання кутів, `dist/slope/time/cost`, заборона `|slope| > maxSlopeDeg`; `validateModel` (спільний з F5) | `src/core/edge.ts`, `model.ts` | AC1, `REFERENCE_EDGE` |
| T3 | A*: бінарна купа, евристика `horiz/speed`, tie-break `g` → індекс, без random | `src/core/astar.ts` | AC1, AC2 |
| T4 | Дерева найменшої вартості (Dijkstra) прямі/зворотні з накопиченням time/o2/energy/dose — для ореолу F5 | `src/core/cost-tree.ts` | основа F5-AC2 |
| T5 | `planRoute`: position → цілі за `waypoints` → base; сегменти, `legs`, `totals`, dose `null` → сума `null`; коди збою з номером точки/ноги | `src/core/plan-route.ts` | AC1, AC3 |
| T6 | Worker + хук: новий `requestId`, `status: 'pending'`, застарілі відповіді відкидаються; без Worker (jsdom) — синхронний fallback; замір 256×256 ≤2 с у тесті | `src/features/route/route.worker.ts`, `useRoutePlanner.ts` | AC5 |
| T7 | `RoutePanel`: «Build route», порядок цілей (↑/↓ → `setWaypoints`), автоперебудова після першого Build, текст збою з кодом, профіль висоти (SVG), таблиця відрізків з одиницями, вибір → `setSelectedSegment` | `src/features/route/*` | AC3, AC4 |
| T8 | `npm run check`, браузер 400 px + десктоп, draft PR (AC → доказ), рядок AI_LOG | — | усі |

**Статус (сб):** T1–T7 зроблено, T8 — draft PR. `no-path-leg` на практиці не виникає: дозволені ребра симетричні, тож ізольовану точку ловить `disconnected`; код лишено як запобіжник. Замір 256×256: ~45 мс у тесті, ~100 мс у браузері через Worker.

Тестові сітки для AC1/AC2 (стіна, крутий підйом vs пологий обхід, ізольована область) будуються в тестах, `src/mocks` не змінюється.

### «View from here» (#30, F4-AC6, SPEC §7.9)
- **F4-AC6. Given** план і обраний відрізок; **When** найближчий знімок до середини відрізка ближче 300 м; **Then** видно знімок з чесним підписом (sol, ~відстань, тип місця, credit, посилання на джерело) і `alt`; далі 300 м — текст «No surface photo within 300 m»; файл не завантажився — заглушка з `alt`. Відрізки з `abort.segments[i].ok = false` — іконка й текст «no return» у таблиці (після #26 і #29).

**Звідки знімки (NASA, офлайн).** Завантажують F6 (#34) і Іван (#36), F4 лише показує. Перевірено 14.11:

| Що | Посилання | Що беремо |
|---|---|---|
| Сирі знімки Curiosity (JSON API) | `https://mars.nasa.gov/api/v1/raw_image_items/?order=sol%20desc&condition_1=msl:mission&condition_2=3008:sol:gte&condition_3=3010:sol:lte&search=NAV_LEFT_B` | `sol`, `site`, `drive`, `instrument`, `https_url` (JPG) — 436 кадрів за sol 3008–3010 |
| Зупинки Curiosity (MMGIS) | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json | `site`, `drive`, `sol`, lon/lat зупинки |
| Галерея для людей | https://mars.nasa.gov/msl/multimedia/raw-images/ | `sourceUrl` у підписі |

**Алгоритм.**
1. Підготовка (F6 / Іван): кадр Navcam → зупинка з тими самими `site` + `drive` → координати зупинки (`locationAccuracy: 'rover-stop'`, це не місце кадру) → фільтр за bbox району → JPG у `public/data/gale/photos/` → `photos.geojson`.
2. Показ (F4): середина обраного відрізка `(from + to) / 2` → кандидати: `photos`, а поки їх немає — `targets[].photo` з `targets[].coordinates` → горизонтальна відстань у метрах → найближчий; ≤300 м («assumption») — знімок, інакше текст.

| # | Задача | Файли | AC |
|---|---|---|---|
| V1 | Тести пошуку: середина відрізка, найближчий, рівно 300 м — так, далі — ні, без кандидатів — `null`, цілі без фото пропускаються → red | `src/features/route/surface-photo.test.ts` | AC6 |
| V2 | `findNearestPhoto` + кандидати з фото цілей | `src/features/route/surface-photo.ts` | AC6 |
| V3 | Тести й компонент `ViewFromHere` у `RoutePanel`: знімок з підписом і посиланням, текст «No surface photo within 300 m», заглушка з `alt` при помилці завантаження | `src/features/route/ViewFromHere.tsx` | AC6 |
| V4 | Після #26: кандидати з `photos` (`SurfacePhoto`) з пріоритетом над фото цілей; після #29 — «no return» у таблиці | `surface-photo.ts`, `SegmentTable.tsx` | AC6 |
| V5 | `npm run check`, браузер 400 px + десктоп, AI_LOG, PR | — | AC6 |

**Статус:** V1–V3 — #39; V4 і «no return» у таблиці — зроблено (кандидати з `photos`, позначки з `reach.abort`). Справжні знімки Navcam з'являться з `photos.geojson` (#34, #36).

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| Ручний порядок (`setWaypoints`) губиться при наступному `toggleTarget`: store перераховує `waypoints` з `selectedTargetIds` | Влад → @xand0dev | сб 21:00 | Порядок у UI змінюється лише стрілками; у README фічі — відоме обмеження |
| Джерела `speedMps`, `o2GPerS` (NASA BVAD / EVA), `maxSlopeDeg` — assumption (SPEC §7.6) | Влад | сб 21:00 | Позначка «assumption» на екрані |
