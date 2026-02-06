"""
Schema-driven system dynamics engine.
Model = data structure (stocks, flows, parameters). ODEs and diagram are built from it.
"""

import re
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

# Safe namespace for evaluating rate expressions (no file/system access)
SAFE_NAMESPACE = {"min": min, "max": max, "abs": abs, "np": np}


def default_sir_schema():
    """SIR model as schema (stocks, flows, parameters)."""
    return {
        "stocks": [
            {"id": "S", "name": "Susceptible", "initial": 990.0},
            {"id": "I", "name": "Infected", "initial": 10.0},
            {"id": "R", "name": "Recovered", "initial": 0.0},
        ],
        "flows": [
            {"id": "infection", "name": "infection", "from": "S", "to": "I", "rate": "beta * S * I / N"},
            {"id": "recovery", "name": "recovery", "from": "I", "to": "R", "rate": "gamma * I"},
        ],
        "parameters": [
            {"id": "N", "name": "Population", "value": 1000.0},
            {"id": "beta", "name": "Transmission", "value": 0.3},
            {"id": "gamma", "name": "Recovery rate", "value": 0.1},
        ],
    }


def get_param_values(schema):
    """Return dict id -> value from schema."""
    return {p["id"]: p["value"] for p in schema["parameters"]}


def get_stock_init(schema):
    """Return list of initials in schema order; stock_ids in same order."""
    stocks = schema["stocks"]
    return [s["initial"] for s in stocks], [s["id"] for s in stocks]


def _eval_rate(rate_expr, stock_values, param_values, stock_ids):
    """Safely evaluate rate expression. stock_values = dict id -> value; param_values = dict id -> value."""
    ns = dict(SAFE_NAMESPACE)
    ns.update(param_values)
    ns.update({sid: stock_values[sid] for sid in stock_ids})
    # Restrict to known names only
    allowed = set(stock_ids) | set(param_values.keys()) | set(SAFE_NAMESPACE.keys())
    for name in re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\b", rate_expr):
        if name not in allowed:
            return 0.0
    try:
        return float(eval(rate_expr, {"__builtins__": {}}, ns))
    except Exception:
        return 0.0


def build_ode(schema, include_flow_ids=None, exclude_mechanisms=None):
    """
    Build ODE function from schema. Returns f(t, y) where y is vector of stock values in schema order.
    - include_flow_ids: if set, only flows whose id is in this set are used (for mechanism exclusion).
    - exclude_mechanisms: if set, flows with flow["mechanism"] in this set are excluded.
    """
    stock_ids = [s["id"] for s in schema["stocks"]]
    flows = schema["flows"]
    if exclude_mechanisms:
        flows = [f for f in flows if f.get("mechanism") not in exclude_mechanisms]
    if include_flow_ids is not None:
        flows = [f for f in flows if f["id"] in include_flow_ids]
    param_values = get_param_values(schema)

    def ode(t, y):
        stock_values = dict(zip(stock_ids, y))
        dydt = {sid: 0.0 for sid in stock_ids}
        for fl in flows:
            rate = max(0.0, _eval_rate(fl["rate"], stock_values, param_values, stock_ids))
            from_s = fl.get("from")
            to_s = fl.get("to")
            if from_s and from_s in dydt:
                dydt[from_s] -= rate
            if to_s and to_s in dydt:
                dydt[to_s] += rate
        return [dydt[sid] for sid in stock_ids]

    return ode


def schema_to_print(schema):
    """Return a readable string of the model structure (data structure print)."""
    lines = [
        "=== MODEL STRUCTURE ===",
        "",
        "STOCKS (id, name, initial):",
    ]
    for s in schema["stocks"]:
        lines.append(f"  - {s['id']}: {s.get('name', s['id'])} = {s['initial']}")
    lines.append("")
    lines.append("FLOWS (id, from → to, rate expression):")
    for f in schema["flows"]:
        fr, to = f.get("from") or "source", f.get("to") or "sink"
        lines.append(f"  - {f['id']}: {fr} → {to}  rate = {f['rate']}")
    lines.append("")
    lines.append("PARAMETERS (id, name, value):")
    for p in schema["parameters"]:
        lines.append(f"  - {p['id']}: {p.get('name', p['id'])} = {p['value']}")
    lines.append("")
    return "\n".join(lines)


def schema_to_dict(schema):
    """Return a clean dict representation for display/export (understanding the data structure)."""
    out = {
        "stocks": [{"id": s["id"], "name": s.get("name", s["id"]), "initial": s["initial"]} for s in schema["stocks"]],
        "flows": [
            {"id": f["id"], "name": f.get("name", f["id"]), "from": f.get("from"), "to": f.get("to"), "rate": f["rate"], "loop_type": f.get("loop_type"), "delay": f.get("delay"), "loop_ids": f.get("loop_ids", [])}
            for f in schema["flows"]
        ],
        "parameters": [{"id": p["id"], "name": p.get("name", p["id"]), "value": p["value"]} for p in schema["parameters"]],
    }
    if schema.get("loops"):
        out["loops"] = [
            {"id": l["id"], "name": l.get("name", l["id"]), "type": l.get("type", "R"), "description": l.get("description", ""), "flow_ids": l.get("flow_ids", []), "delay": l.get("delay", "")}
            for l in schema["loops"]
        ]
    return out


def draw_stock_flow_diagram(schema, figsize=(12, 6)):
    """
    Draw stock-flow diagram from schema. Layout: stocks in a row; flows as arrows with rate labels.
    """
    stocks = schema["stocks"]
    flows = schema["flows"]
    n = len(stocks)
    if n == 0:
        fig, ax = plt.subplots(figsize=figsize)
        ax.text(0.5, 0.5, "No stocks defined", ha="center", va="center")
        return fig

    fig, ax = plt.subplots(figsize=figsize)
    ax.set_aspect("equal")
    ax.axis("off")

    # Layout: stocks in a row, evenly spaced
    xmin, xmax = 1, 10
    y_center = 2.5
    box_w, box_h = 1.2, 0.8
    if n == 1:
        xs = [5]
    else:
        xs = np.linspace(xmin, xmax, n).tolist()

    stock_x = {}
    colors = plt.cm.Pastel1(np.linspace(0, 1, max(n, 3)))

    for i, s in enumerate(stocks):
        x = xs[i]
        stock_x[s["id"]] = x
        box = FancyBboxPatch((x - box_w/2, y_center - box_h/2), box_w, box_h,
                             boxstyle="round,pad=0.02", facecolor=colors[i % len(colors)],
                             edgecolor="black", linewidth=1.5)
        ax.add_patch(box)
        label = f"{s['id']}\n{s.get('name', s['id'])}"
        ax.text(x, y_center, label, ha="center", va="center", fontsize=10, fontweight="bold")

    # Flows: arrow from stock to stock (or source/sink at edges); offset y per flow to avoid overlap
    y_arrow_base = y_center + 0.5
    for i, fl in enumerate(flows):
        fr, to = fl.get("from"), fl.get("to")
        y_arrow = y_arrow_base + (i * 0.22)
        x1 = stock_x.get(fr, xs[0] - 1) if fr else (stock_x[to] - 1.2 if to else 0.5)
        x2 = stock_x.get(to, xs[-1] + 1) if to else (stock_x[fr] + 1.2 if fr else xmax + 0.5)
        if fr is None and to:
            x1 = stock_x[to] - 1.2
        if to is None and fr:
            x2 = stock_x[fr] + 1.2
        ax.annotate("", xy=(x2 - 0.35, y_arrow), xytext=(x1 + 0.35, y_arrow),
                    arrowprops=dict(arrowstyle="->", lw=2, color="black"))
        mid = (x1 + x2) / 2
        ax.text(mid, y_arrow + 0.15, fl.get("name", fl["id"]), ha="center", fontsize=9, style="italic")
        rate = fl["rate"]
        if len(rate) > 30:
            rate = rate[:27] + "..."
        ax.text(mid, y_arrow - 0.2, rate, ha="center", fontsize=8)

    # ODE summary: build from flows
    ode_lines = []
    for s in stocks:
        sid = s["id"]
        inflows = [f for f in flows if f.get("to") == sid]
        outflows = [f for f in flows if f.get("from") == sid]
        in_str = " + ".join([f["rate"] for f in inflows]) if inflows else "0"
        out_str = " + ".join([f["rate"] for f in outflows]) if outflows else "0"
        ode_lines.append(r"$\frac{d%s}{dt} = %s - %s$" % (sid, in_str, out_str))
    ax.text((xmin + xmax) / 2, 0.6, "  |  ".join(ode_lines), ha="center", fontsize=9, wrap=True)
    ax.text((xmin + xmax) / 2, 0.2, "Parameters: " + ", ".join(p["id"] for p in schema["parameters"]),
            ha="center", fontsize=8, color="gray")
    ax.set_xlim(0, xmax + 1)
    ax.set_ylim(0, 5)
    ax.set_title("Stock-flow diagram (from model structure)", fontsize=12)
    plt.tight_layout()
    return fig


def add_stock(schema, stock_id, name=None, initial=0.0):
    """Add a stock to the schema. Returns new schema (copy)."""
    import copy
    schema = copy.deepcopy(schema)
    if any(s["id"] == stock_id for s in schema["stocks"]):
        return schema
    schema["stocks"].append({"id": stock_id, "name": name or stock_id, "initial": float(initial)})
    return schema


def add_flow(schema, flow_id, from_stock, to_stock, rate_expr, name=None):
    """Add a flow. from_stock/to_stock can be None for source/sink. Returns new schema (copy)."""
    import copy
    schema = copy.deepcopy(schema)
    if any(f["id"] == flow_id for f in schema["flows"]):
        return schema
    schema["flows"].append({
        "id": flow_id, "name": name or flow_id,
        "from": from_stock if from_stock else None,
        "to": to_stock if to_stock else None,
        "rate": rate_expr,
    })
    return schema


def add_parameter(schema, param_id, value=0.0, name=None):
    """Add a parameter. Returns new schema (copy)."""
    import copy
    schema = copy.deepcopy(schema)
    if any(p["id"] == param_id for p in schema["parameters"]):
        return schema
    schema["parameters"].append({"id": param_id, "name": name or param_id, "value": float(value)})
    return schema


def remove_stock(schema, stock_id):
    """Remove stock and any flows touching it. Returns new schema (copy)."""
    import copy
    schema = copy.deepcopy(schema)
    schema["stocks"] = [s for s in schema["stocks"] if s["id"] != stock_id]
    schema["flows"] = [f for f in schema["flows"] if f.get("from") != stock_id and f.get("to") != stock_id]
    return schema


def remove_flow(schema, flow_id):
    """Remove a flow. Returns new schema (copy)."""
    import copy
    schema = copy.deepcopy(schema)
    schema["flows"] = [f for f in schema["flows"] if f["id"] != flow_id]
    return schema


def update_parameter(schema, param_id, value):
    """Update parameter value in place (mutates schema)."""
    for p in schema["parameters"]:
        if p["id"] == param_id:
            p["value"] = float(value)
            break
    return schema


def apply_patch(schema, patch):
    """
    Merge patch into schema by id. Only listed elements are updated or added; everything else is unchanged.
    Patch format: { "flows": [ { "id", "rate"? , "from"? , "to"? , "name"? , ... } ], "parameters": [ { "id", "value"? , "name"? } ], "stocks": [ { "id", "initial"? , "name"? } ] }
    Returns a new schema (deep copy); original is not mutated.
    """
    import copy
    out = copy.deepcopy(schema)
    for key, list_key in [("flows", "flows"), ("parameters", "parameters"), ("stocks", "stocks")]:
        for item in patch.get(key, []):
            pid = item.get("id")
            if not pid:
                continue
            target_list = out.get(list_key, [])
            found = False
            for i, existing in enumerate(target_list):
                if existing.get("id") == pid:
                    for k, v in item.items():
                        if k in existing and v is not None:
                            if k == "value" or k == "initial":
                                existing[k] = float(v)
                            else:
                                existing[k] = v
                    found = True
                    break
            if not found and list_key == "flows":
                # Append new flow; ensure required keys
                new_f = {
                    "id": pid,
                    "name": item.get("name", pid),
                    "from": item.get("from"),
                    "to": item.get("to"),
                    "rate": str(item.get("rate", "0")),
                    "source": str(item.get("source", "ai")),
                    "loop_type": str(item.get("loop_type", "")),
                    "delay": str(item.get("delay", "")),
                    "mechanism": str(item.get("mechanism", "")),
                    "loop_ids": list(item.get("loop_ids", [])) if isinstance(item.get("loop_ids"), list) else [],
                }
                target_list.append(new_f)
            elif not found and list_key == "parameters":
                target_list.append({
                    "id": pid,
                    "name": item.get("name", pid),
                    "value": float(item.get("value", 0.0)),
                })
            elif not found and list_key == "stocks":
                target_list.append({
                    "id": pid,
                    "name": item.get("name", pid),
                    "initial": float(item.get("initial", 0.0)),
                    "source": str(item.get("source", "ai")),
                    "loop_type": str(item.get("loop_type", "")),
                })
    return _ensure_provenance(out)


# ---------------------------------------------------------------------------
# Model factory: optional provenance (source, loop_type, delay) and catalog
# ---------------------------------------------------------------------------

def validate_schema(schema):
    """
    Check schema consistency: flow from/to reference stocks; loop_ids and flow_ids match.
    Returns list of error strings (empty if valid).
    """
    errs = []
    stock_ids = {s["id"] for s in schema.get("stocks", [])}
    flow_ids = {f["id"] for f in schema.get("flows", [])}
    loop_ids = {l["id"] for l in schema.get("loops", [])}

    for f in schema.get("flows", []):
        fid = f.get("id", "?")
        fr, to = f.get("from"), f.get("to")
        if fr is not None and fr not in stock_ids:
            errs.append(f"Flow '{fid}': 'from' '{fr}' is not a stock id.")
        if to is not None and to not in stock_ids:
            errs.append(f"Flow '{fid}': 'to' '{to}' is not a stock id.")
        for lid in f.get("loop_ids", []):
            if lid not in loop_ids:
                errs.append(f"Flow '{fid}': loop_ids contains unknown loop '{lid}'.")

    for lo in schema.get("loops", []):
        lid = lo.get("id", "?")
        for fid in lo.get("flow_ids", []):
            if fid not in flow_ids:
                errs.append(f"Loop '{lid}': flow_ids contains unknown flow '{fid}'.")

    return errs


def _ensure_provenance(schema):
    """Ensure stocks/flows have optional source, loop_type (R/B), delay, mechanism for auditability."""
    for s in schema.get("stocks", []):
        s.setdefault("source", "")
        s.setdefault("loop_type", "")
    for f in schema.get("flows", []):
        f.setdefault("source", "")
        f.setdefault("loop_type", "")  # R = reinforcing, B = balancing
        f.setdefault("delay", "")
        f.setdefault("mechanism", "")
        f.setdefault("loop_ids", [])  # ids of loops this flow belongs to (from schema.loops)
    return schema


def schema_from_dict(data):
    """Build a valid schema from a dict (e.g. from JSON or GenAI). Ensures required keys."""
    schema = {
        "stocks": [],
        "flows": [],
        "parameters": [],
        "loops": [],
        "meta": dict(data.get("meta", {})) if isinstance(data.get("meta"), dict) else {},
        "clusters": [],
        "alternatives": [],
    }
    for s in data.get("stocks", []):
        row = {
            "id": str(s.get("id", "")).strip() or "S",
            "name": str(s.get("name", s.get("id", "Stock"))),
            "initial": float(s.get("initial", 0.0)),
            "source": str(s.get("source", "")),
            "loop_type": str(s.get("loop_type", "")),
        }
        if s.get("unit") is not None:
            row["unit"] = str(s.get("unit", ""))
        schema["stocks"].append(row)
    for f in data.get("flows", []):
        row = {
            "id": str(f.get("id", "")).strip() or "flow",
            "name": str(f.get("name", f.get("id", "flow"))),
            "from": f.get("from") if f.get("from") else None,
            "to": f.get("to") if f.get("to") else None,
            "rate": str(f.get("rate", "0")),
            "source": str(f.get("source", "")),
            "loop_type": str(f.get("loop_type", "")),
            "delay": str(f.get("delay", "")),
            "mechanism": str(f.get("mechanism", "")),
            "loop_ids": list(f.get("loop_ids", [])) if isinstance(f.get("loop_ids"), list) else [],
        }
        if f.get("unit") is not None:
            row["unit"] = str(f.get("unit", ""))
        schema["flows"].append(row)
    for p in data.get("parameters", []):
        row = {
            "id": str(p.get("id", "")).strip() or "p",
            "name": str(p.get("name", p.get("id", "param"))),
            "value": float(p.get("value", 0.0)),
        }
        if p.get("unit") is not None:
            row["unit"] = str(p.get("unit", ""))
        schema["parameters"].append(row)
    for lo in data.get("loops", []):
        schema["loops"].append({
            "id": str(lo.get("id", "")).strip() or "L",
            "name": str(lo.get("name", lo.get("id", "Loop"))),
            "type": str(lo.get("type", "R"))[:1].upper() or "R",
            "description": str(lo.get("description", "")),
            "flow_ids": list(lo.get("flow_ids", [])) if isinstance(lo.get("flow_ids"), list) else [],
            "delay": str(lo.get("delay", "")),
        })
    for c in data.get("clusters", []):
        if isinstance(c, dict) and c.get("id"):
            schema["clusters"].append({
                "id": str(c.get("id", "")).strip(),
                "name": str(c.get("name", c.get("id", "Cluster"))),
                "stock_ids": list(c.get("stock_ids", [])) if isinstance(c.get("stock_ids"), list) else [],
            })
    for a in data.get("alternatives", []):
        if isinstance(a, dict) and a.get("id"):
            schema["alternatives"].append({
                "id": str(a.get("id", "")).strip(),
                "name": str(a.get("name", a.get("id", "Alternatives"))),
                "stock_ids": list(a.get("stock_ids", [])) if isinstance(a.get("stock_ids"), list) else [],
            })
    return _ensure_provenance(schema)


def default_aerodyn_lethal_ai_schema():
    """
    AeroDyn Lethal AI — built like the PPT: explicit R & B loops with causal chains.
    Course: "PublicBacklash ↔ Regulation ↔ Secrecy"; "R & B loops with documented delays".
    """
    return _ensure_provenance({
        "meta": {
            "id": "aerodyn_lethal_ai",
            "name": "AeroDyn — Lethal AI & long-term business",
            "question": "What happens to our long-term business if we heavily invest in lethal AI?",
            "horizon_years": 10,
            "building_blocks": ["Reputation/trust", "Adoption/diffusion"],
        },
        "clusters": [
            {"id": "C1", "name": "Visibility & backlash", "stock_ids": ["LethalAIVis", "Backlash"]},
            {"id": "C2", "name": "Regulatory pressure", "stock_ids": ["Regulation"]},
            {"id": "C3", "name": "Reputation & contracts", "stock_ids": ["Reputation", "Contracts"]},
        ],
        "loops": [
            {
                "id": "R1",
                "name": "Backlash spiral",
                "type": "R",
                "description": "More lethal AI visibility → more public backlash → stricter regulation → constraints on contracts (and pressure toward secrecy). Reinforcing: amplifies over time.",
                "flow_ids": ["invest_visibility", "visibility_backlash", "backlash_regulation", "regulation_contracts"],
                "delay": "3–24 mo (visibility to backlash fast; backlash to regulation slower).",
            },
            {
                "id": "R2",
                "name": "Backlash erodes reputation",
                "type": "R",
                "description": "More backlash → reputation falls → less license to operate. Reinforcing: vicious cycle.",
                "flow_ids": ["backlash_reputation"],
                "delay": "3–6 mo.",
            },
            {
                "id": "R3",
                "name": "Reputation builds contracts",
                "type": "R",
                "description": "Better reputation → more contract pipeline (scaled by AI performance sufficiency). Reinforcing: success breeds success.",
                "flow_ids": ["reputation_contracts"],
                "delay": "6–12 mo.",
            },
            {
                "id": "B1",
                "name": "Diversification (visibility decay)",
                "type": "B",
                "description": "Diversify portfolio → lethal AI visibility decays. Balancing: dampens the backlash spiral.",
                "flow_ids": ["visibility_decay"],
                "delay": "12–24 mo.",
            },
            {
                "id": "B2",
                "name": "Media cycle (backlash decay)",
                "type": "B",
                "description": "Public attention fades → backlash decays. Balancing: limits sustained pressure.",
                "flow_ids": ["backlash_decay"],
                "delay": "6–12 mo.",
            },
            {
                "id": "B3",
                "name": "Policy cycle (regulation decay)",
                "type": "B",
                "description": "Policy cycle turns → regulation eases over time. Balancing: limits permanent constraint.",
                "flow_ids": ["regulation_decay"],
                "delay": "24+ mo.",
            },
            {
                "id": "B4",
                "name": "Reputation recovery",
                "type": "B",
                "description": "Transparency, compliance, public education → reputation recovers. Balancing: counters backlash erosion.",
                "flow_ids": ["reputation_recovery"],
                "delay": "12–24 mo.",
            },
            {
                "id": "B5",
                "name": "Contract fulfillment",
                "type": "B",
                "description": "Delivery → contract pipeline drains. Balancing: normal business flow.",
                "flow_ids": ["contracts_fulfill"],
                "delay": "24+ mo.",
            },
        ],
        "stocks": [
            {"id": "LethalAIVis", "name": "Lethal AI visibility", "initial": 20.0, "source": "task force", "loop_type": ""},
            {"id": "Backlash", "name": "Public / ethical backlash", "initial": 15.0, "source": "task force", "loop_type": ""},
            {"id": "Regulation", "name": "Regulatory pressure", "initial": 25.0, "source": "task force", "loop_type": ""},
            {"id": "Reputation", "name": "Reputation (license to operate)", "initial": 55.0, "source": "task force", "loop_type": ""},
            {"id": "Contracts", "name": "Contract pipeline (value at stake)", "initial": 40.0, "source": "task force", "loop_type": ""},
        ],
        "flows": [
            {
                "id": "invest_visibility",
                "name": "Investment → visibility",
                "from": None, "to": "LethalAIVis",
                "rate": "invest_rate",
                "source": "task force", "loop_type": "R", "delay": "6–12 mo", "mechanism": "visibility", "loop_ids": ["R1"],
            },
            {
                "id": "visibility_decay",
                "name": "Visibility decay (diversification)",
                "from": "LethalAIVis", "to": None,
                "rate": "decay_vis * LethalAIVis",
                "source": "task force", "loop_type": "B", "delay": "12–24 mo", "mechanism": "visibility", "loop_ids": ["B1"],
            },
            {
                "id": "visibility_backlash",
                "name": "Visibility → backlash",
                "from": "LethalAIVis", "to": "Backlash",
                "rate": "k_vis_back * LethalAIVis * (1 - Backlash / 100)",
                "source": "task force", "loop_type": "R", "delay": "3–6 mo", "mechanism": "backlash_loop", "loop_ids": ["R1"],
            },
            {
                "id": "backlash_decay",
                "name": "Backlash decay (media cycle)",
                "from": "Backlash", "to": None,
                "rate": "decay_back * Backlash",
                "source": "task force", "loop_type": "B", "delay": "6–12 mo", "mechanism": "backlash_loop", "loop_ids": ["B2"],
            },
            {
                "id": "backlash_regulation",
                "name": "Backlash → regulation",
                "from": "Backlash", "to": "Regulation",
                "rate": "k_back_reg * Backlash * (1 - Regulation / 100)",
                "source": "task force", "loop_type": "R", "delay": "12–24 mo", "mechanism": "regulation_loop", "loop_ids": ["R1"],
            },
            {
                "id": "regulation_decay",
                "name": "Regulation decay (policy cycle)",
                "from": "Regulation", "to": None,
                "rate": "decay_reg * Regulation",
                "source": "task force", "loop_type": "B", "delay": "24+ mo", "mechanism": "regulation_loop", "loop_ids": ["B3"],
            },
            {
                "id": "backlash_reputation",
                "name": "Backlash erodes reputation",
                "from": "Reputation", "to": None,
                "rate": "k_back_rep * Backlash * Reputation / 100",
                "source": "task force", "loop_type": "R", "delay": "3–6 mo", "mechanism": "reputation_loop", "loop_ids": ["R2"],
            },
            {
                "id": "reputation_recovery",
                "name": "Reputation recovery (transparency, compliance)",
                "from": None, "to": "Reputation",
                "rate": "recovery_rate * (100 - Reputation) / 100",
                "source": "task force", "loop_type": "B", "delay": "12–24 mo", "mechanism": "reputation_loop", "loop_ids": ["B4"],
            },
            {
                "id": "reputation_contracts",
                "name": "Reputation → contract pipeline",
                "from": None, "to": "Contracts",
                "rate": "k_rep_cont * Reputation / 100 * base_contracts * ai_performance_sufficient",
                "source": "task force", "loop_type": "R", "delay": "6–12 mo", "mechanism": "contracts_loop", "loop_ids": ["R3"],
            },
            {
                "id": "regulation_contracts",
                "name": "Regulation constrains contracts",
                "from": "Contracts", "to": None,
                "rate": "k_reg_cont * Regulation / 100 * Contracts / 100",
                "source": "task force", "loop_type": "R", "delay": "12–24 mo", "mechanism": "regulation_loop", "loop_ids": ["R1"],
            },
            {
                "id": "contracts_fulfill",
                "name": "Contracts fulfilled (delivery)",
                "from": "Contracts", "to": None,
                "rate": "fulfill_rate * Contracts / 100",
                "source": "task force", "loop_type": "B", "delay": "24+ mo", "mechanism": "contracts_loop", "loop_ids": ["B5"],
            },
        ],
        "parameters": [
            {"id": "invest_rate", "name": "Investment → visibility", "value": 1.2},
            {"id": "decay_vis", "name": "Visibility decay", "value": 0.03},
            {"id": "k_vis_back", "name": "Visibility → backlash", "value": 0.15},
            {"id": "decay_back", "name": "Backlash decay", "value": 0.05},
            {"id": "k_back_reg", "name": "Backlash → regulation", "value": 0.12},
            {"id": "decay_reg", "name": "Regulation decay", "value": 0.02},
            {"id": "k_back_rep", "name": "Backlash → reputation erosion", "value": 0.08},
            {"id": "recovery_rate", "name": "Reputation recovery", "value": 2.0},
            {"id": "k_rep_cont", "name": "Reputation → contracts", "value": 0.5},
            {"id": "k_reg_cont", "name": "Regulation → contract loss", "value": 0.06},
            {"id": "base_contracts", "name": "Base contract inflow", "value": 15.0},
            {"id": "fulfill_rate", "name": "Contract fulfillment", "value": 0.04},
            {"id": "ai_performance_sufficient", "name": "AI performance sufficient (0–1)", "value": 1.0},
        ],
    })


def get_model_catalog():
    """Return catalog of available models: id, name, description, schema loader."""
    return {
        "sir": {
            "id": "sir",
            "name": "SIR (epidemic)",
            "description": "Classic Susceptible–Infected–Recovered; learning and validation.",
            "load": default_sir_schema,
        },
        "aerodyn_pipeline": {
            "id": "aerodyn_pipeline",
            "name": "AeroDyn — Pipeline & trust",
            "description": "R&D → Integration → Certification → Delivery; ministerial trust.",
            "load": _load_aerodyn_pipeline_schema,
        },
        "aerodyn_lethal_ai": {
            "id": "aerodyn_lethal_ai",
            "name": "AeroDyn — Lethal AI & long-term business",
            "description": "Backlash ↔ Regulation ↔ Reputation ↔ Contracts over 5–10 years.",
            "load": lambda: default_aerodyn_lethal_ai_schema(),
        },
    }


def _load_aerodyn_pipeline_schema():
    """AeroDyn pipeline (R&D → Cert → Delivery + Trust) as schema for the engine."""
    return _ensure_provenance({
        "meta": {"id": "aerodyn_pipeline", "name": "AeroDyn — Pipeline & Ministerial Trust", "horizon_years": 5},
        "loops": [],
        "stocks": [
            {"id": "R", "name": "R&D pipeline", "initial": 20.0, "source": "aerodyn_system_dynamics.py", "loop_type": ""},
            {"id": "I", "name": "Integration", "initial": 5.0, "source": "aerodyn_system_dynamics.py", "loop_type": ""},
            {"id": "C", "name": "Certification queue", "initial": 3.0, "source": "aerodyn_system_dynamics.py", "loop_type": ""},
            {"id": "D", "name": "Delivered", "initial": 0.0, "source": "aerodyn_system_dynamics.py", "loop_type": ""},
            {"id": "T", "name": "Ministerial trust", "initial": 60.0, "source": "aerodyn_system_dynamics.py", "loop_type": ""},
        ],
        "flows": [
            {"id": "new_programs", "name": "New programs", "from": None, "to": "R", "rate": "new_programs", "source": "script", "loop_type": "", "delay": ""},
            {"id": "rd_completion", "name": "R&D completion", "from": "R", "to": "I", "rate": "k_rd * R", "source": "script", "loop_type": "", "delay": ""},
            {"id": "integration_completion", "name": "Integration completion", "from": "I", "to": "C", "rate": "k_int * I", "source": "script", "loop_type": "", "delay": ""},
            {"id": "cert_rate", "name": "Certification → delivery", "from": "C", "to": "D", "rate": "k_cert * C / oversight", "source": "script", "loop_type": "", "delay": ""},
            {"id": "trust_gain", "name": "Trust gain", "from": None, "to": "T", "rate": "trust_gain_per_delivery * k_cert * C / oversight * (1 + non_lethal_bonus * frac_nl)", "source": "script", "loop_type": "B", "delay": ""},
            {"id": "trust_decay", "name": "Trust decay", "from": "T", "to": None, "rate": "trust_decay * max(T - trust_floor, 0)", "source": "script", "loop_type": "B", "delay": ""},
        ],
        "parameters": [
            {"id": "new_programs", "name": "New programs/month", "value": 1.2},
            {"id": "k_rd", "name": "R&D completion rate", "value": 0.08},
            {"id": "k_int", "name": "Integration rate", "value": 0.12},
            {"id": "k_cert", "name": "Cert rate (base)", "value": 0.15},
            {"id": "oversight", "name": "Oversight factor", "value": 1.0},
            {"id": "trust_gain_per_delivery", "name": "Trust gain per delivery", "value": 1.5},
            {"id": "non_lethal_bonus", "name": "Non-lethal bonus", "value": 0.4},
            {"id": "frac_nl", "name": "Fraction non-lethal", "value": 0.3},
            {"id": "trust_decay", "name": "Trust decay", "value": 0.02},
            {"id": "trust_floor", "name": "Trust floor", "value": 20.0},
        ],
    })
