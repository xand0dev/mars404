# Пітч MARS//404 — структура слайдів (Оля, з F8)

Джерело: `docs/SPEC.md` §1–4, §7.6, §8, §11. Слайди англійською (≤7), нотатки — українською.
Готово до **нд 18:00**. `[TBD]` — підставити реальне значення з релізу; без джерела не вигадуємо.

| # | Заголовок (EN) | На слайді | Візуал | Нотатки для мовця |
|---|---|---|---|---|
| 1 | **MARS//404 — know when to turn back** | Tablet HUD for a walking EVA on Mount Sharp, Gale crater. Three questions: *Where for science? How to get there? When to turn back?* | Скриншот HUD з великим «Return in N min» | Хук за 10 с: на Марсі найнебезпечніше — не дійти, а не повернутися. |
| 2 | **The problem** | Astronaut picks 1–3 targets before / during an EVA; the crew checks the plan in the habitat; O₂, energy, time and dose run out on the way **back**. | Схема: база → цілі → база, запас тане | Користувачі з §2. Наголос: повернення — частина плану, а не «потім». |
| 3 | **Demo · 30 s** | Globe → Gale → 3D terrain → layers → target with Curiosity photo → Build route → «O₂ −40%» → halo shrinks → Return in N → Replace target | Відео ≤30 с з англ. субтитрами (F8) або 4 кадри | Сценарій §3. Якщо відео не грає — 4 скриншоти з релізу. N — `[TBD]` з релізу. |
| 4 | **Real NASA data, traceable** | Mars Trek Gale DEM 1 m · HiRISE mosaic · THEMIS day/night IR · derived slope · Curiosity traverse (MMGIS) · surface photos (raw images API). Every layer: source, product ID, credit. Works offline. | Шари поруч + рядок credit | §8. bbox і к-сть цілей — `[TBD]` (рішення F3/F6 сб 14:00). Credit — з `docs/SOURCES.md`. |
| 5 | **How it decides** | A* on a terrain grid, slope-asymmetric walking time, no corner-cutting, NoData = blocked → resource budget with a fixed reserve → reachability halo (out **and** back) → «Return in N min» + suggested target swap | Діаграма-ланцюжок 5 кроків + ореол на карті | §7.3–7.4. Одне джерело чисел: «Return in N» рахує тільки рушій бюджету, HUD лише показує. |
| 6 | **Honest by design** | Best status is «within model», never «safe». Unknown dose → «estimate incomplete». Every constant has a source or a visible «assumption». Mock data labelled MOCK. Not certified navigation. Accessible: 400 px, keyboard, icon + text for risk, reduced motion. | Плашки статусів HUD: ✔ / ⚠ / ⛔ / ⏳ | §7.6–7.7, Конституція п. 7–8. Судді цінують чесні межі. |
| 7 | **Team, process, next** | 6 people, 8 features, spec-driven (spec → tests → code). AI coding agents used and disclosed (AI_LOG). Apache-2.0. Next: Jezero, auto target order, dust-storm scenario. Link: `[TBD release URL]` · repo | Фото/аватари команди, QR на реліз | Команда з §9. «Next» — пункти «поза MVP» §4. |

## Чекліст перед нд 18:00
- [ ] Числа (N, bbox, кількість цілей і фото) взято з релізу, а не з mock.
- [ ] Credit під кожним зображенням NASA (`docs/SOURCES.md`).
- [ ] Ніде немає «safe» без «within model».
- [ ] Відео ≤30 с, англ. субтитри; запасні скриншоти.
- [ ] Узгоджено з Олександром (F8): слайди + текст сабміту.
