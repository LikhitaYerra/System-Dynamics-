# Reflection: What’s systematic vs judgment — and how we built the factory

**Purpose:** Separate what the “System Dynamics Studio” does by rule (code, data, simulation) from what remains human territory (scope, interpretation, values). This supports both **trust** and **reproducibility**.

---

## 1. What we made systematic (code and process)

| Element | How it’s systematic | Where it lives |
|--------|----------------------|----------------|
| **Model structure** | One schema format: stocks (id, name, initial), flows (from, to, rate), parameters (id, value). Optional: source, loop_type, delay for auditability. | `sd_engine.py`: schema format, `schema_from_dict()`, catalog. |
| **Simulation** | ODEs are built from the schema; same integrator (e.g. `solve_ivp`) for every model. No hand-written equations per model. | `sd_engine.build_ode()`, Streamlit app. |
| **Visualization** | Diagram and time-series are generated from the same schema. Change structure → diagram and curves update. | `draw_stock_flow_diagram()`, plotting in app. |
| **Import / export** | JSON in/out so models can be versioned, shared, or produced by another tool (e.g. GenAI). | `schema_from_dict()`, `schema_to_dict()`, “Import from JSON”, “Download JSON”. |
| **GenAI workflow** | Documented two-step flow: (1) Concept: Brief → narrative / list of stocks and loops; (2) Code: narrative → JSON. Human pastes JSON into the app. No mixing of concept and code in one prompt. | System Dynamics Studio app: “GenAI prompt template” in Export. |
| **Repeatable process** | Scope → Map → Build → Use; Model Brief as contract; standard scenario set (base, optimistic, pessimistic, levers). | `SYSTEM_DYNAMICS_METHODOLOGY.md`, `MODEL_BRIEF_TEMPLATE.md`. |

These parts are **repeatable and auditable**: same inputs and schema → same simulation and diagram.

---

## 2. What stays in human territory (judgment)

| Area | Why it’s judgment | How we handle it |
|------|-------------------|-------------------|
| **What to include / exclude** | No algorithm can decide “is public backlash more important than supplier risk for this question?”. Scope choices reflect priorities and politics. | Model Brief: “In scope” / “Out of scope” filled by sponsor; task force proposes structure, one review round. |
| **How to interpret conflicting information** | Different sources (ministries, NGOs, media) say different things about backlash or regulation. We don’t auto-merge them. | Assumptions and sources are tagged in the schema (e.g. `source`, `loop_type`); narrative in Model Brief and optional “assumptions and limits” note. |
| **Time horizon and aggregation** | 5 vs 10 years, monthly vs quarterly—affects dynamics and relevance. No “correct” choice. | Stated in Model Brief; horizon is a parameter in the app (slider). |
| **Parameter values** | Many parameters are not observable (e.g. “sensitivity of regulation to backlash”). We use plausible ranges and scenarios, not “true” values. | Parameters are explicit and editable; we run scenarios (base, optimistic, pessimistic, levers) instead of one point forecast. |
| **Reinterpretation of the question** | Management might ask “Should we invest in lethal AI?” (yes/no). Reframing to “Under what conditions does lethal AI investment help or harm our long-term position?” changes what we model. | We document the reframe in the Model Brief or a short “reinterpretation” note (see AeroDyn Lethal AI brief). |

We **don’t** try to automate these. We make them visible (Brief, provenance, scenario set) so they can be debated and updated.

---

## 3. Trade-offs we accepted

- **Simplicity vs realism:** Models are deliberately small (few stocks, few flows). We prefer a simple model that runs and is explainable over a large one that’s hard to validate or communicate. We can always add another model for another question.
- **GenAI: assist, not replace:** We use GenAI to propose structure (narrative → JSON). Humans load, edit, and validate. We don’t let the model run unsupervised; we don’t hide that some content came from an LLM (provenance).
- **No calibration on hard data (for now):** Many strategic variables (e.g. “reputation”, “backlash”) don’t have a single time series. We use scenario-based exploration and document that parameters are assumptions. A future step could be Bayesian priors or soft calibration where data exists.
- **One engine, many schemas:** All models share the same simulation and diagram code. That keeps the factory maintainable but constrains rate expressions to what the engine can evaluate (stock and parameter names, basic math). Non-linear or table functions would require extending the engine.

---

## 4. How this supports the assignment criteria

- **Architecture & data structures (7 pts):** Single schema (stocks, flows, parameters + optional provenance); model catalog; JSON in/out; schema-driven ODE and diagram.
- **Interfaces / GenAI (7 pts):** Catalog + “Import from JSON” + “GenAI prompt template”; low-friction flow: Brief → (GenAI) → JSON → load → edit → simulate; provenance on flows.
- **System-dynamics adequacy (4 pts):** Explicit stocks and flows; reinforcing/balancing loops documented; delays noted; scenarios (base, optimistic, pessimistic, levers); building blocks aligned with methodology.
- **Reflection on trade-offs (2 pts):** This document: systematic vs judgment; what we automated vs what we didn’t; trade-offs (simplicity, GenAI role, calibration, one engine).

---

*The factory is a process and a minimal technical core. The value is in using it repeatedly for different questions and making the human choices explicit.*
