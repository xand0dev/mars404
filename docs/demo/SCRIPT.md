# Демо-відео · 30 с (F8) — фінальний сценарій

Монтує Олександр. Субтитри — `docs/demo/subtitles.srt` (EN, вшити в кадр і лишити окремим файлом).
Статус: **фінал для запису** (нд 15.11). Структура — за Project Submission Guide (Space Apps, 13.11.2026): 0:00 команда → 0:02 челендж і натхнення → 0:05 назва й tagline → 0:10 як працює → 0:20–0:30 майбутнє. Числа звірено на `main` 9a88ecd (білд `npm run build && npm run preview`, 1440×900) — див. «Числа» нижче.

## Структура

| Час | Блок гайду | Що в кадрі | Субтитр (EN) |
|---|---|---|---|
| 0:00–0:02 | **Introduce yourself** | AI-інтро від першої особи (шолом, Gale) з водяним знаком **«AI-generated footage»**; поверх — **«Team MARS::404»** і рядок імен: Oleksandr · Olia · Ivan · Maksym · Vlad · Nastia | We're team MARS::404. |
| 0:02–0:05 | **Lead us in**: челендж і чому | Те саме AI-інтро (знак видно); поверх — **«Challenge: Interplanetary Survival Guide — Martian Map»** | We got lost on a mountain with no signal. On Mars, when do you turn back? |
| 0:05–0:08 | **Name your project**: назва + tagline | Титр поверх інтро: **MARS::404 — know when to turn back** | MARS::404 — know when to turn back. |
| 0:08–0:10.5 | **Describe your idea**: дані NASA | Gale → панель **Layers** над картою: **Optical (HiRISE)** → **Thermal IR night (THEMIS)** → **Slope (derived)**. Підпис у куті: «Data: NASA Mars Trek — HiRISE, THEMIS · ESA Mars Express HRSC» | Real NASA data: HiRISE terrain, THEMIS heat, slope. |
| 0:10.5–0:12.5 | Describe: досвід користувача | Targets → **Open Mont Mercou**: фото Curiosity, «why go», credit | Targets at real Curiosity outcrops. |
| 0:12.5–0:15 | Describe: маршрут | **Add Brantôme**, **Add Mont Mercou** → **Build route** → HUD **«Return in 24 min»**, **GO · CAUTION** | Route on foot. Return in 24 minutes. |
| 0:15–0:18 | Describe: «що як» | **Окремий дубль** (див. «Кадр Replace»): Mont Mercou + Champeaux → **O₂ −40%** → **NO-GO**, червоні відрізки, **«Point of no return in 7 min»** → **«Replace Champeaux with Brantôme»** → **«Return in 12 min»** | Oxygen drops? It finds a closer target. |
| 0:18–0:20 | Describe: без GPS | Панель **Navigation**: **98 % of the route with a precise position**, **Beacons: Base + 3** | No GPS: beacons guide the way back. |
| 0:20–0:23 | **Look into the future**: люди | **▶ Walk the route**, камера **Follow**, ×60 | For the first crews walking on Mars… |
| 0:23–0:26 | Future: світ | **Columbia Hills (Gusev)**: Comanche Outcrop + Home Plate → **«Return in 8 min»**; 1 с — **Olympus Mons** | …and for hikers and rescuers on Earth with no signal. |
| 0:26–0:28 | Future: далі | Глобус, камера віддаляється | Next: rover routes and satellite coverage. |
| 0:28–0:30 | Кінцевий титр | **MARS::404 — know when to turn back** · Team MARS::404 · Challenge: Martian Map · xand0dev.github.io/mars404 | — (лише титр) |

## Вимоги гайду до відео
- **≤ 30,0 с** разом із титрами; довше — не допускається до Global Judging.
- **Англійські субтитри вшиті** в кадр на кожну репліку; окремо — `subtitles.srt`.
- **SI (AI)**: на кожному згенерованому кадрі — видимий водяний знак «AI-generated footage» (0:00–0:08). Якщо голос або музика згенеровані — написати це в описі YouTube («Voice / music: AI-generated»).
- **Без** логотипів, прапорів і місійних емблем NASA у згенерованому контенті; **без** людей до 18 років у кадрі.
- Кадри продукту — лише запис живого застосунку; числа — як у таблиці «Числа».
- Хостинг: YouTube **Unlisted**; посилання перевірити в приватному вікні без входу.
- Музика — лише власна або royalty-free, тихіша за голос.

## Кадр Replace (0:15–0:18)
З **Brantôme + Mont Mercou** після «O₂ −40%» план живий (Return in 12 min, Point of no return in 8 min), тому кнопки Replace **немає**. Для цього кадру — окремий дубль:
1. Gale → **Add Mont Mercou**, **Add Champeaux** → **Build route** (Return in 11 min, GO · CAUTION — цю частину не показуємо або 0,5 с).
2. What if: **O₂ −40%** → **Return in 0 min**, **NO-GO**, **Deficit: O₂**, **Point of no return in 7 min**, червоні відрізки.
3. **Replace Champeaux with Brantôme** → маршрут перебудовано на Brantôme + Mont Mercou (1092.1 m) → **Return in 12 min**, **GO · CAUTION**.

Після заміни маршрут збігається з кадром 0:12.5–0:15, тож склейка логічна: «план, який рятує модель, — це той самий маршрут».

## Числа (перевірено в браузері на `main` 9a88ecd, нд 15.11)

| Кадр | Що на екрані |
|---|---|
| Gale, Brantôme + Mont Mercou, Build route | Return in 24 min · GO · CAUTION · Route found (model estimate): 1092.1 m · 24.0 min · 44.58 g O₂ · 54.60 Wh · dose no data |
| Те саме + «O₂ −40%» | Return in 12 min · GO · CAUTION · Point of no return in 8 min · Replace немає |
| Дубль Replace: Mont Mercou + Champeaux, Build route | Return in 11 min · GO · CAUTION · 1612.5 m · 36.8 min · 68.46 g O₂ |
| + «O₂ −40%» | Return in 0 min · NO-GO · Deficit: O₂ · Point of no return in 7 min · «Replace Champeaux with Brantôme» |
| + Replace | Return in 12 min · GO · CAUTION · 1092.1 m · 24.0 min · 44.58 g O₂ · Point of no return in 7 min |
| Navigation (Brantôme + Mont Mercou) | 98 % of the route with a precise position · Beacons: Base + 3 · Max drift ±1 m |
| Columbia Hills, Comanche Outcrop + Home Plate | Return in 8 min · GO · CAUTION · 1655.2 m · 39.5 min · 73.52 g O₂ · 82.76 Wh |

Набір із коментаря Влада в #28 (сб 19:16: Nontron Quadrant + Mont Mercou + Gardonne → Replace → Return in 6 min) **на поточному `main` не відтворюється**: після «Replace Nontron Quadrant with Brantôme» лишається NO-GO, Return in 0 min, Deficit: O₂. Перебрано всі 84 набори з 2–3 цілей Gale: Replace рятує план лише в 3 (Mont Mercou + Champeaux; Mont Mercou + Gourdon + Champeaux; Brantôme + Mont Mercou + Chalagnac Ridge). Беремо перший — він закінчується на демо-маршруті Brantôme + Mont Mercou. Якщо Влад змінить модель до freeze — перезвірити цей рядок.

## Запис
- Релізний build: `npm ci && npm run build && npm run preview`, Chrome 1440×900, масштаб 100 %, 3D (без `?2d`).
- Перед записом: очистити мітки екіпажу («Crew map notes» → Remove) — вони зберігаються в браузері; «How it works» → Got it; закрити DevTools.
- Кожен блок — окремий дубль по ~4 с; монтаж і переходи — Олександр.
- Інтро 0:00–0:08: напис «AI-generated footage» видимий увесь час (гайд, SI); титри команди, челенджу й назви — поверх інтро.
- Відео ≤30 с → YouTube (unlisted); резервна копія — у пакеті сабміту (офлайн, F8-AC2).

## План Б
- Не встигаємо в 30 с → першим скорочуємо кадр 0:26–0:28 (глобус), далі 0:18–0:20 (Navigation); блоки гайду 0:00–0:08 і кінцевий титр не скорочуємо.
- Прогулянка гальмує на ноутбуці запису → знімаємо з камерою Top; субтитр той самий.
- 3D недоступне → 2D-план (`?2d`), субтитри ті самі.
