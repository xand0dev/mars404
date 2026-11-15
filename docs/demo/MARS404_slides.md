# MARS//404 — презентація (текст для агента)

Остання версія слайдів (7, англійською) у форматі, який агент може прочитати без PowerPoint.

- `MARS404_slides.pptx` — для Google Slides (Drive → Завантажити → відкрити в Google Slides).
- `MARS404_slides.pdf` — те саме як PDF (картинки слайдів).
- Цей файл — текст кожного слайду, alt-тексти зображень і нотатки доповідача (українською, з таймінгом на 3 хв).

Структура й джерела чисел — `SLIDES.md`; числа звірено на `main` 292f528 (див. `SCRIPT.md`, «Числа»).

---

<!-- Slide number: 1 -->
![Mars globe — screenshot by Ivan](Image 0)
NASA SPACE APPS 2026 · CHALLENGE: INTERPLANETARY SURVIVAL GUIDE — MARTIAN MAP
MARS//404
know when to turn back
An offline tablet planner for walking spacewalks on Mars: where to go for science, how to get there safely, and the exact minute to turn back — built on real NASA terrain.
4
sites with real NASA terrain, 6 on the globe
10
NASA / USGS / ESA datasets
6
map layers per site
0
network calls in the field — works offline
Team: MARS//404 · Members: Oleksandr — integration, 3D terrain · Olia — UI, HUD, pitch · Ivan — 3D globe · Maksym — NASA data pipeline · Vlad — route & return model · Nastia — science targets, QA
Live: xand0dev.github.io/mars404   Code (Apache-2.0): github.com/xand0dev/mars404
JUDGING: PRESENTATION · RELEVANCE
1

### Notes:
[0:00–0:20] Ми — MARS//404. Планшет для пішого виходу на Марсі: куди йти по науку, як дійти безпечно і коли рівно розвертатися. 4 райони на 3D-глобусі, 10 наборів даних NASA / USGS / ESA, 6 шарів карти на район, у полі працює без мережі. Команда — 6 людей, ролі на слайді.

<!-- Slide number: 2 -->
The walk back is the dangerous part
![AI-generated first-person view from an astronaut helmet over Gale crater](Image 0)
4–24 min
one-way radio delay Earth ↔ Mars — mission control can’t answer in time
ESA
No GPS
no navigation satellites at Mars — no blue dot, position drifts
no GNSS at Mars
AI-generated footage
Humans will walk on Mars. Every EVA has one question: how far can I go and still make it back? Oxygen, energy and time are one budget, spent twice — out and back.
7 h + 30 min
longest EVA a NASA suit supports, plus the emergency O₂ that must stay untouched
NASA NTRS 20140009556
Same question on Earth: hikers and rescuers without signal. It started for us on a Carpathian descent with no GPS.
×2 slower uphill
the way back is not the way out: slopes and soft sand change the time
model assumption, shown in app
JUDGING: IMPACT · RELEVANCE
2

### Notes:
[0:20–0:45] Проблема глобальна: люди підуть пішки по Марсу. Затримка зв’язку 4–24 хв в один бік (ESA) — ЦУП не встигне. GPS немає. Скафандр NASA — до 7 год + 30 хв аварійного кисню, який не можна чіпати (NTRS 20140009556). Дорога назад — не те саме, що туди: підйом дорожчий (у моделі ×2 — це assumption, ми так і пишемо). Те саме питання на Землі — туристи й рятувальники без зв’язку; у нас усе почалося зі спуску в Карпатах без GPS. Кадр — AI, підписаний.

<!-- Slide number: 3 -->
One screen answers: when do I turn back?
USER EXPERIENCE — 4 STEPS, NEXT ACTION ALWAYS HIGHLIGHTED
1 · Pick a site on the globe
2 · Add science targets
3 · Build route → Return in N min
4 · GO / NO-GO → walk
![Route built, Return in 24 min, GO · CAUTION](Image 0)
Route on foot
A* over HiRISE terrain: closed loop base → targets → base, elevation profile, never through steep or unknown ground
Return clock
“Return in N min” from O₂, energy and time with a 20% reserve; reachable halo on the map
Point of no return
segments without a safe way back turn red; 30 min emergency O₂ kept for the walk home
What if: O₂ −40%
Nontron Quadrant + Mont Mercou + Gardonne → NO-GO, no return in 7 min → “Replace Nontron Quadrant with Brantôme” → Return in 4 min
GO / NO-GO
9 stations before the EVA: route, life support, return time, targets, abort path, map data, radiation, walk model, equipment
No GPS navigation
beacons by line of sight + inertial drift: 96% of the route with a precise position, Base + 3 beacons
Gale · Brantôme + Mont Mercou → Return in 28 min · GO · CAUTION · 1092 m loop · 19.9 min · 37.1 g O₂
Walk preview
astronaut walks the route, Follow camera, 1×–60×, O₂ and energy tick by the minute
Walk or drive
On foot vs Rover cards: time, O₂, Return in, battery · crew notes · glove mode · offline
![After Replace: Return in 4 min](Image 1)
![Navigation without GPS](Image 2)
JUDGING: CREATIVITY · USER EXPERIENCE
3

### Notes:
[0:45–1:20] Рішення — один екран. Обираєш цілі, будуєш маршрут: A* по рельєфу HiRISE, петля база → цілі → база. HUD каже «Return in 24 min», GO · CAUTION. Точка неповернення — червоні відрізки, 30 хв аварійного O₂ завжди лишаються. Сценарій «O₂ −40%»: Mont Mercou + Champeaux → NO-GO, точка неповернення через 7 хв → застосунок сам пропонує ближчу ціль → Return in 12 min. 9 станцій GO / NO-GO. Навігація без GPS: маяки + інерціалка, 98% маршруту з точною позицією. Прогулянка-превʼю з камерою Follow. Режим рукавиць, телефон 400 px, офлайн. Усі числа — з живого застосунку.

<!-- Slide number: 4 -->
![Real NASA data, end to end: HiRISE elevation, THEMIS night infrared, MOLA + HRSC elevation and rover traverses → slope, ground type, context ring and science targets → safe route and return time, slower on soft ground, horizon and landmarks, targets with rover photos](Image 0)
4

### Notes:
[1:20–1:45] Як це працює (слайд Максима): джерело NASA → що ми рахуємо → що бачить астронавт. HiRISE 1 м → схил, прохідність, небезпека → безпечний маршрут і час повернення. THEMIS нічний ІЧ → тип ґрунту (пісок повільніше, assumption). MOLA + HRSC 200 м → кільце рельєфу 61 км і огляд Olympus Mons і Valles Marineris. Траси Curiosity і Spirit → цілі на справжніх зупинках роверів з фото. Усе обрізано офлайн відтворюваним пайплайном, кожен шар показує джерело.

<!-- Slide number: 5 -->
Six map layers — and what we extract from each
![Map layers bar on top: icon + name](Image 0)
![THEMIS night IR layer](Image 1)
![Slope layer](Image 2)
LAYER
SOURCE / METHOD
WHAT THE PLANNER GETS
Terrain (DEM)
HiRISE 1 m stereo → 10 m grid
elevation profile; uphill ×2, downhill ×0.5 walking time
THEMIS night IR: loose vs firm ground
+ Slope (derived): 0° flat → 25° limit
Slope (derived)
Horn 3×3 at 1 m, max per cell
> 25° = blocked; hazard = slope/25 × 0.5 → route keeps off cliffs
GEOLOGY: TARGETS AT REAL OUTCROPS
![Mont Mercou target card with Curiosity photo](Image 3)
Mont Mercou
top of a ~6 m cliff: chemistry, mineralogy, sedimentary structures
Optical (HiRISE)
orthomosaic; Columbia: hillshade
what the ground looks like; 3D surface texture
Nontron · Champeaux
clay → sulfate layers: was it habitable?
Thermal IR night (THEMIS)
Mars Odyssey, ~100 m
dark = low thermal inertia = loose sand → up to +40% time
Comanche · Home Plate
Spirit’s carbonate outcrop and layered rocks (Columbia Hills)
Thermal IR day (THEMIS)
Mars Odyssey, ~100 m
sunward vs shaded slopes (display)
Troy
soft soil where Spirit got stuck — check the ground first
Rover traverse
Curiosity MMGIS · Spirit Trek
site box, targets at real stops, “View from here” photos
Every layer shows source, product ID, native → grid resolution, method, credit and a text legend.
Out and back: every outcrop is reached only by a route that keeps the way back open.
JUDGING: VALIDITY · CREATIVITY
5

### Notes:
[1:45–2:15] Шари — зверху, іконка + назва. Що дістаємо з кожного: рельєф HiRISE 1 м → профіль і час (підйом ×2, спуск ×0.5 — assumption); схил (Horn 3×3) → понад 25° непрохідно, небезпека відводить маршрут від уступів; HiRISE — як виглядає ґрунт; THEMIS нічний ІЧ → низька теплова інерція = пухкий пісок → до +40% часу; THEMIS денний — освітлені й тіньові схили; траса ровера → цілі на справжніх зупинках і фото «View from here». Геологія: цілі — справжні відслонення: Mont Mercou (уступ ~6 м), перехід глини → сульфати (Nontron, Brantôme, Champeaux) — питання придатності до життя; Comanche (карбонати) і Home Plate у Columbia Hills; Troy — м’який ґрунт, де застряг Spirit. До кожного відслонення — лише маршрут, з якого є дорога назад.

<!-- Slide number: 6 -->
Two walking sites, whole planet, honest numbers
![Columbia Hills](Image 0)
![Olympus Mons](Image 1)
![Gale · Valles Marineris](Image 2)
Columbia Hills
Spirit · Comanche + Home Plate → Return in 10 min
Olympus Mons
terrain overview · summit ≈ 21.2 km (MOLA)
Gale · Valles Marineris
Curiosity walks · canyon overview
VERIFIED
Terrain & imagery
NASA Mars Trek product IDs, credit and resolution on every layer; Curiosity & Spirit photos with sol and source. Space Agency Partner data: ESA Mars Express HRSC (with NASA MOLA).
2 of 10
model coefficients verified: 30 min emergency O₂ (NASA EMU) and dose rate (Curiosity RAD). 8 shown on screen as “assumption” — Apollo walk rate, 25° slope limit, soil, reserve.
“within model”
is the best status — never “safe”. Radiation: Curiosity RAD 0.67 mSv/day vs NASA 600 mSv career limit; suit battery 922 Wh (NASA EMU). Not certified navigation — it says so on screen.
JUDGING: VALIDITY
6

### Notes:
[2:15–2:40] Масштаб: два райони для пішого виходу — Gale (Curiosity) і Columbia Hills (Spirit, Comanche + Home Plate → Return in 8 min), плюс огляд Olympus Mons (вершина ≈ 21,2 км за MOLA) і Valles Marineris. Чесність: рельєф і знімки — verified, з ID продуктів. З 10 коефіцієнтів моделі verified лише 30 хв аварійного O₂ (NASA EMU), решта 9 — assumption і так підписані на екрані. Найкращий статус — «within model», ніколи «safe»; невідома доза — «estimate incomplete». Повний текст — specs/F5/assumptions-en.md (Влад).

<!-- Slide number: 7 -->
Who it helps, and what comes next
IMPACT
NEXT
Astronauts on EVA
one number on the wrist tablet instead of mental math under stress
Rover where people can’t walk
routes that switch between rover and foot; walk-back limit if the rover stops (specs/F4/rover.md)
Crew & mission planners
check a plan in the habitat; see what breaks when O₂ drops
Satellite coverage zones
where the crew can reach an orbiter along the route
Analog missions & training
rehearse a walk on real HiRISE terrain before anyone suits up
Suit energy over time
NASA EMU battery ≈ 922 Wh drains by time, not by metres
On Earth
the same turn-back logic for hikers and rescue teams without signal
More sites
Jezero (Perseverance) and new landing zones
MARS//404 — know when to turn back.  xand0dev.github.io/mars404
Demonstration model · not certified navigation · SI tools (AI coding agents) used and logged in docs/AI_LOG.md · SI-generated video frames carry a visible watermark · no NASA logos used
JUDGING: IMPACT
7

### Notes:
[2:40–3:00] Кому допомагає: астронавту на виході — одне число замість розрахунків під стресом; екіпажу й плановикам — перевірити план і побачити, що ламається при падінні O₂; аналоговим місіям і тренуванням — прорепетирувати вихід на справжньому рельєфі; на Землі — та сама логіка розвороту для туристів і рятувальників без зв’язку. Далі: пішки або ровером (джерела LRV — specs/F4/rover.md), зони покриття супутників, енергія скафандра за часом (батарея EMU ≈ 922 Wh, NTRS 20050217305), Jezero. Фінал: MARS//404 — know when to turn back.
