# System Dynamics Model Factory

A **repeatable, transparent** way to build and run small system-dynamics models for strategic questions—focused on **AeroDyn Lethal AI & long-term business**, with schema-driven simulation, scenario exploration, and optional AI (OpenAI + RAG).

---

## What it does

- **One question, one model:** e.g. *“What happens to our long-term business if we heavily invest in lethal AI?”* — stocks, flows, and parameters are explicit and auditable.
- **Schema view:** Diagram (SVG, React Flow, Cluster, Mermaid), variables & equations sidebar, reinforcing/balancing loops, AI schema explanation, add parameter, add scenario.
- **Graph view:** Scenario presets (Base, High investment, Diversification, Stricter regulation, Lower AI performance), custom scenarios, chart with “So what?” and interpretation.
- **AI assistant:** CEO-style Q&A, suggest flow, suggest scenarios; optional **RAG** over project docs (briefs, methodology).
- **Full view:** Horizon, transparency block, exclude mechanisms, parameter sweep, compare runs, edit one relationship (when enabled).

No MCP or agents—just HTTP, JSON, and deterministic simulation.

---

## Tech stack

| Layer    | Stack |
|----------|--------|
| Backend  | Python 3, FastAPI, `scipy` (ODE), OpenAI API |
| Frontend | React, TypeScript, Vite, Recharts |
| AI       | OpenAI (chat + embeddings for RAG); no Mistral |

---

## Prerequisites

- **Python 3.10+** (e.g. `pyenv install 3.11.6`)
- **Node.js 18+** (for frontend)
- **OpenAI API key** (for AI features and RAG)

---

## Installation & setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/LikhitaYerra/System-Dynamics-.git
   cd "System-Dynamics-"
   ```

2. **Backend (Python)**
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Environment (no secrets in repo)**
   - Copy `.env.example` to `.env`.
   - Set `OPENAI_API_KEY=sk-...` in `.env`.
   - Optional: `RAG_ENABLED=1`, `OPENAI_MODEL=gpt-4o` (or `gpt-4o-mini`).

---

## How to run

1. **Start the API** (from project root):
   ```bash
   python -m uvicorn api:app --reload --port 8000
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend && npm run dev
   ```

3. **Open the app** in your browser at the URL shown (e.g. **http://localhost:5173**).

4. **Optional — Streamlit-only demo:**  
   `streamlit run model_factory_app.py` (no React frontend).

---

## Project structure

| Path | Purpose |
|------|---------|
| `api.py` | FastAPI app: catalog, schema, simulate, apply-patch, AI endpoints (schema, suggest-flow, question, explain-schema, suggest-scenarios, RAG). |
| `sd_engine.py` | Schema-driven engine: build ODE from schema, run simulation, model catalog (SIR, AeroDyn Lethal AI, AeroDyn Pipeline). |
| `rag.py` | Optional RAG: chunk project docs, embed (OpenAI), cache in `.rag_cache/`, retrieve for AI prompts. |
| `frontend/` | React app: Schema view, Graph view, Full view; diagram, scenarios, chart, AI assistant. |
| `AeroDyn_Lethal_AI_Model_Brief.md` | Model brief and reinterpretation of the management question. |
| `BUILDING_BLOCKS_ARCHETYPES.md` | Reusable archetypes (capacity–demand, adoption, reputation, pipeline). |
| `SYSTEM_DYNAMICS_METHODOLOGY.md` | Process: Scope → Map → Build → Use. |
| `MODEL_FACTORY_CEO_BRIEF.md` | One-page CEO/board brief (insight, speed, reliability). |
| `DESIGN_AND_TRADEOFFS.md` | Data structures, apply-patch, GenAI role, divergence. |
| `REFLECTION_TRADEOFFS.md` | Systematic vs judgment, trade-offs. |
| `SCRIPT_Explain_Schema_and_Flows.md` | Script to explain schema and flows in a demo. |
| `AeroDyn_Model_Factory_PPT_Outline_v2.md` | PPT outline (problem, question, mechanisms, technical approach, architecture, demo). |

---

## Optional: RAG

The backend can augment AI prompts with relevant chunks from project documentation.

- **Enable:** `RAG_ENABLED=1` and `OPENAI_API_KEY` in `.env`.
- **Check:** Open **http://localhost:8000/rag-status** — `rag_enabled: true`, `indexed_chunks` > 0.
- **Use in app:** “Show explanation” (schema), CEO question, “Suggest flow”, “Suggest scenarios with AI” — each can use RAG when enabled.

Indexed docs: Model Briefs, `BUILDING_BLOCKS_ARCHETYPES.md`, `MODEL_FACTORY_CEO_BRIEF.md`, `SYSTEM_DYNAMICS_METHODOLOGY.md`, `MODEL_BRIEF_TEMPLATE.md`, `DESIGN_AND_TRADEOFFS.md`.

---

## Design choices

- **No single mega-model** — many small, focused models.
- **One question per model** — clear scope and reuse via building blocks.
- **Minimal friction** — Model Brief as contract; same engine for all models.
- **Transparent & deterministic** — explicit stocks, flows, parameters; same inputs → same results; no secrets in repo (`.env` is gitignored).

---

## Repository

**https://github.com/LikhitaYerra/System-Dynamics-**

