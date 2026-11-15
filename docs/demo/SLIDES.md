# Слайди (7, англійською, 3 хв) — F8

Файл: `docs/demo/MARS404_slides.pptx` → Google Drive → «Завантажити» → відкрити в Google Slides → PDF у пакет сабміту.
Скріни — з релізного build `main` b35102d / 292f528 (Chromium 1440×900; 3D, кадр Replace — 2D-план). Скріни Івана підставляємо поверх, коли будуть.
Числа звірено в браузері (див. `docs/demo/SCRIPT.md`, «Числа»). Нотатки до кожного слайду — українською, з таймінгом.

| # | Час | Заголовок (EN) | Що на слайді |
|---|---|---|---|
| 1 | 0:00–0:20 | **MARS//404 — know when to turn back** | Челендж, одна фраза про продукт, скрін глобуса; 4 числа: 4 райони з рельєфом NASA (6 на глобусі), 10 наборів даних NASA / USGS / ESA, 6 шарів карти, 0 мережевих запитів у полі; команда з ролями; посилання на сайт і код |
| 2 | 0:20–0:45 | **The walk back is the dangerous part** | Кадр AI-інтро з підписом «AI-generated footage»; 4 факти: затримка 4–24 хв (ESA), немає GPS, EVA 7 год + 30 хв аварійного O₂ (NASA NTRS 20140009556), підйом ×2 (assumption); те саме питання на Землі (Карпати) |
| 3 | 0:45–1:20 | **One screen answers: when do I turn back?** | Скрін маршруту з «Return in 28 min»; 8 функцій: маршрут пішки, годинник повернення, точка неповернення, «O₂ −40%» → Replace, GO / NO-GO (9 станцій), навігація без GPS (96 %), прогулянка-превʼю, field-ready (мітки, рукавиці, 400 px, офлайн); кропи «Return in 4 min» після Replace і Navigation |
| 4 | 1:20–1:45 | **Real NASA data, end to end** | Слайд Максима (`specs/F3/slide-nasa-data.png`, #144): джерело NASA → що рахуємо → що бачить астронавт |
| 5 | 1:45–2:15 | **Six map layers — and what we extract from each** | Панель шарів зверху (#151); таблиця 6 шарів: джерело / метод → що отримує планувальник; скріни THEMIS night і Slope; геологія: цілі на справжніх відслоненнях (Mont Mercou, Nontron · Champeaux, Comanche · Home Plate, Troy) + картка Mont Mercou з фото Curiosity |
| 6 | 2:15–2:40 | **Two walking sites, whole planet, honest numbers** | Columbia Hills (Return in 10 min), Olympus Mons (≈ 21,2 км, MOLA), глобус; verified (рельєф і знімки) · 2 з 10 коефіцієнтів verified (аварійний O₂, доза Curiosity RAD) · «within model», ніколи «safe» |
| 7 | 2:40–3:00 | **Who it helps, and what comes next** | Користь: астронавт, екіпаж і плановики, аналогові місії, туристи й рятувальники на Землі; далі: пішки або ровером, зони покриття супутників, енергія скафандра за часом, Jezero |

## Вимоги Project Submission Guide → де на слайдах
| Вимога | Де |
|---|---|
| ≤ 7 слайдів разом із титульним, англійською, читабельний шрифт | 7 слайдів, текст ≥ 9 pt (підписи), основний 11–14 pt |
| Назва команди, імена учасників, челендж | Слайд 1 (Team / Members / Challenge) |
| Скрін проєкту | Слайди 1, 3, 5, 6 (глобус — скрін Івана, `specs/F1/screenshots/globe-clean-1920.png`) |
| Досвід користувача | Слайд 3: рядок «User experience — 4 steps» |
| Як дані NASA і партнерів роблять рішення можливим | Слайд 4 (Максим), слайд 5 (шари), слайд 6 (ESA Mars Express HRSC — партнер 2026) |
| Критерії Impact, Creativity, Validity, Relevance, Presentation | Позначка «JUDGING: …» у підвалі кожного слайду (крім 4 — там підвал Максима) |
| SI: видимий водяний знак на згенерованих кадрах; без брендингу NASA; без осіб до 18 | Слайд 2: «AI-generated footage» на кадрі; слайд 7: SI-розкриття; логотипів NASA немає |

## Звідки числа
- Маршрути, «Return in», Replace, Navigation, Columbia Hills — живий застосунок на `main` (таблиця «Числа» в `SCRIPT.md`).
- 4–24 хв — ESA; 7 год + 30 хв — NASA NTRS 20140009556; батарея EMU ≈ 922 Wh — NTRS 20050217305 (`specs/F5/research-real-data.md`).
- Шари, методи й легенди — `public/data/gale/region.json`, `public/data/columbia-hills/region.json`.
- Геологія цілей — поле «why» у `targets.geojson` Gale і Columbia Hills.
- Коефіцієнти моделі (2 verified з 10: `emergencyO2G`, `doseUSvPerS`; ліміти energy 922 Wh і dose 600 мЗв — verified, #160) і межі моделі — `specs/F5/assumptions-en.md` (Влад, #139).
- Olympus Mons ≈ 21,2 км — `docs/SOURCES.md` (`trek-mola-hrsc-200m`).
