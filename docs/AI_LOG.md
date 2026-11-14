# Журнал використання AI

Кожна AI-сесія — рядок у **своєму** розділі (інші розділи не чіпаємо, так PR не конфліктують). Без секретів. Цей журнал — основа розділу про AI у сабміті (F8).

Формат: `| дата | хто | агент / модель | задача | файли | перевірка | PR |`

## F0

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Олександр | Claude Code · claude-opus-5-5 | docs/SPEC.md; каркас F0 з нуля за SPEC: contracts, store, mocks, заглушки фіч, CI, guard, automerge, deploy, CONSTITUTION, AGENTS, specs | усе дерево репо, крім docs/SPEC.md (лише правки §5.3, §9, §10) | npm ci + npm run check у чистому клоні; браузер: без помилок консолі, без горизонтального скролу на 400, 1024 і 1440 px | bootstrap-коміт у main |

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

## F3

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|

## F4

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F4 T1–T7: план у spec; ядро src/core (ребра, A*, дерева вартості, planRoute); Worker + клієнт з requestId; RoutePanel (порядок цілей, профіль, таблиця відрізків, коди збою) | src/core/**, src/features/route/**, specs/F4/** | npm run check (13 файлів, 78 тестів); Edge headless 1440 і 400 px: маршрут A→C через Worker ≈100 мс, без горизонтального скролу | #18 |

## F5

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|
| 2026-11-14 | Влад | Claude Code · claude-opus-5-5 | F5 T1–T7: план у spec; ядро бюджету й ореолу (budget.ts, reachability.ts: резерв, Return in N, маска туди й назад, swap); BudgetEngine; BudgetPanel («O₂ −40%», Reset, статуси) | src/core/**, src/features/budget/**, specs/F5/** | npm run check (190 тестів разом з main); Edge headless 1440 і 400 px: 48 хв → Build route → 3 хв → O₂ −40% → дефіцит + swap → Reset, без горизонтального скролу | #22 |

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

## F8

| Дата | Хто | Агент / модель | Задача | Файли | Перевірка | PR |
|---|---|---|---|---|---|---|

