# Журнал використання AI

Кожна AI-сесія — рядок у **своєму** розділі (інші розділи не чіпаємо, так PR не конфліктують). Без секретів. Цей журнал — основа розділу про AI у сабміті (F8).

Формат: `| дата | хто | агент / модель | задача | файли | перевірка | PR |`

## F0

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | docs/SPEC.md; каркас F0 з нуля за SPEC: contracts, store, mocks, заглушки фіч, CI, guard, automerge, deploy, CONSTITUTION, AGENTS, specs | усе дерево репо, крім docs/SPEC.md (лише правки §5.3, §9, §10) | npm ci + npm run check у чистому клоні; браузер: без помилок консолі, без горизонтального скролу на 400, 1024 і 1440 px | bootstrap-коміт у main |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | Contract #26: emergencyO2G, AbortPlan, SurfacePhoto, photos у store; evaluateGoNoGo (§7.10), EVA-символіка (§7.11) у SPEC | src/contracts/*, src/store/*, src/mocks/*, src/core/abort.ts, src/core/reachability.ts, тести F2/F7 (поле abort), docs/SPEC.md | npm run check: 361 тест, lint, typecheck, build | contract/abort-photos-gonogo |

## F1

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Іван | Claude Code / Claude Opus 5.5 | T0–T5: звірка spec, latLonToSphere, точки IAU Gazetteer, SitePanel, перехід до Gale (Skip / reduced motion) | `src/features/globe/**`, `specs/F1/**`, `docs/SOURCES.md` §F1 | `npm run check` зелений (75/75); Chrome headless 1440 px і 400 px, reduced motion | #19 (draft) |
| 2026-11-14 | Іван | Claude Code / Claude Opus 5.5 | T7: маркери на глобусі, drag-обертання, масштаб під 400 px, завантаження текстури з fallback MOCK, спільна дія chooseSite | `src/features/globe/**`, `specs/F1/**` | `npm run check` зелений (96/96); Chrome headless 1440/400 px, звірка маркерів з тестовою еквірект. сіткою | #19 (draft) |
| 2026-11-14 | Іван | Claude Code / Claude Opus 5.5 | T6: текстура глобуса — Viking MDIM 2.1 colorized (NASA Ames / USGS) з Mars Trek WMTS, 2048×1024, скрипт pipeline/globe | `pipeline/globe/**`, `public/data/mars/**`, `docs/SOURCES.md` §F1, `specs/F1/**` | `npm run check` зелений (96/96); Chrome headless: маркер Olympus Mons у кальдері, Gale в центрі перед переходом, 400 px | #19 (draft) |
| 2026-11-14 | Іван | Claude Code / Claude Opus 5.5 | Маркери зворотного боку й біля краю диска сховано (facesCamera), клік по схованому ігнорується | `src/features/globe/**`, `specs/F1/**` | `npm run check` зелений (100/100); Chrome headless: з-за краю сфери маркери не стирчать | #19 (draft) |

## F2

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2 T1–T11, T13: звірка spec, план; рельєф з grid через toR3F, маска blocked/NoData, ореол, цілі, маршрут і підсвітка відрізка, камери Orbit/Top/POV, 2D-план Б з причиною, FPS-проба `?fps` | src/features/terrain/**, specs/F2/** | npm run check зелений (тести terrain: чисті функції + MapView у jsdom); браузер: десктоп і 400 px, 3D і 2D (втрата контексту), без помилок консолі, без горизонтального скролу | draft PR feat/F2 |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2 T12: траверс марсохода з region.files.traverse (lonLatToXY, на поверхні, 3D і 2D); geojson-шари не вантажаться як растр; тест «нічого не пише» відновлює дії store | src/features/terrain/**, specs/F2/** | npm run check зелений; браузер: регіон-фікстура з підміненим fetch — пунктир у 3D (Top) і 2D, попередження про точку поза сіткою, без помилок консолі | draft PR #15 |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2: перевірка сумісності з F4 (#18, локальне злиття, коментар у PR); помітний маркер вибраного відрізка в 3D і 2D | src/features/terrain/**, specs/F2/** | npm run check зелений; F2+F4 разом: 141 тест, маршрут F4 на рельєфі; браузер: маркер у 3D (Orbit) і 2D, без помилок консолі | draft PR #15 |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2: перевірка сумісності з F1 (#19, локальне злиття); виправлення: камера глобуса скидається до рендеру глобуса (масштаб F1 після «Back to globe») | src/features/terrain/**, specs/F2/** | npm run check зелений; F2+F1 разом: 166 тестів; браузер 400 px: масштаб глобуса 0.7403 до й після двох кіл Gale ↔ globe, touch-action pan-y, без помилок консолі | draft PR #15 |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2: звірка F8 (#13) з F2; примусовий 2D-план `?2d` для плану Б; виправлення: власне розмонтування Canvas більше не позначається як втрата контексту | src/features/terrain/**, specs/F2/** | npm run check зелений; браузер: `?2d` → 2D з інфо-підписом, глобус 3D; без `?2d` справжня втрата контексту → 2D; невалідна сітка → валідна повертає 3D; без помилок консолі | draft PR #15 |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2: звірка F5 (#22, уже в main) з F2; влито main (F1, F4, F5); ореол насиченіший, з контуром краю в 3D і 2D | src/features/terrain/**, specs/F2/** | npm run check зелений (з main); браузер: справжній ореол F5 до й після «O₂ −40%» у 3D і `?2d`, без помилок консолі | draft PR #15 |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2: перевірка з пакетом F3 (#23, локальне злиття); лінії й маркери над накладкою ореолу/blocked; шари slope/terrain із сітки за legend; «not drawn» у легенді | src/features/terrain/**, specs/F2/** | npm run check зелений; браузер з реальним Gale 256×256: траверс над ореолом, slope у 3D (Top) і `?2d`, без помилок консолі | draft PR #15 |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2-AC6 (#27): червоні відрізки без повернення з `reach.abort` (SPEC §7.8) у 3D і 2D, легенда «⛔ No return with emergency O₂ (N g, assumption)»; до contract-PR #26 — локальний тип за SPEC §6 | src/features/terrain/**, specs/F2/** | npm run check зелений; браузер: маршрут F4 + тестовий abort — червоні серії в 3D (Top) і `?2d`, без помилок консолі | draft PR feat/F2-abort |
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | F2-AC6: перехід на `AbortPlan` з контракту (#43), «assumption» з `model.evidence.emergencyO2G` | src/features/terrain/**, specs/F2/** | npm run check зелений (з main); браузер: тестовий abort — червоні відрізки й легенда | PR #38 |

## F3

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|

## F4

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F4 T1–T7: план у spec; ядро src/core (ребра, A*, дерева вартості, planRoute); Worker + клієнт з requestId; RoutePanel (порядок цілей, профіль, таблиця відрізків, коди збою) | src/core/**, src/features/route/**, specs/F4/** | npm run check (13 файлів, 78 тестів); Edge headless 1440 і 400 px: маршрут A→C через Worker ≈100 мс, без горизонтального скролу | #18 |
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F4 #30 «View from here» (F4-AC6, §7.9): найближчий знімок до середини відрізка (поки — фото цілей), поріг 300 м (assumption), підпис sol / відстань / credit / джерело, заглушка з alt; у spec — джерела NASA (raw images API, MMGIS) і алгоритм | src/features/route/**, specs/F4/** | npm run check (282 тести); Chromium headless 1440 і 400 px: Build route → Segment 3 → «No surface photo within 300 m» (у mock-цілей немає фото), без горизонтального скролу | — |
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F4 #30 V4 + «no return»: кандидати «View from here» з `photos` (rover stop, камера, пріоритет над фото цілей), підпис «Navcam, sol N, taken ~D m … (rover stop)»; у таблиці відрізків ⛔ «no return» з `reach.abort` (іконка + текст + aria-label), у деталях відрізка — «no return with emergency O₂ (model)» | src/features/route/** | npm run check; Chromium 1440 і 400 px: A + C → 143 з 216 відрізків «no return», після «O₂ −40%» — 203, без горизонтального скролу й помилок; знімки з photos — лише тестами (photos.geojson ще немає) | — |

## F5

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F5 T1–T7: план у spec; ядро бюджету й ореолу (budget.ts, reachability.ts: резерв, Return in N, маска туди й назад, swap); BudgetEngine; BudgetPanel («O₂ −40%», Reset, статуси) | src/core/**, src/features/budget/**, specs/F5/** | npm run check (190 тестів разом з main); Edge headless 1440 і 400 px: 48 хв → Build route → 3 хв → O₂ −40% → дефіцит + swap → Reset, без горизонтального скролу | #22 |
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F5 #9 (зауваги Олі): дефіцит у BudgetPanel — `role="status"` (єдиний alert — у HUD), назва «O₂» замість ключа `o2` | src/features/budget/** | npm run check (274 тести); Chromium headless 1440 і 400 px: Gale → цілі C, D, E → Build route → O₂ −40% → «Deficit: time, O₂», 0 `role="alert"`, без горизонтального скролу, без помилок у консолі | — |
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F5 #29 A1–A3 (F5-AC5, §7.8): `assessAbort` у ядрі — накопичена витрата + дорога назад зі зворотного дерева, аварійний запас O₂, точка неповернення; до мержу #26 — локальний тип і `emergencyO2G` параметром | src/core/abort.ts, src/core/index.ts, specs/F5/** | npm run check (335 тестів); еталон §7.8 (100 г / 500 с → ok, 1400 с → ні), «O₂ −40%» не покращує жоден відрізок; UI ще немає — браузер не перевіряв | — |
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F5 #32: BudgetPanel на компонентах F7 — `Gauge` з резервом, плановою витратою й позначкою дефіциту, `formatMinutes`, рівні `pending` / `deficit`; без обраного місця «Return in — min», у дефіциті «0 min» — як у HUD (#9 п.3) | src/features/budget/** | npm run check (325 тестів); Chromium headless 1440 і 400 px разом з HUD: глобус «—» = «—», план 3 = 3 хв, дефіцит — 1 alert (HUD), 2 шкали з дефіцитом, без горизонтального скролу й помилок | — |
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F5 #29 A4–A5 (F5-AC5): `assessReach` пише `reach.abort` (`assessAbort` на тому ж зворотному дереві, запас з `model.emergencyO2G`); без чинного плану й при invalid — `null` | src/core/reachability.ts, src/core/reachability.test.ts, src/features/budget/BudgetPanel.test.tsx | npm run check (369 тестів); BudgetEngine публікує abort, «O₂ −40%» не покращує; Chromium 1440 і 400 px — сценарій бюджету без змін і помилок (abort на екрані покажуть F2 #38 і F7 #33) | — |

## F6

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|

## F7

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Оля | Claude Code | T1–T5: план у spec, стан HUD (`hudState`), `Hud` (Return in N, статус, Elapsed, заміна цілі), формат «—», іконки рівнів, токени й сітка | `src/ui/**`, `src/features/hud/**`, `specs/F7/**` | `npm run check` зелений (63 тести); Playwright: 400/768/1024/1440 без гор. скролу, Tab-фокус 3 px | #17 |
| 2026-11-14 | Оля | Claude Code | T7: `Gauge` — резерв, план, дефіцит (§7.4), «no data» для null/NaN; `gaugeLevel` | `src/ui/**`, `specs/F7/**` | `npm run check` зелений (70 тестів); скриншот шкал у Chromium 400 px | #17 |
| 2026-11-14 | Оля | Claude Code | За відгуком F5 (issue #9): `Gauge` бере дефіцит з пропа `deficit` (з `reach.deficits`), без власного розрахунку й `alert`; HUD показує `reach.warnings` | `src/ui/**`, `src/features/hud/**`, `specs/F7/**` | `npm run check` зелений (72 тести) | #17 |
| 2026-11-14 | Оля | Claude Code | Аудит доступності панелей (F7-AC2); прогін F7-AC1…AC5 у браузері на dev-сервері зі станами `reach`; правка текстів HUD | `specs/F7/**`, `src/features/hud/**` | `npm run check` зелений (72 тести); Playwright: усі 5 AC пройдено | #17 |
| 2026-11-14 | Оля | Claude Code | HUD: рядок витрат чинного плану «Plan N s · N g O₂» (як на концепт-сторінці команди) | `src/features/hud/**` | `npm run check` зелений (74 тести); Chromium 400/1440 px без гор. скролу | #17 |
| 2026-11-14 | Оля | Claude Code | Злиття `main` (F1, F4, F5) у `feat/F7`; наскрізна перевірка HUD на справжньому `reach` (Build route → 30 хв, +600 с → 20, O₂ −40% → 10, дефіцит); прибрано дублі попереджень F5 у HUD | `src/features/hud/**` | `npm run check` зелений (237 тестів); Playwright 400/1440: N у HUD = N у BudgetPanel, без помилок консолі | #17 |

## F8

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|

