# F6 — Наукові цілі й фото

Власник: Настя (@Bulka0801) · гілка `feat/F6` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

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
<!-- Власник: T1 — звірити spec із src/contracts; далі тести з AC → код. -->

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
