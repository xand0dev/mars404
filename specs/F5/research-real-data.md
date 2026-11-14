# F5 · Ресерч: реальні дані замість mock (ресурси й коефіцієнти)

Мета: кожне число моделі й лімітів у `region.json` — з джерела NASA або чесно «assumption» з поясненням. Документ — точка входу для задач R1…R8; реалізація — після ресерчу, окремими PR.

Статуси: **verified** — цитату звірено в першоджерелі; **candidate** — джерело знайдено, число треба звірити; **TODO** — джерела ще немає.

## 1. Що зараз у моделі (`public/data/gale/region.json`, рішення #20)

| Параметр | Зараз | Статус | Що не так |
|---|---|---|---|
| `o2GPerS` | 0.031 г/с | assumption (Apollo, Місяць → Марс) | ходьба на Місяці (1/6 g), не на Марсі (0.38 g) |
| `speedMps` | 1.0 м/с | assumption (Apollo) | те саме |
| `emergencyO2G` | 56 г (30 хв × `o2GPerS`) | verified (EMU SOP) | — |
| `limits.o2` | 140 г | assumption (година ходьби після резерву) | не ємність балона, а демо-ліміт |
| `limits.time` | 3600 с | assumption | реальний вихід — до 7 год (EMU) |
| `limits.energy` | 600 Wh | assumption | реальна батарея EMU ≈ 922 Wh |
| `energyWhPerM` | 0.05 Wh/м | assumption | **скафандр витрачає енергію за часом (PLSS), а не за метрами** — модель неправильна |
| `doseUSvPerS` | `null` | — | є дані RAD для Gale |
| `limits.dose` | `null` | — | ліміту на один вихід у NASA немає |
| `uphillFactor` / `downhillFactor` | 2 / 0.5 | assumption (еталон §7.3) | джерела немає |
| `maxSlopeDeg` | 25° | assumption | джерела немає |
| `hazardWeight`, `reserveFraction` | 0.5 / 0.2 | assumption | — |

## 2. Знайдені джерела (звірено 14.11)

| id | Цитата / число | Джерело | Статус |
|---|---|---|---|
| emu-battery | «silver-zinc battery that is 20.5 V and 45 Ah capacity. The EMU's portable life support system (PLSS) will draw power from the battery during the entire period of an EVA» → 20.5 × 45 ≈ **922 Wh** | [NTRS 20050217305](https://ntrs.nasa.gov/citations/20050217305) | verified |
| emu-eva-7h | EMU: «consumables to support an EVA of 7 hours maximum duration … 30 minutes for reserve» | [NTRS 20140009556](https://ntrs.nasa.gov/api/citations/20140009556/downloads/20140009556.pdf) | verified |
| nasa-std-3001-career | «total career effective radiation dose due to space flight radiation exposure shall be less than 600 mSv»; SPE — «250 mSv per event» | [NASA OCHMO Radiation Protection brief](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) | verified |
| jones-apollo-walk | O₂ 0.16 lb/h на 1000 BTU/h; ходьба 1290 BTU/h (2.7 км/год), 1560 BTU/h (3.5 км/год) | [Jones, LA-UR-89-3858](https://www.osti.gov/servlets/purl/7168757) | verified (Місяць) |
| rad-gale | Доза на поверхні Gale ≈ 0.67 мЗв/добу (Curiosity RAD) | Hassler et al. 2014, Science (джерело Олі, #20) | candidate — звірити першоджерело |

## 3. Задачі ресерчу

| # | Задача | Що шукати | Куди | AC |
|---|---|---|---|---|
| R1 | **Енергія скафандра за часом.** Замінити `energyWhPerM` на витрату PLSS у Wh/с | 922 Wh / 7 год ≈ 0.037 Wh/с (≈ 130 W) — звірити з потужністю PLSS (NTRS: EMU power budget) | issue `contract`: поле `energyWhPerS` або формула; F5 ядро | F5-AC8: енергія тане з часом, а не з метрами |
| R2 | `limits.energy` = ємність батареї EMU | 922 Wh (verified) → у `region.json` (F3) зі статусом verified | #64-подібний issue на F3 | — |
| R3 | `limits.time` реальний | 7 год EMU (verified) vs демо 1 год: рішення команди — для демо лишити 1 год «assumption» або показати 7 год | рішення @xand0dev | — |
| R4 | `limits.o2` = реальний запас O₂ основного балона EMU | маса O₂ у PLSS (NTRS: EMU primary O₂ tank, 900 psia) → г | SOURCES, `region.json` | — |
| R5 | **Доза:** `doseUSvPerS` з RAD | звірити Hassler 2014 (0.21 мГр/добу, 0.64–0.67 мЗв/добу) → ≈ 0.0076 мкЗв/с | `region.json`, SOURCES | HUD перестає казати «dose — no data» |
| R6 | **Ліміт дози на вихід** | у NASA-STD-3001 ліміту на один вихід немає (є 600 мЗв кар'єра, 250 мЗв на SPE) → показувати дозу як частку кар'єрного ліміту, а не як ліміт; `limits.dose` лишається `null` | рішення команди; F5 UI | — |
| R7 | Підйом / спуск (`uphillFactor`, `downhillFactor`) | NASA: метаболічна вартість ходьби в скафандрі під ухил (1/6 g і 0.38 g тести, NTRS 20080013604 та ін.) | SOURCES, модель | — |
| R8 | `maxSlopeDeg` | досвід Apollo (Jones: 10° — «only walk for a few minutes at a time»), EVA-стандарти NASA для схилів | SOURCES | — |

## 4. Правила
- Mock-фікстура SPEC §7.3–7.4 / §7.8 **не змінюється** — лише `region.json` (рішення #52).
- Кожне нове число — рядок у `docs/SOURCES.md ## F5` з цитатою; без цитати — «assumption».
- Місяць → Марс: усе з Apollo — «assumption (Moon → Mars)», навіть якщо цитату звірено.
