# Design & trade-offs: usage context, data structure, GenAI, determinism

**Purpose:** Put yourself in the context of usage. The system dynamics model is not perfect. This document explains what is easy vs hard to change, how the data structure supports it, where GenAI fits, and how we keep **transparency** and **determinism**—including the rule that **editing one area leaves untouched parts exactly the same**.

---

## 1. Usage questions vs what the design supports

| Question | How easy? | What the design does | Trade-off |
|----------|-----------|----------------------|-----------|
| **Change one relationship** | Easy | Schema is a list of flows; each flow has `id`, `rate`, `from`, `to`. You **patch by id**: send only the flow(s) you change. The engine has `apply_patch(schema, patch)` so only those entries are updated; everything else is unchanged. | Rate expressions are plain strings (e.g. `beta * S * I / N`). No formal grammar—typos or invalid refs yield 0 or a runtime error. We could add validation as a separate step. |
| **Add / update a feedback mechanism** | Easy | A “mechanism” is one or more flows (and optionally parameters). Add a new flow with a new `id`; optionally tag flows with `mechanism` (or `loop_id`) so you can **disable a mechanism** for comparison (run without those flows). Patching adds or updates only what you specify. | Mechanism “disable” is implemented by filtering flows by tag before building the ODE; the rest of the schema is untouched. |
| **Compare simulations** | Supported | You can run multiple scenarios (different parameters or different schemas), give each a **label** (e.g. "Base", "High invest"), and the UI stores them. Chart overlays all selected runs so you compare trajectories. Backend has `/simulate-batch` returning multiple time series. | Comparison is by run label; we don’t persist runs to disk by default—only in session. For audit, export JSON of schema + params per run. |
| **Run a bunch of sims for a range of parameters** | Supported | **Parameter sweep**: one parameter, min/max/step (or a list of values). Backend `/simulate-batch` accepts `variants: [ { label, params } ]`. You can build a sweep as many variants. Results returned in one response; frontend can overlay or show a selector. | Large sweeps (e.g. 100 points) are sequential in the current impl; could be parallelized or capped (e.g. max 50 variants) to avoid timeouts. |
| **What happens if there is divergence?** | Detected, not fixed | Simulation uses `solve_ivp`; we **post-check** the solution: if any stock is NaN, Inf, or above a large threshold (e.g. 1e10), we add a **warning** to the response (`warnings: ["Stock X diverged at t=…"]`). We don’t change the model or the integrator; we report so you can adjust the relationship or parameters. | We do not auto-cap or change equations; that would break determinism. You decide how to fix (e.g. soften a feedback, add a ceiling). |
| **Use AI to include additional sources?** | Targeted, not whole-schema | GenAI is used in **two ways**, both transparent: (1) **Full draft** from a Model Brief (`/ai-schema`): you explicitly “apply” the draft; it’s a starting point. (2) **Localized suggestion** (`/ai-suggest-flow` or `/ai-suggest-params`): you send the **current schema** + a short instruction (e.g. “add a balancing loop that reduces Backlash”). The AI returns **only** the new flow(s) or parameter changes. You **merge** that into the schema via `apply_patch`. So “additional sources” (e.g. from a new report) can be turned into one new flow or one new param; the rest of the model is untouched. | AI can hallucinate rates or ids; so every AI suggestion is tagged `source: "ai"` and shown in the UI; you edit or approve. We don’t auto-merge into production schema without user action. |
| **Can it separate mechanisms?** | Yes | Flows (and optionally stocks) can carry an optional **mechanism** (or **loop_id**) tag. You can run “same schema but disable mechanism X” by excluding those flows when building the ODE. So you can compare “full model” vs “without this feedback loop”. The data structure is **relatable**: same schema, different “active” set of flows. | Mechanism tags are optional and human-defined; the engine doesn’t infer loops automatically. |

---

## 2. How the data structure is relatable

- **Stocks, flows, parameters** are three lists keyed by **id**. Every relationship is a **flow** with `from`, `to`, `rate`. So:
  - “Change one relationship” = change one flow’s `rate` (or `from`/`to`) by id.
  - “Add a feedback” = append a new flow (and optionally new parameters).
  - “Disable a mechanism” = filter flows by `mechanism` (or `loop_id`) and build the ODE from the filtered list.

- **Patch format** for “only touch what I say”:
  - `patch = { "flows": [ { "id": "visibility_backlash", "rate": "k_vis_back * LethalAIVis" } ], "parameters": [ { "id": "k_vis_back", "value": 0.2 } ] }`
  - Merge rule: for each item in `patch.flows`, find the flow in `schema.flows` with that `id` and update its fields (only those present in the patch). If no flow with that id exists, append. Same for `parameters` (and optionally `stocks`). **Anything not mentioned in the patch is unchanged.**

- **Determinism:** Same schema + same parameters + same horizon ⇒ same numerical result. No randomness in the engine. AI is only used to **propose** a patch or a full draft; applying it is an explicit user step, and the simulation itself is pure ODE integration.

---

## 3. Where GenAI is and how it helps (transparency & determinism)

| Place | What it does | Transparency | Determinism |
|-------|----------------|--------------|-------------|
| **POST /ai-schema** | Given a Model Brief, returns a **full** JSON schema (stocks, flows, parameters). | You see the whole draft; you choose to load it or not. Typically used for “new model from scratch”. | The **run** is deterministic once you’ve fixed the schema. The AI output can vary between calls; we don’t cache it. So “determinism” here means: after you’ve accepted/edited the schema, simulation is deterministic. |
| **POST /ai-suggest-flow** | Given **current schema** + short instruction (e.g. “add a balancing loop that reduces Backlash”), returns **only** one (or a few) new flow(s) and any new parameters. | Response is a **patch** (e.g. `{ flows: [ {...} ], parameters: [ {...} ] }`). Every suggested element has `source: "ai"`. UI shows “AI-suggested (review before use)”. You can edit the rate or reject. | **Untouched parts stay exactly the same.** Only the patch is applied; merge is by id. So changing “one area” (e.g. adding one flow) does not alter existing flows or stocks. |
| **POST /ai-suggest-params** (optional) | Given current schema + instruction (e.g. “stricter regulation”), returns suggested **parameter** changes only. | Same idea: returned as a small patch; only parameters; `source: "ai"` on suggested params. | Same: apply_patch only updates those param ids; stocks and flows are unchanged. |

**Rule for live demos:** If someone asks to “change one area” of the model (e.g. “make the visibility–backlash link stronger”), the workflow is: (1) edit that flow’s `rate` (or call AI to suggest a new rate), (2) apply only that change via patch. No “regenerate the whole schema”; no overwriting of unrelated flows or parameters. The code path is: `apply_patch(schema, { flows: [ { id: "visibility_backlash", "rate": "..." } ] })` → only that flow changes.

---

## 4. Divergence and numerical issues

- **Detection:** After `solve_ivp`, we check each stock trajectory for NaN, Inf, or values > 1e10. If any, we add a warning string to the response (e.g. `warnings: ["Backlash diverged (NaN) after t=5.2 years"]`).
- **We do not:** change the ODE, clamp stocks in the integrator, or auto-adjust parameters. That would break reproducibility and make “untouched parts” ambiguous. The user fixes the model or the scenario.

---

## 5. Summary table: data structure ↔ operations

| Operation | Data structure | API / engine |
|-----------|----------------|--------------|
| Change one relationship | Update one flow by `id` (rate, from, to) | `apply_patch(schema, { flows: [{ id, rate }] })` |
| Add feedback mechanism | Append new flow(s), optionally new params | `apply_patch(schema, { flows: [new], parameters: [new] })` |
| Compare simulations | Multiple result sets with labels | `POST /simulate-batch` → `results: [ { label, t, Y } ]`; UI keeps last N runs, overlays |
| Parameter sweep | Same schema, many param sets | `POST /simulate-batch` with `variants: [ { label, params } ]` |
| Divergence | No change to schema | Post-check solution; return `warnings` in simulate response |
| AI additional source | New flow/param with `source: "ai"` | `POST /ai-suggest-flow` returns patch only; merge via apply_patch |
| Separate mechanisms | Optional `mechanism` (or `loop_id`) on flows | Build ODE from `flows` filtered by mechanism; optional `?mechanism_exclude=id1,id2` in simulate |

---

*This design keeps the model **editable by hand or by AI in small, localized steps**, ensures **untouched parts stay exactly the same** when you change one area, and keeps **simulation deterministic** and **transparent**.*

---

## 6. Where to find it in the code

| Capability | Backend | Frontend |
|------------|---------|----------|
| Change one relationship | `POST /schema/apply-patch` with `patch.flows = [{ id, rate }]` | "Edit one relationship": click flow → edit rate → Apply |
| Compare simulations | `POST /simulate` per run; store results with labels | Save current run as label; checkboxes to show saved runs; Chart overlays selected runs |
| Parameter sweep | `POST /simulate-batch` with `variants: [ { label, params } ]` | Left panel: "Parameter sweep" — select param, min, max, steps (2–30), "Run sweep"; results added to compare and overlaid on chart |
| Divergence | `SimResponse.warnings` after post-check | Warnings box under chart when `simResult.warnings` present |
| AI full draft | `POST /ai-schema` | "Draft schema with AI" (replaces schema; use for new model) |
| AI localized suggestion | `POST /ai-suggest-flow` → returns patch; merge via apply-patch | "Suggest flow / params with AI" → applies patch so only suggested parts change |
| Mechanism separation | `build_ode(schema, exclude_mechanisms=[...])`; optional in `POST /simulate` | Left panel: "Exclude mechanisms" checkboxes (when flows have `mechanism` tag); sweep results in compare |
