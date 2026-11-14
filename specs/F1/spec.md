# F1 — Глобус і вибір місця

Власник: Іван (@gonivanko) · гілка `feat/F1` · згенеровано з `docs/SPEC.md` §9.
**За розбіжності перемагає `docs/SPEC.md`.** Власник може уточнювати цей файл (план, задачі, відкриті питання), не суперечачи SPEC.

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
