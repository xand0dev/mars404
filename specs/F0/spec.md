# F0 — Каркас, contracts, store, CI, інтеграція

Власник: Олександр (@xand0dev) · гілка `feat/F0` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Мета й обсяг
Vite-проєкт, contracts, store з правилами §6.1, mocks (128×128 синтетична сітка по 10 м з blocked-зоною й NaN, 5 цілей MOCK, модель з `assumption`), `src/app` зі слотами, заглушки експортів, CI, automerge, path-guard, Pages, CONSTITUTION, AGENTS, specs F1–F8, AI_LOG, SOURCES, LICENSE.

## Дозволені шляхи
спільні файли §5.3, `src/features/*/index.ts` (заглушки); плюс `specs/F0/**`, розділ `## F0` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: —
- Пише: —

## Acceptance criteria
- **F0-AC1. Given** чистий checkout; **When** `npm ci && npm run check`; **Then** lint, typecheck, test і build проходять, а сторінка відкривається без помилок консолі і показує всі слоти з бейджем MOCK.
- **F0-AC2. Given** PR з гілки `feat/F<N>` змінює лише свої шляхи; **When** CI зелений; **Then** PR сам мерджиться squash-ом. **Given** PR чіпає спільний файл або чужу папку; **Then** guard позначає його «needs review» (чужа папка — червоний), і automerge не вмикається.
- **F0-AC3. Given** у PR внесено помилку типів; **When** запущено CI; **Then** `check` червоний, merge заблоковано.
- **F0-AC4. Given** store; **When** `toggleTarget`, `replaceTarget`, `setSite`, `setRegionData`; **Then** інвалідація відбувається за §6.1 (unit-тести).
- **F0-AC5. Given** PR, змерджений **автоматично** (automerge); **When** відпрацював deploy; **Then** GitHub Pages відкриває нову версію з `base: './'`, а дані вантажаться без 404.

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## План / задачі
<!-- Власник: T1 — звірити spec із src/contracts; далі тести з AC → код. -->

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
