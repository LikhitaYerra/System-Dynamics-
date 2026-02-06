"""
System Dynamics Studio — System dynamics for strategic options.
Pick a model from the catalog, or import from JSON (e.g. from GenAI). Edit, simulate, export.
Designed for board-level exploration: insight, speed, transparency.
"""

import json
import os
import numpy as np
from scipy.integrate import solve_ivp
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import streamlit as st

try:
    # Optional GenAI integration (OpenAI). If not installed or no key, we degrade gracefully.
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    OpenAI = None

from sd_engine import (
    get_model_catalog,
    schema_from_dict,
    schema_to_dict,
    schema_to_print,
    build_ode,
    get_stock_init,
    get_param_values,
    draw_stock_flow_diagram,
    add_stock,
    add_flow,
    add_parameter,
    remove_stock,
    remove_flow,
    update_parameter,
)

st.set_page_config(page_title="System Dynamics Studio", layout="wide")
  st.title("System Dynamics Studio — System dynamics for strategic options")
st.caption("Choose a model, tweak parameters, run scenarios. Or import a schema from JSON (e.g. generated from a Model Brief).")

# --- Session state ---
if "schema" not in st.session_state:
    catalog = get_model_catalog()
    st.session_state.schema = catalog["aerodyn_lethal_ai"]["load"]()
if "current_model_id" not in st.session_state:
    st.session_state.current_model_id = "aerodyn_lethal_ai"

catalog = get_model_catalog()

# --- Sidebar: Model selection & import/export ---
with st.sidebar:
    st.header("Model")
    choice = st.radio(
        "Source",
        ["Catalog", "Import from JSON", "AI assistant"],
        index=0,
        key="model_source",
    )

    if choice == "Catalog":
        model_options = list(catalog.keys())
        labels = [catalog[k]["name"] for k in model_options]
        idx = model_options.index(st.session_state.current_model_id) if st.session_state.current_model_id in model_options else 0
        sel = st.selectbox(
            "Model",
            range(len(model_options)),
            format_func=lambda i: labels[i],
            index=idx,
            key="catalog_select",
        )
        model_id = model_options[sel]
        if st.button("Load model") or st.session_state.current_model_id != model_id:
            st.session_state.schema = catalog[model_id]["load"]()
            st.session_state.current_model_id = model_id
            st.rerun()
        st.caption(catalog[model_id]["description"])
    elif choice == "Import from JSON":
        st.caption("Paste a JSON schema (from GenAI or export). Keys: stocks, flows, parameters.")
        json_text = st.text_area("JSON schema", height=120, key="import_json", placeholder='{"stocks": [...], "flows": [...], "parameters": [...]}')
        if st.button("Load from JSON"):
            try:
                data = json.loads(json_text)
                st.session_state.schema = schema_from_dict(data)
                st.session_state.current_model_id = "imported"
                st.success("Schema loaded.")
                st.rerun()
            except Exception as e:
                st.error(f"Invalid JSON: {e}")
    else:
        st.caption("Use an LLM (optional) to propose a schema from a Model Brief.")
        st.markdown("**Step 1 — Paste your Model Brief or question**")
        brief_text = st.text_area(
            "Model Brief / strategic question",
            height=160,
            key="ai_brief",
            placeholder="Paste the Model Brief, including strategic question, scope, and context flags…",
        )
        st.markdown("**Step 2 — Let the AI draft a schema (optional)**")
        ai_enabled = OpenAI is not None and bool(os.getenv("OPENAI_API_KEY"))
        if not ai_enabled:
            st.info("AI integration is optional. To enable one-click drafting, install `openai` and set `OPENAI_API_KEY` in your environment. Otherwise, you can still follow the GenAI prompt template in the Export section.")
        if st.button("Draft schema with AI", disabled=not ai_enabled or not brief_text.strip()):
            try:
                client = OpenAI()
                prompt = f"""
You are a system dynamics assistant. From the following Model Brief, propose a small, explainable model.

1. Identify 3–6 key STOCKS (id, name, initial).
2. Identify 5–10 FLOWS (id, from, to, rate, loop_type) where:
   - id: short identifier
   - from: stock id or null (source)
   - to: stock id or null (sink)
   - rate: algebraic expression using stock and parameter ids (Python style)
   - loop_type: "R" (reinforcing) or "B" (balancing)
3. Identify 6–15 PARAMETERS (id, name, value).

Return **only** a single JSON object with keys:
  - stocks: list of {{id, name, initial}}
  - flows: list of {{id, name, from, to, rate, loop_type}}
  - parameters: list of {{id, name, value}}

Do NOT include explanations or comments. Use simple ids (letters / short words).

Model Brief:
\"\"\"{brief_text}\"\"\""""
                resp = client.responses.create(
                    model="gpt-4.1-mini",
                    input=prompt,
                )
                # Extract first text block
                content = ""
                for out in resp.output_text.splitlines():
                    content += out + "\n"
                # Try to find JSON in the text
                content = content.strip()
                try:
                    data = json.loads(content)
                except Exception:
                    # Fallback: try to strip code fences if present
                    if content.startswith("```"):
                        content = content.strip("`")
                        # remove possible language tag
                        if "\n" in content:
                            content = content.split("\n", 1)[1]
                    data = json.loads(content)
                st.session_state.schema = schema_from_dict(data)
                st.session_state.current_model_id = "ai_drafted"
                st.success("AI-drafted schema loaded. You can inspect and adjust it below.")
                st.rerun()
            except Exception as e:
                st.error(f"AI error: {e}")

    st.divider()
    st.header("Parameters")
    schema = st.session_state.schema
    param_values = {}
    for p in schema["parameters"]:
        pid, name, val = p["id"], p.get("name", p["id"]), p["value"]
        new_val = st.number_input(
            f"{pid}",
            value=float(val),
            min_value=0.0,
            max_value=1e6,
            step=0.01,
            key=f"param_{pid}",
            help=name,
        )
        param_values[pid] = new_val
        if new_val != val:
            update_parameter(schema, pid, new_val)

    # Time horizon: use meta if present, else default
    default_months = 120
    if "meta" in schema and isinstance(schema["meta"], dict) and "horizon_years" in schema["meta"]:
        default_months = int(schema["meta"].get("horizon_years", 10) * 12)
    months = st.slider("Time horizon (months)", 12, 240, default_months, 12)

# Apply param updates
for pid, v in param_values.items():
    update_parameter(schema, pid, v)

# --- Main: Meta (question, scope) ---
if "meta" in schema and isinstance(schema["meta"], dict):
    with st.expander("Model purpose & scope", expanded=True):
        meta = schema["meta"]
        if meta.get("question"):
            st.markdown(f"**Strategic question:** {meta['question']}")
        if meta.get("name"):
            st.caption(f"Model: {meta['name']}")
        if meta.get("building_blocks"):
            st.caption(f"Building blocks: {', '.join(meta['building_blocks'])}")

# --- Structure (data) and provenance ---
with st.expander("Model structure & provenance", expanded=False):
    st.text(schema_to_print(schema))
    st.json(schema_to_dict(schema))
    st.subheader("Flow provenance (source, loop type, delay)")
    for f in schema["flows"]:
        src = f.get("source", "")
        loop = f.get("loop_type", "")
        dly = f.get("delay", "")
        st.caption(f"**{f['id']}** — source: {src or '—'} | loop: {loop or '—'} | delay: {dly or '—'}")

# --- Run simulation ---
try:
    ode_func = build_ode(schema)
    initials, stock_ids = get_stock_init(schema)
    y0 = initials
    sol = solve_ivp(ode_func, [0, float(months)], y0, dense_output=True, max_step=1.0)
    t = np.linspace(0, months, 200)
    Y = sol.sol(t)
except Exception as e:
    st.error(f"Model error: {e}")
    st.stop()

# --- Time-series plot ---
fig, ax = plt.subplots(figsize=(10, 5))
for i, sid in enumerate(stock_ids):
    ax.plot(t / 12, Y[i], label=sid, alpha=0.8)
ax.set_xlabel("Time (years)")
ax.set_ylabel("Value")
ax.set_title("Stocks over time (from current structure)")
ax.legend(loc="center left", bbox_to_anchor=(1, 0.5), fontsize=8)
ax.grid(True, alpha=0.3)
plt.tight_layout()
st.pyplot(fig)
plt.close()

# --- Stock-flow diagram ---
fig2 = draw_stock_flow_diagram(schema, figsize=(12, 6))
st.pyplot(fig2)
plt.close()

# --- Export ---
with st.expander("Export"):
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Download schema (JSON)")
        export_dict = schema_to_dict(schema)
        if "meta" in schema:
            export_dict["meta"] = schema.get("meta", {})
        st.download_button(
            "Download JSON",
            data=json.dumps(export_dict, indent=2),
            file_name="sd_schema.json",
            mime="application/json",
            key="dl_json",
        )
    with col2:
        st.subheader("GenAI prompt template")
        st.markdown("""
Use this workflow to create a **new** model from a Model Brief:

1. **Concept (LLM tab 1):** Paste the Model Brief and ask:  
   *"What are the main stocks, flows, and feedback loops (reinforcing R, balancing B) for this strategic question? List stocks (id, name, initial), flows (id, from, to, rate, loop_type), and parameters (id, value)."*

2. **Code (LLM tab 2):** Ask:  
   *"Output a single JSON object with keys stocks, flows, parameters. No code—only valid JSON. Rate expressions may use stock ids and parameter ids as variables."*

3. Copy the JSON into **Import from JSON** above, then **Load from JSON**. Adjust and run.
        """)
        st.caption("Keeping concept and code in separate steps keeps the process reproducible and auditable.")

st.success("Model and diagram are built from the current structure. Change parameters in the sidebar or load another model to explore scenarios.")
