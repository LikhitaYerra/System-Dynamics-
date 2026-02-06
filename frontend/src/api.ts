import axios from "axios";
import { Schema } from "./types";

const API_BASE = "http://localhost:8000";

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
}

export interface SimResult {
  t: number[];
  stock_ids: string[];
  Y: number[][];
  warnings?: string[] | null;
}

export async function fetchCatalog(): Promise<Record<string, CatalogEntry>> {
  const res = await axios.get(`${API_BASE}/catalog`);
  return res.data;
}

export async function fetchSchema(modelId: string): Promise<Schema> {
  const res = await axios.get(`${API_BASE}/schema/${modelId}`);
  return res.data;
}

export async function simulate(
  schema: Schema,
  horizon_months: number,
  exclude_mechanisms?: string[]
): Promise<SimResult> {
  const res = await axios.post(`${API_BASE}/simulate`, {
    schema,
    horizon_months,
    exclude_mechanisms: exclude_mechanisms ?? null
  });
  return res.data;
}

export interface BatchVariant {
  label: string;
  params: Record<string, number>;
}

export interface BatchResult extends SimResult {
  label: string;
}

export async function simulateBatch(
  schema: Schema,
  horizon_months: number,
  variants: BatchVariant[]
): Promise<{ results: BatchResult[] }> {
  const res = await axios.post(`${API_BASE}/simulate-batch`, {
    schema,
    horizon_months,
    variants: variants.map((v) => ({ label: v.label, params: v.params }))
  });
  return res.data;
}

export async function applyPatch(schema: Schema, patch: Record<string, unknown>): Promise<Schema> {
  const res = await axios.post(`${API_BASE}/schema/apply-patch`, { schema, patch });
  return res.data as Schema;
}

export async function draftSchemaWithAI(brief: string): Promise<Schema | { error: string }> {
  const res = await axios.post(`${API_BASE}/ai-schema`, { brief });
  return res.data as Schema | { error: string };
}

export async function suggestFlowWithAI(
  schema: Schema,
  instruction: string
): Promise<Record<string, unknown> | { error: string }> {
  const res = await axios.post(`${API_BASE}/ai-suggest-flow`, { schema, instruction });
  return res.data as Record<string, unknown> | { error: string };
}

export interface AIQuestionResult {
  interpretation: string;
  suggested_patch?: Record<string, unknown> | null;
}

export async function askQuestion(
  schema: Schema,
  question: string,
  simSummary?: string
): Promise<AIQuestionResult | { error: string }> {
  const res = await axios.post(`${API_BASE}/ai-question`, {
    schema,
    question,
    sim_summary: simSummary ?? null
  });
  return res.data as AIQuestionResult | { error: string };
}

export interface SuggestedScenario {
  label: string;
  params: Record<string, number>;
}

export async function askSuggestScenarios(
  schema: Schema,
  brief?: string
): Promise<{ scenarios: SuggestedScenario[] } | { error: string; scenarios?: SuggestedScenario[] }> {
  const res = await axios.post(`${API_BASE}/ai-suggest-scenarios`, {
    schema,
    brief: brief ?? null
  });
  return res.data as { scenarios: SuggestedScenario[] } | { error: string; scenarios?: SuggestedScenario[] };
}

export interface CompareRunInput {
  label: string;
  summary?: string;
  final_values?: Record<string, number>;
}

export async function askCompareRuns(
  runs: CompareRunInput[],
  question?: string
): Promise<{ narrative: string } | { error: string; narrative?: string }> {
  const res = await axios.post(`${API_BASE}/ai-compare-runs`, {
    runs,
    question: question ?? null
  });
  return res.data as { narrative: string } | { error: string; narrative?: string };
}

export async function askExplainSchema(schema: Schema): Promise<{ explanation: string } | { error: string; explanation?: string }> {
  const res = await axios.post(`${API_BASE}/ai-explain-schema`, { schema });
  return res.data as { explanation: string } | { error: string; explanation?: string };
}

