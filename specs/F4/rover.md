# F4 · Спека: марсохід у маршруті (не лише пішки)

Зараз F4 будує лише **пішохідний** маршрут, F5 рахує ресурси скафандра. На Марсі (як на Apollo 15–17) екіпаж може їхати на ровері: далі, швидше, дешевше за O₂. Але головне правило безпеки — **walkback**: якщо ровер зламається в будь-якій точці, екіпаж має дійти до бази пішки на ресурсах скафандра. Документ — точка входу для ресерчу й реалізації (задачі V1…V8).

## 1. Що кажуть джерела (звірено 14.11)

| id | Цитата / число | Джерело | Статус |
|---|---|---|---|
| lrv-power | «two 36-volt silver-zinc potassium hydroxide non-rechargeable batteries with a capacity of 121 amp-hr» → 2 × 36 × 121 ≈ **8.7 kWh** | [NSSDC: Apollo LRV](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html) | verified |
| lrv-range | «The longest traverse was 20.1 km and the greatest range from the LM was 7.6 km»; маса 210 кг, вантаж 490 кг | там само | verified |
| walkback-10km | екіпажі на роверах «travel up to 10 kilometers away»; аварійне повернення пішки «3.6 km/hr for periods of up to an hour, and 2.5 km/hr for longer periods. A return from a distance of 10 kilometers could, then, be completed in about 4 hours» | [Jones, LA-UR-89-3858](https://www.osti.gov/servlets/purl/7168757) | verified (Місяць) |
| riding-metabolic | «550 BTU/hr while riding» проти 1290 BTU/hr при ходьбі → O₂ на ровері ≈ 0.16 × 0.55 lb/h ≈ **0.011 г/с** (ходьба — 0.026–0.031) | там само | verified (Місяць) |
| walkback-limit-9.5 | NASA обмежувала поїздки радіусом ~9.5 км від LM — межа пішого повернення | NASA History SP-4204 ch. 23 | candidate — звірити |
| sev-concept | Space Exploration Vehicle (концепт): ~10 км/год, схили до 40° | NASA techbriefs | candidate, **концепт, не дані** |
| lrv-speed / lrv-slope | швидкість LRV, допустимий схил | [LRV Systems Handbook A15](https://www.nasa.gov/wp-content/uploads/static/history/alsj/LRVSysHndbkA15RevA.pdf), [LRV Ops Handbook](https://www.nasa.gov/wp-content/uploads/static/history/alsj/LRV_OpsNAS8-25145Pt1.pdf) | **TODO** (PDF — скани, потрібен OCR) |

## 2. Модель

**Режими пересування на відрізку:** `walk` (як зараз) і `drive`.

| Що | Пішки (зараз) | Ровер (нове) |
|---|---|---|
| Граф | ребра §7.3, `maxSlopeDeg` | ті самі клітинки, свій `roverMaxSlopeDeg` (TODO, LRV), свій штраф hazard (сипкий пісок — гірше для колес) |
| Швидкість | `speedMps` (1.0) | `roverSpeedMps` (TODO, LRV) |
| O₂ екіпажу | `o2GPerS` (ходьба) | `o2GPerSRiding` ≈ 0.011 г/с (verified, Місяць) |
| Енергія | батарея скафандра | батарея ровера: `roverEnergyWhPerM` (TODO) з ліміту ≈ 8.7 kWh (verified) |

**Маршрут:** база → (їдемо) → паркування біля цілі → (пішки до цілі й назад) → (їдемо) → … → база. Паркування — найближча до цілі клітинка, прохідна для ровера, у межах пішої дистанції (параметр, assumption).

**Walkback (головне правило безпеки, нове F5):** для кожного відрізка, який ми **їдемо**, екіпаж має дійти пішки до бази з будь-якої його точки на ресурсах скафандра, що лишились на цей момент, — з аварійним запасом O₂. Це та сама машинерія, що й Abort map (§7.8): зворотне **пішохідне** дерево від бази + накопичена витрата. Відрізки, де walkback не виконано, — «no walkback» (червоні); точка, після якої ровер не має права їхати далі, — **walkback limit** (аналог точки неповернення).

**Сценарій для демо:** «Rover fails here» на обраному відрізку → пішохідний маршрут додому з цієї точки, «Return on foot in N min», вистачає / не вистачає O₂.

## 3. Зміни контракту (issue з міткою `contract`, рішення @xand0dev)
- `ModelParams` → блок `rover?: { speedMps, maxSlopeDeg, energyWhPerM, o2GPerSRiding, evidence }` (немає — режиму `drive` немає).
- `Region.limits` → `roverEnergyWh?`.
- `Segment.mode: 'walk' | 'drive'`; `RoutePlan` без змін форми.
- `ReachabilityResult.abort` → для `drive` відрізків `ok` означає walkback; або окреме поле `walkback`.
- Store: режим маршруту (`walk` / `rover`) — хто пише (F4).

## 4. Задачі

| # | Задача | Хто / де | AC (пропозиція) |
|---|---|---|---|
| V1 | Ресерч LRV: швидкість, схил, Wh/км з OCR handbook; Mars pressurized rover (NASA DRA 5.0) | Влад, `docs/SOURCES.md ## F4` | — |
| V2 | Contract-issue (розділ 3) | Влад → @xand0dev | — |
| V3 | Ядро: граф ровера (`src/core/edge.ts` з параметрами режиму), пошук паркування | Влад, `src/core` | — |
| V4 | `planRoute` з режимом `rover`: drive-ноги + пішохідні ноги до цілей | Влад, `src/core/plan-route.ts` | **F4-AC8.** Given ціль далі за пішу досяжність; When режим «Rover»; Then маршрут їде до паркування й іде пішки до цілі, на карті drive і walk відрізки розрізняються |
| V5 | Walkback у F5 | Влад, `src/core/abort.ts` | **F5-AC7.** Given drive-відрізок; When пішохідне повернення з його кінця не вкладається в ресурси скафандра з аварійним запасом; Then відрізок «no walkback», а walkback limit — початок першого такого |
| V6 | «Rover fails here» у пульті | Влад, `RouteDock` | демо-сценарій |
| V7 | Карта: drive — суцільна лінія, walk — пунктир; walkback limit — знак | F2 (@xand0dev або Влад за погодженням) | — |
| V8 | Ресурси ровера в Life support (батарея ровера окремо від скафандра) | Влад, F5 | — |

**Порядок:** V1 → V2 → V3 → V4 → V5 → V6; V7, V8 — паралельно після V4.

## 5. Ризики
- **Час:** заморозка фіч — неділя 12:00. Повний ровер (V3–V8) — після хакатону або як «next» на слайді; до заморозки реально — V1, V2 і хіба що V6 як демо на пішохідній машинерії.
- **Місяць ≠ Марс:** усі числа LRV — «assumption (Moon → Mars)»; Марс — тиск і пил, інша гравітація.
