# F3 — Дані й шари

Власник: Максим (@kingsneverdie17) · гілка `feat/F3` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## Мета й обсяг
Pipeline у Docker вивантажує bbox (§8), рахує схил, walkable і hazard, валідує й пише `public/data/gale/`. `DataLoader` вантажить пакет і викликає `setRegionData`. `LayersPanel` перемикає шари й показує легенду та походження.

## Дозволені шляхи
`pipeline/**` (крім `pipeline/globe`), `public/data/gale/**` (крім `targets*`, `photos/`), `src/features/data/**`; плюс `specs/F3/**`, розділ `## F3` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: site, layers, region
- Пише: `setRegionData`, `toggleLayer`

## Acceptance criteria
- **F3-AC1. Given** обрано bbox; **When** `docker run … prepare` запущено двічі; **Then** файли в `public/data/gale/` мають однакові sha256, а TS-тест перевіряє схему `region.json`, розміри файлів (`w×h×4` / `w×h`) і те, що NoData = `NaN` + `walkable = 0`.
- **F3-AC2. Given** пакет Gale; **When** відкрито район; **Then** `grid` у store — реальна сітка (не mock), статус «verified», а висоти лежать у діапазоні, який повертає `exportImage` для bbox.
- **F3-AC3. Given** панель шарів; **When** перемикаються terrain, optical, thermal, slope, traverse (мишею чи клавіатурою); **Then** кожен шар має легенду з текстом, одиниці й рядок походження (product ID/URL, нативна й цільова роздільність, метод, credit).
- **F3-AC4. Given** файл шару відсутній або має інший розмір сітки; **When** вантажиться район; **Then** видно помилку саме цього шару, решта UI працює, а битий шар не потрапляє в `grid`. Якщо бита сама сітка — лишається mock з бейджем.

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## План / задачі
<!-- Власник: T1 — звірити spec із src/contracts; далі тести з AC → код. -->

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
