# F5 — Бюджет і повернення

Власник: Влад (@froozy3) · гілка `feat/F5` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Нові задачі (14.11): Abort map + «View from here»
План — #25, правила — `docs/SPEC.md` §7.8–7.9 (PR #24). До мержу contract-PR (#26, сб 16:00) — на mocks. Тести з AC → red → код → green.

| Задача | AC / правило | Issue | Залежить від |
|---|---|---|---|
| `reach.abort` у ядрі й `BudgetEngine`: `segments`, `pointOfNoReturnS`, еталон §7.8 | F5-AC5, §7.8 | #29 | #26 |
| Джерела `emergencyO2G`, швидкості й O₂ (EMU, NASA BVAD) → `docs/SOURCES.md`, значення для F3 | §7.6 | #31 | до сб 21:00 |
| `BudgetPanel` на `Gauge` / `StatusNote` / `formatMinutes` від F7 | #9 | #32 | мерж #17 |

## Мета й обсяг
`BudgetEngine` (headless) за §7.4 рахує `budget` і `reach` (маска, `returnInS`, `deficits`, `swap`). `BudgetPanel` показує шкали O₂, енергії, часу й дози, сценарій «O₂ −40%» (`setLimits`) і «Reset».

## Дозволені шляхи
`src/features/budget/**`, `src/core/**`; плюс `specs/F5/**`, розділ `## F5` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: grid, model, limits, plan, time, base, position, targets, selectedTargetIds
- Пише: `setBudget`, `setReach`, `setLimits`

## Acceptance criteria
- **F5-AC1. Given** еталонна фікстура §7.4; **When** порахувано; **Then** N = 48 / 33 / 23 / 13 хв для чотирьох випадків прикладу, статус `incomplete` при невідомій дозі.
- **F5-AC2. Given** позиція, база й бюджет; **When** порахувано ореол; **Then** до маски входять лише клітинки з реальним шляхом туди й назад (зворотні ребра окремо) у межах бюджету з резервом, рівність приймається, перевищення ні.
- **F5-AC3. Given** ціль усередині ореолу; **When** увімкнено «O₂ −40%» або зростає elapsed; **Then** маска не розширюється, а ціль поза ореолом отримує текстове попередження і `reach.swap` (за модельною вартістю).
- **F5-AC4. Given** невалідний параметр (`speed ≤ 0`, `NaN`, `reserveFraction ≥ 1`); **When** порахувано; **Then** статус `invalid`, маска порожня, `returnInS = null`, на екрані помилка і жодного статусу «у межах моделі».

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## План / задачі
Звірка (T1): spec ↔ SPEC §7.4 ↔ `src/contracts` узгоджені; `ReachabilityResult` (`status`, `mask`, `returnInS`, `deficits`, `swap`, `warnings`) покриває AC1–AC4. Еталон — `REFERENCE_RETURN_MIN`, `REFERENCE_PLAN_TOTALS`, `mockLimits`, `mockModel`. Заглушки: `BudgetEngine` → `null`, `BudgetPanel` — шкали без логіки.

Залежність: ребра й дерева вартості — з `src/core` (F4, T2/T4). F5 стартує після мержу ядра F4 або гілкою поверх `feat/F4`.

| # | Задача | Файли | AC |
|---|---|---|---|
| T1 | Звірка spec ↔ contracts ↔ заглушки, план | `specs/F5/spec.md` | — |
| T2 | Валідація параметрів (`speed ≤ 0`, від'ємні, `NaN`, `reserveFraction ∉ [0,1)`) → `invalid`, порожня маска, `returnInS = null` | `src/core/budget.ts` | AC4 |
| T3 | Бюджет від elapsed, резерв від ліміту, `returnInS = min_k(...)`, `deficits`, статус `incomplete` при невідомій дозі; без чинного плану при обраних цілях → `null` | `src/core/budget.ts` | AC1 (48/33/23/13), AC4 |
| T4 | Ореол: пряме дерево від `position` + зворотне до `base`, клітинка в масці, якщо для кожного відомого ресурсу сума ≤ `budget − reserve` (рівність — так) | `src/core/reachability.ts` | AC2, AC3 (маска не росте) |
| T5 | `swap`: drop — обрана ціль з найбільшою вартістю туди-назад, add — необрана в ореолі з найменшою меншою; інакше `null`; текст попередження для цілі поза ореолом | `src/core/reachability.ts` | AC3 |
| T6 | `BudgetEngine` (headless): підписка на store → `setBudget` / `setReach`, перерахунок лише при зміні входів | `src/features/budget/BudgetEngine.tsx` | AC1–AC4 |
| T7 | `BudgetPanel`: шкали з одиницями, «Return in N min» / «Calculating…», статус іконкою + текстом (`role="status"`, дефіцит — `role="alert"`), «O₂ −40%» (`setLimits`) і «Reset» (`region?.limits ?? mockLimits`), позначки assumption/MOCK | `src/features/budget/*` | AC3, AC4 |
| T8 | Джерела коефіцієнтів (NASA BVAD / EVA) → `docs/SOURCES.md ## F5`, значення — пропозицією для `region.json` (F3) | `docs/SOURCES.md` | SPEC §7.6 |
| T9 | `npm run check`, браузер 400 px + десктоп, draft PR (AC → доказ), рядок AI_LOG | — | усі |

**Статус (сб):** T1–T7 зроблено (ядро `budget.ts`, `reachability.ts`, `BudgetEngine`, `BudgetPanel`); T8 (джерела) і T9 (PR) — далі. Ореол рахується в головному потоці: дерева кешуються (`useMemo` за grid/model/position/base), зміна лімітів чи часу перераховує лише маску — «O₂ −40%» ≈120 мс у браузері.

**Інтеграція з F7 (коментар Олі в #9, PR #17):** контракт `reach` збігається з очікуваннями HUD. Після мержу #17 у `main`: хвилини через `formatMinutes`, `Gauge` з `reserve`/`need`, рівні `StatusNote` `pending`/`deficit`; прибрати дубль alert-у дефіциту (Gauge + статус панелі).

### Abort map (#29, F5-AC5, SPEC §7.8)
- **F5-AC5. Given** чинний план і mock-модель (`emergencyO2G = 360 г`, `limits` §7.4, `t = 0`); **When** порахувано; **Then** відрізок з `used.o2 = 100 г`, `back.time = 500 с` → `ok`, з `back.time = 1400 с` → не `ok`; `pointOfNoReturnS` — початок першого не-`ok`; без чинного плану `abort = null`; «O₂ −40%» не робить жоден відрізок `ok`.

Контракт (`AbortPlan`, `reach.abort`, `model.emergencyO2G`) приходить у #26. До мержу ядро приймає `emergencyO2G` параметром і повертає локальний результат; після мержу — тип із `src/contracts` і запис у `reach.abort`.

| # | Задача | Файли | AC |
|---|---|---|---|
| A1 | Тести еталону §7.8 (ok / не ok, рівність), `pointOfNoReturnS`, «всі ok → null», «немає шляху назад → ok=false, returnS=null», «пізній відрізок знову ok», невідома доза — без неї → red | `src/core/abort.test.ts` | AC5 |
| A2 | `assessAbort(plan, toBase, budget, reserve, model, emergencyO2G)`: `used_k` накопичувально, `back` із зворотного дерева (той самий `toBase`, що й ореол), запас O₂ = `emergencyO2G`, решта — резерв, `fitsWithin` | `src/core/abort.ts`, `index.ts` | AC5 |
| A3 | Тест «O₂ −40%»: жоден відрізок не стає `ok`, `pointOfNoReturnS` не пізніше | `src/core/abort.test.ts` | AC5 |
| A4 | Після мержу #26: `assessReach` пише `reach.abort` (лише `plan.status = 'ok'`, інакше `null`; `invalid` → `null`), тип `AbortPlan` з контракту | `src/core/reachability.ts` | AC5 |
| A5 | Тест `BudgetEngine`: план у store → `reach.abort` є; `setLimits` O₂ −40% → не кращий | `src/features/budget/BudgetEngine.test.tsx` | AC5 |
| A6 | `npm run check`, AI_LOG, draft PR `feat/F5-abort` (AC → доказ) | — | AC5 |

**Статус:** A1–A3 зроблено (#40); A4–A5 зроблено — `reach.abort` публікує `BudgetEngine`; A6 — PR.

### Мітки екіпажу в ореолі й Abort map (#59, F5-AC6, SPEC §7.12)
- **F5-AC6. Given** мітки `impassable` / `hazard`; **When** рахується ореол і Abort map; **Then** використовується `applyAnnotations(grid, annotations)`, і клітинки під непрохідною міткою не входять в ореол.

| # | Задача | Файли | AC |
|---|---|---|---|
| M5 | Тест `BudgetEngine` → red: мітка `impassable` → клітинки під нею не в `reach.mask`, abort перераховано; `hazard` — клітинка лишається в масці (прохідна) | `BudgetPanel.test.tsx` | AC6 |
| M6 | `BudgetEngine`: `applyAnnotations(grid, annotations)` (useMemo) у дерева й `assessReach` — ореол і abort на одній сітці | `BudgetEngine.tsx` | AC6 |
| M7 | `npm run check`, браузер 1440 / 400 px на реальному Gale (мітка на маршруті Mont Mercou + Gardonne), AI_LOG, PR | — | AC6, AC7 |

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| ~~Issue #14~~ вирішено в PR #16: F6 читає `grid` і сама перевіряє `reach.mask` — нове поле в `reach` не потрібне | — | — | — |
| `swap` у SPEC — вартість «база → ціль → база», дерева — від `position`. До старту `position = base`, тож беру дерева (`position → ціль → base`) | Влад | — | — |
| Ореол на 256×256 рахується в головному потоці; якщо > ~100 мс — переносимо у Worker F4 | Влад | сб 21:00 | Сітка 128×128 по 20 м (SPEC §12) |
