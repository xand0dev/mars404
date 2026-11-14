# Submission draft — MARS::404

> Чернетка тексту для сторінки команди на Space Apps. Мова — англійська.
> Перед сабмітом: звірити назви полів із формою, підставити всі `TODO` реальними результатами, прибрати це вступне примітку.
> Правило: жодного числа чи твердження, якого немає в продукті або в `docs/SOURCES.md`.

## Project name
MARS::404 — Gale EVA planner

## Challenge
Interplanetary Survival Guide: Martian Map

## High-level summary
MARS::404 is a tablet / HUD for an astronaut walking on Mount Sharp in Gale crater. It answers three questions: where to go for science, how to get there safely, and when to turn back. The map is built from NASA data for Gale: a 1 m HiRISE elevation model, a HiRISE orthomosaic, THEMIS thermal imagery, and Curiosity's real traverse and surface photos. A route planner finds a walking loop from base through the chosen science targets and back, avoiding steep and unknown ground. A resource model tracks oxygen, energy, time and (when known) radiation dose with a reserve, draws the zone you can still reach and return from, and shows "Return in N min". When resources drop, it suggests swapping to a closer target. It is a demonstration model, not certified navigation, and it says so on screen.

## Links
- Demo video (≤30 s, English subtitles): TODO
- Live app: https://xand0dev.github.io/mars404/
- Source code (Apache-2.0): https://github.com/xand0dev/mars404

## How it works
- **Data** (offline, reproducible): `pipeline/` (Python + GDAL in Docker) crops the Gale region from NASA Mars Trek, computes slope and walkability, and writes a static data package. The app never calls an API during the demo. — TODO: final bbox, grid size, resolution.
- **Map**: one 3D scene (React Three Fiber) with orbit, top and first-person cameras; a 2D plan when WebGL is unavailable. Vertical exaggeration ×3 is visual only; all numbers are real metres.
- **Route**: A* on an 8-neighbour grid; cost = walking time, asymmetric for uphill and downhill, plus a hazard term; no-data and too-steep cells are never walkable.
- **Return model**: two shortest-path trees (from the astronaut and back to base) give the reachable zone; the reserve is applied once; an unknown dose rate marks the estimate as incomplete instead of "safe".
- **Honesty**: every model constant shows its source or the label "assumption"; any mock data is labelled MOCK.

## NASA data used
TODO: копіювати з `docs/SOURCES.md` лише рядки зі статусом `verified`, з credit і посиланням.
- Gale DEM 1 m (`Gale_DEM_SMG_1m`), NASA/JPL Mars Trek
- HiRISE orthomosaic (`curiosity_hirise_mosaic`), NASA/JPL Mars Trek
- THEMIS Day/Night IR, NASA/JPL Mars Trek
- Curiosity traverse and waypoints, NASA/JPL-Caltech (MMGIS)
- Curiosity raw images, NASA/JPL-Caltech

## Use of AI
We used AI coding agents (Claude Code; TODO: other tools from `docs/AI_LOG.md`) to generate code and tests from human-written specifications. People wrote the product spec and per-feature acceptance criteria, reviewed results in the browser, and decided what to merge. Each AI session is logged in `docs/AI_LOG.md` (date, person, model, task, files, check). No AI-generated images, data or scientific values are presented as NASA data.

## Limitations
- Demonstration model, not certified navigation; not validated against real EVA operations.
- Walking speed, oxygen and energy rates, slope threshold and reserve are assumptions unless a source is shown in the app. — TODO: перелік із фінальної моделі.
- No terrain radiation map exists for Gale; dose is shown only if a source rate is used, otherwise "no data".
- THEMIS imagery (~100 m) is shown for context only and does not feed the hazard model.
- One detailed region (Gale / Mount Sharp); other globe sites are "next site" cards.

## Team
| Name | GitHub | Role |
|---|---|---|
| Oleksandr | @xand0dev | scaffold, integration, 3D terrain, demo & submission |
| Olia | @oljyaaa | UI, HUD, design system, pitch |
| Ivan | @gonivanko | 3D globe and site selection |
| Maksym | @kingsneverdie17 | data pipeline and layers |
| Vlad | @froozy3 | route planner, resource and return model |
| Nastia | @Bulka0801 | science targets and photos, QA, sources |
