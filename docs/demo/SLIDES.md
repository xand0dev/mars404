# Слайди (≤7, англійською) — F8

Мінімум тексту: заголовок + 1–2 рядки + скрін. Звідси → Google Slides → PDF у пакет сабміту.
Скріни робить Іван після 16:30 з релізного build (1440×900); до того — заглушки `[SCREEN: …]`.
Числа — як у `docs/demo/SCRIPT.md` (звірено на `main` 9a88ecd); без джерела — не пишемо.

| # | Заголовок (EN) | Текст на слайді (EN) | Візуал | Хто дає |
|---|---|---|---|---|
| 1 | **MARS::404 — know when to turn back** | Team MARS::404 · NASA Space Apps 2026 · Challenge: Martian Map | Логотип; `[SCREEN: глобус Марса]` | Оля |
| 2 | **No GPS. When do I turn back?** | An astronaut on foot on Mars has no GPS and no live help from Earth. Oxygen, energy and time must last the way **back**. | `[SCREEN: кадр інтро «AI-generated footage»]` з видимим написом | Оля |
| 3 | **One number: Return in N min** | Route on real terrain → return clock → GO / NO-GO before the EVA starts. | `[SCREEN: HUD «Return in 24 min» + GO · CAUTION]` (Gale, Brantôme + Mont Mercou) | Іван |
| 4 | **Built on NASA data** | Short form з `docs/SOURCES.md` → «NASA data for the Space Apps form» (нижче) | `[SCREEN: шари HiRISE / THEMIS / slope]` | Максим |
| 5 | **Two sites, whole planet** | Gale (Curiosity) and Columbia Hills (Spirit) for walks; Olympus Mons and Valles Marineris — terrain overview. | `[SCREEN: Columbia Hills з маршрутом]` + `[SCREEN: Olympus Mons]` | Іван |
| 6 | **Honest by design** | Terrain data: verified. Model: 1 of 10 coefficients verified (30-min emergency O₂), 9 shown as **assumption**. Best status is “within model”, never “safe”. | `[SCREEN: «Details: model coefficients» + «Sources of limits»]` | Влад |
| 7 | **What’s next** | Walk or drive the rover · satellite coverage zones · suit energy over time (NASA EMU data). | — | Оля |

## Слайд 4 — текст від Максима (з `docs/SOURCES.md`, #127)
> Terrain and imagery from NASA Mars Trek: HiRISE 1 m elevation models of Gale crater (Curiosity) and the Columbia Hills (Spirit), the HiRISE orthomosaic of the Curiosity area, THEMIS day and night infrared mosaics (Mars Odyssey), the MOLA + HRSC 200 m global elevation model and the Viking MDIM 2.1 colour mosaic. Rover traverses and stops from NASA/JPL-Caltech (MSL MMGIS, Mars Trek Spirit layers) and Curiosity raw images.

На слайд — скорочено до списку з 5 рядків; повний текст — у нотатках і в `SUBMISSION.md`.

## Слайд 6 — звідки числа
`public/data/gale/region.json` на `main`: `emergencyO2G` = 56 г — **verified** (NASA EMU, 30 хв); решта 9 коефіцієнтів моделі й ліміти time / O₂ / energy / dose — **assumption**. Те саме показує застосунок: «9 of 10 model coefficients have no verified source. Model, not certified navigation.»

## Слайд 7 — що далі
Лише те, чого ще немає в продукті (позначаємо як next): транспорт «пішки / ровер» (`specs/F4/rover.md`), зони покриття супутників, енергія скафандра за часом замість метрів (R1 у `specs/F5/research-real-data.md`).
