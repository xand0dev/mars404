# F4 · Спека: марсохід у маршруті (не лише пішки)

Зараз F4 будує лише **пішохідний** маршрут, F5 рахує ресурси скафандра. На Марсі (як на Apollo 15–17) екіпаж може їхати на ровері: далі, швидше, дешевше за O₂. Але головне правило безпеки — **walkback**: якщо ровер зламається в будь-якій точці, екіпаж має дійти до бази пішки на ресурсах скафандра. Документ — точка входу для ресерчу й реалізації (задачі V1…V8).

## 1. Що кажуть джерела (V1, звірено 15.11)

Цитати дослівні, скопійовані з тексту сторінок, які реально завантажено 15.11 (HTML або текстовий шар PDF). Похідні числа (→) — наш розрахунок, не цитата. Статичні сторінки ALSJ на nasa.gov (`/wp-content/uploads/static/history/alsj/*.htm|pdf`) 15.11 віддають 404 або редирект на головну ALSJ. Тому розділи Apollo 15 Mission Report узято з копії `hq.nasa.gov/alsj` у Wayback Machine (оригінальний NASA-текст, URL нижче).

| id | Цитата / число | Джерело | Статус |
|---|---|---|---|
| lrv-speed-max | «The vehicle was designed to carry the two crewmen and a science payload at a maximum velocity of about 16 kilometers per hour (8.6 mi/hr) on a smooth, level surface, and at reduced velocities on slopes up to 25 degrees.» | Apollo 15 Mission Report (MSC-05161), Appendix A: [Wayback hq.nasa.gov/alsj/a15/a15mr-a.htm](https://web.archive.org/web/20190721173436/https://www.hq.nasa.gov/alsj/a15/a15mr-a.htm) | verified (Місяць) |
| lrv-speed-max-2 | «…range of 65 kilometers (40 miles) at speeds up to 17 kilometers per hour (11 miles per hour).» | NASA SP-4214 «Where No Man Has Gone Before», ch. 13-3: [nasa.gov](https://www.nasa.gov/wp-content/uploads/static/history/SP-4214/ch13-3.html) | verified (Місяць); 16 vs 17 км/год — різні документи, для моделі брати 16 (mission report) |
| lrv-speed-flown | «The velocity of the rover on the level surface reached a maximum of 13 kilometers (7 miles) per hour. Driving directly upslope on the soft surface material at the Apennine Front, maximum velocities of 10 kilometers (5.4 miles) per hour were maintained.» | Apollo 15 Mission Report, ch. 9 (Pilot's report): [Wayback a15mr-9.htm](https://web.archive.org/web/20190721173434/https://www.hq.nasa.gov/alsj/a15/a15mr-9.htm) | verified (Місяць) |
| lrv-speed-typical | «the vehicle traveled 27.9 kilometers (15.1 miles) during 3 hours and 8 minutes of driving at an average speed of 9.2 kilometers (4.97 miles) per hour.» → **типова ~9 км/год ≈ 2.5 м/с** | Apollo 15 Mission Report, ch. 8.2: [Wayback a15mr-8.htm](https://web.archive.org/web/20190721173435/https://www.hq.nasa.gov/alsj/a15/a15mr-8.htm) | verified (Місяць) |
| lrv-speed-ntrs | «The LRV could theoretically achieve speeds of 9 – 13 km/hr (2.5 – 3.6 m/s).»; «The Apollo 16 mission report states the LRV achieved speeds up to 14 km/hr (3.8 m/s)»; «The as-traversed speeds were, on average, lower than expected.» | NTRS 20250011301, «Apollo Lunar Roving Vehicle as Traversed Performance Metrics: Preparing for Artemis Mobile Vehicle Traverse Planning»: [ntrs.nasa.gov](https://ntrs.nasa.gov/citations/20250011301) | verified (Місяць); середні SMG — у Table 1 PDF, не відкрито |
| lrv-speed-nssdc | Apollo 15: «27.8 km in 3 hours, 2 minutes of driving time»; Apollo 17: «35.9 km in 4 hours 26 minutes total drive time» → 9.2 і 8.1 км/год | [NSSDC: Apollo LRV](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html) | verified (числа), швидкість — похідна |
| lrv-slope | «climb and descend slopes of 25 degrees, and park on slopes as steep as 35 degrees.» | NASA SP-4214, ch. 13-3 (як вище) | verified (Місяць) |
| lrv-slope-2 | «The LRVs were designed to navigate a 20 – 23° slope in "favorable conditions" with a max of 25°.» → **`roverMaxSlopeDeg` = 25** (≈ як пішки зараз), робочий 20–23° | NTRS 20250011301 (як вище) | verified (Місяць) |
| lrv-energy-flown | «estimated total power consumption of 52 ampere-hours of the 242 ampere- hours available. The consumed electrical power corresponds to a rate of 1.87 ampere-hours per kilometer. The preflight prediction of the usage rate was 3.67 ampere-hours per kilometer.» → при 36 В: **≈ 67 Wh/км фактично**, ≈ 132 Wh/км передпольотний прогноз (worst-case ґрунт) | Apollo 15 Mission Report, ch. 8.2.3 «Electrical Power»: [Wayback a15mr-8.htm](https://web.archive.org/web/20190721173435/https://www.hq.nasa.gov/alsj/a15/a15mr-8.htm) | verified (Ah/км); Wh/км — похідне (36 В номінал) |
| lrv-battery | «two 36-volt silver-zinc potassium hydroxide non-rechargeable batteries with a capacity of 121 amp-hr» (NSSDC); «two silver-zinc batteries, each having a nominal voltage of 36 Vdc and a capacity of 120 ampere hours» (A15 MR App. A) → 2 × 36 × 121 ≈ **8.7 kWh** | [NSSDC](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html); [Wayback a15mr-a.htm](https://web.archive.org/web/20190721173436/https://www.hq.nasa.gov/alsj/a15/a15mr-a.htm) | verified |
| lrv-energy-rated | «The 207-kilogram vehicle would run for 65 kilometers on its two 36-volt batteries.» → 8.7 kWh / 65 км ≈ 134 Wh/км (номінал, збігається з прогнозом 3.67 Ah/км) | NASA SP-4204 «Moonport», ch. 23-3 (дзеркало, див. нижче) | verified текст / похідне число |
| walkback-limit-9.5 | «As a safety precaution, NASA restricted travel to a 9.5-kilometer radius from the lunar module, the limit of the astronauts' ability to walk home.» | NASA SP-4204 «Moonport», ch. 23-3 «The Moon Gets an Automobile». Офіційний URL (з [змісту SP-4204 на nasa.gov](https://www.nasa.gov/wp-content/uploads/static/history/SP-4204/contents.html)) `http://www.hq.nasa.gov/office/pao/History/SP-4204/ch23-3.html` віддає 403; текст звірено на дзеркалі [apolloexplorer.co.uk/books/sp-4204/ch23-3.html](https://apolloexplorer.co.uk/books/sp-4204/ch23-3.html) | verified (через дзеркало); перед фіналом перевірити з браузера на hq.nasa.gov |
| walkback-6mi | «During the Apollo program, exploration was confined to the distance astronauts could expect to walk back wearing spacesuits if their rovers broke down: about 6 miles.» (≈ 9.7 км) | NASA SEV fact sheet: [nasa.gov PDF](https://www.nasa.gov/wp-content/uploads/2015/08/464826main_sev_factsheet_508.pdf) | verified — друге NASA-джерело для 9.5 км |
| mars-walkback-15km | Mars: «traveling out a nominal distance (approximately 15 km, or EVA walk-back distance)»; Telecommuter: «traverses by the crew of no more than walk-back distances (~15 km radial distance)» | NASA SP-2009-566 (DRA 5.0): [nasa.gov PDF](https://www.nasa.gov/pdf/373665main_NASA-SP-2009-566.pdf); NASA/SP-2009-566-ADD (Addendum): [nasa.gov PDF](https://www.nasa.gov/pdf/373667main_NASA-SP-2009-566-ADD.pdf) | verified (архітектурне припущення NASA, не дані) |
| mars-lrv-type | «Range will be limited by suit power, rover speed, and permissible "walk-back" distance as with the Apollo mission. Speed for this rover is estimated at around 10 km/hour and in the 1–2 kW range.» (Apollo LRV-type rover на Марсі) | DRA 5.0 Addendum, §6.3 (Telecommuter) — PDF вище | verified (концепт) |
| dra5-spr | Commuter, 2 малі герметичні ровери: «traverse 100 km (130 km total with trafficability factors included) in 15 days … a speed of 3 km/hr … The drive power to achieve the 3 km/hr speed for the small rovers is approximately 25 kWe.» Маса: «the lower mass of these rovers (~7,500 kg)» | SP-2009-566 §5.4.2 «Mobile power»; Addendum (Scenario 2: Commuter) — PDF вище | verified (концепт DRA 5.0) |
| dra5-large-rover | Mobile Home: «excursions of up to 200 km in 30 days, an average rover speed of about 3 km/hr is required, assuming 5 hours of driving every other day … a 15,000-kg rover would need about 47 kWe for mobility alone.» | DRA 5.0 Addendum (Scenario 1: Mobile Home) — PDF вище | verified (концепт) |
| sev-concept | SEV (Surface Concept): «It can travel at about 10 kilometers per hour»; «would extend that potential range to more than 125 miles in any direction» (два й більше SEV); «Weight: 6,600 pounds» | NASA SEV fact sheet — PDF вище | verified (концепт, не дані); **«схили до 40°» у fact sheet немає** (рядок прибрано) |

### Що це дає моделі (пропозиція, усе — «assumption (Moon → Mars)»)
- `roverSpeedMps` ≈ 2.5 м/с (типова 9.2 км/год, Apollo 15); макс. 16 км/год ≈ 4.4 м/с — лише для перевірки.
- `roverMaxSlopeDeg` = 25 (робочий 20–23°).
- `roverEnergyWhPerM` ≈ 0.067 (фактично A15) або 0.13 (прогноз NASA для поганого ґрунту, обережніше); ліміт `roverEnergyWh` ≈ 8700.
- Walkback-межа: Apollo 9.5 км (Місяць), DRA 5.0 ~15 км (Марс, припущення NASA). У нашому районі 2.56 км walkback ніколи не обмежує відстань — обмежує O₂ скафандра (§7.8).

### Не підтверджено
- Офіційні NASA-URL розділів ALSJ / SP-4204 зараз не відкриваються автоматично (404/403). Тексти взято з Wayback і дзеркала; варто відкрити в браузері й за потреби поставити посилання на сторінки, що працюють.
- LRV Operations Handbook (LS006-002-2H, Boeing), розділи 5 «Operating Limitations» і 7 «Operating Profiles»: PDF — скани без текстового шару, OCR недоступний. Таблиця швидкість / схил (App. A) і графіки витрати енергії на схилах 0/5/10° не прочитані → **candidate**.
- Середні фактичні швидкості (SMG) по відрізках з NTRS 20250011301 — у Table 1 PDF, не відкрито.
- «SEV: схили до 40°» — у fact sheet NASA не знайдено — прибрано зі спеки.

## 2. Модель

**Режими пересування на відрізку:** `walk` (як зараз) і `drive`.

| Що | Пішки (зараз) | Ровер (нове) |
|---|---|---|
| Граф | ребра §7.3, `maxSlopeDeg` | ті самі клітинки, свій `roverMaxSlopeDeg` = 25° (LRV, verified), свій штраф hazard (сипкий пісок — гірше для колес) |
| Швидкість | `speedMps` (1.0) | `roverSpeedMps` ≈ 2.5 (типова LRV 9.2 км/год, verified) |
| O₂ екіпажу | `o2GPerS` (ходьба) | `o2GPerSRiding` ≈ 0.011 г/с (verified, Місяць) |
| Енергія | батарея скафандра | батарея ровера: `roverEnergyWhPerM` ≈ 0.067–0.13 (A15 факт / прогноз NASA) з ліміту ≈ 8.7 kWh (verified) |

**Маршрут:** база → (їдемо) → паркування біля цілі → (пішки до цілі й назад) → (їдемо) → … → база. Паркування — найближча до цілі клітинка, прохідна для ровера, у межах пішої дистанції (параметр, assumption).

**Walkback (головне правило безпеки, нове F5):** для кожного відрізка, який ми **їдемо**, екіпаж має дійти пішки до бази з будь-якої його точки на ресурсах скафандра, що лишились на цей момент, — з аварійним запасом O₂. Це та сама машинерія, що й Abort map (§7.8): зворотне **пішохідне** дерево від бази + накопичена витрата. Відрізки, де walkback не виконано, — «no walkback» (червоні); точка, після якої ровер не має права їхати далі, — **walkback limit** (аналог точки неповернення).

**Сценарій для демо:** «Rover fails here» на обраному відрізку → пішохідний маршрут додому з цієї точки, «Return on foot in N min», вистачає / не вистачає O₂.

## 3. Зміни контракту (issue з міткою `contract`, рішення @xand0dev)
- `ModelParams` → блок `rover?: { speedMps, maxSlopeDeg, energyWhPerM, o2GPerSRiding, evidence }` (немає — режиму `drive` немає).
- `Region.limits` → `roverEnergyWh?`.
- `Segment.mode: 'walk' | 'drive'`; `RoutePlan` без змін форми.
- `ReachabilityResult.abort` → для `drive` відрізків `ok` означає walkback; або окреме поле `walkback`.
- Store: режим маршруту (`walk` / `rover`) — хто пише (F4).

## 4a. MVP до code freeze (15.11) — без зміни контракту

Перемикач **On foot / Rover** у панелі Route (і в пульті на ≥ 720 px). У режимі Rover маршрут рахується моделлю `riderModel` (`src/core/rover.ts`): швидкість 2.5 м/с, O₂ екіпажу 0.011 г/с, батарея скафандра на метр — 0; батарея ровера окремо (0.132 Wh/м з 8712 Wh). Ореол, «Return in» і Abort map рахуються **пішохідною** моделлю зі store, тобто повернення з будь-якої точки — пішки (walkback). Контракт і store не змінено: режим живе в стані `RoutePanel`, `ModelParams` ровера — у ядрі.

Спрощення MVP (assumption): ровер їде до самих цілей тим самим графом (ліміт схилу 25°, як у LRV), без паркування й пішої «ноги» до цілі; на карті drive і walk не розрізняються.

- **F4-AC8 (MVP). Given** обрані цілі; **When** режим «Rover»; **Then** маршрут перебудовано моделлю ровера: той самий шлях, час менший у 2.5 рази, O₂ — за нормою їзди, видно витрату батареї ровера.
- **F5-AC7 (MVP). Given** маршрут на ровері; **When** рахується Abort map; **Then** час повернення кожного відрізка — пішохідний (той самий, що в пішого плану), і точка неповернення — це межа walkback.

Числа на реальних районах (Chromium, 15.11): Columbia Hills, Pot of Gold + Troy — пішки NO-GO, Point of no return 35 min → на ровері GO · CAUTION, Return in 22 min, 25.8 хв, 379 Wh; Gale, Brantôme + Mont Mercou — 24 → 38 min.

**Відомі обмеження MVP (ревʼю 15.11), закриваються повною версією V2–V8:**
- Ореол і попередження «outside the reachable area» рахуються пішки туди й назад, а план — на ровері: ціль, досяжна ровером, може бути позначена як поза ореолом.
- Витрата O₂ за elapsed — за нормою ходьби (обережно: екіпаж на зупинках пішки), навіть якщо їхали.
- Режим живе в стані `RoutePanel`, у store й `RoutePlan` його немає (потрібне contract-issue): після перемонтування панелі перемикач повертається на On foot, а план у store лишається ровера до наступної перебудови.
- Швидкість і O₂ ровера — константи LRV, не залежать від пішохідної моделі району; «Model coefficients» показує пішохідну модель.
- Ліміт батареї ровера перевіряється лише на екрані (alert), у `reach.deficits` його немає.

## 4. Задачі

| # | Задача | Хто / де | AC (пропозиція) |
|---|---|---|---|
| V1 | ✅ Ресерч LRV і DRA 5.0 — §1 (OCR handbook — лишився candidate) | Влад | — |
| V2 | Contract-issue (розділ 3) | Влад → @xand0dev | — |
| V3 | Ядро: граф ровера (`src/core/edge.ts` з параметрами режиму), пошук паркування | Влад, `src/core` | — |
| V4 | 🟡 MVP (§4a): увесь маршрут на ровері, без паркування. Повністю — `planRoute` з режимом `rover`: drive-ноги + пішохідні ноги до цілей | Влад, `src/core/plan-route.ts` | **F4-AC8.** Given ціль далі за пішу досяжність; When режим «Rover»; Then маршрут їде до паркування й іде пішки до цілі, на карті drive і walk відрізки розрізняються |
| V5 | 🟡 MVP (§4a): повернення пішки з усіх відрізків — є; позначка «no walkback» окремо від «no return» — ні. Walkback у F5 | Влад, `src/core/abort.ts` | **F5-AC7.** Given drive-відрізок; When пішохідне повернення з його кінця не вкладається в ресурси скафандра з аварійним запасом; Then відрізок «no walkback», а walkback limit — початок першого такого |
| V6 | «Rover fails here» у пульті | Влад, `RouteDock` | демо-сценарій |
| V7 | Карта: drive — суцільна лінія, walk — пунктир; walkback limit — знак | F2 (@xand0dev або Влад за погодженням) | — |
| V8 | 🟡 MVP: витрата батареї ровера — у панелі Route. Ресурси ровера в Life support (батарея ровера окремо від скафандра) | Влад, F5 | — |

**Порядок:** V1 → V2 → V3 → V4 → V5 → V6; V7, V8 — паралельно після V4.

## 5. Ризики
- **Час:** заморозка фіч — неділя 12:00. Повний ровер (V3–V8) — після хакатону або як «next» на слайді; до заморозки реально — V1, V2 і хіба що V6 як демо на пішохідній машинерії.
- **Місяць ≠ Марс:** усі числа LRV — «assumption (Moon → Mars)»; Марс — тиск і пил, інша гравітація.
