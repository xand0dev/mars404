# MARS//404 — know when to turn back

NASA Space Apps Challenge 2026 · челендж **Interplanetary Survival Guide: Martian Map** · команда MARS//404.

**Застосунок:** https://xand0dev.github.io/mars404/ — без входу, без ключів, працює офлайн після завантаження.
**Код:** цей репозиторій, ліцензія Apache-2.0.

Планшет / HUD для астронавта, що йде пішки на гору Шарпа в кратері Gale. Відповідає на три питання:

1. **Куди піти по науку?** — справжні зупинки марсоходів із фото з поверхні й поясненням «навіщо».
2. **Як дійти безпечно?** — маршрут A* по реальному рельєфу HiRISE в обхід крутих схилів і ділянок без даних.
3. **Коли розвертатися?** — бюджет O₂, енергії, часу й дози з резервом, «Return in N min» і точка неповернення.

> Це демонстраційна модель, а не сертифікована навігація. Найкращий статус в інтерфейсі — **«within model»**, ніколи не «safe».

## Подивитися за 2 хвилини

Інтерфейс англійською, назви кнопок нижче — як на екрані.

1. Відкрий застосунок → на 3D-глобусі Марса обери **Gale / Mount Sharp** (миша, Tab + Enter або Space). Глобус долітає до району й відкриває 3D-рельєф.
2. Панель **Layers**: Optical (HiRISE) → Thermal IR night (THEMIS) → Slope (derived). У кожного шару видно джерело й роздільність.
3. **Targets** → відкрий **Mont Mercou**: фото Curiosity, «why go», credit. Додай **Brantôme** і **Mont Mercou** → **Build route**.
4. HUD показує **Return in N min** і вердикт **GO / NO-GO**; профіль висоти й відрізки — у панелі маршруту. Обери відрізок → **View from here** — найближчий справжній знімок Navcam з цього місця.
5. **What if → O₂ −40%**: ореол досяжності звужується, відрізки без повернення червоніють, з'являється **Point of no return in N min**. Для набору Nontron Quadrant + Mont Mercou + Gardonne план стає NO-GO, і застосунок пропонує **Replace Nontron Quadrant with Brantôme**.
6. **▶ Walk the route** — астронавт іде маршрутом (камера Follow, 1×–60×) з часом, O₂ і енергією. Режим **Rover** порівнює той самий план на марсоході.
7. **Back to globe** → **Columbia Hills (Gusev)** — другий район з маршрутом (Spirit). **Olympus Mons** і **Valles Marineris** — огляд рельєфу без планування.

Додатково: панель **Navigation** (маяки по прямій видимості + інерціальна позиція з дрейфом, без GPS), чекліст **GO / NO-GO** перед виходом, **Crew map notes** (мітки Blocked / Hazard / Note / Plan перебудовують маршрут, експорт / імпорт JSON), режим рукавиць із великими кнопками.

## Дані NASA

Усе готується офлайн відтворюваним скриптом (`pipeline/`, Python у Docker) і лежить у `public/data/` — під час демо застосунок у мережу не ходить.

| Що | Звідки |
|---|---|
| Рельєф Gale і Columbia Hills, 1 м | MRO HiRISE stereo DEM, NASA Mars Trek |
| Ортомозаїка району Curiosity | HiRISE, NASA Mars Trek |
| Термальні шари день / ніч, 100 м | THEMIS IR, Mars Odyssey (NASA/JPL-Caltech/ASU) |
| Рельєф навколо районів, Olympus Mons, Valles Marineris, 200 м | MOLA + HRSC blended DEM (NASA/GSFC, ESA/DLR/FU Berlin, USGS) |
| Текстура глобуса | Viking MDIM 2.1 colorized mosaic (USGS Astrogeology); колір художній |
| Центри локацій на глобусі | IAU Gazetteer of Planetary Nomenclature (USGS) |
| Траси й зупинки марсоходів | MSL MMGIS (Curiosity), шари Spirit у Mars Trek |
| Фото цілей і «View from here» | Curiosity Navcam raw images, Spirit Navcam (PDS Imaging Node), Spirit Pancam (Photojournal) |
| 3D-модель Curiosity | NASA 3D Resources (public domain) |

Повний список з ID продуктів, датами, ліцензіями й credit — [`docs/SOURCES.md`](docs/SOURCES.md).

## Межі моделі

- Сітка 256 × 256 клітинок по 10 м (2.56 × 2.56 км); деталі менші за 10 м не видно.
- Клітинки крутіші за 25° і без даних (NoData) — заблоковані. NoData ніколи не вважається безпечним.
- Швидкість ходьби й витрата O₂ — з даних Apollo (Місяць, 1/6 g), для Марса це **assumption**.
- Перевірені джерелом: 30 хв аварійного O₂ (EMU Secondary Oxygen Package), батарея скафандра 922 Wh (NASA EMU), доза на поверхні 0.67 мЗв/добу (Curiosity RAD, Gale). Решта коефіцієнтів позначена на екрані як «assumption».
- Немає телеметрії в реальному часі, погоди й пилових бур. Не сертифікована навігація.

Кожне число в інтерфейсі показує джерело або слово «assumption». Повний текст — [`specs/F5/assumptions-en.md`](specs/F5/assumptions-en.md).

## Як це зроблено

Vite + React 19 + TypeScript (strict) + three / React Three Fiber + Zustand. Статичний сайт без backend.

```text
NASA Mars Trek, MMGIS, raw images, PDS
        │  один раз, офлайн
        ▼
pipeline/  crop → resample → схил / прохідність / hazard → перевірка → sha256
        ▼
public/data/<район>/  рельєф, шари, цілі, фото, траса
        ▼
useMission (єдиний store) ◄─ глобус · шари · цілі · маршрут A* (Web Worker) · бюджет і повернення · HUD
        ▼
3D-рельєф / 2D-план
```

- Маршрут — A* по сітці з вартістю за модельним часом (схил, ґрунт, hazard), замкнена петля база → цілі → база.
- «Return in N min», ореол досяжності й точку неповернення рахує одне ядро (`src/core`), HUD лише показує.
- Доступність: ширина 400 px без горизонтального скролу, повна робота з клавіатури, ризик іконкою + текстом, reduced motion, 2D-план як запасний режим (`?2d`).

Специфікація продукту — [`docs/SPEC.md`](docs/SPEC.md); правила команди — [`CONSTITUTION.md`](CONSTITUTION.md).

## Запустити локально

```bash
npm ci
npm run dev        # розробка
npm run build && npm run preview   # релізна збірка, працює без мережі
npm run check      # lint + typecheck + unit-тести + build
npm run e2e        # Playwright
```

Node 22.22+, 24.15+ або 26+ (CI — Node 24, `.nvmrc`). Підготовка даних — [`pipeline/README.md`](pipeline/README.md).

## Команда

| Хто | Що робив |
|---|---|
| Олександр (@xand0dev) | каркас, інтеграція, 3D-рельєф, відео, сабміт |
| Оля (@oljyaaa) | UI, HUD, дизайн-система, сценарій демо, слайди |
| Іван (@gonivanko) | 3D-глобус, вибір місця, мітки екіпажу |
| Максим (@kingsneverdie17) | pipeline даних, шари, дані NASA |
| Влад (@froozy3) | маршрут A*, модель ресурсів і повернення |
| Настя (@Bulka0801) | наукові цілі й фото, QA, джерела |

## Використання AI

Код, тести й документацію писали AI-агенти (переважно Claude Code, також Codex) за специфікаціями, які написали люди. Люди обирали задачу, писали spec і критерії приймання, перевіряли кожну зміну в браузері й на CI і вирішували, що мерджити. Кожна AI-сесія записана в [`docs/AI_LOG.md`](docs/AI_LOG.md). Жодних згенерованих AI даних, зображень чи чисел не подано як дані NASA.

## Ліцензія

Apache-2.0 — [`LICENSE`](LICENSE). Дані — за ліцензіями джерел у [`docs/SOURCES.md`](docs/SOURCES.md).
