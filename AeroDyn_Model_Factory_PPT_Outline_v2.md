# System Dynamics Model Factory — PPT Outline (v2)

**AeroDyn Systems — Strategic options for lethal AI & long-term business**  
*External System Modeling & AI Task Force*

*Alternative structure: problem-led, then one question, mechanisms, value, how it works, technical approach, architecture, trade-offs, demo.*

---

## Slide 1 — Title
- **System Dynamics Model Factory**
- AeroDyn Systems — Strategic options for lethal AI & long-term business
- External System Modeling & AI Task Force

---

## Slide 2 — The problem the board has
- One giant model that does everything → slow, opaque, hard to trust.
- What the board actually needs: **repeatable way** to build **small, focused** models for different strategic questions—with **minimal friction**.
- So we can explore options in **minutes**, not months, without depending on a single expert or black box.

---

## Slide 3 — The one question we took on
- **“What happens to our long-term business if we heavily invest in lethal AI?”**
- And: *How do public opinion, regulation, and contracts interact over 5–10 years?*
- One question → one model. Not a firm-wide mega-model; a single, explainable story.

---

## Slide 4 — Reframing: from yes/no to conditions
- Board often asks: *“Should we invest in AI-controlled lethal weapons?”* (yes/no) → not useful for exploring when it pays off or backfires.
- We reframe: **“Under what conditions does investing in lethal AI improve or harm our long-term position?”**
- That leads to: **mechanisms** (visibility → backlash → regulation → reputation → contracts), **levers** (pace, diversification, transparency), and **scenarios**—strategic options, not one number.

---

## Slide 5 — The causal story (what the model captures)
- **Visibility** → more investment in lethal AI → more visible → **backlash** (public/ethical); backlash decays with media cycle.
- **Backlash** → **regulatory pressure** (export controls, certification); regulation eases with policy cycle.
- **Backlash** erodes **reputation** (license to operate); **transparency and compliance** recover it.
- **Reputation** builds **contract pipeline**; delivery drains it; **regulation** constrains it.
- One picture: visibility ↔ backlash ↔ regulation ↔ reputation ↔ contracts.

---

## Slide 6 — What you get: insight, speed, reliability
- **Insight:** One question per model; see how key variables move over 5–10 years. Run scenarios in minutes (base, high investment, diversification, stricter regulation, lower AI performance).
- **Speed:** Model Brief = one-page contract. New question → new model in hours to days. Same engine for every model.
- **Reliability:** Explicit stocks, flows, parameters; editable and auditable; provenance visible. No black box.

---

## Slide 7 — How it works: repeatable and transparent
- **Single schema** (stocks, flows, parameters) → one engine builds equations and diagram. JSON in/out; GenAI can draft, human validates.
- **Systematic:** Same inputs → same results. Schema, simulation, diagram, export—all traceable.
- **Human judgment stays explicit:** What to include, how to interpret conflicts, time horizon, parameter choices, and the **reinterpretation of the question** (e.g. yes/no → under what conditions).

---

## Slide 8 — Technical approach
- **Single schema = source of truth:** Stocks, flows (from/to/rate), parameters—all in one JSON. One engine turns that into ODEs and the causal diagram; no separate “model file” and “picture.”
- **Simulation:** Deterministic ODE integration (same schema + same parameters → same results). Divergence (e.g. blow-up) is detected and reported as a warning; we don’t auto-fix so results stay reproducible.
- **Localized changes:** “Change one relationship” = update one flow by id via **apply-patch**; the rest of the schema is untouched. Compare runs (different params or scenarios) and overlay trajectories; optional parameter sweep.
- **GenAI in the loop:** (1) **Draft** from Model Brief → full schema for you to load and edit. (2) **Suggest** flow or parameters → returns a small patch only; you review and apply. AI-suggested items tagged; no auto-merge. So: **transparent and auditable**; simulation itself stays deterministic.

---

## Slide 9 — Architecture
- **Frontend (React):** Schema view (diagram, variables, loops, “Show explanation”), Graph view (scenarios, chart, “So what?”), optional Full view (3-column: schema + controls + chart + AI). Model selector loads schema from catalog; all views share the same schema and call the same backend.
- **Backend (FastAPI):** REST API: **catalog** (list models), **simulate** / **simulate-batch** (schema + params → time series + optional warnings), **schema/apply-patch** (localized updates), **ai-schema** (draft from brief), **ai-suggest-flow** / **ai-explain-schema** (suggest patch, plain-language summary). No MCP or agents—just HTTP and JSON.
- **Engine (schema-driven):** Single Python engine reads schema (stocks, flows, parameters) → builds ODEs from flow rates → integrates (e.g. `solve_ivp`) → returns trajectories. Same code path for every model (SIR, AeroDyn Lethal AI, Pipeline); model = schema + optional preset params.
- **Data flow:** User picks model → frontend fetches schema (or loads from catalog) → user edits/scenario → POST simulate with schema + params → backend runs engine → chart + “So what?” + interpretation. Schema is the only contract between UI and engine.

---

## Slide 10 — Trade-offs and what we don’t promise
- **Simplicity over realism:** Small, explainable models. Need another angle? Add another model. GenAI assists; humans validate; provenance visible.
- **No calibration on hard data yet:** Scenario-based exploration; assumptions documented.
- **No perfect predictions; no single right answer.** Models help you reason and compare options; **choices stay with you.**

---

## Slide 11 — Demo and bottom line
- **Demo:** Pick the question → load model (stocks, flows, loops) → pick a scenario or change a parameter → run → see the chart and “So what?” interpretation. Just the picture and the numbers—no technical jargon.
- **Bottom line:** Credible, repeatable way to turn strategic questions into system-dynamics models the board can understand. Same approach for the next question → a **library of small models**, human choices explicit.

---

## Slide 12 — Thank you
- Questions?
- We can run a live demo anytime.
