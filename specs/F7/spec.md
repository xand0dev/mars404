# F7 — UI, HUD, дизайн-токени

Власник: Оля (@oljyaaa) · гілка `feat/F7` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Мета й обсяг
Токени (`src/ui/tokens.css`: темний фон, акцент), Panel / Gauge / StatusNote / OwnerBadge, адаптивний `Shell`, `Hud`: великий «Return in N min», статус, поле «Elapsed, s», кнопка заміни цілі.

## Дозволені шляхи
`src/features/hud/**`, `src/ui/**`; плюс `specs/F7/**`, розділ `## F7` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: site, plan, budget, reach, time, limits, targets, selectedTargetIds
- Пише: `setTime`, `replaceTarget`

## Acceptance criteria
- **F7-AC1. Given** ширина 400, 768, 1024 або 1440 px; **When** відкрито сторінку в будь-якому стані; **Then** `scrollWidth ≤ clientWidth`, дотикові цілі ≥40 px, «Return in N min» — найбільший текст HUD.
- **F7-AC2. Given** робота лише з клавіатури; **When** Tab по локації, шарах, цілях, маршруту й HUD; **Then** фокус видно (≥3 px), кожне поле має доступну назву, зміна статусу озвучується (`status`, дефіцит — `alert`).
- **F7-AC3. Given** store з `reach` (еталон §7.4, план 900 с); **When** відкрито HUD; **Then** HUD показує те саме N, що й `BudgetPanel` (33 хв), і ризик іконкою + словами: «Estimate incomplete: dose — no data». Різні рівні мають різні іконки.
- **F7-AC4. Given** стани empty, «цілі обрано, плану немає», pending, invalid, no-path, deficit, incomplete, estimated, MOCK і `NaN` у budget; **When** відкрито HUD; **Then** для кожного видно пояснення й наступну дію, `NaN` показано як «—», а не «NaN min». Найкращий статус — «within model».
- **F7-AC5. Given** `reach.swap = {dropId, addId}`; **When** натиснуто «Replace ‹A› with ‹B›»; **Then** викликано `replaceTarget(dropId, addId)` і фокус перейшов на «Elapsed». При `swap = null` кнопки немає, є порада «Remove a target or return to base now». Reduced motion прибирає переходи.

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## План / задачі

**Звірка зі `src/contracts` і заглушкою (T0, зроблено).** Усе, що потрібно HUD, у контрактах уже є: `reach.returnInS / status / deficits / swap / warnings`, `plan.status / reason`, `budget`, `limits`, `time`, `targets`, `selectedTargetIds`, `region.status`, дії `setTime` і `replaceTarget`. Нових полів не треба → issue `contract` не потрібен. Заглушка `Hud` показує лише N і `info`; `Shell` — одна колонка / 2 колонки від 1024 px. Еталон — `REFERENCE_RETURN_MIN` у `src/mocks`.

**Стан HUD (чисто з store, без власних обчислень; N рахує лише F5):**

| Стан | Умова | Рівень / іконка | Пояснення → наступна дія |
|---|---|---|---|
| empty | `site = null` або цілей не обрано | info ℹ | «Choose Gale» / «Select targets» |
| no plan | цілі є, `plan = null` | info ℹ | «No route yet» → «Build route» |
| pending | `plan.status = 'pending'` або план ok, а `reach = null` | info ⏳ | «Calculating…», N = «—» |
| invalid | `plan.status = 'invalid'` або `reach.status = 'invalid'` | danger ✖ | причина → «Check targets / parameters» |
| no-path | `plan.status = 'no-path'` | danger ✖ | `reason` → «Remove or replace a target» |
| deficit | `deficits ≠ []` або `returnInS < 0` | danger ⛔ + `role="alert"` | «Deficit: o2…» → swap або «Remove a target or return to base now» |
| incomplete | `reach.status = 'incomplete'` | warn ⚠ | «Estimate incomplete: dose — no data» |
| estimated | `reach.status = 'estimated'` | ok ✔ | «Within model» (ніколи «safe») |
| MOCK | `region = null` або `region.status = 'mock'` | бейдж MOCK | — |
| NaN | `returnInS` / budget не скінченні | — | «—», не «NaN min» |

- **T1 · `src/ui` формат і рівні.** Хелпер `formatMinutes(s)` (`null/NaN/∞ → «—»`, інакше `floor(s/60)`); `StatusNote` — окремі іконки для кожного рівня (додати `pending`, `deficit` без ламання пропів); `Gauge` — `NaN → «no data»` (є). Тести: `ui/*.test.tsx`.
- **T2 · `hudState(store)` — чиста функція стану** (таблиця вище) у `features/hud/hudState.ts` + тести на всі 10 станів (F7-AC4) і еталон 48/33/23/13 хв (F7-AC3). *Red → green.*
- **T3 · `Hud`**: великий «Return in N min» (найбільший шрифт HUD), `StatusNote` з `role="status"` / `alert` для дефіциту, поле «Elapsed, s» (`<input type=number>` з label → `setTime`), кнопка «Replace ‹A› with ‹B›» → `replaceTarget` + фокус на «Elapsed»; без swap — порада (F7-AC3, AC5). Тести Testing Library.
- **T4 · Токени й `Shell`**: розміри шрифтів (`--fs-hero` тощо), фокус ≥3 px, touch ≥40 px, reduced motion, сітка 400/768/1024/1440 без горизонтального скролу; HUD липкий зверху на десктопі (F7-AC1, AC2).
- **T5 · Перевірка в браузері**: Playwright-скрипт (не в репо, у скретчпаді) — `scrollWidth ≤ clientWidth` на 4 ширинах, Tab-обхід, скриншоти 400 px і 1440 px → у PR.
- **T6 · `npm run check`**, рядок у `docs/AI_LOG.md` (`## F7`), draft PR з таблицею AC → доказ.

- **T7 · `Gauge` для F5** (пропи лише розширено): `reserve` — позначка резерву на шкалі й текст; `need` — лише текст «plan …»; `deficit` — передає F5 з `reach.deficits` (Gauge сам не рахує — одне джерело чисел, §5.2; погоджено з Владом в issue #9) → ⛔ «Deficit: …» і червона шкала, без власного `role="alert"` (alert — у статусі панелі); `null`/`NaN` → ⚠ «no data», без шкали.
- **T8 · `reach.warnings` у HUD** (напр. «‹name› is outside the reachable area (model)») — лише для чинної оцінки (deficit / incomplete / estimated), не під час `pending`.

Порядок: T1 → … → T8. До сб 21:00 — T1–T4 на mocks; після F5 — перевірка на реальному `reach`.

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| F5 ще заглушка (`reach = null`) — HUD завжди «Calculating…»/порада | Влад | сб 21:00 | Тести на фікстурах `reach`; у UI бейдж MOCK |
| «Тієї ж N, що й BudgetPanel» — обидва беруть `reach.returnInS`; хелпер `formatMinutes` у `src/ui` може взяти й F5 | Оля / Влад | сб 21:00 | F7 перевіряє тестом лише свій HUD |
