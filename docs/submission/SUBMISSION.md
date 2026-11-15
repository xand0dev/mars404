# Submission — MARS//404 (NASA Space Apps 2026)

> Тексти для форми Space Apps, англійською. Форму заповнює й відправляє Олександр (чернетка 20:00, фінал 21:00).
> Назви розділів = поля форми з Project Submission Guide (spaceappschallenge.org, 13.11.2026). Усе — англійською; посилання — публічні, без входу (перевірити в приватному вікні).
> Правило: жодного числа чи твердження, якого немає в продукті, `docs/SOURCES.md` або `specs/F5/assumptions-en.md`.
> `COMING SOON` — чекаємо текст / посилання від людини в дужках. Перед відправкою — прибрати цей блок і всі `COMING SOON`.

## Project name
MARS//404 — know when to turn back

## Challenge
Interplanetary Survival Guide: Martian Map

## Team
| Name | GitHub | Role |
|---|---|---|
| Oleksandr | @xand0dev | scaffold, integration, 3D terrain, video edit, submission |
| Olia | @oljyaaa | UI, HUD, design system, demo script, slides |
| Ivan | @gonivanko | 3D globe, site selection, screenshots |
| Maksym | @kingsneverdie17 | data pipeline, layers, NASA data |
| Vlad | @froozy3 | route planner, resource and return model |
| Nastia | @Bulka0801 | science targets and photos, QA, sources |

## Link to Project Demo
Video ≤ 30 s with English subtitles (YouTube unlisted, no login): COMING SOON (Oleksandr).
Backup: slide deck, 7 slides in English (Google Slides / PDF, public link): COMING SOON (Olia).
Only one demo counts; anything over 30 s or 7 slides is not eligible for Global Judging.

## Link to Final Project
- Live app (no login): https://xand0dev.github.io/mars404/
- Source code (Apache-2.0): https://github.com/xand0dev/mars404

## High-Level Project Summary
On Mars an astronaut on foot has no GPS and no live help from Earth, and the same oxygen, energy and time must last the way back. MARS//404 is a tablet planner for walking spacewalks that answers one question: when do I have to turn back? Built on real NASA terrain of Gale crater (Curiosity) and the Columbia Hills (Spirit), it plans a walking route around steep and unknown ground, counts down “Return in N min”, marks the point of no return, gives a GO / NO-GO before the walk starts and, when oxygen drops, suggests a closer target. It works offline, finds the position without GPS from beacons, and is honest about its limits: every model number shows its source or the word “assumption”.

## Detailed Project Description

### What it does
- **Pick a site on a 3D Mars globe.** Two detailed walking sites — Gale crater / Mount Sharp (Curiosity) and the Columbia Hills (Spirit) — plus terrain overviews of Olympus Mons and Valles Marineris.
- **Choose science targets.** Real rover stops with surface photos, a short “why go” and credit (Curiosity Navcam, Spirit Pancam).
- **Build a walking route.** A loop from base through the chosen targets and back, avoiding steep, blocked and no-data ground, with an elevation profile and “View from here” — the nearest real surface photo to a route segment.
- **Know when to turn back.** “Return in N min” from oxygen, energy and time with a fixed reserve; the reachable area on the map; segments with no safe return turn red; “Point of no return in N min”.
- **What if.** “O₂ −40%” shows instantly whether the plan still brings you home; if not, the app offers a closer target (for example, Nontron Quadrant + Mont Mercou + Gardonne → NO-GO → “Replace Nontron Quadrant with Brantôme” → Return in 4 min, GO · CAUTION).
- **Walk or drive.** “On foot” and “Rover” cards compare time, O₂, “Return in” and battery for the same plan; in Rover mode a Curiosity 3D model (NASA 3D Resources, public domain) drives the route.
- **GO / NO-GO checklist** before the EVA: route, life support, return time, targets, abort path, map data, radiation, walk model and equipment.
- **Navigation without GPS.** Beacons placed along the route by line of sight plus inertial position with drift; the app shows how much of the route has a precise position.
- **Walk preview.** An astronaut walks the planned route over the terrain (Follow camera, 1× to 60×) with elapsed time, O₂ and energy.
- **Crew map notes** (Blocked / Hazard / Note / Plan) that reroute the plan, glove mode with large controls, keyboard and 400 px phone layout.

### How it works
COMING SOON (Oleksandr, ~19:00).

### Benefits and intended impact
COMING SOON (Oleksandr, ~19:00).

### Tools, languages, hardware and software
COMING SOON (Oleksandr, ~19:00).

## NASA Data
Text from Maksym (`docs/SOURCES.md`, “NASA data for the Space Apps form”, #127):

> Terrain and imagery from NASA Mars Trek: HiRISE 1 m elevation models of Gale crater (Curiosity) and the Columbia Hills (Spirit), the HiRISE orthomosaic of the Curiosity area, THEMIS day and night infrared mosaics (Mars Odyssey), the MOLA + HRSC 200 m global elevation model and the Viking MDIM 2.1 colour mosaic. Rover traverses and stops from NASA/JPL-Caltech (MSL MMGIS, Mars Trek Spirit layers) and Curiosity raw images. All data is cropped and resampled offline by our reproducible pipeline; every layer in the app shows its source and resolution.

| Dataset | Source | Credit |
|---|---|---|
| Gale DEM 1 m (`Gale_DEM_SMG_1m`), MRO HiRISE stereo | https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer | NASA/JPL/University of Arizona, NASA Mars Trek |
| HiRISE orthomosaic of the Curiosity area (`curiosity_hirise_mosaic`) | https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_hirise_mosaic/ImageServer | NASA/JPL/University of Arizona, NASA Mars Trek |
| Columbia Hills DEM 1 m (`DEM_1m_ColumbiaHills`), MRO HiRISE stereo | https://trek.nasa.gov/mars/trekarcgis/rest/services/DEM_1m_ColumbiaHills/ImageServer | NASA/JPL/University of Arizona, NASA Mars Trek |
| Curiosity traverse and waypoints (`MSL_traverse.json`) | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json | NASA/JPL-Caltech, MSL MMGIS |
| Spirit traverse and waypoints | https://trek.nasa.gov/mars/trekarcgis/rest/services/spirit_path/MapServer | NASA/JPL-Caltech, NASA Mars Trek |
| THEMIS IR day and night mosaics 100 m v2, Mars Odyssey | https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/ | NASA/JPL-Caltech/Arizona State University |
| MOLA + HRSC blended DEM 200 m | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m | NASA/GSFC (MOLA, CC0), ESA/DLR/FU Berlin (HRSC, CC BY-SA 3.0 IGO), USGS |
| Viking MDIM 2.1 colorized global mosaic 232 m | https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m | NASA/JPL (Viking), USGS Astrogeology |
| Curiosity Navcam raw images | https://mars.nasa.gov/api/v1/raw_image_items/ | NASA/JPL-Caltech |
| Spirit Pancam images (Home Plate, Comanche, Husband Hill) | https://photojournal.jpl.nasa.gov/ | NASA/JPL-Caltech/Cornell |

Full list with product IDs, dates and licences: `docs/SOURCES.md`.

## Space Agency Partner Data and Other References
- **ESA (2026 Space Agency Partner)** — HRSC on Mars Express (ESA / DLR / FU Berlin) in the MOLA + HRSC blended 200 m elevation model: 61 km terrain ring around Gale and Columbia Hills, Olympus Mons and Valles Marineris overviews; CC BY-SA 3.0 IGO.
- **Astronaut 3D model** — Quaternius (CC0), https://poly.pizza/m/3hC2i0CTuO; **walk animation** — Adobe Mixamo motion capture.
- Apollo and ISS suit references used for model coefficients — see “Validity” below.

## Validity: model assumptions
Text from Vlad (`specs/F5/assumptions-en.md`, #139, updated in #177), short form for the form field:

> MARS//404 plans EVAs on foot or by rover on real HiRISE terrain. The walk and life-support model is a transparent estimate, not flight software. Every coefficient is shown in the app with its source, and anything without a verified source is labelled “assumption”. The same coefficients are used for both detailed sites (Gale crater and Columbia Hills).
>
> - Terrain: 256 × 256 grid of 10 m cells (2.56 km × 2.56 km) from HiRISE 1 m elevation models; features smaller than 10 m are not resolved.
> - Cells steeper than 25° and NoData cells are blocked (25° is an assumption).
> - Walking speed 1.0 m/s and O₂ use 0.031 g/s come from Apollo walking data (Moon, 1/6 g) — assumptions for Mars.
> - Slope penalty (×2 uphill, ×0.5 downhill), soil slowdown up to +40% from THEMIS night IR, hazard weight, 20% reserve, 140 g O₂ and 1 h time limits and 0.05 Wh/m energy use are assumptions; the small O₂ limit is chosen so the “O₂ −40%” scenario visibly changes the plan.
> - 30 minutes of emergency O₂ for the walk home is from the NASA EMU Secondary Oxygen Package (verified); the 56 g figure is an assumption (ISS suit, Apollo rate).
> - Suit battery 922 Wh (ISS EMU, “20.5 V and 45 Ah”, NTRS 20050217305) — verified, but an ISS suit, not a Mars suit; energy is charged only while moving, so this part is optimistic.
> - Radiation: surface dose rate 0.0078 µSv/s (0.67 mSv per day), Curiosity RAD at Gale (Hassler et al. 2014) — verified for Gale, an assumption for Columbia Hills; shown against the NASA-STD-3001 600 mSv career limit for scale only (NASA has no per-EVA limit). A typical demo route adds about 11 µSv.
> - Rover option: Apollo LRV numbers moved from the Moon to Mars as assumptions; the walk home from any point is always checked on foot.
> - Not certified navigation; no real-time telemetry, weather or dust storms.

Full text with sources and the file where each number lives: `specs/F5/assumptions-en.md`.

## Use of Super Intelligence (SI)
Yes. SI tools were used as accelerators, not to come up with the idea; people chose the challenge, wrote the specification and decided what to merge.

- **Code.** We used AI coding agents — mostly Claude Code (Anthropic), plus Codex (OpenAI) — to write code, tests and documentation from human-written specifications (`docs/SPEC.md`, per-feature acceptance criteria). People wrote the specs, reviewed every change in the browser and on CI (`npm run check`, Playwright E2E), and decided what to merge. Every AI session is logged in `docs/AI_LOG.md`: date, person, tool, task, files, how it was checked, PR.
- **Data and science values.** No AI-generated data, images or numbers are presented as NASA data. All terrain, imagery, rover paths and photos come from NASA / USGS / ESA sources listed above; model coefficients carry a source or the label “assumption”.
- **Video.** The first 8 seconds of the demo video (first-person intro on Mars) are AI-generated footage and carry a visible “AI-generated footage” label in the frame. Tool: COMING SOON (Oleksandr — also add a row to `docs/AI_LOG.md`). All product shots are screen recordings of the live app. No NASA logos, flags or mission identifiers are used in generated content, and no images of people under 18.

### References
- E. M. Jones, *Working on the Moon*, LA-UR-89-3858 — Apollo walking speed and O₂ use.
- NASA NTRS 20140009556 — EMU: 30 minutes of emergency O₂, EVA up to 7 hours.
- Lejeune et al. (1998) — energy cost of walking on sand (soil slowdown cap).
- Full list: `docs/SOURCES.md`.
