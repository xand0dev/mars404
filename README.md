# MARS::404 — Gale EVA planner

NASA Space Apps Challenge 2026 · **Interplanetary Survival Guide: Martian Map**.

Tablet / HUD for an astronaut walking on Mount Sharp (Gale crater): where to go for science, how to get there safely, when to turn back. Demonstration model, not certified navigation.

## Почни тут
1. `docs/SPEC.md` — продукт, контракти, формули, фічі F0–F8 з власниками й AC.
2. `CONSTITUTION.md`, `AGENTS.md` — правила роботи (для людей і агентів).
3. `specs/F<N>/spec.md` — твоя фіча.

```bash
npm ci
npm run dev      # локально
npm run check    # lint + typecheck + test + build
```

Node 22.22+, 24.15+ або 26+ (CI — Node 24, `.nvmrc`). Licence: Apache-2.0. AI usage: `docs/AI_LOG.md`. Data sources: `docs/SOURCES.md`.
