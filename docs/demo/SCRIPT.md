# Демо-відео · 30 с (F8) — фінальний сценарій

Монтує Олександр. Субтитри — `docs/demo/subtitles.srt` (EN, вшити в кадр і лишити окремим файлом).
Статус: **фінал для запису** (нд 15.11). Числа звірено на `main` 9a88ecd (білд `npm run build && npm run preview`, 1440×900) — див. «Числа» нижче.

## Структура

| Час | Блок | Що в кадрі | Субтитр (EN) |
|---|---|---|---|
| 0:00–0:08 | Інтро (готове) | Від першої особи: шолом, Gale, планшет у рукавиці. Видимий напис **«AI-generated footage»** у кадрі | Gale crater, Mars. Every spacewalk has one question: when do I have to turn back? |
| 0:08–0:11 | Шари карти | Location → «Gale / Mount Sharp» → шари зверху (панель **Map layers**, #151; без неї — панель **Layers**): **Optical (HiRISE)** → **Thermal IR night (THEMIS)** → **Slope (derived)**; легенда в кадрі | Real NASA layers: HiRISE, THEMIS heat, slope. Steep ground is blocked. |
| 0:11–0:13.5 | Геологічна ціль | Targets → **Open Mont Mercou**: фото Curiosity, «why go» (вершина ≈6-метрового уступу: хімія, мінералогія, шаруватість порід), credit | Targets are real outcrops on Curiosity's path. |
| 0:13.5–0:16 | Маршрут | **Add Brantôme**, **Add Mont Mercou** → **Build route** → HUD **«Return in 24 min»**, **GO · CAUTION** | Route on foot. Return in 24 minutes. |
| 0:16–0:18.5 | Прогулянка | **▶ Walk the route**, камера **Follow**, швидкість ×60 | Rehearse the walk: time, oxygen and energy. |
| 0:18.5–0:22.5 | «O₂ −40%» → Replace | **Окремий дубль** (див. «Кадр Replace»): Mont Mercou + Champeaux → **O₂ −40%** → **NO-GO**, **Point of no return in 7 min**, червоні відрізки → **«Replace Champeaux with Brantôme»** → **«Return in 12 min»**, **GO · CAUTION** | Oxygen down 40%? Point of no return, then a closer target. |
| 0:22.5–0:25 | Навігація без GPS | Панель **Navigation**: **98 % of the route with a precise position**, **Beacons: Base + 3** | No GPS on Mars: beacons guide the way back. |
| 0:25–0:28 | Масштаб | **Columbia Hills (Gusev)**: Comanche Outcrop + Home Plate → **«Return in 8 min»**; 1 с — **Olympus Mons** (рельєф) | Second site: Spirit's Columbia Hills. And the whole planet. |
| 0:28–0:30 | Титр | **MARS::404 — know when to turn back** · Team MARS::404 · Challenge: Martian Map | — (лише титр) |

## Кадр Replace (0:18.5–0:22.5)
З **Brantôme + Mont Mercou** після «O₂ −40%» план живий (Return in 12 min, Point of no return in 8 min), тому кнопки Replace **немає**. Для цього кадру — окремий дубль:
1. Gale → **Add Mont Mercou**, **Add Champeaux** → **Build route** (Return in 11 min, GO · CAUTION — цю частину не показуємо або 0,5 с).
2. What if: **O₂ −40%** → **Return in 0 min**, **NO-GO**, **Deficit: O₂**, **Point of no return in 7 min**, червоні відрізки.
3. **Replace Champeaux with Brantôme** → маршрут перебудовано на Brantôme + Mont Mercou (1092.1 m) → **Return in 12 min**, **GO · CAUTION**.

Після заміни маршрут збігається з кадром 0:13.5–0:16, тож склейка логічна: «план, який рятує модель, — це той самий маршрут».

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
- Інтро: напис «AI-generated footage» лишається видимим (SPEC, `docs/AI_LOG.md`).
- Відео ≤30 с → YouTube (unlisted); резервна копія — у пакеті сабміту (офлайн, F8-AC2).

## План Б
- Columbia Hills не в релізі до freeze 15:00 → кадр 0:25–0:28 замінюємо на картку «Columbia Hills — coming soon» або віддаємо час кадрам 0:08–0:22.5.
- Прогулянка гальмує на ноутбуці запису → знімаємо з камерою Top; субтитр той самий.
- 3D недоступне → 2D-план (`?2d`), субтитри ті самі.
