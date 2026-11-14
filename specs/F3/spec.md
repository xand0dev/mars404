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

## Звірка з contracts (T1, 14.11)
- `Region.files` має `elevation`, `slope`, `walkable`, `hazard`, `texture`, `targets`, `traverse?`. Окремого файлу для thermal немає, тому thermal-шар — це лише `layers[].url` (PNG-накладка, не вхід hazard).
- `LayerKind` = terrain | optical | thermal | slope | mission. Траверс — шар з `id: 'traverse'`, `kind: 'mission'`, `url` = `files.traverse`.
- Окремого поля для формули hazard немає. Тому `hazard.f32` рахує pipeline, а формулу й коефіцієнти пишемо в `Source` з `id: 'hazard-from-slope'` (`status: 'assumption'`). Contract-PR не потрібен.
- `Region` вимагає `model`, `limits`, `base`. До джерел від Влада (§7.6) і рішення про базу з Настею беремо значення з `src/mocks`, а статус — `assumption`/`mock` у `sources`.
- Помилки окремих шарів (AC4) — локальний стан F3, store не потрібен. Якщо бита сама сітка, `setRegionData` не викликаємо: у store лишається `mockGrid`, а в панелі видно `MockBadge`.
- NoData перевіряємо через `isNoDataValue` (є `region.noData` і `|h| ≥ 3e38`), URL файлів — через `dataUrl('gale/' + шлях)`. Шляхи у `files.*` і `layers[].url` — без префікса `gale/`.
- Перемикачі шарів — `<button aria-pressed>` (запит F7 в #7), висота ≥40 px, легенда текстом.
- Розбіжність: `source.json` (§8) не входить у contracts. Це артефакт pipeline для AC1 і AC2, frontend його не читає.

## План / задачі
Порядок пріоритетів: пакет даних у `main` до сб 14:00 (ним користуються F2, F4, F5, F6), далі UI до 21:00.

- [x] T1 Звірити spec із `src/contracts`, `src/store`, `src/mocks` і заглушками `src/features/data` (розділ вище).
- [x] T2 Bbox (до 14:00). Скрипт `pipeline/probe.py` перевіряє кандидата біля Curiosity і план Б за критеріями §8: скінченні висоти з `exportImage`, NoData <5%, ≥5 зупинок MMGIS усередині. Фото перевіряємо разом із Настею. Рішення й числа записуємо сюди і в `docs/SOURCES.md`.
  - **Рішення 14.11:** квадрат 2.56 км навколо Curiosity (sol 5073, lon 137.388886, lat −4.82602331), bbox 137.367215…137.410557, −4.847618…−4.804429. `probe.py` на сітці 256×256: NoData 0 %, висоти −3655…−3189 м, 104 зупинки (sol 4605–5073). План Б (137.400–137.422, −4.750…−4.728) теж проходить: NoData 0 %, 56 зупинок. Фото з повного кадру підтверджує Настя.
- [x] T3 Тести AC1 (red): TS-тест читає `public/data/gale` і перевіряє схему `region.json`, розміри (`w×h×4` / `w×h`), NoData = `NaN` + `walkable = 0`, sha256 із `source.json`.
- [x] T4 Pipeline: `fetch` (мережа, один раз, сирі файли в кеш) → `prepare` (офлайн, детермінований): висоти — mean до сітки ≤256×256 ≤10 м; схил на нативному 1 м → max; walkable; hazard = f(схил) (assumption); текстура HiRISE; THEMIS PNG; траверс з MMGIS у bbox; `region.json`, `source.json`, sha256. Два запуски → однакові sha256 (AC1 green). Dockerfile.
  - Зроблено 14.11 без thermal (THEMIS — окремим кроком разом із T6). Схил max з 1 м: медіана 16°, p95 45°, 27 % клітинок > 25°; від бази при `maxSlopeDeg = 25` досяжно 44 837 з 65 536 клітинок. Docker-запуск — не перевірено (Docker на ПК ще не доступний); prepare двічі локально — однакові SHA256SUMS.
- [ ] T5 Тести AC2 і AC4 → `DataLoader`: вантажить пакет, перевіряє сітку й кожен шар окремо, `targets.geojson` → `lonLatToXY`, `setRegionData` лише для актуального `site`. Бита сітка → mock з бейджем.
- [ ] T6 Тести AC3 → `LayersPanel`: 5 шарів (terrain, optical, thermal, slope, traverse), `aria-pressed` → `toggleLayer`, легенда текстом, одиниці, походження (product ID/URL, нативна й цільова роздільність, метод, credit), статус словом.
- [ ] T7 `npm run check`, браузер 400 px і десктоп, скриншоти, таблиця AC → доказ у PR, рядок у `docs/AI_LOG.md`, джерела в `docs/SOURCES.md`.

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| Docker і GDAL локально не встановлені — як запускати pipeline для AC1? | Максим | сб 12:00 | `exportImage` у сирому форматі (bip/bsq, перевірити) читається без GDAL; Docker — для відтворюваності |
| Bbox навколо Curiosity: NoData <5% і ≥5 зупинок з фото? | Максим, Настя | сб 14:00 | перевірений bbox 137.400–137.422 / −4.750…−4.728 |
| База (хабітат) у bbox | Максим, Настя | сб 14:00 | центр прохідної клітинки, assumption |
| Коефіцієнти hazard від схилу | Максим, Влад | сб 21:00 | малі коефіцієнти, assumption на екрані |
