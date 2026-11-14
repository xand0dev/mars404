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
<!-- Власник: T1 — звірити spec із src/contracts; далі тести з AC → код. -->

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
