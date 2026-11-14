# F6 — Наукові цілі й фото

Власник: Настя (@Bulka0801) · гілка `feat/F6` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Нові задачі (14.11): Abort map + «View from here»
План — #25, правила — `docs/SPEC.md` §7.8–7.9 (PR #24). До мержу contract-PR (#26, сб 16:00) — на mocks. Тести з AC → red → код → green.

| Задача | AC / правило | Issue | Залежить від |
|---|---|---|---|
| `photos/photos.geojson`: 8–20 знімків Navcam у bbox, локально, `alt`, credit, sol, `sourceUrl`, камера, `locationAccuracy: 'rover-stop'`; джерела в SOURCES | F6-AC5, §6.0 | #34 | скрипт Івана (#36) |

## Мета й обсяг
5–8 цілей у bbox із зупинок Curiosity. Для кожної: назва, «why go» з посиланням NASA/JPL, фото Navcam з raw images API, credit і sol. `targets.geojson` і `photos/` лежать локально. Список цілей і картка.

## Дозволені шляхи
`src/features/science/**`, `public/data/gale/targets*`, `public/data/gale/photos/**`; плюс `specs/F6/**`, розділ `## F6` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: site, targets, selectedTargetIds, reach, grid
- Пише: `toggleTarget`

## Acceptance criteria
- **F6-AC1. Given** пакет Gale; **When** відкрито список цілей; **Then** видно 5–8 цілей у межах сітки, кожна з бейджем точності: «verified» (координати зупинки MMGIS), «approximate» або «MOCK».
- **F6-AC2. Given** ціль; **When** відкрито картку (клік або клавіатура); **Then** видно назву, «why go», фото з `alt`, credit (як його дає API / сторінка зображення), sol і посилання на джерело. Фото позначено «view from rover stop», а не точне місце цілі.
- **F6-AC3. Given** картка; **When** натиснуто «Add to route» / «Remove»; **Then** викликано `toggleTarget(id)`, а ціль поза ореолом має попередження з `reach` (клітинка цілі — `xyToCell(grid, target.coordinates)`, перевірка — `reach.mask`).
- **F6-AC4. Given** фото не завантажилося; **When** відкрито картку; **Then** видно заглушку з `alt`, і картка та кнопка працюють.

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## План / задачі
- **T1 — Контракти й межі.** Звірити AC зі `src/contracts`, store і заглушкою; зафіксувати розрив F6-AC3 у contract issue #14. Спільні файли не змінювати.
- **T2 — AC-тести (red).** Поруч із компонентами додати Given/When/Then-тести для F6-AC1…AC4 на детермінованих mock-цілях і переконатися, що вони падають до реалізації.
- **T3 — Список цілей.** Мінімально реалізувати доступне відкриття картки мишею й клавіатурою, 5–8 елементів та бейджі `verified` / `approximate` / `MOCK` (F6-AC1).
- **T4 — Картка й фото.** Показати `why`, локальне фото, `alt`, credit, sol, source link і напис «view from rover stop»; додати робочу заглушку при помилці фото (F6-AC2, F6-AC4).
- **T5 — Вибір і reachability.** Під'єднати `toggleTarget(id)`, стани «Add to route» / «Remove» та текстове попередження поза ореолом; до рішення issue #14 тестувати на mocks без змін contracts/store (F6-AC3).
- **T6 — Перевірені дані.** Після перевірки джерел підготувати 5–8 записів `targets.geojson` і локальні фото; перевірити bbox, схему, credit та sol. Непідтверджене явно позначити `assumption` / `MOCK` і додати джерела лише в `## F6` `docs/SOURCES.md`.
- **T7 — Перевірка й handoff.** Довести AC-тести до green, перевірити 400 px і desktop, виконати `npm run check`, додати рядок у `## F6` `docs/AI_LOG.md` та відкрити draft PR з таблицею AC → доказ. `Ready for review` не ставити.
- **T8 — Surface photos (#34).** За F6-AC5 додати red-тест і `photos/photos.geojson` для 8–20 локальних Navcam-знімків за контрактом `SurfacePhoto`: точні MMGIS rover-stop координати, `alt`, credit, sol, `sourceUrl`, camera, `locationAccuracy: 'rover-stop'`; shared-файли не змінювати.

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
