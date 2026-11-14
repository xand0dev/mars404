# MARS::404 — специфікація продукту

> NASA Space Apps Challenge 2026 · челендж **Interplanetary Survival Guide: Martian Map** · команда MARS::404.
> Хакатон: сб 14.11 – нд 15.11.2026, час Europe/Kyiv. Сабміт — нд 22:30 (крайній строк 23:59).
> Цей файл — єдине джерело правди. Каркас, specs фіч, issues і код генеруються з нього. Кодова база пишеться з нуля на хакатоні.

---

## 1. Мета

Планшет / HUD астронавта для пішого виходу на гору Шарпа (кратер Gale). Відповідає на три питання:

1. **Куди піти по науку?** Наукові цілі з фото з поверхні й поясненням «навіщо».
2. **Як дійти безпечно?** Маршрут A* по реальному рельєфу з обходом крутих схилів і NoData.
3. **Коли розвертатися?** Бюджет O₂, енергії, часу й дози з резервом, ореол досяжності, «Return in N min».

Це **демонстраційна модель**, а не сертифікована навігація. Найкращий можливий статус в інтерфейсі — «у межах моделі», ніколи не «безпечно».

### Критерій успіху
- Демо-відео ≤30 с з англійськими субтитрами (або ≤7 слайдів англійською) проходить на релізному URL і офлайн.
- Дані Gale — реальні продукти NASA з простежуваними джерелами; кожна модельна константа має джерело або видиму позначку «припущення».
- ≥3 типи даних: рельєф (DEM), орбітальний знімок (HiRISE), термальний шар (THEMIS IR); плюс похідний схил і контекст місії Curiosity (маршрут, фото).
- F1–F8 мають докази AC у PR; `npm run check` зелений на `main`.

## 2. Користувач

- **Астронавт на планшеті** перед виходом і під час нього: обрати 1–3 цілі, побачити шлях, знати, скільки часу лишилось до розвороту.
- **Екіпаж у хабітаті**: перевірити план, побачити, що буде при зменшенні запасу O₂.
- **Судді Space Apps**: за 30 с побачити реальні дані NASA, науку, безпеку й чесні межі моделі.

## 3. Демо · 30 секунд

| Час | Дія | Що доводимо |
|---|---|---|
| 0–6 с | Глобус Марса → Gale → 3D-рельєф | Планетарний контекст, один детальний район |
| 6–13 с | Шари: рельєф / HiRISE / THEMIS / схил; картка цілі з фото Curiosity | ≥3 типи даних, наукова мета |
| 13–21 с | Обрати 2 цілі → «Build route» → замкнений маршрут база → цілі → база, профіль висоти → клік по відрізку → справжній знімок Navcam з цього місця | A* за модельним часом, обхід blocked/NoData; вигляд з поверхні (§7.9) |
| 21–30 с | Сценарій «O₂ −40%» → ореол звужується → відрізки без повернення червоніють, «Point of no return in N min» → «Replace target» на ближчу; плашка «model, not certified» | Модель враховує аварійне повернення (§7.8); чесність |

Запасний варіант — ≤7 слайдів англійською. Резервне відео лежить у пакеті сабміту і відтворюється без мережі.

## 4. Обсяг MVP

| У MVP | Поза MVP (лише якщо лишився час) |
|---|---|
| Gale: один детальний район; глобус із 3–5 точками, інші — картки «next site» | Детальні Jezero та інші регіони |
| 5–8 наукових цілей з фото Curiosity Navcam і посиланнями NASA/JPL | Автоматичний порядок цілей (TSP), оптимізація наукової цінності |
| A* у Web Worker, порядок цілей користувача, повернення на базу, профіль висоти | Згладжування шляху, ровер-транспорт |
| O₂, енергія, час, доза (якщо відома), резерв, ореол, сценарій «O₂ −40%» | Пилова буря як модель погоди, реальна телеметрія |
| Abort map: відрізки без повернення з аварійним запасом O₂, «Point of no return in N min» (§7.8) | Камені з HiRISE — офлайн-шар «model-derived» (рішення о сб 21:00) |
| «View from here»: найближчий справжній знімок Navcam до обраного відрізка (§7.9) | — |
| GO / NO-GO: опитування станцій перед виходом і вердикт у HUD (§7.10) | Анімація опитування, тінь зв'язку як станція |
| EVA-символіка: одна мова знаків на карті, у 2D і в списках (§7.11) | Знаки в 3D (лишаються 2D і HUD) |
| Планшетний HUD, клавіатура, 400 px, reduced motion, 2D-план Б | VR, мультиплеєр, складні ефекти |
| Статичний сайт, локальні дані, provenance кожного шару | Backend, облікові записи, LLM, ключі в браузері |
| — | Текстовий брифінг з RoutePlan, AI-зведення сектора, шторка порівняння шарів |

**Порядок скорочення**, якщо не встигаємо: камені з HiRISE → знімки на відрізках (лишити фото цілей) → червоні відрізки на карті → анімація переходу → POV-камера → «Back to globe» → термальний шар (лишити в SOURCES, прибрати з UI). **Не скорочуємо:** маршрут, цілі з фото, бюджет і повернення, Abort у HUD, походження даних, 2D-план Б.

## 5. Архітектура

**Стек:** Vite + React 19 + TypeScript (strict) + three / @react-three/fiber / drei + Zustand. Тести: Vitest + Testing Library + jsdom. Лінт: ESLint (flat, typescript-eslint). Node 22.22+ / 24.15+ / 26+ (вимога jsdom), CI — Node 24. Статичний сайт, `base: './'`, без backend і ключів. Ліцензія Apache-2.0.

**Дані** готуються офлайн: Python + GDAL у Docker (`pipeline/`) один раз вивантажує bbox з Mars Trek і MMGIS і кладе файли в `public/data/gale/`. Під час демо застосунок не ходить у мережу.

```text
Mars Trek ImageServer / WMTS, MMGIS, raw images API
        │  (один раз, скрипт; CORS не потрібен)
        ▼
pipeline/ (Docker: Python + GDAL)  crop → resample → slope/walkable/hazard → validate → sha256
        ▼
public/data/gale/  region.json, elevation.f32, slope.f32, walkable.u8, hazard.f32,
                   hirise.jpg, layers/*.png, targets.geojson, photos/*.jpg, traverse.geojson
        ▼
F3 loadRegion → setRegionData({ region, grid, targets }) ──► useMission (Zustand, єдиний store)
                                                               │
   F1 globe ─ setSite ─────────────────────────────────────────┤
   F6 targets ─ toggleTarget / replaceTarget ──────────────────┤
   F4 planRoute (Worker) ─ setPlan, setSelectedSegment ────────┤
   F5 budget + reachability ─ setBudget, setReach, setLimits ──┤
   F7 HUD ─ setTime, replaceTarget(reach.swap) ────────────────┤
                                                               ▼
                         F2 MapView (R3F canvas / 2D-план) читає все, нічого не пише
```

### 5.1 Структура репо

```text
CONSTITUTION.md, AGENTS.md, CLAUDE.md, README.md, LICENSE      (корінь)
specs/F<N>/spec.md
src/contracts/          типи + чисте ядро координат (planning.ts)       — спільне
src/store/useMission.ts єдиний store                                     — спільне
src/app/                композиція: слоти всіх фіч уже змонтовані F0     — спільне
src/mocks/              детерміновані mock-сітка, цілі, модель           — спільне
src/ui/                 Panel, Gauge, StatusNote, OwnerBadge, tokens.css — F7
src/core/               графове ядро: ребра, вартість, A*, дерева        — F4/F5
src/features/{globe,terrain,data,route,budget,science,hud}/
pipeline/               Python + GDAL, Dockerfile                        — F3
public/data/{mars,gale}/
docs/{SPEC.md,AI_LOG.md,SOURCES.md,demo/,submission/}
.github/{workflows/,CODEOWNERS,pull_request_template.md}
```

### 5.2 Правила обміну
- Фічі обмінюються **лише через `useMission`**. Типи — **лише з `src/contracts`**. Імпорт з чужої `src/features/*` заборонений; дозволено імпортувати `src/contracts`, `src/store`, `src/ui`, `src/mocks`, а F4/F5 — ще `src/core`.
- **Композиція.** F0 створює `src/app` зі змонтованими слотами і заглушки `src/features/<f>/index.ts` з іменованими експортами нижче. Власник фічі наповнює свій експорт і `src/app` не чіпає.
- **Полотно.** Єдиний R3F `<Canvas>` належить F2 (`MapView`). Глобус F1 потрапляє в нього через проп від `src/app`: `<MapView globe={<GlobeScene />} />`. F2 малює рельєф, текстуру, шари, цілі, маршрут, підсвітку відрізка й ореол, беручи їх зі store.
- **Одне джерело чисел повернення.** «Return in N min», статус бюджету й кандидат на заміну цілі рахує тільки F5 і публікує в `reach`. HUD і панелі лише показують.

| Фіча | Експорт з `src/features/<f>/index.ts` |
|---|---|
| F1 globe | `GlobeScene` (R3F-вузли), `SitePanel` |
| F2 terrain | `MapView({ globe })`, `CameraModes` |
| F3 data | `DataLoader` (headless), `LayersPanel` |
| F4 route | `RoutePanel` (кнопка Build, профіль, таблиця відрізків) |
| F5 budget | `BudgetEngine` (headless), `BudgetPanel` (шкали, сценарій O₂) |
| F6 science | `TargetsPanel`, `TargetCard` |
| F7 hud | `Shell` (адаптивна сітка), `Hud` |

### 5.3 Спільні файли

Будь-який PR, що їх чіпає, **не мерджиться автоматично**, а чекає на рев'ю @xand0dev:
`src/contracts/**`, `src/store/**`, `src/app/**`, `src/mocks/**`, `src/main.tsx`, `src/test-setup.ts`, `package.json`, `package-lock.json`, `vite.config.*`, `tsconfig*.json`, `eslint.config.*`, `index.html`, `.github/**`, `CONSTITUTION.md`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `docs/SPEC.md`, `specs/_templates/**`.

**Будь-який шлях, якого немає в таблиці §9, теж спільний.** Машинна версія карти — `.github/scripts/paths.mjs`; з неї працюють guard і CODEOWNERS.

**Не вважаються спільними:**
- `docs/AI_LOG.md` і `docs/SOURCES.md`. У них заздалегідь є розділи `## F1`…`## F8`, і кожен дописує рядки лише у свій розділ.
- `specs/F<N>/**` власної фічі.

Потрібне нове поле, дія чи тип — issue з міткою `contract` (що, навіщо, приклад даних). Поки його не змерджено, працюєш на mocks.

## 6. Контракти

Нормативні сигнатури для `src/contracts/index.ts`; реалізацію генерує F0. Одиниці: м, °, с, г, Wh, µSv.

```ts
export type XY = readonly [xM: number, yM: number];          // локальні метри: x — схід, y — північ
export type Evidence = 'verified' | 'assumption' | 'mock' | 'pending';

export interface Source {
  id: string; title: string; url?: string; productId?: string;
  status: Evidence; note: string; credit?: string; accessedAt?: string; // ISO
}

export interface Layer {
  id: 'terrain' | 'optical' | 'thermal' | 'slope' | 'traverse' | string;
  name: string; kind: 'terrain' | 'optical' | 'thermal' | 'slope' | 'mission';
  url: string; sourceIds: string[]; status: Evidence; units: string;
  nativeResolutionM: number | null; gridResolutionM: number;
  method: string;                                             // як отримано: resample, derived…
  legend: { value: number; label: string; color: string }[];
}

export interface Region {
  schemaVersion: 1; id: 'gale'; name: string; status: Evidence;
  grid: {
    width: number; height: number; metersPerPixel: number;
    originM: XY;                                              // північно-західний зовнішній кут
    rowOrder: 'north-to-south';
    boundsLonLat: readonly [west: number, south: number, east: number, north: number];
    crs: string;                                              // 'Mars 2000 geographic (Trek bboxSR 104905)'
  };
  files: {                                                    // відносно папки регіону, через BASE_URL
    elevation: string; slope: string; walkable: string; hazard: string; // .f32 / .u8, row-major, LE
    texture: string; targets: string; traverse?: string;
    photos?: string;                                          // photos.geojson (F6), §6.0
  };
  noData: number;                                             // сирий sentinel у elevation.f32
  base: XY; model: ModelParams; limits: Resources;
  limitsEvidence?: Record<keyof Resources, Source>;   // джерело кожного ліміту; немає — «assumption» (§7.6)
  layers: Layer[]; sources: Source[];
}

export interface Target {
  id: string; name: string; coordinates: XY; lonLat: readonly [lon: number, lat: number];
  why: string; sourceIds: string[]; status: Evidence;
  locationAccuracy: 'verified' | 'approximate' | 'mock';
  photo: { url: string; alt: string; sourceUrl?: string; credit: string; sol?: number; status: Evidence } | null;
}

export interface SurfacePhoto {                                // знімок з поверхні для «View from here» (§7.9)
  id: string; coordinates: XY; lonLat: readonly [lon: number, lat: number];
  url: string; alt: string; sourceUrl: string; credit: string; sol: number;
  camera: string;                                             // 'NAV_LEFT_B' тощо, як дає raw images API
  locationAccuracy: 'rover-stop' | 'approximate';             // координати зупинки ровера за sol, не місце кадру
  status: Evidence;
}

export interface Resources {                                  // залишки (або ліміти)
  time: number; o2: number; energy: number;
  dose: number | null;                                        // null = невідомо
}

export interface ModelParams {
  speedMps: number; uphillFactor: number; downhillFactor: number;
  o2GPerS: number; energyWhPerM: number; doseUSvPerS: number | null;
  maxSlopeDeg: number; hazardWeight: number; reserveFraction: number; // [0,1)
  emergencyO2G: number;                                       // аварійний запас O₂, г; на план не витрачається (§7.8)
  evidence: Record<keyof Omit<ModelParams, 'evidence'>, Source>;
}

export interface PlanningGrid {
  width: number; height: number; metersPerPixel: number; originM: XY;
  elevationsM: Float32Array;                                  // NoData → NaN
  slopesDeg: Float32Array; walkable: Uint8Array;              // 1 = прохідна
  hazard: Float32Array;                                       // [0,1], модельний індекс
}

export interface Segment {
  from: XY; to: XY; dist: number; slope: number;              // slope — градуси, + = підйом
  time: number; o2: number; energy: number; dose: number | null;
}
export type RouteFailure =
  | { code: 'invalid-params' }
  | { code: 'out-of-grid' | 'blocked-point' | 'disconnected'; pointIndex: number } // 0 = старт, 1…n = цілі, n+1 = база
  | { code: 'no-path-leg'; legIndex: number };
export interface RoutePlan {
  status: 'ok' | 'pending' | 'no-path' | 'invalid';
  path: XY[]; segments: Segment[]; legs: number[];            // legs: індекс першого відрізка кожної ноги
  totals: Resources & { dist: number };                       // витрати
  reason?: RouteFailure; warnings: string[]; requestId: number;
}

export interface ReachabilityResult {
  status: 'estimated' | 'incomplete' | 'invalid';
  mask: Uint8Array;                                           // 1 = туди й назад у межах бюджету з резервом
  returnInS: number | null;                                   // §7.4; null — не оцінено
  deficits: (keyof Resources)[];                              // ресурси, яких бракує на план
  swap: { dropId: string; addId: string } | null;             // кандидат заміни цілі
  abort: AbortPlan | null;                                    // §7.8; null — немає чинного плану
  warnings: string[];
}

export interface AbortPlan {
  segments: { returnS: number | null; ok: boolean }[];        // по одному на plan.segments[i]; returnS — час до бази з кінця відрізка
  pointOfNoReturnS: number | null;                            // с від початку плану до першого відрізка з ok = false; null — повернення звідусіль
  emergencyO2G: number;                                       // який запас враховано (з model, для підпису й «assumption»)
}

export interface MissionState {
  site: 'gale' | null; layers: Record<string, boolean>;
  targets: Target[]; selectedTargetIds: string[]; selectedSegment: number | null;
  photos: SurfacePhoto[];                                     // до завантаження — []
  region: Region | null; grid: PlanningGrid;                  // до завантаження — mockGrid
  model: ModelParams; limits: Resources;                      // з region.json, до того — mocks
  waypoints: XY[]; plan: RoutePlan | null;
  budget: Resources; reach: ReachabilityResult | null; time: number; // time — минуло, с
  base: XY | null; position: XY | null;

  setSite(site: 'gale' | null): void;
  toggleLayer(id: string): void;
  setRegionData(d: { region: Region; grid: PlanningGrid; targets: Target[]; photos?: SurfacePhoto[] }): void;
  toggleTarget(id: string): void;
  replaceTarget(dropId: string, addId: string): void;
  setWaypoints(points: XY[]): void;
  setPlan(plan: RoutePlan | null): void;
  setSelectedSegment(i: number | null): void;
  setBudget(b: Resources): void; setReach(r: ReachabilityResult | null): void;
  setLimits(l: Resources): void; setTime(elapsedS: number): void; setPosition(p: XY): void;
}
```

`src/contracts/planning.ts` — чисте ядро координат без React і стану: `cellIndex(grid, row, col)`, `inGrid(grid, row, col)`, `cellCenter(grid, row, col)`, `xyToCell(grid, xy)`, `lonLatToXY(region, lonLat)`, `toR3F(xy, h)`, `isNoDataValue(h, noData?)`, `isBlocked(grid, i, maxSlopeDeg?)`, `validateGrid(grid)`, `dataUrl(path)` (через Vite `BASE_URL`).

`src/contracts/gonogo.ts` — чиста функція `evaluateGoNoGo(state) → { verdict, during, stations[] }` за §7.10. Її викликає HUD (F7) і тести; власних розрахунків маршруту чи бюджету вона не робить.

### 6.0 Файли даних

- **`targets.geojson`** (пише F6): `FeatureCollection` точок, `geometry.coordinates = [lon, lat]` у градусах, `properties` = `Target` без `coordinates` і `lonLat`. `DataLoader` (F3) перетворює `[lon, lat]` через `lonLatToXY` і заповнює `Target.coordinates` та `lonLat`; ціль поза сіткою відкидається з попередженням.
- **`traverse.geojson`** (пише F3): `LineString` `[lon, lat, elev]`. F2 читає його за `region.files.traverse` і перетворює через `lonLatToXY`.
- **`photos/photos.geojson`** (пише F6, прив'язку до зупинок робить Іван): `FeatureCollection` точок `[lon, lat]` — координати зупинки ровера в sol знімка (MMGIS); `properties` = `SurfacePhoto` без `coordinates` і `lonLat`. Файли зображень — локально в `photos/`. `DataLoader` (F3) читає його за `region.files.photos`, заповнює `coordinates` / `lonLat` і передає в `setRegionData({ …, photos })`; знімок поза сіткою відкидається з попередженням. Немає файла — `photos = []`, працює запасний варіант §7.9.

### 6.1 Правила store (реалізує F0, тестує F0)

| Дія | Ефект |
|---|---|
| `setSite(x)` | Скидає `waypoints`, `plan`, `reach`, `selectedTargetIds`, `selectedSegment` і `time`. `position = base`. `null` повертає до глобуса. |
| `toggleTarget` / `replaceTarget` | Перераховує `waypoints` = координати обраних цілей у порядку вибору. Ставить `plan = null`, `reach = null`, `selectedSegment = null`. `replaceTarget` ставить нову ціль на місце старої в порядку. Після першого «Build route» F4 сам перебудовує план на кожну зміну `waypoints`. |
| `setWaypoints` | Задає порядок вручну (F4). Інвалідує `plan` і `reach`. |
| `setRegionData` | Записує `region`, `grid`, `targets`, `photos` (без поля — `[]`), `model`, `limits`, `base`. Скидає як `setSite`. |
| `setLimits` | Сценарій (F5). `reach = null`, `plan` лишається. |

Хто що читає й пише — таблиця фіч у §8.

## 7. Правила обчислень

### 7.1 Координати й сітка
- Сітка north-to-south, row-major: `i = row × width + col`.
- Центр клітинки: `x = originX + (col + 0.5) × mpp`, `y = originY − (row + 0.5) × mpp`.
- У 3D точка `(x, h, y)` стає `(x, h × 3, −y)`. Перебільшення ×3 лише візуальне: підписи й числа завжди в справжніх метрах, на екрані є напис «height ×3».
- Lon/lat → метри: 1° на екваторі Марса ≈ 59.27 км (R = 3396.19 км). Gale лежить біля екватора, тож рахуємо як рівнопроміжну площину з `cos(lat)` для довготи.

### 7.2 NoData і прохідність
Клітинка **заблокована**, якщо виконується будь-що з переліченого:
- `walkable ≠ 1`;
- висота, схил або hazard `NaN` чи `±Infinity`;
- сира висота дорівнює `region.noData`, або `|h| ≥ 3e38` (у `exportImage` значення noData не вказане);
- схил клітинки більший за `maxSlopeDeg`.

Заблокована клітинка ніколи не «безпечна»: у 3D і 2D вона окремого кольору з підписом, в ореол не входить. Невідоме ніколи не стає нулем.

### 7.3 Маршрут (F4, ядро в `src/core`)
- Граф на 8 сусідів з фіксованим порядком обходу. Діагональ дозволена, лише коли обидві ортогональні сусідні клітинки прохідні: заблоковані кути не зрізаються.
- Для ребра між центрами `a → b`:
  - `horiz = mpp` (або `mpp·√2` для діагоналі), `dz = h_b − h_a`, `dist = hypot(horiz, dz)`, `slope = atan2(dz, horiz)`;
  - ребро заборонене, якщо `|slope| > maxSlopeDeg`;
  - `time = dist / speedMps × (1 + uphillFactor × max(0, tan slope) + downhillFactor × max(0, −tan slope))` — асиметричний за схилом;
  - `cost = time × (1 + hazardWeight × (hazard_a + hazard_b) / 2)`.
- Евристика — `евклідова горизонтальна відстань / speedMps`; вона допустима, бо `cost ≥ time ≥ dist/speed`.
- **Еталонне ребро** (mock: `mpp = 10`, `speed = 1 м/с`, `uphill = 2`, `downhill = 0.5`, `hazardWeight = 0.5`, hazard обох клітинок 0.1): `dz = +1 м` → `dist = 10.050`, `slope = 5.71°`, `time = 10.050 × 1.2 = 12.060 с`, `cost = 12.060 × 1.05 = 12.663`. Зворотне ребро (`dz = −1`): `time = 10.050 × 1.05 = 10.552 с`, `cost = 11.080`.
- Tie-break: менше `g`, потім менший індекс. Жодного `Math.random`, однакові входи дають однаковий шлях.
- План: `position` (до старту дорівнює `base`) → цілі в порядку `waypoints` → `base`. Збій будь-якої ноги анулює весь план і дає `reason`.
- Ресурси відрізка: `o2 = time × o2GPerS`; `energy = dist × energyWhPerM`; `dose = time × doseUSvPerS`, якщо rate відомий, інакше `null`. Якщо хоч одна доза `null`, сума теж `null`.
- Рахується у Web Worker; на кожен запит новий `requestId`, застарілі відповіді відкидаються. Ціль — ≤2 с на сітці 256×256.

### 7.4 Бюджет, резерв і «Return in N» (F5)
- **Резерв** береться один раз від ліміту: `reserve_k = reserveFraction × limits_k`. Ресурс `k` у нормі, якщо `витрата_k ≤ budget_k − reserve_k`. **Рівність допустима.**
- **Минулий час** `t = time` у store (поле HUD «Elapsed»):
  - `budget.time = limits.time − t`;
  - `budget.o2 = limits.o2 − t × o2GPerS`;
  - `budget.dose = limits.dose − t × doseUSvPerS` (або `null`);
  - `budget.energy = limits.energy`: енергія витрачається лише на рух.
- **Return in N min** — скільки хвилин можна провести на зупинках, перш ніж запас з'їсть резерв, якщо далі пройти план:
  `returnInS = min_k ((budget_k − reserve_k − планова_витрата_k) / rate_k)` для `k ∈ {time (rate 1), o2 (o2GPerS), dose (doseUSvPerS, якщо відомий)}`.
  - Планова витрата — `plan.totals`. Без плану це шлях `position → base` (у базі — 0).
  - Енергія не має погодинної норми, тож у N не входить. Її нестача потрапляє в `deficits`.
  - `N = floor(returnInS / 60)`. Якщо `returnInS < 0`, це дефіцит.
  - Якщо цілі обрано, а `plan.status ≠ 'ok'` (немає плану, `pending`, помилка), то `returnInS = null`, а наступна дія — «Build route» / «Calculating…». Число без чинного плану не показуємо.
- **Еталонний приклад для тестів F4/F5/F7.** Це mock-фікстура, а не наука: `limits.time = 3600 с`, `limits.o2 = 720 г`, `o2GPerS = 0.2`, `reserveFraction = 0.2`, доза невідома.
  - Без плану, `t = 0`: `min(3600 − 720, (720 − 144) / 0.2) = 2880 с` → **48 хв**, статус `incomplete` («оцінка неповна: доза — немає даних»).
  - План `time = 900 с`, `o2 = 180 г`: `min(2880 − 900, (576 − 180) / 0.2 = 1980) = 1980 с` → **33 хв**.
  - Той самий план, `t = 600 с`: `min(3000 − 720 − 900, (600 − 144 − 180) / 0.2 = 1380) = 1380 с` → **23 хв**.
  - Сценарій «O₂ −40%» (`limits.o2 = 432`), `t = 0`: `min(1980, (432 − 86.4 − 180) / 0.2 = 828) = 828 с` → **13 хв**.
  - Той самий сценарій, ціль щойно замінено, план ще перебудовується: `returnInS = null` → «Calculating…», а не 28 хв.
- **Ореол (reachability).**
  - Будуються два дерева найменшої вартості: від `position` на прямому графі і до `base` на зворотному. Схили асиметричні, тому зворотні ребра рахуються окремо.
  - Клітинка `c` потрапляє в `mask`, якщо обидва шляхи існують і для кожного відомого ресурсу `витрата(pos→c) + витрата(c→base) ≤ budget_k − reserve_k`.
  - Зменшення бюджету ніколи не розширює ореол.
- **Статуси.**
  - `invalid`: некоректні параметри (`speed ≤ 0`, від'ємні значення, `reserveFraction ∉ [0,1)`, `NaN`). Маска порожня, `returnInS = null`.
  - `incomplete`: невідома доза або її ліміт. Числа показуються, але з текстом «return not fully assessed».
  - `estimated`: усі ресурси відомі.
  - Невідомий бюджет ніколи не означає «безпечно».
- **Кандидат заміни (`swap`)**, якщо є дефіцит або обрана ціль поза ореолом:
  - `drop` — обрана ціль з найбільшою вартістю «база → ціль → база» за деревами;
  - `add` — необрана ціль в ореолі з найменшою такою вартістю, меншою за вартість `drop`;
  - якщо такої немає, `swap = null`.
  Це модельна вартість, а не відстань по прямій.

### 7.5 Рендер
- `frameloop="demand"`, без власних таймерів, що пишуть у store.
- Ціль ≥30 FPS: медіана за 60 с після прогріву на ноутбуці демо, з записом пристрою, браузера й роздільності.
- Без WebGL, після втрати контексту або з невалідною сіткою показується 2D-план (canvas/SVG) з текстом причини, blocked/NoData, цілями й маршрутом. Порожнього полотна немає.

### 7.6 Чесність даних
- Кожна константа `ModelParams` і `limits` має `Source`. Без джерела — `status: 'assumption'`, і на екрані видно «assumption».
- **Кандидати джерел** перевіряє Влад до сб 21:00:
  - швидкість пішохода в скафандрі й O₂ на виході — NASA BVAD / дані EVA;
  - поріг `maxSlopeDeg` — припущення;
  - аварійний запас `emergencyO2G` = 30 хв × `o2GPerS` (мінімум аварійного запасу за EMU SOP; джерела — `docs/SOURCES.md ## F5`).
- **Рішення 14.11 (#20, #41):** у реальній моделі `region.json` — `o2GPerS` ≈ 0.031 г/с (Apollo, ходьба), `emergencyO2G` = 30 хв × `o2GPerS` ≈ 56 г, `limits.o2` = **200 г** зі статусом «assumption» (залишок кисню на цей вихід для демо). Еталонні числа §7.3–7.4 і §7.8 лишаються **mock-фікстурою для тестів** і не є параметрами реальної моделі.
- Джерела лімітів — `region.limitsEvidence` (по одному `Source` на `time`, `o2`, `energy`, `dose`); F5 і F7 показують біля шкали «assumption», якщо джерела немає або його статус не `verified`.
- Доза — кандидат Curiosity RAD (перевіряє Настя). Карти радіації по місцевості немає: точкову дозу на карту не розтягуємо.
- Mock завжди підписаний «MOCK». Кожне джерело — рядок у `docs/SOURCES.md` (id, URL, product ID, credit, дата доступу, статус).

### 7.7 Доступність
- 400 px без горизонтального скролу; також 768 / 1024 / 1440.
- Уся робота з клавіатури; фокус видно рамкою ≥3 px.
- Ціль дотику ≥40 px.
- Ризик передається іконкою **і** текстом, колір лише доповнює.
- Live region: `role="status"`, для дефіциту — `role="alert"`.
- `prefers-reduced-motion` прибирає переходи.
- Мова інтерфейсу — англійська (для суддів і відео).

### 7.8 Abort map і точка неповернення (F5)
Правило Apollo: з будь-якої точки маршруту екіпаж має змогу повернутися на базу пішки. Abort map показує, з яких відрізків плану це можливо з аварійним запасом O₂.
- Рахується лише для чинного плану (`plan.status = 'ok'`); інакше `reach.abort = null`.
- Для відрізка `i` (кінець — `segments[i].to`):
  - **витрачено до кінця відрізка** `used_k(i) = Σ_{j ≤ i} segments[j].k` для time, o2, energy, dose;
  - **дорога назад** — зворотне дерево до бази (§7.4, ті самі зворотні ребра): `back.time`, `back.dist` з клітинки кінця; `back.o2 = back.time × o2GPerS`, `back.energy = back.dist × energyWhPerM`, `back.dose = back.time × doseUSvPerS` (якщо відомий);
  - **запас безпеки** `safety_o2 = emergencyO2G`; для time, energy і dose — резерв §7.4 (`reserveFraction × limits_k`);
  - відрізок **повертабельний** (`ok = true`), якщо для кожного відомого ресурсу `back_k(i) ≤ budget_k − used_k(i) − safety_k`. Рівність допустима (той самий допуск float, що й у §7.4). Немає шляху назад — `ok = false`, `returnS = null`.
- `returnS = back.time` (с).
- **Точка неповернення** — початок першого відрізка з `ok = false`: `pointOfNoReturnS = Σ_{j < i*} segments[j].time`. Якщо всі `ok`, то `null`. Відлік — від старту плану (позиція до виходу = база).
- Пізніші відрізки біля бази можуть знову бути `ok`: кожен відрізок фарбується окремо, а точка неповернення — лише перша.
- `emergencyO2G` має `Source` у `model.evidence`; без джерела на екрані видно «assumption».
- **Еталон для тестів** (mock-модель, `emergencyO2G = 360 г`, `limits` з §7.4, `t = 0`): відрізок з `used.o2 = 100 г`, `back.time = 500 с` → `back.o2 = 100 г ≤ 720 − 100 − 360 = 260` → `ok`; той самий з `back.time = 1400 с` → `280 > 260` → не `ok`.

### 7.9 «View from here» — знімок з маршруту (F4)
- Для обраного відрізка (`selectedSegment`) береться його середина; кандидати — `photos` (§6.0), а якщо їх немає — фото цілей (`targets[].photo` з `targets[].coordinates`).
- Показується найближчий знімок за горизонтальною відстанню в метрах, якщо він ближче за **300 м** (поріг — «assumption»); інакше текст «No surface photo within 300 m».
- Підпис чесний: «Navcam, sol N, taken ~D m from this segment (rover stop)», credit як дає джерело, `alt`, посилання на `sourceUrl`. Знімок — вид із зупинки ровера, а не з точки маршруту.
- Немає файла знімка або не завантажився — заглушка з `alt`, а не порожня рамка.

### 7.10 GO / NO-GO (F7 показує, рахує `src/contracts/gonogo.ts`)
Як передстартове опитування: кожна станція відповідає GO, CAUTION, NO-GO або HOLD з причиною одним рядком; вердикт — найгірший виклик (HOLD > NO-GO > CAUTION > GO).

| Станція | Читає | GO | CAUTION | NO-GO | HOLD | Дія |
|---|---|---|---|---|---|---|
| RTE маршрут | `plan` | `ok` | — | `no-path` / `invalid` з кодом | немає цілей, немає плану, `pending` | обрати цілі / «Build route» |
| LSS ресурси | `reach.deficits` | порожньо | — | будь-який дефіцит | немає `reach` | `replaceTarget(swap)` або прибрати ціль |
| RTN повернення | `reach.returnInS` | ≥ 15 хв | 0 – 15 хв (поріг — assumption) | < 0 | `null` | «Return now» |
| SCI цілі | `reach.mask` + `xyToCell` | усі обрані в ореолі | — | ціль поза ореолом | маска не тієї сітки | `replaceTarget(swap)` або прибрати ціль |
| ABT abort map | `reach.abort` (§7.8) | `pointOfNoReturnS = null` | точка неповернення є; або `abort = null` | точка неповернення = 0 | — | — |
| DAT рельєф | `grid`, `region.status` | `verified` | MOCK / інший статус | `validateGrid` з помилками | — | — |
| RAD радіація | `model.doseUSvPerS`, `limits.dose` | обидва відомі | немає даних | — (дефіцит дози — у LSS) | — | — |
| MDL модель | `reach.status` | `estimated` | `incomplete` | `invalid` | немає `reach` | — |

- Без сайту — усі станції HOLD «No site selected». Невідоме ніколи не дає GO.
- **Перед виходом** (`time = 0`): GO — кнопка виходу; CAUTION — вихід лише після утримування кнопки 1,5 с, у HUD лишається запис часу й підтверджених станцій; NO-GO — кнопки виходу немає, біля станцій дії виправлення; HOLD — наступна дія.
- **Під час виходу** (`time > 0`): вердикт оновлюється сам; NO-GO → «Return to base now» з `role="alert"`.
- Найкращий текст вердикту — «within model», ніколи не «safe».

### 7.11 EVA-символіка (F7 визначає, F2 і F6 використовують)
Форма знака — тип об'єкта, заливка й контур — стан, підпис поруч — деталі. Колір лише доповнює. Знаки — SVG-компоненти в `src/ui`, однакові в 3D-підписах, 2D-плані, HUD і списках.

| Об'єкт | Знак | Стан |
|---|---|---|
| База / хабітат | квадрат | — |
| Наукова ціль | коло | обрана — заливка; необрана — контур; поза ореолом — пунктир і «!» |
| Небезпека (схил, пісок) | трикутник | рівень — заливка або контур + текст |
| NoData / невідоме | ромб із «?» | завжди однаковий, ніколи не колір «прохідно» |
| Астронавт | шеврон за напрямком руху | — |
| Точка неповернення | ромб із «!» | на маршруті, з часом у підписі |
| Знімок Navcam | квадрат-рамка з крапкою | — |

## 8. Дані NASA

| Шар / дані | Джерело | Як беремо | Тип |
|---|---|---|---|
| Рельєф 1 м | Mars Trek ImageServer `Gale_DEM_SMG_1m/exportImage` (`bboxSR=104905`, `pixelType=F32`, `format=tiff`) | pipeline: тайловий float32 TIFF (теги 322–325, GDAL читає) → середнє до планувальної сітки | terrain |
| Знімок | `curiosity_hirise_mosaic/exportImage` (`format=jpg`), той самий bbox | текстура рельєфу, 2048² | optical |
| Схил, walkable, hazard | похідні від DEM | схил на нативному 1 м, агрегація до клітинки **за максимумом**; hazard = функція схилу, формула в `region.json` як assumption | slope (похідний) |
| Термальний | Mars Trek WMTS THEMIS Day/Night IR, ~100 м | PNG-тайли → накладка; на район ~2.5 км це ~25×25 нативних пікселів, тому **лише відображення, не вхід hazard** | thermal (незалежний) |
| Маршрут Curiosity, зупинки | MMGIS `MSL_traverse.json`, `MSL_waypoints.json`, `MSL_waypoints_current.json` | обрізка по bbox → `traverse.geojson`; зупинки — кандидати цілей | mission |
| Фото з поверхні | raw images API `msl:mission`, `is_thumbnail=false`; `site`+`drive` = `RMC` зупинки | URL і credit кожного фото; файли локально в `photos/` | photo |

**Район (bbox).** Сітка — 256×256 клітинок ≤10 м (≤2.56 км).
- Кандидат — квадрат навколо поточної позиції Curiosity (sol 5070: lat −4.8257, lon 137.3892), всередині покриття DEM (137.122…137.730, −4.925…−4.249).
- Єдиний bbox, перевірений живим запитом, — 137.400–137.422°, −4.750…−4.728° (висоти −4108…−3817 м). Він не містить поточної позиції марсохода. Це план Б.
- **Рішення приймає Максим до сб 14:00** за критеріями:
  1. `exportImage` дає скінченні висоти;
  2. частка NoData <5%;
  3. всередині ≥5 зупинок Curiosity з повнокадровими фото.
- Базу (хабітат) обирає Максим разом із Настею: прохідна клітинка в bbox, позначена «assumption».

**Офлайн.** Усі файли лежать у `public/data/gale/` разом з `source.json` (URL, дата, розмір, sha256). Каталог Trek (`searchItems`) не має CORS, тому використовується лише в pipeline.

## 9. Команда й фічі

| Фіча | Власник | GitHub | Гілка | Дозволені шляхи | Читає зі store | Пише в store |
|---|---|---|---|---|---|---|
| F0 Каркас, contracts, store, CI, інтеграція | Олександр | xand0dev | `feat/F0` | спільні файли §5.3, `src/features/*/index.ts` (заглушки) | — | — |
| F1 Глобус і вибір місця | Іван | gonivanko | `feat/F1` | `src/features/globe/**`, `public/data/mars/**`, `pipeline/globe/**` | site | `setSite` |
| F2 3D-рельєф і 2D-план | Олександр | xand0dev | `feat/F2` | `src/features/terrain/**` | site, grid, region, layers, targets, selectedTargetIds, plan, selectedSegment, reach, base, position | — |
| F3 Дані й шари | Максим | kingsneverdie17 | `feat/F3` | `pipeline/**` (крім `pipeline/globe`), `public/data/gale/**` (крім `targets*`, `photos/`), `src/features/data/**` | site, layers, region | `setRegionData` (з `photos`), `toggleLayer` |
| F4 Маршрут A* | Влад | froozy3 | `feat/F4` | `src/features/route/**`, `src/core/**` | grid, model, limits, waypoints, base, position, plan, selectedSegment, reach, targets, photos, region | `setPlan`, `setWaypoints`, `setSelectedSegment` |
| F5 Бюджет і повернення | Влад | froozy3 | `feat/F5` | `src/features/budget/**`, `src/core/**` | grid, model, limits, plan, time, base, position, targets, selectedTargetIds | `setBudget`, `setReach`, `setLimits` |
| F6 Наукові цілі й фото | Настя | Bulka0801 | `feat/F6` | `src/features/science/**`, `public/data/gale/targets*`, `public/data/gale/photos/**` | site, targets, selectedTargetIds, reach, grid | `toggleTarget` |
| F7 UI, HUD, дизайн-токени | Оля | oljyaaa | `feat/F7` | `src/features/hud/**`, `src/ui/**` | site, plan, budget, reach, time, limits, targets, selectedTargetIds | `setTime`, `replaceTarget` |
| F8 Демо й сабміт | Олександр | xand0dev | `feat/F8` | `docs/demo/**`, `docs/submission/**`, `README.md` | — | — |

Кожній фічі F1–F8 (і F0) також дозволено: `specs/F<N>/**`, свій розділ у `docs/AI_LOG.md` і `docs/SOURCES.md`. **Тести лежать поруч із кодом** у своїй папці (`*.test.ts(x)`).

Додатково:
- **Настя:** QA на `main` (Pages) у вікна інтеграції, `docs/SOURCES.md`, рев'ю F2/F7 у браузері.
- **Оля:** презентація й пітч.
- **Іван:** доступність (#5), скрипт прив'язки знімків Navcam до зупинок MMGIS за sol для `photos.geojson` (у шляхах F6, разом з Настею), прогін демо.
- **Abort map і «View from here»** (§7.8–7.9): F5 рахує `reach.abort`, F4 показує знімок і позначає відрізки без повернення в таблиці, F2 фарбує їх на карті, F7 — «Point of no return» у HUD, F6 + Іван — знімки, F3 — `photos` у `DataLoader` і `emergencyO2G` у `region.json`.
- F4 і F5 ділять `src/core/` (одна людина, конфлікту немає).
- `docs/AI_LOG.md` і `docs/SOURCES.md` кожен змінює лише у своєму розділі.

### F0 — Каркас (Олександр)
Vite-проєкт, contracts, store з правилами §6.1, mocks (128×128 синтетична сітка по 10 м з blocked-зоною й NaN, 5 цілей MOCK, модель з `assumption`), `src/app` зі слотами, заглушки експортів, CI, automerge, path-guard, Pages, CONSTITUTION, AGENTS, specs F1–F8, AI_LOG, SOURCES, LICENSE.
- **F0-AC1. Given** чистий checkout; **When** `npm ci && npm run check`; **Then** lint, typecheck, test і build проходять, а сторінка відкривається без помилок консолі і показує всі слоти з бейджем MOCK.
- **F0-AC2. Given** PR з гілки `feat/F<N>` змінює лише свої шляхи; **When** CI зелений; **Then** PR сам мерджиться squash-ом. **Given** PR чіпає спільний файл або чужу папку; **Then** guard позначає його «needs review» (чужа папка — червоний), і automerge не вмикається.
- **F0-AC3. Given** у PR внесено помилку типів; **When** запущено CI; **Then** `check` червоний, merge заблоковано.
- **F0-AC4. Given** store; **When** `toggleTarget`, `replaceTarget`, `setSite`, `setRegionData`; **Then** інвалідація відбувається за §6.1 (unit-тести).
- **F0-AC5. Given** PR, змерджений **автоматично** (automerge); **When** відпрацював deploy; **Then** GitHub Pages відкриває нову версію з `base: './'`, а дані вантажаться без 404.

### F1 — Глобус і вибір місця (Іван)
3D-глобус Марса з текстурою (джерело й credit у SOURCES, файл у `public/data/mars/`) і 3–5 точками за координатами IAU Gazetteer. Gale відкриває район, інші точки показують картку «next site». Обертання перетягуванням, без самообертання.
- **F1-AC1. Given** `site = null`; **When** натиснуто кнопку «Gale / Mount Sharp» (мишею, Enter або Space); **Then** викликано `setSite('gale')`, у полотні з'являється рельєф Gale, і маркер Gale позначено активним.
- **F1-AC2. Given** панель локацій; **When** обрано Jezero або іншу не-Gale точку; **Then** видно короткий опис і «next site — not modelled», `site` не змінюється.
- **F1-AC3. Given** увімкнено reduced motion або натиснуто «Skip»; **When** обрано Gale; **Then** район відкривається одразу, без анімації.
- **F1-AC4. Given** глобус; **When** відмальовано; **Then** маркери стоять у точках `latLonToSphere` (lon 0 → +X, lon +90 → −Z, lat +90 → +Y), узгоджено з текстурою. Видно підпис джерела текстури. Без текстури показується процедурна сфера з «MOCK», кнопки працюють.
- **F1-AC5. Given** район Gale відкрито; **When** натиснуто «Back to globe»; **Then** `setSite(null)` повертає глобус, і стан скинуто.

### F2 — 3D-рельєф і 2D-план (Олександр)
`MapView`: єдиний Canvas, рельєф із `grid`, текстура HiRISE, накладки шарів, цілі, маршрут, підсвітка відрізка, ореол; камери «Orbit», «Top», «POV»; 2D-план Б.
- **F2-AC1. Given** `site = 'gale'` і сітка; **When** відкрито рельєф; **Then** вершини, маркери цілей і маршрут беруть висоту з тієї самої сітки за `(x, h×3, −y)`, а на екрані видно розмір сітки, м/клітинку, «height ×3» і статус даних (verified / MOCK).
- **F2-AC2. Given** сітка з `walkable = 0`, `NaN` і сирим `noData`; **When** відкрито 3D або 2D; **Then** жодна з цих клітинок не має кольору прохідної поверхні чи ореолу, а 2D показує лічильник «Blocked / NoData cells».
- **F2-AC3. Given** є маршрут і `selectedSegment = i`; **When** перемальовано; **Then** відрізок `i` підсвічено окремо на висоті поверхні, а при `null` підсвітки немає. F2 нічого не пише в store.
- **F2-AC4. Given** WebGL недоступний, контекст втрачено або сітка невалідна; **When** відкрито Gale; **Then** видно причину і 2D-план з blocked, цілями й маршрутом.
- **F2-AC5. Given** 3D з увімкненими шарами на ноутбуці демо; **When** зроблено 60-секундний замір; **Then** у PR записано пристрій, браузер, роздільність і медіанний FPS ≥30 (або чесно «не пройдено»).
- **F2-AC6. Given** `reach.abort` з відрізками `ok = false`; **When** відмальовано 3D або 2D; **Then** ці відрізки маршруту червоні з легендою іконкою й текстом «No return with emergency O₂», а при `abort = null` маршрут звичайний.
- **F2-AC7. Given** цілі, база, небезпеки, NoData і точка неповернення; **When** відмальовано 2D-план (і 3D, якщо встигаємо); **Then** кожен об'єкт має знак з `src/ui` за §7.11, а легенда пояснює знаки словами.

### F3 — Дані й шари (Максим)
Pipeline у Docker вивантажує bbox (§8), рахує схил, walkable і hazard, валідує й пише `public/data/gale/`. `DataLoader` вантажить пакет і викликає `setRegionData`. `LayersPanel` перемикає шари й показує легенду та походження.
- **F3-AC1. Given** обрано bbox; **When** `docker run … prepare` запущено двічі; **Then** файли в `public/data/gale/` мають однакові sha256, а TS-тест перевіряє схему `region.json`, розміри файлів (`w×h×4` / `w×h`) і те, що NoData = `NaN` + `walkable = 0`.
- **F3-AC2. Given** пакет Gale; **When** відкрито район; **Then** `grid` у store — реальна сітка (не mock), статус «verified», а висоти лежать у діапазоні, який повертає `exportImage` для bbox.
- **F3-AC3. Given** панель шарів; **When** перемикаються terrain, optical, thermal, slope, traverse (мишею чи клавіатурою); **Then** кожен шар має легенду з текстом, одиниці й рядок походження (product ID/URL, нативна й цільова роздільність, метод, credit).
- **F3-AC4. Given** файл шару відсутній або має інший розмір сітки; **When** вантажиться район; **Then** видно помилку саме цього шару, решта UI працює, а битий шар не потрапляє в `grid`. Якщо бита сама сітка — лишається mock з бейджем.
- **F3-AC5. Given** `region.files.photos` і `photos.geojson`; **When** вантажиться район; **Then** `photos` у store мають `coordinates` з `lonLatToXY`, знімки поза сіткою відкинуто з попередженням; без файла — `photos = []`. `region.json` має `model.emergencyO2G` з `evidence` (без джерела — `assumption`).

### F4 — Маршрут A* (Влад)
Ядро `src/core` (ребра, вартість, A*, дерева) за §7.3; Worker; `RoutePanel` з кнопкою «Build route», порядком цілей, профілем висоти й таблицею відрізків.
- **F4-AC1. Given** контрольна сітка з проходом і заблокованою стіною та 2 цілі; **When** «Build route»; **Then** шлях іде база → цілі в заданому порядку → база, без blocked, NoData, зрізаних кутів і ребер зі схилом > `maxSlopeDeg`.
- **F4-AC2. Given** короткий крутий підйом і довший пологий обхід; **When** будується маршрут; **Then** обрано шлях з меншою модельною вартістю, і зворотний шлях може відрізнятися від прямого.
- **F4-AC3. Given** ціль поза сіткою, на blocked, в ізольованій області або нога без шляху; **When** «Build route»; **Then** видно код причини з номером точки або ноги, `plan.status ≠ 'ok'`, і старий маршрут не показано як чинний.
- **F4-AC4. Given** маршрут; **When** обрано відрізок у профілі або таблиці; **Then** `setSelectedSegment(i)`, і видно dist, slope, time, O₂, energy та dose з одиницями (dose `null` → «no data»).
- **F4-AC5. Given** сітка 256×256 і 2 цілі; **When** «Build route»; **Then** результат є за ≤2 с, UI не блокується (статус «pending»), а застарілі відповіді Worker відкинуто.
- **F4-AC6. Given** маршрут і обраний відрізок; **When** є знімок ближче 300 м (§7.9); **Then** видно «View from here»: знімок з `alt`, sol, credit, відстань і посилання на джерело; інакше «No surface photo within 300 m». Відрізки з `reach.abort.segments[i].ok = false` позначені в таблиці іконкою й текстом «no return».

### F5 — Бюджет і повернення (Влад)
`BudgetEngine` (headless) за §7.4 рахує `budget` і `reach` (маска, `returnInS`, `deficits`, `swap`). `BudgetPanel` показує шкали O₂, енергії, часу й дози, сценарій «O₂ −40%» (`setLimits`) і «Reset».
- **F5-AC1. Given** еталонна фікстура §7.4; **When** порахувано; **Then** N = 48 / 33 / 23 / 13 хв для чотирьох випадків прикладу, статус `incomplete` при невідомій дозі.
- **F5-AC2. Given** позиція, база й бюджет; **When** порахувано ореол; **Then** до маски входять лише клітинки з реальним шляхом туди й назад (зворотні ребра окремо) у межах бюджету з резервом, рівність приймається, перевищення ні.
- **F5-AC3. Given** ціль усередині ореолу; **When** увімкнено «O₂ −40%» або зростає elapsed; **Then** маска не розширюється, а ціль поза ореолом отримує текстове попередження і `reach.swap` (за модельною вартістю).
- **F5-AC4. Given** невалідний параметр (`speed ≤ 0`, `NaN`, `reserveFraction ≥ 1`); **When** порахувано; **Then** статус `invalid`, маска порожня, `returnInS = null`, на екрані помилка і жодного статусу «у межах моделі».
- **F5-AC5. Given** чинний план і еталон §7.8; **When** порахувано; **Then** `reach.abort.segments` має стільки ж елементів, скільки `plan.segments`, `ok` за правилом §7.8 (рівність приймається), `pointOfNoReturnS` = сума часу до першого не-`ok` відрізка або `null`; без чинного плану `abort = null`; «O₂ −40%» не робить жоден відрізок «повертабельнішим».

### F6 — Наукові цілі й фото (Настя)
5–8 цілей у bbox із зупинок Curiosity. Для кожної: назва, «why go» з посиланням NASA/JPL, фото Navcam з raw images API, credit і sol. `targets.geojson` і `photos/` лежать локально. Список цілей і картка.
- **F6-AC1. Given** пакет Gale; **When** відкрито список цілей; **Then** видно 5–8 цілей у межах сітки, кожна з бейджем точності: «verified» (координати зупинки MMGIS), «approximate» або «MOCK».
- **F6-AC2. Given** ціль; **When** відкрито картку (клік або клавіатура); **Then** видно назву, «why go», фото з `alt`, credit (як його дає API / сторінка зображення), sol і посилання на джерело. Фото позначено «view from rover stop», а не точне місце цілі.
- **F6-AC3. Given** картка; **When** натиснуто «Add to route» / «Remove»; **Then** викликано `toggleTarget(id)`, а ціль поза ореолом має попередження з `reach` (клітинка цілі — `xyToCell(grid, target.coordinates)`, перевірка — `reach.mask`).
- **F6-AC4. Given** фото не завантажилося; **When** відкрито картку; **Then** видно заглушку з `alt`, і картка та кнопка працюють.
- **F6-AC5. Given** bbox Gale; **When** зібрано `photos/photos.geojson`; **Then** 8–20 знімків Navcam у межах сітки, кожен локально, з `alt`, credit, sol, `sourceUrl`, камерою й `locationAccuracy = 'rover-stop'` (координати зупинки MMGIS за sol), джерела — у `docs/SOURCES.md`.

### F7 — UI, HUD, дизайн-токени (Оля)
Токени (`src/ui/tokens.css`: темний фон, акцент), Panel / Gauge / StatusNote / OwnerBadge, адаптивний `Shell`, `Hud`: великий «Return in N min», статус, поле «Elapsed, s», кнопка заміни цілі.
- **F7-AC1. Given** ширина 400, 768, 1024 або 1440 px; **When** відкрито сторінку в будь-якому стані; **Then** `scrollWidth ≤ clientWidth`, дотикові цілі ≥40 px, «Return in N min» — найбільший текст HUD.
- **F7-AC2. Given** робота лише з клавіатури; **When** Tab по локації, шарах, цілях, маршруту й HUD; **Then** фокус видно (≥3 px), кожне поле має доступну назву, зміна статусу озвучується (`status`, дефіцит — `alert`).
- **F7-AC3. Given** store з `reach` (еталон §7.4, план 900 с); **When** відкрито HUD; **Then** HUD показує те саме N, що й `BudgetPanel` (33 хв), і ризик іконкою + словами: «Estimate incomplete: dose — no data». Різні рівні мають різні іконки.
- **F7-AC4. Given** стани empty, «цілі обрано, плану немає», pending, invalid, no-path, deficit, incomplete, estimated, MOCK і `NaN` у budget; **When** відкрито HUD; **Then** для кожного видно пояснення й наступну дію, `NaN` показано як «—», а не «NaN min». Найкращий статус — «within model».
- **F7-AC5. Given** `reach.swap = {dropId, addId}`; **When** натиснуто «Replace ‹A› with ‹B›»; **Then** викликано `replaceTarget(dropId, addId)` і фокус перейшов на «Elapsed». При `swap = null` кнопки немає, є порада «Remove a target or return to base now». Reduced motion прибирає переходи.
- **F7-AC6. Given** `reach.abort`; **When** відкрито HUD; **Then** видно «Point of no return in N min» (`N = floor(pointOfNoReturnS / 60)`) або «Return possible along the whole route», з іконкою й текстом; при `abort = null` рядка немає, а «assumption» біля аварійного запасу видно, якщо `emergencyO2G` без джерела.
- **F7-AC7. Given** будь-який стан store; **When** відкрито HUD; **Then** видно вердикт `evaluateGoNoGo` (GO / GO · CAUTION / NO-GO / HOLD) і список станцій з причинами; для CAUTION перед виходом вихід підтверджується утримуванням 1,5 с (миша й клавіатура) з записом часу; для NO-GO видно дії виправлення; під час виходу NO-GO — «Return to base now» з `role="alert"`.
- **F7-AC8. Given** `src/ui`; **When** використано знаки §7.11; **Then** є компонент знака для кожного типу й стану з `aria-label`, і знаки однакові в HUD, списку цілей і легенді карти.

### F8 — Демо й сабміт (Олександр)
Сценарій і відео ≤30 с з англійськими субтитрами, ≤7 слайдів (з Олею), сторінка сабміту, AI_LOG, SOURCES, релізний URL.
- **F8-AC1. Given** релізний build; **When** відтворено сценарій §3; **Then** відео ≤30 с з англійськими субтитрами показує Gale, ≥3 типи даних, ціль з фото, маршрут, знімок «View from here», «O₂ −40%», ореол, червоні відрізки й «Point of no return», «Return in N min», заміну цілі й плашку обмежень.
- **F8-AC2. Given** мережу вимкнено після локального запуску (`npm run preview`); **When** пройдено сценарій; **Then** усі дані локальні, а резервне відео відтворюється офлайн.
- **F8-AC3. Given** пакет сабміту; **When** пройдено чекліст; **Then** є 6 учасників, репо з ліцензією Apache-2.0, опис використання AI (з `docs/AI_LOG.md`), усі джерела NASA з credit (`docs/SOURCES.md`) і опис меж моделі.
- **F8-AC4. Given** релізний URL і відео; **When** відкрито в приватному вікні; **Then** усе доступне без входу, сабміт на сторінці команди підтверджено до 23:59, час записано.

## 10. Процес

- **SDD:** spec фічі → тести з AC (red) → мінімальний код (green). Власник сам затверджує свій `specs/F<N>/spec.md`. Зміна поведінки починається зі spec.
- **Агенти** генерують код; люди пишуть spec і перевіряють AC у браузері. Підписів агентів у комітах і PR немає. Кожна AI-сесія — рядок у своєму розділі `docs/AI_LOG.md`: дата, хто, агент і модель, задача, файли, перевірка, PR.
- **Гілки:** `feat/F<N>` або `feat/F<N>-<суфікс>`. На фічу — **один відкритий PR одночасно**: поки працюєш, PR у draft; на контрольній точці (сб 14:00, сб 21:00, нд 12:00) переводиш у «Ready» → automerge squash. Після мержу продовжуєш у свіжій `feat/F<N>` від `main` новим PR.
- **Перевірки:** `npm run check` = `lint && typecheck && test --run && build`.
- **CI** (`.github/workflows/ci.yml`, без secrets, права read-only):
  - `check` — `npm ci` + `npm run check`;
  - `guard` — порівнює змінені файли з дозволеними шляхами гілки (§9): чужа папка → fail; спільні файли (§5.3) або гілка не `feat/F<N>` → мітка `shared`.
- **Automerge** (`automerge.yml`): запускається з коду `main` після завершення CI на PR (`workflow_run`). Мерджить squash-ом, якщо CI зелений саме для поточного head, PR не draft, гілка `feat/F<N>` і guard не бачить спільних файлів. Інакше ставить мітку `shared` — такий PR мерджить @xand0dev. Після мержу явно запускає `deploy.yml`: мерж токеном workflow не породжує подію push (перевіряється F0-AC5).
- **Захист `main`:** required checks `check` і `guard`, без force-push. CODEOWNERS: спільні файли → @xand0dev, папки фіч → власники.
- **Deploy:** push у `main` → GitHub Pages. Це і є preview для QA.
- **Інтеграція:** прогін сценарію демо на Pages у контрольних точках таймлайну (QA — Настя).

## 11. Таймлайн (до нд 22:30)

| Коли | Що | Хто |
|---|---|---|
| **Сб, старт** | Репо з SPEC.md → каркас F0, CI, automerge, Pages; issues F1–F8; specs фіч | Олександр |
| Сб, старт + каркас | Усі починають на mocks: spec → тести → код у `feat/F<N>` | усі |
| **Сб 14:00** | Bbox і пакет даних Gale у `main` (F3); список 5–8 цілей і фото (F6); джерела в SOURCES | Максим, Настя |
| **Сб 15:00** | Погодження Abort map і «View from here» (§7.8–7.9) | усі |
| **Сб 16:00** | Contract-PR у `main`: `reach.abort`, `emergencyO2G`, `SurfacePhoto`, `photos` у store і mocks; `evaluateGoNoGo` (§7.10) і символіка (§7.11) | Олександр |
| Сб 14:00–21:00 | F2 на реальній сітці; F4/F5 на реальній сітці й замір ≤2 с; F1 текстура; F7 HUD на store | Олександр, Влад, Іван, Оля |
| **Сб 21:00** | Перша інтеграція: повний ланцюг демо на Pages на реальних даних (з Abort і знімками); список багів; рішення щодо каменів з HiRISE | усі, QA — Настя |
| Нд до 12:00 | Добудова AC, баги, доступність 400 px, FPS-замір | усі |
| **Нд 12:00** | **Freeze**: нових фіч немає, лише виправлення | — |
| Нд 12:00–18:00 | QA за AC, запис відео, слайди, AI_LOG, SOURCES, опис обмежень | Олександр, Оля, Настя |
| **Нд 18:00** | Матеріали готові: відео, слайди, текст сабміту | Олександр, Оля |
| Нд 21:00 | Релізний прогін у приватному вікні й офлайн | усі |
| **Нд 22:30** | Сабміт (крайній строк 23:59), підтвердження збережено | Олександр |

## 12. Ризики й план Б

| Ризик | Дія |
|---|---|
| Bbox навколо марсохода дає NoData або мало фото | Перевірений bbox 137.400–137.422 / −4.750…−4.728 + найближчі зупинки; рішення до сб 14:00 |
| Тайловий TIFF не читається | Читає GDAL у pipeline; клієнт отримує лише `.f32` |
| Trek або мережа недоступні на демо | Усе офлайн у `public/data/gale/`, резервне відео |
| A* або ореол повільні на 256×256 | Сітка 128×128 по 20 м; Worker; замір у PR |
| Низький FPS | Менша сітка або текстура; 2D-план |
| Немає джерела для коефіцієнта | Позначка «assumption» на екрані; доза `null` → `incomplete` |
| Мало знімків біля маршруту | Запасний варіант §7.9 — фото цілей; поріг 300 м і чесний текст «No surface photo within 300 m» |
| Демо-цілі поза ореолом (на реальній сітці ореол ≈19.5 % карти) | Обрати демо-цілі всередині ореолу і одну ближню для заміни; перевіряє Максим на реальній сітці |
| PR конфліктують | Папки по фічах, слоти в `src/app` від F0, розділи AI_LOG/SOURCES; спільне — малий PR з міткою `contract` |
| Фіча не встигає до freeze | Лишається mock з бейджем MOCK, демо не ламається; порядок скорочення §4 |
