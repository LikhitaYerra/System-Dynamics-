# Presentation checklist — System Dynamics Studio

**For tomorrow:** Use this as a quick run-through so the app matches what was asked.

---

## 1. Open the app

- Start backend: `cd "industrial ai" && python -m uvicorn api:app --reload --port 8000`
- Start frontend: `cd "industrial ai/frontend" && npm run dev`
- Open the URL shown (e.g. http://localhost:5173 or 5175)

---

## 2. What the audience sees (Executive view — default)

- **Header:** “System Dynamics Studio” + “Explainable, transparent, interpretable…”
- **First card — Schema:**
  - Strategic question (e.g. “What happens to our long-term business if we heavily invest in lethal AI?”)
  - **Schema diagram:** stocks as boxes, flows as curved arrows (R/B colored). **Drag boxes to rearrange**; arrows update.
  - **Reinforcing & balancing loops:** short explanation (R = amplifies, B = dampens) + loop cards with causal chains and delays.
- **Second card — Scenarios:**
  - Same question repeated.
  - Scenario buttons: Base, High investment in lethal AI, More diversification, Stricter regulation.
  - **Run a scenario** → chart appears (stocks over time).
  - **“Show interpretation”** → “So what?” + explainable summary (trends, traceability to equations).

---

## 3. If you switch to Full view

- Left: Schema (same as above) + **Transparency** (how each variable changes: inflows/outflows, equations, parameters, provenance).
- Center: Chart + “Show interpretation” after a run.
- Right: AI assistant (draft from brief, suggest flow), parameter sweep, compare runs, edit one relationship.
- **Glossary:** “How to read this model” at the bottom of the schema section.

---

## 4. Checklist — as asked

| Asked | Where it is |
|-------|----------------|
| Schema visible | Schema section at top (Executive and Full); diagram + loops + counts. |
| Loops explained | “What are these loops?” + R/B cards with causal chain and delay. |
| Explainability / transparency / interpretability | Transparency block (Full), Interpretation behind button, Glossary, provenance. |
| Name = System Dynamics Studio | Header + browser title. |
| Real schema diagram (visual) | Schema diagram: stocks, curved arrows, R/B, source/sink. |
| Move boxes around | Diagram is draggable; hint: “Drag boxes to rearrange; arrows update live.” |
| Big diagram, all text visible | Large canvas; full stock/flow names (wrapped); no “…” truncation. |
| No “like in the PPT” | Removed everywhere. |
| Light, clear UI | Light theme, teal accent, Outfit + DM Sans. |

---

## 5. Suggested demo flow (2–3 minutes)

1. **Executive view** — “This is our system dynamics model: one strategic question, a clear schema, and feedback loops.”
2. Point to the **schema diagram** — “Stocks, flows, reinforcing and balancing loops; we can drag nodes to rearrange.”
3. Point to **Reinforcing & balancing loops** — “Each loop is explained with causal chain and delay.”
4. Click **Base** (or another scenario) — “We run a scenario.”
5. Show the **chart** — “Stocks over time.”
6. Click **“Show interpretation”** — “We get a plain-language ‘So what?’ and an explainable summary; everything is traceable to the equations.”
7. Optional: switch to **Full view** — “Under Transparency we see exactly how each variable changes and which parameters drive the run.”

Good luck for tomorrow.
