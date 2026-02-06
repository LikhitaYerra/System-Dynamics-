# Assignment coverage — “Is everything covered?”

**Purpose:** Map the Task Force brief and grading criteria to this project. Use this to confirm coverage and to prepare the CEO-style presentation.

---

## In the app: what’s actually in the running UI

The **live app** has two main views (Schema view, Graph view). A third **Full view** (3-column: schema + controls + chart + AI) was disabled; it contained several assignment-relevant features. Below: what is **in the app** vs **only in Full view** (code exists but was hidden).

| Feature | In app? | Where |
|--------|---------|--------|
| **Model selector** (catalog) | ✅ | Header dropdown (Schema + Graph). |
| **Strategic question + subject + horizon** | ✅ | SubjectScenarioCard (model name, question, horizon in years). |
| **Schema diagram** (stocks, flows, R/B) | ✅ | Schema view; toggles: SVG, React Flow, Cluster, Mermaid API. |
| **Variables & equations sidebar** | ✅ | Schema view left: stocks, parameters, flows (code-style). |
| **Reinforcing & balancing loops** (cards) | ✅ | Schema view “Show explanation” + loop cards. |
| **AI schema explanation** (plain-language summary of model) | ✅ | Backend `/ai-explain-schema`; AI produces 4–8 sentences: model name & question, stocks, flows, R/B loops, causal story, transparency. Frontend: `askExplainSchema`, handler + state; can be surfaced in Schema view “Show explanation”. |
| **AI assistant** (CEO question, draft, suggest) | ✅ | Schema view + Graph view (AIAssistantCard). |
| **Scenario presets** (Base, High invest, Diversification, Stricter reg, **Lower AI performance**) | ✅ | Graph view: preset buttons; run → chart. |
| **Chart + “So what?” + Interpretation** | ✅ | Graph view after run; “Show explanation” toggle. |
| **Divergence warnings** | ✅ | Graph view under chart when present. |
| **Horizon slider** (change 5–10 years) | ✅ | **Full view** left panel (Model & horizon). |
| **Transparency block** (inflows/outflows per stock, parameters, provenance) | ✅ | **Full view** left panel. |
| **Exclude mechanisms** | ✅ | **Full view** left panel. |
| **Parameter sweep** | ✅ | **Full view** left panel. |
| **Compare runs** (save run, overlay on chart) | ✅ | **Full view** left panel + chart. |
| **Edit one relationship** (one flow rate) | ✅ | **Full view** left panel. |

**Summary:** **Full view** is a third view mode (header: “Full view” toggle). It shows the 3-column layout: left = Schema + Transparency + Model & horizon + Exclude mechanisms + Run scenario + Parameter sweep + Compare runs + Edit one relationship; center = Chart; right = AI assistant. So **everything from the assignment that the app supports is reachable in the UI** (Schema view, Graph view, or Full view).

---

## 1. AeroDyn focus & board questions

| Requirement | Covered? | Where |
|-------------|----------|--------|
| **Lethal weapons & AI** (targeting, autonomy, benefits vs risks) | ✅ | AeroDyn Lethal AI model: LethalAIVis, Backlash, Regulation, Reputation, Contracts; Model Brief + `sd_engine.default_aerodyn_lethal_ai_schema()`. |
| **Benefits:** operational effectiveness, attractive products | ✅ | Captured via visibility → contract pipeline (Reputation → Contracts with `ai_performance_sufficient`). |
| **Risks:** backlash, regulation, public opinion, reputation, pipeline | ✅ | Flows: visibility→backlash, backlash→regulation, backlash→reputation, reputation→contracts; scenario “Stricter regulation”, “High investment”, “More diversification”. |
| **“Will AI performance be sufficient?”** | ✅ | Parameter `ai_performance_sufficient` (0–1) in Reputation→Contracts; scenario **“Lower AI performance”** in Executive view. |
| **Board questions:** “What happens to long-term business if we heavily invest in lethal AI?” | ✅ | Strategic question in schema meta + SubjectScenarioCard; Executive presets run exactly this. |
| **“How do public opinion, regulation, contracts interact over 5–10 years?”** | ✅ | Same model; horizon slider (e.g. 10 years); chart + “So what?” + interpretation traceable to flows. |

---

## 2. Model factory expectations

| Expectation | Covered? | Where |
|-------------|----------|--------|
| **Credible and transparent** | ✅ | Explicit stocks, flows, parameters; provenance (task force / AI); “Transparency” block (equations, parameters); interpretation traceable to equations. |
| **Reusable and adaptable** | ✅ | One schema format; catalog (SIR, AeroDyn Lethal AI, Pipeline); JSON in/out; apply-patch for localized changes; building blocks (METHODOLOGY + BUILDING_BLOCKS_ARCHETYPES). |
| **Explainable to non-technical decision-makers** | ✅ | Executive view: one question, schema diagram, scenario buttons, chart, “So what?” + interpretation; MODEL_FACTORY_CEO_BRIEF.md; no jargon in demo. |

---

## 3. CEO presentation (what the evaluator cares about)

| CEO care | Covered? | Where |
|----------|----------|--------|
| **Insight** | ✅ | One question per model; scenarios in minutes; “So what?” and interpretation after each run; CEO question in AI: plain-language insight + optional schema addition. |
| **Speed** | ✅ | Model Brief = contract; same engine for all models; AI draft from brief + localized suggest; new question → new model in hours to days (process in METHODOLOGY). |
| **Reliability** | ✅ | Deterministic simulation; explicit assumptions; editable/auditable; AI suggestions tagged and review-before-apply. |
| **No “MCP server” / “agent hallucination” in the pitch** | ✅ | CEO brief and PRESENTATION_CHECKLIST say “No MCP servers or agents—just the picture and the numbers.” Demo is schema → scenarios → chart → interpretation. |

---

## 4. How to approach (narrow, reflect, separate, illustrate)

| Point | Covered? | Where |
|--------|----------|--------|
| **Start narrow and concrete** | ✅ | One question (AeroDyn Lethal AI); small model (5 stocks, ~10 flows); key mechanisms only. |
| **Reflect: where did information come from?** | ✅ | REFLECTION_TRADEOFFS + DESIGN_AND_TRADEOFFS: Model Brief, building blocks, scenario set; GenAI for draft/suggest, human validates. |
| **How structured?** | ✅ | Variables (stocks, params), relationships (flows, loop_type R/B), assumptions (in Brief + provenance), scenarios (presets + sweep). |
| **How visualize and communicate?** | ✅ | Schema diagram (SVG / React Flow / Cluster / Mermaid), causal loops section, chart (stocks over time), “So what?” + interpretation. |
| **How update the system?** | ✅ | Apply-patch (one flow, params); AI suggest-flow merges only patch; exclude mechanisms; parameter sweep; compare runs. |
| **Separate systematic vs judgment** | ✅ | REFLECTION_TRADEOFFS: systematic = schema, simulation, diagram, export, GenAI workflow; judgment = what to include, interpretation of conflicts, horizon, parameters, **reinterpretation of the question**. |
| **Illustrate credible approach, not scale** | ✅ | One engine, one AeroDyn model, clear process (Scope→Map→Build→Use); METHODOLOGY + CEO brief show how it could scale. |

---

## 5. Grading criteria (20 pts)

| Criterion | Pts | Covered? | Where to show |
|-----------|-----|----------|----------------|
| **Architecture & data structures** | 7 | ✅ | Single schema (stocks, flows, parameters, meta, loops, clusters); catalog; JSON in/out; `apply_patch`; schema-driven ODE and diagram; DESIGN_AND_TRADEOFFS §2, §5. |
| **Interfaces / interaction design / thoughtful GenAI** | 7 | ✅ | Executive vs Full view; Schema + Graph views; diagram (drag, R/B, legend); scenario buttons; “Show interpretation”; AI: draft from brief, suggest flow, **CEO question** (insight + optional patch); provenance (purple = AI); PRESENTATION_CHECKLIST. |
| **System-dynamics adequacy** | 4 | ✅ | Explicit stocks and flows; reinforcing/balancing loops (R/B) in schema and diagram; delays in loop cards; scenarios (base, high invest, diversification, regulation, **lower AI performance**); building blocks; divergence warnings. |
| **Reflection on trade-offs** | 2 | ✅ | REFLECTION_TRADEOFFS + DESIGN_AND_TRADEOFFS: systematic vs judgment, what we automate vs not, simplicity vs realism, GenAI role, no calibration. |

---

## 6. Bonus: reinterpretation of the question

| Bonus | Covered? | Where |
|-------|----------|--------|
| **Show how you reinterpreted management’s question to yield more interesting/beneficial aspects** | ✅ | **AeroDyn_Lethal_AI_Model_Brief.md** § “Reinterpretation of the management question”: “Should we invest?” (yes/no) → **“Under what conditions does investing in lethal AI improve or harm our long-term position?”** → mechanisms, levers, scenarios. Same in OUTLINE slide 3 and CEO brief. |

---

## 7. Small gaps / optional strengtheners

| Item | Status | Suggestion |
|------|--------|------------|
| **EuroMotion** | Optional | Brief mentions AeroDyn or EuroMotion; project is AeroDyn-focused. If asked: “Same methodology and app; we’d add a EuroMotion model and brief.” |
| **Interviews / reports / public data** | Reflected, not implemented | REFLECTION says “where did info come from?”; no interview log. Optional: one line in Brief or README: “Sources: Model Brief, building blocks, task force assumptions.” |
| **Model passport (one-page purpose, scope, limits)** | In methodology | METHODOLOGY Phase D mentions “model passport”; no separate file per model. Optional: add AeroDyn_Lethal_AI_Model_Passport.md (1 page). |

---

## 8. One-line summary

**Is everything covered?** Yes. The project delivers a **repeatable model factory** (one question, one model, minimal friction), **credible and transparent** (explicit structure, provenance, interpretation), **explainable to the board** (Executive view, “So what?”, CEO brief), with **thoughtful GenAI** (draft, suggest, CEO Q&A) and **clear reflection** on what’s systematic vs judgment and on trade-offs. The **reinterpretation bonus** is explicit in the AeroDyn Model Brief. For the demo: lead with insight, speed, and reliability; show the schema, one scenario run, and the interpretation—no technical implementation details.
