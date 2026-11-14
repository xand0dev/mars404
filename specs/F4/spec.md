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

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| Ручний порядок (`setWaypoints`) губиться при наступному `toggleTarget`: store перераховує `waypoints` з `selectedTargetIds` | Влад → @xand0dev | сб 21:00 | Порядок у UI змінюється лише стрілками; у README фічі — відоме обмеження |
| Джерела `speedMps`, `o2GPerS` (NASA BVAD / EVA), `maxSlopeDeg` — assumption (SPEC §7.6) | Влад | сб 21:00 | Позначка «assumption» на екрані |
