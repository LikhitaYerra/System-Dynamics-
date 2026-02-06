# System Modeling & AI Task Force — Repeatable SD Methodology

This folder contains a **repeatable way** for both boards (including AeroDyn Systems and other clients) to use system dynamics for **strategic options**—without building one big model and with **minimal friction**.

## Contents

| File | Purpose |
|------|---------|
| **SYSTEM_DYNAMICS_METHODOLOGY.md** | The process: four phases (Scope → Map → Build → Use), one-question-one-model rule, standard scenarios, and context note for AeroDyn. |
| **MODEL_BRIEF_TEMPLATE.md** | One-page scope for each model. Fill once per engagement; reduces clarifying questions. |
| **BUILDING_BLOCKS_ARCHETYPES.md** | Five reusable archetypes (capacity–demand, adoption, reputation, pipeline, resource competition) to start models quickly. |
| **model_factory_app.py** | **System Dynamics Studio** Streamlit app: pick a model from the catalog (SIR, AeroDyn Pipeline, AeroDyn Lethal AI), or import from JSON (e.g. from GenAI); edit parameters, run simulation, view diagram, export. |
| **sd_engine.py** | Schema-driven engine: build ODE and stock-flow diagram from a single schema; model catalog and provenance (source, loop_type, delay). |
| **MODEL_FACTORY_CEO_BRIEF.md** | One-page brief for the CEO/board: what the factory delivers (insight, speed, reliability), no technical jargon. |
| **REFLECTION_TRADEOFFS.md** | What’s systematic vs judgment; trade-offs; how the design maps to the assignment criteria. |
| **AeroDyn_Lethal_AI_Model_Brief.md** | Model Brief for the “Lethal AI & long-term business” model, including reinterpretation of the management question. |
| **README.md** | This overview. |

## Quick start

**Run the System Dynamics Studio (interactive):**
```bash
streamlit run model_factory_app.py
```
Then: choose a model (e.g. **AeroDyn — Lethal AI & long-term business**), adjust parameters in the sidebar, and run scenarios. Use **Import from JSON** to load a schema from a Model Brief (e.g. via GenAI) and **Export** to download JSON or the GenAI prompt template.

**Process (for each new question):**
1. **Agree one strategic question** with the board/sponsor.
2. **Fill the Model Brief** (use `MODEL_BRIEF_TEMPLATE.md`); get sign-off.
3. **Follow the methodology** (Scope → Map → Build → Use) in `SYSTEM_DYNAMICS_METHODOLOGY.md`.
4. **Pick 1–2 archetypes** from `BUILDING_BLOCKS_ARCHETYPES.md` for the map; customize names and parameters.
5. **Run standard scenarios** (base, optimistic, pessimistic, 1–2 policy levers); document with a one-page “model passport.”

For **AeroDyn** (defense, Europe): always complete the **Context flag** in the Brief (lethal vs non-lethal, perception, oversight) and add a short assumptions/limits note for models touching targeting or autonomous decision support.

## Optional: RAG (retrieval-augmented generation)

The FastAPI backend can augment AI prompts with relevant snippets from project documentation (Model Briefs, building blocks, methodology). This is **optional** and off by default.

- **Enable:** Set `RAG_ENABLED=1` and `OPENAI_API_KEY` in `.env` (embeddings use OpenAI).
- **How it works:** `rag.py` chunks the project’s markdown docs, embeds them with OpenAI, and caches results in `.rag_cache/`. When you call AI draft, suggest-flow, explain-schema, or CEO question, the backend retrieves the top-k relevant chunks and prepends them to the prompt.
- **Indexed docs:** `AeroDyn_Lethal_AI_Model_Brief.md`, `BUILDING_BLOCKS_ARCHETYPES.md`, `MODEL_FACTORY_CEO_BRIEF.md`, `SYSTEM_DYNAMICS_METHODOLOGY.md`, `MODEL_BRIEF_TEMPLATE.md`, `DESIGN_AND_TRADEOFFS.md`.

**How to test RAG in the app**

1. Set `RAG_ENABLED=1` and `OPENAI_API_KEY` in `.env`, then restart the backend (`uvicorn api:app --reload`).
2. Check status: open **http://localhost:8000/rag-status** in the browser. You should see `"rag_enabled": true` and `"indexed_chunks"` > 0 (first request may take a few seconds while the index is built and cached).
3. In the app, trigger any of these; each uses RAG to inject relevant doc chunks into the AI prompt:
   - **Schema view:** Click **“Show explanation”** (AI explain schema) for the loaded model.
   - **Schema view:** In the AI assistant, ask a **CEO-style question** (e.g. “What drives reputation in this model?”) and send.
   - **Schema view:** Use **“Suggest flow”** with an instruction (e.g. “add a balancing loop that reduces backlash”).
   - **Graph view:** **“Suggest scenarios with AI”** — RAG adds context from methodology/briefs.
   - **Draft from brief:** If the UI has a “Draft schema from Model Brief” flow, paste a brief and generate; RAG augments the prompt with similar content from indexed docs.
4. You can’t see RAG chunks in the UI; the backend prepends them to the prompt. To confirm RAG is used, ensure `/rag-status` shows `indexed_chunks` > 0 and that AI answers sometimes reflect project terms (e.g. “building blocks”, “Model Brief”, “AeroDyn”) when relevant.

## Design choices

- **No single mega-model** — many small, focused models over time.
- **One question per model** — clear boundary and reuse via building blocks.
- **Minimal friction** — one mandatory artifact (Model Brief), one map review, standard scenarios.
- **Same process for both firms** — AeroDyn uses the same methodology with context-specific Brief and documentation.
