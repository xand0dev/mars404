# F1 — Глобус і вибір місця

Власник: Іван (@gonivanko) · гілка `feat/F1` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

## #105 · Режими точок: EVA / Overview / Card (15.11)
Контракт — #103 (`SITE_IDS`, `isSiteId()`, `Region.kind`). Гілка `feat/F1-sites`, PR #128.

- `Site.modelled` → `Site.mode: 'eva' | 'overview' | 'card'` (+ `comingSoon?`). EVA — Gale, Columbia Hills; Overview — Olympus Mons, Valles Marineris (id = SiteId, пакети в main); Card — Jezero, Meridiani.
- `canOpenSite()` = не card, не coming soon, id — SiteId → переліт і `setSite(id)`, як для Gale. Coming soon — кнопка `disabled`, `chooseSite` нічого не робить.
- Картка словами: «EVA site — plan a route» / «Overview — terrain only, no EVA planning» / «Card only — no terrain data». Картка показується й для відкритого району. **Уточнення F1-AC2:** замість «next site — not modelled» — «Card only…» (за #105).
- Форма (§7.7): маркер eva — октаедр ◆, overview — тетраедр ▲, card — сфера ●; такий самий значок у кнопці + режим в `aria-describedby`.
- Columbia Hills: у IAU Gazetteer назви немає → центр із Trek spirit_waypoints (SOURCES §F1).
- Notes: `parseAnnotationsFile(text, site)` — `isSiteId()` і збіг із поточним районом; панель працює на будь-якому відкритому районі.

## Нові задачі (14.11): Abort map + «View from here»
План — #25, правила — `docs/SPEC.md` §7.8–7.9 (PR #24). До мержу contract-PR (#26, сб 16:00) — на mocks. Тести з AC → red → код → green.

| Задача | AC / правило | Issue | Залежить від |
|---|---|---|---|
| Скрипт прив'язки знімків Navcam до зупинок MMGIS за sol → `photos.geojson` для F6 (Іван, у шляхах F6) | SPEC §6.0, F6-AC5 | #36 | — |
| Доступність Location (аудит F7-AC2): усі точки — кнопки, Tab + Enter, картка без canvas — ✔, тест `#5 · доступність` у `SitePanel.test.tsx`. Скидання цілей після перельоту — стик з F6: пропозиція показувати цілі лише при `site = 'gale'` (у шляхах F6) | SPEC §7.7 | #5 | F6 |
| Прогін демо за §3 | SPEC §3 | #36 | інтеграція сб 21:00 |

## #80 · Масштаб глобуса (від F7)
Колесо / тачпад (зокрема «щипок» macOS, `wheel` + `ctrlKey`), два пальці на телефоні й кнопки «Zoom in / Zoom out / Reset view». Гілка `feat/F1-zoom`.

| # | Задача | Файли |
|---|---|---|
| Z1 | `zoom.ts`: `ZOOM_MIN = 0.7`, `ZOOM_MAX = 3`, `clampZoom(z, max)`, `wheelFactor(deltaY, deltaMode, ctrlKey)`, `pinchFactor(prev, next)`, `maxZoomFor({ scale, distance, radius })`; локальний zustand `useZoom` (`zoom`, `maxZoom`, `zoomBy`, `zoomIn/Out`, `reset`, `resetTick`) + тести | `globe/zoom.ts`, `zoom.test.ts` |
| Z2 | `SitePanel`: кнопки «Zoom in», «Zoom out», «Reset view» (нативні `<button>`, ≥ 40 px), коли `site = null` і сцена змонтована; на межах — `disabled` + тести | `SitePanel.tsx`, `SitePanel.test.tsx` |
| Z3 | `GlobeScene`: `scale * zoom`; `wheel` (`passive: false`) лише коли промінь влучає в сферу — інакше сторінка прокручується; два пальці — pointer-події на `gl.domElement`, під час «щипка» обертання скасовано; `invalidate()` на зміну; «Reset view» повертає й поворот | `GlobeScene.tsx` |

Рішення:
- **Верхня межа залежить від камери.** Камера F2 стоїть на відстані 3, а `fitScale` на десктопі дає 1, тож 3× завела б камеру всередину сфери. `maxZoom = min(3, 0.85 · distance / (radius · scale))` — на десктопі ≈ 2.4×, на 400 px (менший `fitScale`) — повні 3×. Кнопка «Zoom in» на межі вимикається.
- Без WebGL (немає сцени) кнопки масштабу не показуємо — їм нічого масштабувати.
- Числа 0.7 / 3 / крок 1.25 / чутливість колеса — UI-вибір, не дані.

## F1-AC6 · Жива карта — панель «Crew map notes» (#57, SPEC §7.12)
Контракт — PR #56 (змерджено). Гілка `feat/F1-notes`, папка `src/features/notes/**`.

**F1-AC6. Given** відкрито Gale; **When** у панелі «Crew map notes» додано, видалено, експортовано й імпортовано мітки; **Then** список показує вид, текст, час і `origin`; мітки переживають перезавантаження сторінки (`localStorage`, без нього — працює без збереження); експорт дає `AnnotationsFile` JSON, імпорт невалідного файла показує помилку і не змінює мітки.

| # | Задача | Файли |
|---|---|---|
| N1 | Чисті функції: `toAnnotationsFile`, `parseAnnotationsFile` (валідація схеми v1, `site = 'gale'`, вид, скінченні координати, радіус ≥ 0, ISO-час; усім імпортованим `origin = 'imported'`), `mergeImported` | `notes/annotationsFile.ts` + test |
| N2 | Сховище: `loadStoredAnnotations` / `saveStoredAnnotations` у `localStorage` (ключ `mars404.annotations.v1`), try/catch — без сховища працює без збереження | `notes/storage.ts` + test |
| N3 | `NotesPanel`: при `site !== 'gale'` — підказка «Open Gale…»; форма (вид, текст) → `addAnnotation` у точці `position ?? base`, радіус 20 м з позначкою «assumption»; список: вид (іконка + текст), текст, час UTC, `origin`, «Remove»; «Export marks» (`<a download>` з blob); «Import marks» (файл → помилка `role=alert` або злиття) | `notes/NotesPanel.tsx` + test |

Рішення:
- **Імпорт зливає, а не замінює:** поточні мітки лишаються, імпортовані додаються (той самий `id` — береться імпортована). Список передається в `setAnnotations` (SPEC: «Import marks — `setAnnotations`»), тож план інвалідується. Так мітки цього виходу не губляться при імпорті попереднього.
- **Відновлення після перезавантаження:** при монтуванні, якщо в store міток немає, а в сховищі є — `setAnnotations(stored)` зі збереженим `origin`. Далі кожна зміна `annotations` пишеться у сховище.
- Координати мітки з панелі — поточна позиція екіпажу (`position`, або `base`); точне розміщення кліком по карті — F2 (F2-AC8).

## Мета й обсяг
3D-глобус Марса з текстурою (джерело й credit у SOURCES, файл у `public/data/mars/`) і 3–5 точками за координатами IAU Gazetteer. Gale відкриває район, інші точки показують картку «next site». Обертання перетягуванням, без самообертання.

## Дозволені шляхи
`src/features/globe/**`, `public/data/mars/**`, `pipeline/globe/**`; плюс `specs/F1/**`, розділ `## F1` у `docs/AI_LOG.md` і `docs/SOURCES.md`. Тести — поруч із кодом.

## Store
- Читає: site
- Пише: `setSite`

## Acceptance criteria
- **F1-AC1. Given** `site = null`; **When** натиснуто кнопку «Gale / Mount Sharp» (мишею, Enter або Space); **Then** викликано `setSite('gale')`, у полотні з'являється рельєф Gale, і маркер Gale позначено активним.
- **F1-AC2. Given** панель локацій; **When** обрано Jezero або іншу не-Gale точку; **Then** видно короткий опис і «next site — not modelled», `site` не змінюється.
- **F1-AC3. Given** увімкнено reduced motion або натиснуто «Skip»; **When** обрано Gale; **Then** район відкривається одразу, без анімації.
- **F1-AC4. Given** глобус; **When** відмальовано; **Then** маркери стоять у точках `latLonToSphere` (lon 0 → +X, lon +90 → −Z, lat +90 → +Y), узгоджено з текстурою. Видно підпис джерела текстури. Без текстури показується процедурна сфера з «MOCK», кнопки працюють.
- **F1-AC5. Given** район Gale відкрито; **When** натиснуто «Back to globe»; **Then** `setSite(null)` повертає глобус, і стан скинуто.

## Правила, на які спирається
`docs/SPEC.md` §5.2 (обмін), §6 (контракти), §7 (обчислення), §7.6 (чесність даних), §7.7 (доступність). Еталонні числа — `src/mocks` (`REFERENCE_*`).

## План / задачі
### Звірка зі src/contracts і заглушкою (T0, зроблено)
- `setSite` / `site` є в `MissionState`; скидання стану при `setSite(null)` уже робить store (§6.1) — F1 лише викликає дію.
- `latLonToSphere` у `src/contracts` **немає**. Це чиста функція, потрібна лише F1, — кладемо в `src/features/globe/geo.ts`, не в contracts (issue `contract` не потрібен, поки інші фічі її не потребують).
- Полотно належить F2: при `site !== null` `MapView` сам прибирає глобус і малює рельєф. Тож «рельєф у полотні» (AC1) і повернення глобуса (AC5) — наслідок `setSite`, F1 перевіряє виклик дії.
- Камера спільна з F2 → глобус обертаємо **групою** (drag по сфері / drei `PresentationControls`), камеру не чіпаємо. `frameloop="demand"` → `invalidate()` на drag і під час анімації.
- Без WebGL (і в jsdom) `GlobeScene` не монтується → уся логіка вибору й таймінгу живе в `SitePanel` + локальному стані F1, сцена лише показує.
- Підпис джерела текстури й «MOCK» показуємо в `SitePanel` (HTML), бо `GlobeScene` — R3F-вузли.

### Задачі
| # | Задача | AC | Файли |
|---|---|---|---|
| T1 | `latLonToSphere(lat, lon, r)` = (r·cosφ·cosλ, r·sinφ, −r·cosφ·sinλ) + тести (lon 0→+X, +90→−Z, lat 90→+Y). Узгоджено з UV `SphereGeometry` (u=0.5 → +X) для еквірект. текстури −180…180 | AC4 | `globe/geo.ts`, `geo.test.ts` |
| T2 | `sites.ts`: 3–5 точок (Gale, Jezero, Meridiani Planum, Olympus Mons, Valles Marineris) з координатами з IAU Gazetteer (URL у `docs/SOURCES.md`), короткий опис, `modelled: true` лише для Gale. Тест: рівно одна modelled, координати в межах | AC2, AC4 | `globe/sites.ts`, `sites.test.ts` |
| T3 | Локальний стан F1 (zustand у `globe/`): `previewId` (картка не-Gale), `flying`, `textureStatus: 'loading'\|'ok'\|'missing'` | — | `globe/globeState.ts` |
| T4 | `SitePanel`: кнопки локацій (миша/Enter/Space — нативні `<button>`), Gale → `setSite('gale')` (`aria-pressed` = активний маркер); не-Gale → опис + «next site — not modelled», `site` без змін; «Back to globe» → `setSite(null)` + скидання локального стану; підпис джерела / «MOCK». Тести RTL | AC1, AC2, AC5, AC4 (підпис) | `globe/SitePanel.tsx`, `SitePanel.test.tsx` |
| T5 | Перехід до Gale: поворот глобуса до Gale ~1 с, потім `setSite`. `prefers-reduced-motion` або «Skip» → одразу; без WebGL — одразу. Тести з fake timers і `matchMedia` | AC3 | `SitePanel.tsx`, `globe/motion.ts` |
| T6 | Текстура: `pipeline/globe/` скрипт (завантажує глобальну мозаїку NASA/USGS, ресемпл 2048×1024 jpg, sha256 у `public/data/mars/source.json`); рядок у `docs/SOURCES.md` з credit | AC4 | `pipeline/globe/**`, `public/data/mars/**` |
| T7 | `GlobeScene`: сфера з текстурою (Suspense + error boundary → процедурна сфера, `textureStatus='missing'`), маркери в `latLonToSphere`, клік по маркеру = та сама дія, що кнопка, активний маркер Gale, drag-обертання групи, без самообертання | AC1, AC4 | `globe/GlobeScene.tsx`, `Markers.tsx` |
| T8 | Перевірка: `npm run check`, браузер 400 px і десктоп (скриншоти), ручна перевірка, що Gale на текстурі збігається з маркером; draft PR (AC → доказ), рядок `docs/AI_LOG.md` | усі | — |

**Статус (2026-11-14):** T0–T7 ✔ — draft PR #19. Текстура: Viking MDIM 2.1 colorized (художній колір), `public/data/mars/source.json`. Маркери зворотного боку сховано.

Порядок: T1 → T2 → T3/T4 → T5 → T7 (спершу процедурна сфера) → T6 → T8. Перший draft PR — після T1–T5 (панель робоча на mocks).

## Відкриті питання
| Питання | Хто | Коли | План Б |
|---|---|---|---|
| ~~Джерело текстури~~ — **закрито (T6)**: USGS «Mars Viking Colorized Global Mosaic 232m» (Use Constraints: none), тайли Mars Trek WMTS рівня 2; повний файл USGS — 12 GB, тому тайли. Колір художній — так і в SOURCES | Іван | — | — |
| ~~Набір точок і координати~~ — **закрито (T2)**: 5 точок, центри з Gazetteer, мережа MDIM 2.1 (сторінки Feature/<id>; таблиця пошуку дає старіші MDIM 2.0, напр. Gale −5.37°, 137.81°E). Джерела — `docs/SOURCES.md` §F1 | Іван | — | — |
| ~~Таймер переходу~~ — **закрито (T5, рішення Івана)**: один `setTimeout(FLY_MS)` у `SitePanel`, пише `setSite('gale')` рівно раз; Skip / скасування / unmount прибирають його (тест). Анімація — `useFrame` + `invalidate` лише під час переходу, у store не пише. Без сцени (немає WebGL) або з reduced motion — одразу | Іван | — | — |
