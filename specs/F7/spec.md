# F7 — UI, HUD, дизайн-токени

Власник: Оля (@oljyaaa) · гілка `feat/F7` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Нові задачі (14.11): Abort map + «View from here»
План — #25, правила — `docs/SPEC.md` §7.8–7.9 (PR #24). До мержу contract-PR (#26, сб 16:00) — на mocks. Тести з AC → red → код → green.

| Задача | AC / правило | Issue | Залежить від |
|---|---|---|---|
| HUD: «Point of no return in N min» / «Return possible along the whole route», «assumption» біля аварійного запасу | F7-AC6, §7.8 | #33 | #26, #29 |
| Слайди й пітч: Abort map — головна історія | §3 | #33 | — |

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

### Етап 2 (сб 16:00 →): символіка, Abort map, GO / NO-GO

**Звірка з контрактом (`main` @ 3c2d160, #43).** Є все потрібне: `reach.abort: AbortPlan | null` (`segments[].ok`, `pointOfNoReturnS`, `emergencyO2G`), `model.emergencyO2G` + `model.evidence.emergencyO2G` (у mocks — `assumption`), `src/contracts/gonogo.ts` (`evaluateGoNoGo`, `StationCall`, `Fix`, `STATION_ORDER`, тести). Для символіки типу в контракті немає — її визначає F7 у `src/ui` (§7.11), тож issue `contract` не потрібен. Стор не змінюється.

Порядок за дедлайнами: T9 (до 19:00, чекають F2 / F6) → T10 → T11–T12 → T13–T14.

- **T9 · F7-AC8 символіка (#45), `src/ui/EvaSign.tsx`.** Один компонент `EvaSign` з `kind` = `base | target | hazard | nodata | astronaut | ponr | photo` і `state` для цілі (`selected | unselected | outside`) та небезпеки (`high | low`), `heading` для шеврона. Два способи вживання: `<EvaSign …/>` — окремий `<svg role="img" aria-label>` (HUD, списки, легенда); `<EvaSignShape x y size …/>` — `<g>` усередині чужого `<svg>` (2D-план F2). Форма = тип, заливка / контур / пунктир = стан, колір — лише токени й лише доповнює; NoData ніколи не кольору «прохідно». `EVA_SIGN_LABEL` — тексти `aria-label` англійською. Тести: кожен `kind × state` має свій `aria-label` і різну геометрію (форма не залежить від кольору); пропи лише додаються.
- **T10 · легенда знаків** `EvaLegend` у `src/ui` — для HUD і щоб F2 / F6 могли показати ту саму легенду (F7-AC8 «однакові в HUD, списку цілей і легенді карти»). Підключення в їхні панелі — їхні PR; я напишу в #46 і F6, як імпортувати.
- **T11 · F7-AC6 Point of no return (#33).** У `hudState` — поле `abort`: `null` → рядка немає; `pointOfNoReturnS = null` → ✔ «Return possible along the whole route»; інакше ◆! «Point of no return in N min», `N = formatMinutes(pointOfNoReturnS)`; `0` → «Point of no return: now». Біля — «Emergency O₂ N g», і «assumption», якщо `model.evidence.emergencyO2G.status ≠ 'verified'`. У HUD — знак `ponr` з T9.
- **T12 · тести AC6** (red → green): `abort = null` → рядка немає; `null` → «Return possible…»; 1380 с → «in 23 min»; NaN → «—»; `assumption` видно / не видно залежно від `evidence`.
- **T13 · F7-AC7 GO / NO-GO (#44), `features/hud/GoNoGo.tsx`.** Лише показ `evaluateGoNoGo(store)` (рахувати нічого): вердикт GO / GO · CAUTION / NO-GO / HOLD (іконка + слово, найкращий — «GO · within model», ніколи «safe») і список 8 станцій `STATION_ORDER` з причиною. Дії `Fix`: `select-targets` → порада, `build-route` → «Press “Build route”», `replace-target` → кнопка `replaceTarget(dropId, addId)`, `remove-target` → кнопка `toggleTarget(id)`, `return-now` → текст. Перед виходом (`time = 0`): GO → кнопка «Start EVA»; CAUTION → «Hold to confirm» 1,5 с (pointer і Space / Enter; відпустив — скасовано) → запис «Confirmed HH:MM:SS · CAUTION: RTN, ABT…» у HUD; NO-GO → кнопки немає, біля станцій дії; HOLD → наступна дія. Під час виходу (`time > 0`) NO-GO → «Return to base now» з `role="alert"` (один alert на сторінці). Reduced motion — без анімації заповнення; анімацію опитування станцій ріжемо першою.
- **T14 · тести AC7** (red → green, `vi.useFakeTimers`): вердикт і 8 станцій для кожного виклику; утримування < 1,5 с не підтверджує, ≥ 1,5 с — підтверджує й пише час (миша і клавіатура); NO-GO перед виходом — без кнопки, з діями; дія `replace-target` викликає `replaceTarget`; під час виходу NO-GO → `alert`. Потім Playwright 400 / 1440 і на справжньому F5.
- **T15 · перевірка, PR.** `npm run check`, браузер (dev-сервер, стани через store), AI_LOG, draft PR з `feat/F7` (AC6–AC8 → доказ); «Ready» — на твоє рішення.

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| Що саме робить «Start EVA» у store? У контракті немає «вихід почато»; «під час виходу» = `time > 0` | Олександр | до 19:00 | Кнопка лише пише підтвердження в HUD і переводить фокус на «Elapsed»; `time` рухає астронавт полем |
| Запис підтвердження CAUTION живе лише в HUD (локальний стан) і зникає після перезавантаження — достатньо для демо? | Олександр | до 21:00 | Так, з підписом «not saved» |
| Хто пише `position` (геопозиція, #20)? Впливає на точку неповернення під час виходу | Олександр | до 21:00 | Відлік від старту плану, як у §7.8 |
