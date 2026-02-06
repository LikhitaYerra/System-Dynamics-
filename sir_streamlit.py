"""
Schema-driven system dynamics in Streamlit.
Model = data structure (stocks, flows, parameters). Change structure → diagram and ODEs update.
"""

import numpy as np
from scipy.integrate import solve_ivp
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import streamlit as st

from sd_engine import (
    default_sir_schema,
    build_ode,
    get_stock_init,
    get_param_values,
    schema_to_print,
    schema_to_dict,
    draw_stock_flow_diagram,
    add_stock,
    add_flow,
    add_parameter,
    remove_stock,
    remove_flow,
    update_parameter,
)

st.set_page_config(page_title="System Dynamics Model", layout="wide")
st.title("System dynamics model")
st.caption("Schema-driven: stocks, flows, parameters. Edit structure → diagram and equations update.")

# Initialize schema in session state
if "schema" not in st.session_state:
    st.session_state.schema = default_sir_schema()

schema = st.session_state.schema

# --- Sidebar: parameter index (all parameters from schema) ---
with st.sidebar:
    st.header("Parameter index")
    param_values = {}
    for p in schema["parameters"]:
        pid, name, val = p["id"], p.get("name", p["id"]), p["value"]
        new_val = st.number_input(f"{pid} ({name})", value=float(val), min_value=0.0, max_value=1e6, step=0.01, key=f"param_{pid}")
        param_values[pid] = new_val
        if new_val != val:
            update_parameter(schema, pid, new_val)

    st.divider()
    days = st.slider("Time horizon (days)", 30, 365, 160, 10)

# Apply param values from sidebar (in case of number_input updates)
for pid, v in param_values.items():
    update_parameter(schema, pid, v)

# --- Main: Model structure (data structure print) ---
with st.expander("Model structure (data structure)", expanded=False):
    st.text(schema_to_print(schema))
    st.json(schema_to_dict(schema))

# --- Add / remove stocks and flows ---
with st.expander("Change model: add stocks, add flows", expanded=True):
    col1, col2, col3 = st.columns(3)

    with col1:
        st.subheader("Add stock")
        new_sid = st.text_input("Stock id", key="new_stock_id", placeholder="e.g. E")
        new_sname = st.text_input("Stock name", key="new_stock_name", placeholder="e.g. Exposed")
        new_sinit = st.number_input("Initial value", value=0.0, key="new_stock_init")
        if st.button("Add stock"):
            if new_sid and new_sid.strip():
                schema = add_stock(schema, new_sid.strip(), name=(new_sname or new_sid).strip(), initial=new_sinit)
                st.session_state.schema = schema
                st.rerun()

    with col2:
        st.subheader("Add flow")
        stock_ids = [s["id"] for s in schema["stocks"]]
        flow_from = st.selectbox("From stock", [None] + stock_ids, format_func=lambda x: "source" if x is None else x, key="flow_from")
        flow_to = st.selectbox("To stock", [None] + stock_ids, format_func=lambda x: "sink" if x is None else x, key="flow_to")
        flow_id = st.text_input("Flow id", key="new_flow_id", placeholder="e.g. exposure")
        flow_rate = st.text_input("Rate expression", key="new_flow_rate", placeholder="e.g. beta * S * I / N")
        if st.button("Add flow"):
            if flow_id and flow_rate and (flow_from or flow_to):
                schema = add_flow(schema, flow_id.strip(), flow_from, flow_to, flow_rate.strip())
                st.session_state.schema = schema
                st.rerun()

    with col3:
        st.subheader("Add parameter")
        new_pid = st.text_input("Parameter id", key="new_param_id", placeholder="e.g. delta")
        new_pval = st.number_input("Value", value=0.1, key="new_param_val")
        if st.button("Add parameter"):
            if new_pid:
                schema = add_parameter(schema, new_pid.strip(), value=new_pval)
                st.session_state.schema = schema
                st.rerun()

    st.subheader("Remove")
    rcol1, rcol2 = st.columns(2)
    with rcol1:
        rem_stock = st.selectbox("Remove stock (and its flows)", [""] + [s["id"] for s in schema["stocks"]], key="rem_stock")
        if st.button("Remove stock") and rem_stock:
            st.session_state.schema = remove_stock(schema, rem_stock)
            st.rerun()
    with rcol2:
        rem_flow = st.selectbox("Remove flow", [""] + [f["id"] for f in schema["flows"]], key="rem_flow")
        if st.button("Remove flow") and rem_flow:
            st.session_state.schema = remove_flow(schema, rem_flow)
            st.rerun()

    if st.button("Reset to SIR model"):
        st.session_state.schema = default_sir_schema()
        st.rerun()

# Keep schema reference after edits
schema = st.session_state.schema

# --- Build ODE from schema and integrate ---
try:
    ode_func = build_ode(schema)
    initials, stock_ids = get_stock_init(schema)
    y0 = initials
    sol = solve_ivp(ode_func, [0, float(days)], y0, dense_output=True, max_step=1.0)
    t = np.linspace(0, days, 200)
    Y = sol.sol(t)  # (n_stocks, n_times)
except Exception as e:
    st.error(f"Model error: {e}")
    st.stop()

# --- Time-series plot ---
fig, ax = plt.subplots(figsize=(8, 4))
for i, sid in enumerate(stock_ids):
    ax.plot(t, Y[i], label=f"{sid}", alpha=0.8)
ax.set_xlabel("Time (days)")
ax.set_ylabel("Value")
ax.set_title("Stocks over time (from model structure)")
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
st.pyplot(fig)
plt.close()

# --- Stock-flow diagram (drawn from schema) ---
fig2 = draw_stock_flow_diagram(schema, figsize=(12, 6))
st.pyplot(fig2)
plt.close()

st.success("Model and diagram are built from the current structure. Add or remove stocks/flows above to change the system; the diagram and equations update automatically.")
