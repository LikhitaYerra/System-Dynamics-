"""
FastAPI backend for the System Dynamics Studio.

Exposes:
- GET /catalog            → list available models
- GET /schema/{id}        → schema for a given model
- POST /simulate          → schema + horizon → time series (+ optional warnings on divergence)
- POST /simulate-batch    → same schema, multiple param variants → multiple time series
- POST /schema/apply-patch → merge a patch into schema (only touched parts change; deterministic)
- POST /ai-schema         → (optional) full draft from Model Brief
- POST /ai-suggest-flow   → (optional) localized suggestion: one flow or params; rest unchanged
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml
from dotenv import load_dotenv
# Load .env from project root (same folder as this file) so the key is always found
load_dotenv(Path(__file__).resolve().parent / ".env")

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy.integrate import solve_ivp

from sd_engine import (
    get_model_catalog,
    schema_from_dict,
    build_ode,
    get_stock_init,
    get_param_values,
    update_parameter,
    apply_patch,
    validate_schema,
)

try:
    import rag as _rag
except Exception:
    _rag = None  # type: ignore

try:
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore

def _get_ai_client() -> Tuple[Any, str]:
    """Return (client, model_name). OpenAI only. Reads OPENAI_API_KEY from env each time so .env is respected."""
    openai_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not openai_key:
        return None, ""
    client = OpenAI(api_key=openai_key)
    return client, os.environ.get("OPENAI_MODEL", "gpt-4o")


app = FastAPI(title="System Dynamics Studio API")

# Allow frontend (Vite dev server) to call the API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Divergence threshold: flag if any stock exceeds this
DIVERGENCE_THRESHOLD = 1e10

# System role for AI: expert behavior and output format
_AI_SYSTEM_ROLE = """You are an expert in system dynamics and causal loop modeling. You reason about stocks (accumulations), flows (rates), feedback loops (reinforcing R and balancing B), and parameters. You always output valid JSON only—no markdown code fences, no preamble. When asked to draft or patch a model, you use camelCase ids, clear human-readable names, and rate expressions that reference only existing stock/parameter ids (Python-style math). You think step-by-step about causality before writing the JSON."""

_PROMPTS_FILE = Path(__file__).resolve().parent / "prompts.yaml"

_DEFAULT_AI_SCHEMA = """From the Model Brief below, design a small, explainable system dynamics model.

Steps:
1. Extract the strategic question and key concepts. Name the model (short title).
2. Identify 3–6 STOCKS that capture the main accumulations (id: camelCase, name: human label, initial: number 0–100).
3. Identify 5–12 FLOWS that connect stocks (and source/sink). For each flow:
   - id (camelCase), name (short label)
   - from: stock id or null for external source; to: stock id or null for sink
   - rate: a Python-style expression using ONLY stock ids and parameter ids you define (e.g. "k_xy * StockA / 100", "invest_rate * visibility")
   - loop_type: "R" (reinforcing: amplifies) or "B" (balancing: dampens)
4. Identify 6–15 PARAMETERS (id, name, value) so every symbol in flow rates is defined.

Causal discipline: each flow should have a clear causal story. Reinforcing loops (R) amplify; balancing loops (B) correct or limit. Ensure every flow's rate expression uses only the stock and parameter ids you list.

Return a single JSON object with:
- "meta": {{ "name": "Model short name", "question": "Strategic question one sentence" }}
- "stocks": [ {{ "id", "name", "initial" }}, ... ]
- "flows": [ {{ "id", "name", "from", "to", "rate", "loop_type" }}, ... ]
- "parameters": [ {{ "id", "name", "value" }}, ... ]

JSON only, no other text.

Model Brief:
\"\"\"{brief}\"\"\""""

_DEFAULT_AI_SUGGEST_FLOW = """The user has an existing system dynamics model and wants a LOCALIZED change. Your response will be MERGED into the schema: only the elements you list are added or updated; everything else stays the same.

Existing STOCKS (id and name): {stock_list}
Existing PARAMETERS (id=value): {param_list}
Existing FLOWS (from → to, id, rate, loop_type): {flow_list}

User instruction: "{instruction}"

Interpret the instruction precisely:
- "X depends on Y" or "Y affects X" → add a flow (and new stock/parameter if needed). Choose direction and rate so the causal story is clear.
- "Add a balancing loop that reduces Z" → add one or more flows that drain or limit Z, with loop_type "B", and any new stock/parameter required.
- "Add reinforcing loop" → add flows that amplify a stock, loop_type "R".
- "Change parameter X" or "tweak Y" → in the patch include "parameters": [ {{ "id": "X", "value": newValue, "name": "..." }} ].

Rules:
- Rate expressions must use ONLY: existing stock ids, existing parameter ids, and any NEW stock/parameter ids you add. Python-style math (e.g. "k * StockA / 100").
- New stocks: id (camelCase), name (human label), initial (0–100). New flows: id, name, from, to, rate, loop_type "R" or "B", source "ai". New parameters: id, name, value.
- Reuse existing parameter ids where they fit (e.g. a "sensitivity" param); add new parameters when the new flow needs its own constant.

Return ONLY a JSON object (patch). Keys: "stocks" (optional array of NEW stocks), "flows" (array of flows to ADD or UPDATE by id), "parameters" (optional array to ADD or UPDATE by id). Omit keys you do not need.

Example for "reputation depends on company appeal": {{ "stocks": [ {{ "id": "CompanyAppeal", "name": "Company appeal", "initial": 50 }} ], "flows": [ {{ "id": "appeal_to_reputation", "name": "Appeal → Reputation", "from": "CompanyAppeal", "to": "Reputation", "rate": "k_appeal_rep * CompanyAppeal / 100", "loop_type": "R", "source": "ai" }} ], "parameters": [ {{ "id": "k_appeal_rep", "name": "Appeal→reputation", "value": 0.3 }} ] }}

JSON only:"""

_DEFAULT_AI_QUESTION = """You are helping a CEO understand their system dynamics model. They asked a question. Respond with a sharp, actionable insight and optionally one small schema addition.

Model context:
- Name / strategic question: {meta_name} — {meta_question}
- Stocks (id, name): {stock_list}
- Parameters (id=value, name): {param_list}
- Flows (from → to, name, rate, loop_type): {flow_detail}
- Loops: {loop_list}{sim_ctx}

CEO question: "{question}"

Your tasks:
1. INTERPRET (required): In 2–5 sentences, answer the question in plain language. Reference specific stocks and flows by name. Explain what the model implies for the business or situation and how the causal structure (e.g. backlash → regulation → reputation) drives that. If simulation summary is present, use it to ground your answer (e.g. "Given the latest run, LethalAIVis rises while Reputation falls because...").

2. SUGGESTED_PATCH (optional): Only if the question naturally implies adding ONE small mechanism to the model (e.g. "what if reputation also depended on company appeal?" → add CompanyAppeal stock and a flow to Reputation), output a patch. Otherwise set "suggested_patch" to null. Patch format: {{ "stocks": [ {{ "id", "name", "initial" }} ], "flows": [ {{ "id", "name", "from", "to", "rate", "loop_type", "source": "ai" }} ], "parameters": [ {{ "id", "name", "value" }} ] }}. Rate expressions must use only existing + new stock/param ids. Do not replace the whole model—only add.

Return ONLY a JSON object: {{ "interpretation": "<your insight>", "suggested_patch": <patch object or null> }}. No markdown."""

_DEFAULT_AI_SUGGEST_SCENARIOS = """You are helping define scenario variants for a system dynamics model. Given the model context below, suggest 3–5 distinct scenarios (e.g. Baseline, High regulation, Low trust, Fast adoption). For each scenario provide a short label and parameter overrides: only change a few key parameters (use the exact parameter ids from the list). Do not invent new parameter ids.

Model: {model_name}
Parameters (id, name, typical value): {param_list}
Stocks (id, name): {stock_list}
{brief}

Return ONLY a JSON array of objects, each with: "label" (string, short scenario name) and "params" (object: param_id -> number). Example: [ {{ "label": "Baseline", "params": {{}} }}, {{ "label": "High regulation", "params": {{ "reg_sensitivity": 0.8 }} }} ]. JSON only, no other text."""

_DEFAULT_AI_COMPARE_RUNS = """You are comparing multiple simulation runs of a system dynamics model. The user has provided run labels and summaries (or key outcomes). Produce a short, insightful narrative comparison: what differs between runs, which scenario leads to better/worse outcomes, and one or two actionable takeaways. Reference specific stocks or metrics when possible.

Runs:
{runs_text}
{question}

Respond with plain text only (no JSON). Write 3–6 sentences."""

_DEFAULT_AI_EXPLAIN_SCHEMA = """You are explaining a system dynamics model to a stakeholder. Given the model below, write a clear, concise explanation in plain language (4–8 sentences). Cover: (1) the model name and strategic question, (2) the main stocks (accumulations) and what they represent, (3) the key flows and how they connect stocks, (4) the reinforcing (R) and balancing (B) loops and what story they tell (e.g. backlash spiral, reputation recovery), (5) why the structure is transparent and auditable. Use simple language; avoid jargon where possible.

Model name / question: {meta_name} — {meta_question}
Stocks (id, name): {stock_list}
Parameters (id=value): {param_list}
Flows (from → to, name, rate, loop_type): {flow_detail}
Loops: {loop_list}

Respond with plain text only (no JSON, no markdown headers). Write one short paragraph."""


def _get_prompts() -> Dict[str, str]:
    """Load prompts from prompts.yaml if present; merge with defaults."""
    out = {
        "ai_schema": _DEFAULT_AI_SCHEMA,
        "ai_suggest_flow": _DEFAULT_AI_SUGGEST_FLOW,
        "ai_question": _DEFAULT_AI_QUESTION,
        "ai_suggest_scenarios": _DEFAULT_AI_SUGGEST_SCENARIOS,
        "ai_compare_runs": _DEFAULT_AI_COMPARE_RUNS,
        "ai_explain_schema": _DEFAULT_AI_EXPLAIN_SCHEMA,
    }
    if _PROMPTS_FILE.is_file():
        try:
            with open(_PROMPTS_FILE, "r", encoding="utf-8") as f:
                loaded = yaml.safe_load(f)
            if isinstance(loaded, dict):
                for k, v in loaded.items():
                    if isinstance(v, str) and k in out:
                        out[k] = v
        except Exception:
            pass
    return out


class SimRequest(BaseModel):
    schema_data: Dict[str, Any] = Field(alias="schema")
    horizon_months: int = 120
    exclude_mechanisms: Optional[List[str]] = None


class SimResponse(BaseModel):
    t: List[float]
    stock_ids: List[str]
    Y: List[List[float]]
    warnings: Optional[List[str]] = None


class SimBatchVariant(BaseModel):
    label: str
    params: Dict[str, float] = {}  # param_id -> value override


class SimBatchRequest(BaseModel):
    schema_data: Dict[str, Any] = Field(alias="schema")
    horizon_months: int = 120
    variants: List[SimBatchVariant]


class SimBatchResult(BaseModel):
    label: str
    t: List[float]
    stock_ids: List[str]
    Y: List[List[float]]
    warnings: Optional[List[str]] = None


class SimBatchResponse(BaseModel):
    results: List[SimBatchResult]


class ApplyPatchRequest(BaseModel):
    schema_data: Dict[str, Any] = Field(alias="schema")
    patch: Dict[str, Any]


class AISuggestFlowRequest(BaseModel):
    schema_data: Dict[str, Any] = Field(alias="schema")
    instruction: str


class AISchemaRequest(BaseModel):
    brief: str


class AIQuestionRequest(BaseModel):
    schema_data: Dict[str, Any] = Field(alias="schema")
    question: str
    sim_summary: Optional[str] = None


class AISuggestScenariosRequest(BaseModel):
    schema_data: Dict[str, Any] = Field(alias="schema")
    brief: Optional[str] = None


class AICompareRunsRun(BaseModel):
    label: str
    summary: Optional[str] = None
    final_values: Optional[Dict[str, float]] = None  # stock_id -> value at end


class AICompareRunsRequest(BaseModel):
    runs: List[AICompareRunsRun]
    question: Optional[str] = None


class AIExplainSchemaRequest(BaseModel):
    schema_data: Dict[str, Any] = Field(alias="schema")


@app.get("/")
def root() -> Dict[str, str]:
    """Root route so GET / does not 404."""
    return {
        "message": "System Dynamics Studio API",
        "docs": "http://127.0.0.1:8000/docs",
        "catalog": "http://127.0.0.1:8000/catalog",
    }


@app.get("/catalog")
def catalog() -> Dict[str, Dict[str, str]]:
    cat = get_model_catalog()
    return {
        k: {
            "id": v["id"],
            "name": v["name"],
            "description": v["description"],
        }
        for k, v in cat.items()
    }


@app.get("/schema/{model_id}")
def get_schema(model_id: str) -> Dict[str, Any]:
    cat = get_model_catalog()
    if model_id not in cat:
        return {"error": "unknown model_id"}
    schema = cat[model_id]["load"]()
    errs = validate_schema(schema)
    if errs:
        import logging
        logging.warning("Schema validation issues for %s: %s", model_id, errs)
        schema = dict(schema)
        schema["_validation_errors"] = errs
    return schema


def _check_divergence(Y: np.ndarray, stock_ids: List[str], t_years: List[float]) -> List[str]:
    """Return list of warning strings if any stock diverged (NaN, Inf, or > threshold)."""
    warnings = []
    for i, sid in enumerate(stock_ids):
        row = Y[i]
        for j, v in enumerate(row):
            if np.isnan(v) or np.isinf(v):
                warnings.append(f"{sid} diverged ({'NaN' if np.isnan(v) else 'Inf'}) at t≈{t_years[j]:.1f} years")
                break
            if abs(v) > DIVERGENCE_THRESHOLD:
                warnings.append(f"{sid} exceeded threshold at t≈{t_years[j]:.1f} years")
                break
    return warnings


@app.post("/simulate", response_model=SimResponse)
def simulate(req: SimRequest) -> SimResponse:
    schema = schema_from_dict(req.schema_data)
    ode = build_ode(schema, exclude_mechanisms=req.exclude_mechanisms or None)
    y0, stock_ids = get_stock_init(schema)
    sol = solve_ivp(ode, [0, float(req.horizon_months)], y0, dense_output=True, max_step=1.0)
    t = np.linspace(0, req.horizon_months, 200)
    Y = sol.sol(t)
    t_years = (t / 12).tolist()
    Y_list = Y.tolist()
    warnings = _check_divergence(Y, stock_ids, t_years)
    return SimResponse(t=t_years, stock_ids=stock_ids, Y=Y_list, warnings=warnings or None)


@app.post("/simulate-batch", response_model=SimBatchResponse)
def simulate_batch(req: SimBatchRequest) -> SimBatchResponse:
    """Run multiple variants (same schema, different param overrides). Only touched params change."""
    results = []
    for v in req.variants:
        schema = schema_from_dict(req.schema_data)
        for pid, pval in v.params.items():
            update_parameter(schema, pid, pval)
        ode = build_ode(schema)
        y0, stock_ids = get_stock_init(schema)
        sol = solve_ivp(ode, [0, float(req.horizon_months)], y0, dense_output=True, max_step=1.0)
        t = np.linspace(0, req.horizon_months, 200)
        Y = sol.sol(t)
        t_years = (t / 12).tolist()
        Y_list = Y.tolist()
        warnings = _check_divergence(Y, stock_ids, t_years)
        results.append(SimBatchResult(label=v.label, t=t_years, stock_ids=stock_ids, Y=Y_list, warnings=warnings or None))
    return SimBatchResponse(results=results)


@app.post("/schema/apply-patch")
def schema_apply_patch(req: ApplyPatchRequest) -> Dict[str, Any]:
    """Merge patch into schema by id. Only listed elements are updated/added; rest unchanged (deterministic)."""
    schema = schema_from_dict(req.schema_data)
    out = apply_patch(schema, req.patch)
    return out


def _extract_json(content: str) -> str:
    """Extract JSON object from model output (handles markdown fences and surrounding text)."""
    s = content.strip()
    # Remove markdown code block if present
    if s.startswith("```"):
        lines = s.split("\n")
        for i, line in enumerate(lines):
            if line.strip().startswith("{"):
                s = "\n".join(lines[i:])
                break
        s = s.strip("`").strip()
        if s.startswith("json"):
            s = s[4:].strip()
    # Find first { and last }
    start = s.find("{")
    end = s.rfind("}")
    if start != -1 and end != -1 and end > start:
        return s[start : end + 1]
    return s


def _extract_json_array(content: str) -> str:
    """Extract JSON array from model output."""
    s = content.strip()
    if s.startswith("```"):
        lines = s.split("\n")
        for i, line in enumerate(lines):
            if "[" in line:
                s = "\n".join(lines[i:])
                break
        s = s.strip("`").strip()
        if s.startswith("json"):
            s = s[4:].strip()
    start = s.find("[")
    end = s.rfind("]")
    if start != -1 and end != -1 and end > start:
        return s[start : end + 1]
    return "[]"


def _ai_text_completion(prompt: str, system_role: Optional[str] = None) -> str:
    """Call AI and return raw message content (for narrative/comparison)."""
    if OpenAI is None:
        return ""
    client, model = _get_ai_client()
    if client is None:
        return ""
    messages: List[Dict[str, str]] = []
    if system_role:
        messages.append({"role": "system", "content": system_role})
    messages.append({"role": "user", "content": prompt})
    try:
        resp = client.chat.completions.create(model=model, messages=messages)
        return (resp.choices[0].message.content or "").strip()
    except Exception:
        return ""


def _ai_json_completion(prompt: str, system_role: Optional[str] = None) -> Dict[str, Any]:
    """Call OpenAI chat completion and parse JSON from response. Uses system role for smarter behavior."""
    if OpenAI is None:
        return {"error": "OpenAI client not available (openai library not installed)."}
    client, model = _get_ai_client()
    if client is None:
        return {"error": "No AI API key set. Set OPENAI_API_KEY in .env."}
    messages: List[Dict[str, str]] = []
    if system_role:
        messages.append({"role": "system", "content": system_role})
    messages.append({"role": "user", "content": prompt})
    try:
        resp = client.chat.completions.create(model=model, messages=messages)
        content = (resp.choices[0].message.content or "").strip()
    except Exception as e:
        return {"error": f"AI API error: {str(e)}"}
    extracted = _extract_json(content)
    try:
        return json.loads(extracted)
    except json.JSONDecodeError:
        return {"error": f"AI did not return valid JSON: {extracted[:200]}…"}


@app.post("/ai-schema")
def ai_schema(req: AISchemaRequest) -> Dict[str, Any]:
    """
    Optional: full draft from a Model Brief. Returns a full schema (stocks, flows, parameters, meta).
    You explicitly apply it; untouched parts of any existing model are not involved.
    """
    if OpenAI is None:
        return {"error": "AI integration not available (openai library not installed)."}
    if not req.brief.strip():
        return {"error": "Empty brief."}
    prompt = _get_prompts()["ai_schema"].format(brief=req.brief)
    if _rag:
        rag_ctx = _rag.get_rag_context_for_prompt(req.brief.strip(), top_k=4)
        if rag_ctx:
            prompt = rag_ctx + "\n\n" + prompt
    out = _ai_json_completion(prompt, _AI_SYSTEM_ROLE)
    if "error" in out:
        return out
    # Ensure meta exists for UI
    if "meta" not in out or not isinstance(out["meta"], dict):
        out["meta"] = {"name": "AI-drafted model", "question": ""}
    return out


@app.post("/ai-suggest-flow")
def ai_suggest_flow(req: AISuggestFlowRequest) -> Dict[str, Any]:
    """
    Localized AI suggestion: given current schema + short instruction, return ONLY a small patch
    (e.g. one new flow, or one flow edit, or a few parameter changes). Merge via apply-patch;
    untouched parts of the schema stay exactly the same. All suggested elements get source "ai".
    """
    if OpenAI is None:
        return {"error": "AI integration not available."}
    if not req.instruction.strip():
        return {"error": "Empty instruction."}

    schema = req.schema_data
    stocks = schema.get("stocks") or []
    params = schema.get("parameters") or []
    flows = schema.get("flows") or []

    stock_list = [f"{s.get('id')} ({s.get('name', '')})" for s in stocks if isinstance(s, dict)]
    param_list = [f"{p.get('id')}={p.get('value')}" for p in params if isinstance(p, dict)]
    flow_list = [
        f"{f.get('from') or 'source'} → {f.get('to') or 'sink'}: {f.get('id')} rate={f.get('rate', '')} loop_type={f.get('loop_type', '')}"
        for f in flows[:25] if isinstance(f, dict)
    ]
    prompt = _get_prompts()["ai_suggest_flow"].format(
        stock_list=stock_list, param_list=param_list, flow_list=flow_list, instruction=req.instruction
    )
    if _rag:
        rag_ctx = _rag.get_rag_context_for_prompt(req.instruction.strip(), top_k=4)
        if rag_ctx:
            prompt = rag_ctx + "\n\n" + prompt
    out = _ai_json_completion(prompt, _AI_SYSTEM_ROLE)
    if "error" in out:
        return out
    # Ensure suggested items are tagged so UI can show "AI-suggested" (purple/dashed in diagram)
    for f in out.get("flows", []):
        if isinstance(f, dict):
            f["source"] = "ai"
    for p in out.get("parameters", []):
        if isinstance(p, dict):
            p["source"] = "ai"
    for s in out.get("stocks", []):
        if isinstance(s, dict):
            s["source"] = "ai"
    return out


@app.post("/ai-question")
def ai_question(req: AIQuestionRequest) -> Dict[str, Any]:
    """
    CEO-style Q&A: answer a simple question about the model in plain language.
    Returns an interpretation (insight) and optionally a small suggested patch to ADD to the
    existing schema (no full replace). The CEO gets insight first; they can optionally apply
    the suggestion to add something to the model.
    """
    try:
        if OpenAI is None:
            return {"error": "AI integration not available (openai library not installed)."}
        if not req.question or not str(req.question).strip():
            return {"error": "Please ask a question."}

        schema = req.schema_data if isinstance(req.schema_data, dict) else {}
        stocks = schema.get("stocks") or []
        params = schema.get("parameters") or []
        flows = schema.get("flows") or []
        loops = schema.get("loops") or []
        meta = schema.get("meta") or {}

        stock_list = [f"{s.get('id')} ({s.get('name', '')})" for s in stocks if isinstance(s, dict)]
        param_list = [f"{p.get('id')}={p.get('value')} ({p.get('name', '')})" for p in params if isinstance(p, dict)]
        flow_detail = [
            f"{f.get('from') or 'source'} → {f.get('to') or 'sink'}: {f.get('name', f.get('id'))} | rate={f.get('rate', '')} | {f.get('loop_type', '')}"
            for f in flows[:20] if isinstance(f, dict)
        ]
        loop_list = [f"{l.get('id')}: {l.get('name', '')} ({l.get('type', '')})" for l in loops[:15] if isinstance(l, dict)]
        question = str(req.question).strip()
        sim_ctx = f"\nLatest simulation (if run): {req.sim_summary}" if getattr(req, "sim_summary", None) else ""

        prompt = _get_prompts()["ai_question"].format(
            meta_name=meta.get("name", ""),
            meta_question=meta.get("question", "N/A"),
            stock_list=stock_list,
            param_list=param_list,
            flow_detail=flow_detail,
            loop_list=loop_list,
            sim_ctx=sim_ctx,
            question=question,
        )
        if _rag:
            rag_ctx = _rag.get_rag_context_for_prompt(question, top_k=4)
            if rag_ctx:
                prompt = rag_ctx + "\n\n" + prompt
        out = _ai_json_completion(prompt, _AI_SYSTEM_ROLE)
        if "error" in out:
            return out
        interpretation = out.get("interpretation", "") or "No interpretation generated."
        patch = out.get("suggested_patch")
        if patch and isinstance(patch, dict):
            for f in patch.get("flows") or []:
                if isinstance(f, dict):
                    f["source"] = "ai"
            for p in patch.get("parameters") or []:
                if isinstance(p, dict):
                    p["source"] = "ai"
            for s in patch.get("stocks") or []:
                if isinstance(s, dict):
                    s["source"] = "ai"
        return {"interpretation": interpretation, "suggested_patch": patch}
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}


@app.post("/ai-suggest-scenarios")
def ai_suggest_scenarios(req: AISuggestScenariosRequest) -> Dict[str, Any]:
    """
    AI suggests 3–5 scenario variants (label + param overrides) for the given schema.
    Frontend can pass the result to simulate-batch to run and compare.
    """
    if OpenAI is None:
        return {"error": "AI integration not available."}
    schema = req.schema_data if isinstance(req.schema_data, dict) else {}
    meta = schema.get("meta") or {}
    params = schema.get("parameters") or []
    stocks = schema.get("stocks") or []
    model_name = meta.get("name", "Model")
    param_list = [f"{p.get('id')} ({p.get('name', p.get('id'))}) = {p.get('value')}" for p in params if isinstance(p, dict)]
    stock_list = [f"{s.get('id')} ({s.get('name', '')})" for s in stocks if isinstance(s, dict)]
    brief = f"Optional context: {req.brief}" if req.brief and req.brief.strip() else ""

    prompt = _get_prompts()["ai_suggest_scenarios"].format(
        model_name=model_name,
        param_list=param_list,
        stock_list=stock_list,
        brief=brief,
    )
    if _rag:
        rag_ctx = _rag.get_rag_context_for_prompt(f"{model_name} {brief}".strip() or "scenarios", top_k=3)
        if rag_ctx:
            prompt = rag_ctx + "\n\n" + prompt
    client, model = _get_ai_client()
    if client is None:
        return {"error": "No AI API key set."}
    messages = [{"role": "system", "content": _AI_SYSTEM_ROLE}, {"role": "user", "content": prompt}]
    try:
        resp = client.chat.completions.create(model=model, messages=messages)
        content = (resp.choices[0].message.content or "").strip()
    except Exception as e:
        return {"error": f"AI API error: {str(e)}"}
    extracted = _extract_json_array(content)
    try:
        raw = json.loads(extracted)
        scenarios = raw if isinstance(raw, list) else []
        # Normalize to { label, params }
        out_list = []
        for item in scenarios:
            if isinstance(item, dict) and item.get("label"):
                out_list.append({
                    "label": str(item.get("label", "")),
                    "params": {str(k): float(v) for k, v in (item.get("params") or {}).items() if isinstance(v, (int, float))},
                })
        return {"scenarios": out_list}
    except json.JSONDecodeError:
        return {"error": f"AI did not return valid JSON array: {extracted[:200]}…", "scenarios": []}


@app.post("/ai-compare-runs")
def ai_compare_runs(req: AICompareRunsRequest) -> Dict[str, Any]:
    """
    AI produces a short narrative comparison of multiple runs (e.g. from batch or saved results).
    Request: runs (label + summary and/or final_values), optional question.
    """
    if OpenAI is None:
        return {"error": "AI integration not available."}
    if not req.runs:
        return {"error": "At least one run required."}
    lines = []
    for r in req.runs:
        parts = [f"- {r.label}:"]
        if r.summary:
            parts.append(f"  {r.summary}")
        if r.final_values and isinstance(r.final_values, dict):
            parts.append("  Final values: " + ", ".join(f"{k}={v}" for k, v in list(r.final_values.items())[:10]))
        lines.append(" ".join(parts))
    runs_text = "\n".join(lines)
    question = f"\nUser question: {req.question}" if req.question and str(req.question).strip() else ""

    prompt = _get_prompts()["ai_compare_runs"].format(runs_text=runs_text, question=question)
    narrative = _ai_text_completion(prompt, _AI_SYSTEM_ROLE)
    if not narrative:
        return {"error": "AI did not return a comparison.", "narrative": ""}
    return {"narrative": narrative}


@app.post("/ai-explain-schema")
def ai_explain_schema(req: AIExplainSchemaRequest) -> Dict[str, Any]:
    """
    AI produces a short plain-language explanation of the schema (stocks, flows, loops, causal story).
    """
    if OpenAI is None:
        return {"error": "AI integration not available."}
    schema = req.schema_data if isinstance(req.schema_data, dict) else {}
    meta = schema.get("meta") or {}
    stocks = schema.get("stocks") or []
    params = schema.get("parameters") or []
    flows = schema.get("flows") or []
    loops = schema.get("loops") or []
    meta_name = meta.get("name", "Model")
    meta_question = meta.get("question", "N/A")
    stock_list = [f"{s.get('id')} ({s.get('name', '')})" for s in stocks if isinstance(s, dict)]
    param_list = [f"{p.get('id')}={p.get('value')}" for p in params if isinstance(p, dict)]
    flow_detail = [
        f"{f.get('from') or 'source'} → {f.get('to') or 'sink'}: {f.get('name', f.get('id'))} rate={f.get('rate', '')} ({f.get('loop_type', '')})"
        for f in flows[:25] if isinstance(f, dict)
    ]
    loop_list = [f"{l.get('id')}: {l.get('name', '')} ({l.get('type', '')})" for l in loops[:20] if isinstance(l, dict)]

    prompt = _get_prompts()["ai_explain_schema"].format(
        meta_name=meta_name,
        meta_question=meta_question,
        stock_list=stock_list,
        param_list=param_list,
        flow_detail=flow_detail,
        loop_list=loop_list,
    )
    if _rag:
        rag_ctx = _rag.get_rag_context_for_prompt(meta_question or meta_name, top_k=4)
        if rag_ctx:
            prompt = rag_ctx + "\n\n" + prompt
    explanation = _ai_text_completion(prompt, _AI_SYSTEM_ROLE)
    if not explanation:
        return {"error": "AI did not return an explanation.", "explanation": ""}
    return {"explanation": explanation}


@app.get("/rag-status")
def rag_status() -> Dict[str, Any]:
    """
    Check if RAG is enabled and how many chunks are indexed. Useful for testing.
    """
    enabled = os.environ.get("RAG_ENABLED", "").strip().lower() in ("1", "true", "yes")
    out: Dict[str, Any] = {"rag_enabled": enabled, "indexed_chunks": 0}
    if not enabled:
        return out
    if _rag:
        try:
            _rag._ensure_index()
            meta = getattr(_rag, "_index_meta", None)
            if meta:
                out["indexed_chunks"] = len(meta)
        except Exception as e:
            out["error"] = str(e)
    return out


# Convenience: run with `uvicorn api:app --reload`

