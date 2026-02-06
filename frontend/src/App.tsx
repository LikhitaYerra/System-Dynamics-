import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Schema, Flow, Loop } from "./types";
import {
  fetchCatalog,
  fetchSchema,
  simulate,
  simulateBatch,
  applyPatch,
  askQuestion,
  askSuggestScenarios,
  askCompareRuns,
  askExplainSchema,
  CatalogEntry,
  SimResult,
  AIQuestionResult,
  SuggestedScenario,
  CompareRunInput
} from "./api";
import { Chart } from "./Chart";
import { SchemaDiagram } from "./SchemaDiagram";
import { SchemaDiagramReactFlow } from "./SchemaDiagramReactFlow";
import { SchemaDiagramClusterView } from "./SchemaDiagramClusterView";
import { SchemaDiagramMermaid } from "./SchemaDiagramMermaid";
import { AIAssistantCard } from "./AIAssistantCard";
import { theme } from "./theme";

const SCHEMA_STORAGE_PREFIX = "sdm_schema_";

function getStoredSchema(modelId: string): Schema | null {
  try {
    const raw = localStorage.getItem(SCHEMA_STORAGE_PREFIX + modelId);
    if (!raw) return null;
    const s = JSON.parse(raw) as Schema;
    return s?.stocks && s?.flows && s?.parameters ? s : null;
  } catch {
    return null;
  }
}

function storeSchemaForModel(modelId: string, schema: Schema): void {
  try {
    localStorage.setItem(SCHEMA_STORAGE_PREFIX + modelId, JSON.stringify(schema));
  } catch (_) {}
}

type ButtonProps = { $primary?: boolean };
type ActiveableProps = { $active?: boolean };

const Page = styled.div`
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  background: ${theme.pageBg};
  color: ${theme.text};
  font-family: "DM Sans", system-ui, sans-serif;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  padding: 1rem 2rem;
  border-bottom: 1px solid ${theme.border};
  background: ${theme.surface};
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Title = styled.h1`
  font-family: "Outfit", "DM Sans", sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: ${theme.text};
`;

const Badge = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: ${theme.primaryLight};
  color: ${theme.primary};
  letter-spacing: 0.02em;
`;

const SubTitle = styled.span`
  font-size: 0.875rem;
  color: ${theme.textSecondary};
  font-weight: 400;
  margin-top: 0.2rem;
  display: block;
`;

const Layout = styled.main`
  display: grid;
  grid-template-columns: 340px 1fr 340px;
  gap: 1.25rem;
  padding: 1.25rem 2rem 2rem;
  flex: 1;
  min-height: 0;
`;

const Panel = styled.div`
  background: ${theme.surface};
  border-radius: 12px;
  border: 1px solid ${theme.border};
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const LeftPanel = styled(Panel)`
  overflow-y: auto;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: ${theme.pageBg}; }
  &::-webkit-scrollbar-thumb { background: ${theme.borderStrong}; border-radius: 3px; }
`;

const PanelTitle = styled.h2`
  font-family: "Outfit", "DM Sans", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: ${theme.textSecondary};
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

const Section = styled.div`
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid ${theme.borderMuted};
  &:first-of-type { margin-top: 0; padding-top: 0; border-top: none; }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid ${theme.borderStrong};
  background: ${theme.surface};
  color: ${theme.text};
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:hover { border-color: ${theme.textMuted}; }
  &:focus { outline: none; border-color: ${theme.primary}; box-shadow: 0 0 0 2px ${theme.primaryPale}; }
`;

const SliderLabel = styled.label`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: ${theme.textSecondary};
  margin-top: 0.75rem;
`;

const Slider = styled.input`
  width: 100%;
  margin-top: 0.35rem;
  accent-color: ${theme.primary};
  height: 6px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 4rem;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid ${theme.borderStrong};
  background: ${theme.surface};
  color: ${theme.text};
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus { outline: none; border-color: ${theme.primary}; box-shadow: 0 0 0 2px ${theme.primaryPale}; }
  &::placeholder { color: ${theme.textMuted}; }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid ${theme.borderStrong};
  background: ${theme.surface};
  color: ${theme.text};
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus { outline: none; border-color: ${theme.primary}; box-shadow: 0 0 0 2px ${theme.primaryPale}; }
  &::placeholder { color: ${theme.textMuted}; }
`;

const Small = styled.p`
  font-size: 0.75rem;
  color: ${theme.textSecondary};
  margin: 0.35rem 0 0 0;
  line-height: 1.4;
`;

const Warnings = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: ${theme.warningBg};
  border: 1px solid ${theme.warningBorder};
  font-size: 0.8rem;
  color: ${theme.warningText};
  line-height: 1.45;
`;

const Button = styled.button<ButtonProps>`
  width: 100%;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  margin-top: 0.6rem;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${(p) =>
    p.$primary
      ? `
    border: none;
    background: ${theme.primary};
    color: ${theme.textInverse};
    &:hover:not(:disabled) { background: ${theme.primaryHover}; box-shadow: 0 2px 8px rgba(10, 124, 115, 0.35); }
  `
      : `
    border: 1px solid ${theme.primary};
    background: transparent;
    color: ${theme.primary};
    &:hover:not(:disabled) { background: ${theme.primaryLight}; }
  `}
`;

const FlowCard = styled.button<ActiveableProps>`
  text-align: left;
  width: 100%;
  padding: 0.5rem 0.65rem;
  background: ${(p) => (p.$active ? theme.primaryLight : theme.surfaceAlt)};
  border: 1px solid ${(p) => (p.$active ? theme.primary : theme.border)};
  border-radius: 8px;
  color: ${theme.text};
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  margin-top: 0.4rem;
  transition: background 0.15s, border-color 0.15s;
  &:hover { background: ${theme.pageBg}; border-color: ${theme.primary}; }
  & span.rate { color: ${theme.textSecondary}; font-size: 0.75rem; display: block; margin-top: 0.2rem; }
  & span.ai { font-size: 0.7rem; color: ${theme.ai}; margin-left: 0.35rem; }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: ${theme.textSecondary};
  cursor: pointer;
  &:hover { color: ${theme.text}; }
  input { accent-color: ${theme.primary}; }
`;

const InlineButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
  & button {
    flex: 1;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    border: 1px solid ${theme.borderStrong};
    background: ${theme.surface};
    color: ${theme.textSecondary};
    transition: background 0.15s, border-color 0.15s;
    &:hover { background: ${theme.pageBg}; border-color: ${theme.primary}; color: ${theme.primary}; }
  }
  & button:first-child { background: ${theme.primaryLight}; border-color: ${theme.primary}; color: ${theme.primary}; }
`;

const ChartPanel = styled(Panel)`
  min-height: 420px;
`;

const QuestionBlock = styled.div`
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: ${theme.primaryPale};
  border-left: 3px solid ${theme.primary};
  font-size: 0.8rem;
  color: ${theme.textSecondary};
  line-height: 1.45;
  & strong { color: ${theme.text}; }
`;

const ViewToggle = styled.button<ActiveableProps>`
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${theme.borderStrong};
  background: ${(p) => (p.$active ? theme.primary : "transparent")};
  color: ${(p) => (p.$active ? theme.textInverse : theme.textSecondary)};
  &:hover {
    background: ${(p) => (p.$active ? theme.primaryHover : theme.pageBg)};
    color: ${(p) => (p.$active ? theme.textInverse : theme.text)};
  }
`;

const ExecutiveLayout = styled.main`
  padding: 1.5rem 2rem 2rem;
  max-width: min(2400px, 98vw);
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-sizing: border-box;
`;

const ScenariosAndAssistantRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1.25rem;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  & > * {
    flex: 1;
    min-width: 0;
  }
`;

const SchemaLayoutWithSidebar = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1.25rem;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
`;

const SchemaCodeSidebar = styled.aside`
  flex-shrink: 0;
  width: 340px;
  max-height: 85vh;
  overflow-y: auto;
  background: ${theme.surfaceCode};
  border-radius: 12px;
  padding: 1rem 1.25rem;
  font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace;
  font-size: 12px;
  line-height: 1.55;
  color: ${theme.codeText};
  border: 1px solid ${theme.codeBorder};
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: #0f172a; }
  &::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
`;

const SchemaCodeBlock = styled.pre`
  margin: 0 0 1rem 0;
  white-space: pre-wrap;
  word-break: break-word;
  font: inherit;
  & .comment { color: ${theme.codeComment}; }
  & .keyword { color: ${theme.codeKeyword}; }
  & .var { color: ${theme.codeVar}; }
  & .num { color: ${theme.codeNum}; }
  & .flow-id { color: ${theme.codeFlowId}; }
  & .eq { color: ${theme.codeEq}; }
`;

const EditSectionLabel = styled.div`
  font-size: 11px;
  color: ${theme.codeComment};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 1rem 0 0.5rem 0;
  &:first-of-type { margin-top: 0; }
`;

const EditParamRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
`;

const EditParamId = styled.span`
  min-width: 100px;
  color: ${theme.codeVar};
  font-size: 11px;
  flex-shrink: 0;
`;

const EditFlowRow = styled.div`
  margin-bottom: 0.5rem;
`;

const EditFlowId = styled.div`
  color: ${theme.codeFlowId};
  font-size: 11px;
  margin-bottom: 0.2rem;
`;

const EditInput = styled.input`
  flex: 1;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  background: #0f172a;
  border: 1px solid ${theme.codeBorder};
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  font: inherit;
  font-size: 11px;
  color: ${theme.codeText};
  &::placeholder { color: ${theme.codeComment}; }
  &:focus { outline: none; border-color: ${theme.primary}; }
`;

const ExecutiveCard = styled.div`
  background: ${theme.surface};
  border-radius: 12px;
  border: 1px solid ${theme.border};
  padding: 1.5rem 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow-x: auto;
  overflow-y: visible;
  min-width: 0;
`;

const SubjectScenarioCard = styled.div`
  margin: 0 auto 0;
  padding: 1rem 2rem;
  max-width: min(2400px, 98vw);
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(135deg, ${theme.primaryPale} 0%, ${theme.primaryLight} 100%);
  border-bottom: 1px solid ${theme.primaryBorder};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem 2rem;
  & .subject {
    font-family: "Outfit", "DM Sans", sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: ${theme.primary};
    margin: 0;
    letter-spacing: -0.01em;
  }
  & .scenario {
    flex: 1;
    min-width: 200px;
    font-size: 0.95rem;
    color: ${theme.successText};
    line-height: 1.45;
    margin: 0;
  }
  & .horizon {
    font-size: 0.85rem;
    color: ${theme.primary};
    font-weight: 600;
    margin: 0;
    white-space: nowrap;
  }
`;

const ExecutiveQuestion = styled.p`
  font-family: "Outfit", "DM Sans", sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
`;

const WhatYouSee = styled.p`
  font-size: 0.9rem;
  color: ${theme.textSecondary};
  margin: 0 0 1.25rem 0;
  line-height: 1.5;
`;

const PresetGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const PresetButton = styled.button<ActiveableProps>`
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${theme.borderStrong};
  background: ${(p) => (p.$active ? theme.primary : theme.surface)};
  color: ${(p) => (p.$active ? theme.textInverse : theme.textSecondary)};
  &:hover:not(:disabled) {
    border-color: ${theme.primary};
    background: ${(p) => (p.$active ? theme.primaryHover : theme.primaryPale)};
    color: ${(p) => (p.$active ? theme.textInverse : theme.primary)};
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const SoWhat = styled.div`
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  background: ${theme.primaryPale};
  border: 1px solid ${theme.primaryBorder};
  font-size: 0.95rem;
  color: ${theme.successText};
  line-height: 1.55;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-height: 70vh;
  overflow-y: auto;
  & strong { color: ${theme.primary}; }
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: ${theme.primaryLight}; border-radius: 3px; }
  &::-webkit-scrollbar-thumb { background: ${theme.primaryBorder}; border-radius: 3px; }
`;

const ChartTitle = styled.p`
  font-size: 0.9rem;
  color: ${theme.textSecondary};
  margin: 0 0 0.5rem 0;
`;

const SchemaSection = styled.div`
  margin-bottom: 1.25rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid ${theme.border};
`;

const LoopsSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${theme.borderMuted};
`;

const LoopCard = styled.div<{ $type: "R" | "B" }>`
  margin-bottom: 0.75rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border-left: 4px solid ${(p) => (p.$type === "R" ? theme.loopRBorder : theme.loopBBorder)};
  background: ${(p) => (p.$type === "R" ? theme.loopRBg : theme.loopBBg)};
  font-size: 0.8rem;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  & .loop-name { font-weight: 600; color: ${theme.text}; margin-bottom: 0.25rem; }
  & .loop-desc { color: ${theme.textSecondary}; line-height: 1.4; }
  & .loop-delay { color: ${theme.textMuted}; font-size: 0.7rem; margin-top: 0.25rem; }
`;

const LoopsExplain = styled.div`
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: ${theme.surfaceAlt};
  border: 1px solid ${theme.border};
  font-size: 0.8rem;
  color: ${theme.textSecondary};
  line-height: 1.5;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  & strong { color: ${theme.textSecondary}; }
  & ul { margin: 0.35rem 0 0 1rem; padding: 0; }
  & li { margin-bottom: 0.2rem; }
`;

const TransparencyBlock = styled.div`
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  background: ${theme.surfaceAlt};
  border: 1px solid ${theme.border};
  font-size: 0.8rem;
  color: ${theme.textSecondary};
  line-height: 1.5;
  & strong { color: ${theme.textSecondary}; }
  & .stock-row { margin-top: 0.6rem; }
  & .flow-eq { font-family: ui-monospace, monospace; font-size: 0.75rem; color: ${theme.primary}; margin-left: 0.5rem; }
  & .param-row { display: flex; justify-content: space-between; gap: 0.5rem; margin-top: 0.25rem; }
`;

const InterpretBlock = styled.div`
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  background: ${theme.successBg};
  border: 1px solid ${theme.successBorder};
  font-size: 0.9rem;
  color: ${theme.successText};
  line-height: 1.55;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-height: 70vh;
  overflow-y: auto;
  & strong { color: ${theme.primary}; }
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: ${theme.primaryLight}; border-radius: 3px; }
  &::-webkit-scrollbar-thumb { background: ${theme.primaryBorder}; border-radius: 3px; }
`;

const InterpretToggleBtn = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${theme.primary};
  background: ${theme.primaryPale};
  color: ${theme.primary};
  &:hover { background: ${theme.primaryLight}; }
`;

const GlossaryBlock = styled.details`
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: ${theme.textSecondary};
  & summary { cursor: pointer; color: ${theme.primary}; font-weight: 600; }
  & dl { margin: 0.5rem 0 0 0; padding-left: 0.5rem; }
  & dt { color: ${theme.primary}; margin-top: 0.4rem; }
  & dd { margin-left: 0; margin-top: 0.15rem; line-height: 1.4; }
`;

const LoopFlowChain = styled.div`
  font-size: 0.72rem;
  color: ${theme.textMuted};
  margin-top: 0.35rem;
  font-style: italic;
`;

function App() {
  const [catalog, setCatalog] = useState<Record<string, CatalogEntry>>({});
  const [modelId, setModelId] = useState<string>("aerodyn_lethal_ai");
  const [schema, setSchema] = useState<Schema | null>(null);
  const [horizon, setHorizon] = useState<number>(120);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Compare runs: save current result with a label and overlay
  const [savedRuns, setSavedRuns] = useState<Array<{ label: string; result: SimResult }>>([]);
  const [runLabel, setRunLabel] = useState("");
  const [selectedRunLabels, setSelectedRunLabels] = useState<Set<string>>(new Set());

  // Edit one relationship (deterministic: only that flow changes)
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState("");

  // CEO question: ask in plain language, get interpretation + optional schema addition
  const [ceoQuestion, setCeoQuestion] = useState("");
  const [ceoQuestionBusy, setCeoQuestionBusy] = useState(false);
  const [ceoQuestionResult, setCeoQuestionResult] = useState<AIQuestionResult | null>(null);
  const [ceoQuestionError, setCeoQuestionError] = useState<string | null>(null);
  const [ceoAppliedMessage, setCeoAppliedMessage] = useState<string | null>(null);

  // Exclude mechanisms (run without these flows)
  const [excludedMechanisms, setExcludedMechanisms] = useState<Set<string>>(new Set());

  // Parameter sweep
  const [sweepParamId, setSweepParamId] = useState("");
  const [sweepMin, setSweepMin] = useState(0);
  const [sweepMax, setSweepMax] = useState(1);
  const [sweepSteps, setSweepSteps] = useState(5);
  const [sweepBusy, setSweepBusy] = useState(false);
  const [suggestScenariosBusy, setSuggestScenariosBusy] = useState(false);
  const [suggestScenariosResult, setSuggestScenariosResult] = useState<SuggestedScenario[] | null>(null);
  const [compareAiBusy, setCompareAiBusy] = useState(false);
  const [compareNarrative, setCompareNarrative] = useState<string | null>(null);
  const [schemaExplainBusy, setSchemaExplainBusy] = useState(false);
  const [schemaExplainResult, setSchemaExplainResult] = useState<string | null>(null);
  const [schemaExplainError, setSchemaExplainError] = useState<string | null>(null);
  const [patchApplyBusy, setPatchApplyBusy] = useState(false);
  const [newParamId, setNewParamId] = useState("");
  const [newParamName, setNewParamName] = useState("");
  const [newParamValue, setNewParamValue] = useState("");
  const [customScenarios, setCustomScenarios] = useState<Array<{ label: string; params: Record<string, number> }>>([]);
  const [showAddScenarioForm, setShowAddScenarioForm] = useState(false);
  const [newScenarioLabel, setNewScenarioLabel] = useState("");
  const [newScenarioOverrides, setNewScenarioOverrides] = useState<Array<{ paramId: string; value: string }>>([{ paramId: "", value: "" }]);
  const [patchApplyError, setPatchApplyError] = useState<string | null>(null);

  // Executive view (CEO-friendly: one question, scenario buttons, one chart, "So what?")
  const [viewMode, setViewMode] = useState<"schema" | "graph" | "full">("schema");
  const [executivePresetLabel, setExecutivePresetLabel] = useState<string | null>("Base");

  // All explanation text hidden behind button (Schema + Graph views)
  const [showSchemaExplanation, setShowSchemaExplanation] = useState(false);
  const [showGraphExplanation, setShowGraphExplanation] = useState(false);

  useEffect(() => {
    fetchCatalog().then(setCatalog);
  }, []);

  useEffect(() => {
    if (!modelId) return;
    fetchSchema(modelId).then((s) => {
      const stored = getStoredSchema(modelId);
      const toUse = stored ?? s;
      setSchema(toUse);
      setSchemaExplainResult(null);
      setSchemaExplainError(null);
      setPatchApplyError(null);
      const years = toUse.meta?.horizon_years ?? 10;
      setHorizon(years * 12);
    });
  }, [modelId]);

  useEffect(() => {
    setCustomScenarios([]);
    setShowAddScenarioForm(false);
  }, [modelId]);

  const handleSimulate = async () => {
    if (!schema) return;
    setLoading(true);
    setAiError(null);
    try {
      const exclude = excludedMechanisms.size > 0 ? Array.from(excludedMechanisms) : undefined;
      const res = await simulate(schema, horizon, exclude);
      setSimResult(res);
    } catch (e: any) {
      setAiError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const uniqueMechanisms = (schema?.flows ?? [])
    .map((f) => f.mechanism)
    .filter((m): m is string => Boolean(m?.trim()));
  const mechanismSet = Array.from(new Set(uniqueMechanisms));

  const toggleMechanismExcluded = (mech: string) => {
    setExcludedMechanisms((prev) => {
      const next = new Set(prev);
      if (next.has(mech)) next.delete(mech);
      else next.add(mech);
      return next;
    });
  };

  const handleRunSweep = async () => {
    if (!schema || !sweepParamId || sweepSteps < 2 || sweepSteps > 30) return;
    setSweepBusy(true);
    setAiError(null);
    try {
      const min = Math.min(sweepMin, sweepMax);
      const max = Math.max(sweepMin, sweepMax);
      const steps = Math.max(2, Math.min(30, sweepSteps));
      const values: number[] = [];
      for (let i = 0; i < steps; i++) {
        values.push(min + (max - min) * (i / (steps - 1)));
      }
      const variants = values.map((v) => ({
        label: `${sweepParamId}=${v.toFixed(2)}`,
        params: { [sweepParamId]: v }
      }));
      const { results } = await simulateBatch(schema, horizon, variants);
      const newRuns = results.map((r) => ({
        label: r.label,
        result: { t: r.t, stock_ids: r.stock_ids, Y: r.Y, warnings: r.warnings }
      }));
      setSavedRuns((prev) => [...prev, ...newRuns]);
      setSelectedRunLabels((prev) => {
        const next = new Set(prev);
        results.forEach((r) => next.add(r.label));
        return next;
      });
    } catch (e: any) {
      setAiError(String(e?.message || e));
    } finally {
      setSweepBusy(false);
    }
  };

  const handleSuggestScenarios = async () => {
    if (!schema) return;
    setSuggestScenariosBusy(true);
    setSuggestScenariosResult(null);
    setAiError(null);
    try {
      const out = await askSuggestScenarios(schema);
      if ("error" in out) {
        setAiError(out.error);
      } else {
        setSuggestScenariosResult(out.scenarios?.length ? out.scenarios : null);
      }
    } catch (e: any) {
      setAiError(String(e?.message || e));
    } finally {
      setSuggestScenariosBusy(false);
    }
  };

  const handleRunSuggestedScenarios = async () => {
    if (!schema || !suggestScenariosResult?.length) return;
    setSweepBusy(true);
    setAiError(null);
    try {
      const { results } = await simulateBatch(schema, horizon, suggestScenariosResult);
      const newRuns = results.map((r) => ({
        label: r.label,
        result: { t: r.t, stock_ids: r.stock_ids, Y: r.Y, warnings: r.warnings }
      }));
      setSavedRuns((prev) => [...prev, ...newRuns]);
      setSelectedRunLabels((prev) => {
        const next = new Set(prev);
        results.forEach((r) => next.add(r.label));
        return next;
      });
      if (results[0]) setSimResult(results[0]);
    } catch (e: any) {
      setAiError(String(e?.message || e));
    } finally {
      setSweepBusy(false);
    }
  };

  const handleCompareWithAi = async () => {
    const runs = compareRuns();
    if (runs.length === 0) return;
    setCompareAiBusy(true);
    setCompareNarrative(null);
    setAiError(null);
    try {
      const runInputs: CompareRunInput[] = runs.map((r) => {
        const lastIdx = r.result.Y?.[0]?.length ? r.result.Y[0].length - 1 : 0;
        const final_values: Record<string, number> = {};
        (r.result.stock_ids || []).forEach((id, i) => {
          const row = r.result.Y?.[i];
          if (row && lastIdx < row.length) final_values[id] = row[lastIdx];
        });
        const summary = r.result.stock_ids?.length
          ? `Final: ${(r.result.stock_ids || []).map((id, i) => {
              const row = r.result.Y?.[i];
              const v = row && row.length ? row[row.length - 1] : null;
              return `${id}=${v != null ? v.toFixed(1) : "?"}`;
            }).join(", ")}`
          : undefined;
        return { label: r.label, summary, final_values: Object.keys(final_values).length ? final_values : undefined };
      });
      const out = await askCompareRuns(runInputs);
      if ("error" in out) {
        setAiError(out.error);
      } else {
        setCompareNarrative(out.narrative ?? null);
      }
    } catch (e: any) {
      setAiError(String(e?.message || e));
    } finally {
      setCompareAiBusy(false);
    }
  };

  const handleSaveRun = () => {
    if (!simResult || !runLabel.trim()) return;
    setSavedRuns((prev) => [...prev, { label: runLabel.trim(), result: simResult }]);
    setSelectedRunLabels((prev) => new Set(prev).add(runLabel.trim()));
    setRunLabel("");
  };

  const toggleRunSelection = (label: string) => {
    setSelectedRunLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const compareRuns = (): Array<{ label: string; result: SimResult }> => {
    const list: Array<{ label: string; result: SimResult }> = [];
    if (simResult) list.push({ label: "Current", result: simResult });
    savedRuns.filter((r) => selectedRunLabels.has(r.label)).forEach((r) => list.push(r));
    return list;
  };

  const paramOptions = schema?.parameters ?? [];
  const hasMechanisms = mechanismSet.length > 0;

  // Transparency: for each stock, which flows add to it (to=stock) and which subtract (from=stock)
  const getStockFlows = (s: Schema) => {
    const out: Record<string, { inflows: Flow[]; outflows: Flow[] }> = {};
    (s.stocks ?? []).forEach((st) => {
      out[st.id] = { inflows: [], outflows: [] };
    });
    (s.flows ?? []).forEach((f) => {
      if (f.to && out[f.to]) out[f.to].inflows.push(f);
      if (f.from && out[f.from]) out[f.from].outflows.push(f);
    });
    return out;
  };
  const stockFlows = schema ? getStockFlows(schema) : {};

  // Flow id → display name for loop causal chain
  const flowNameById: Record<string, string> = {};
  schema?.flows?.forEach((f) => { flowNameById[f.id] = f.name || f.id; });

  // Scenario presets for Executive view (plain-language choices)
  const executivePresets: Array<{ label: string; params: Record<string, number> }> =
    modelId === "aerodyn_lethal_ai"
      ? [
          { label: "Base", params: {} },
          { label: "High investment in lethal AI", params: { invest_rate: 2.2 } },
          { label: "More diversification", params: { decay_vis: 0.06, recovery_rate: 2.5 } },
          { label: "Stricter regulation", params: { k_back_reg: 0.18 } },
          { label: "Lower AI performance", params: { ai_performance_sufficient: 0.5 } },
        ]
      : [{ label: "Base", params: {} }];

  const allPresetsForSchemaView = [...executivePresets, ...customScenarios];

  const runPreset = async (preset: { label: string; params: Record<string, number> }) => {
    if (!schema) return;
    setLoading(true);
    setExecutivePresetLabel(preset.label);
    setAiError(null);
    try {
      let schemaToRun = schema;
      if (Object.keys(preset.params).length > 0) {
        const patch = {
          parameters: Object.entries(preset.params).map(([id, value]) => ({ id, value })),
        };
        schemaToRun = await applyPatch(schema, patch);
      }
      const exclude = excludedMechanisms.size > 0 ? Array.from(excludedMechanisms) : undefined;
      const res = await simulate(schemaToRun, horizon, exclude);
      setSimResult(res);
    } catch (e: any) {
      setAiError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddScenarioForm = () => {
    const params = schema?.parameters ?? [];
    setNewScenarioLabel("");
    setNewScenarioOverrides(params.length > 0 ? [{ paramId: params[0].id, value: String(params[0].value) }] : [{ paramId: "", value: "" }]);
    setShowAddScenarioForm(true);
  };

  const handleSaveNewScenario = async () => {
    const label = newScenarioLabel.trim();
    if (!label) return;
    const params: Record<string, number> = {};
    for (const row of newScenarioOverrides) {
      if (!row.paramId) continue;
      const v = parseFloat(row.value);
      if (!Number.isNaN(v)) params[row.paramId] = v;
    }
    const preset = { label, params };
    setCustomScenarios((prev) => [...prev, preset]);
    setShowAddScenarioForm(false);
    setNewScenarioLabel("");
    setNewScenarioOverrides([{ paramId: "", value: "" }]);
    await runPreset(preset);
  };

  const handleAddScenarioOverrideRow = () => {
    const params = schema?.parameters ?? [];
    const firstId = params.length > 0 ? params[0].id : "";
    setNewScenarioOverrides((prev) => [...prev, { paramId: firstId, value: "" }]);
  };

  const handleRemoveScenarioOverrideRow = (index: number) => {
    setNewScenarioOverrides((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateScenarioOverride = (index: number, field: "paramId" | "value", val: string) => {
    setNewScenarioOverrides((prev) => {
      const next = [...prev];
      if (index >= next.length) return prev;
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Display names: prefer schema stock names so all models (AeroDyn, SIR, pipeline) interpret correctly
  const stockDisplayNames: Record<string, string> = useMemo(() => {
    const out: Record<string, string> = {};
    schema?.stocks?.forEach((s) => { out[s.id] = s.name || s.id; });
    // Fallbacks for AeroDyn if schema not yet loaded
    if (Object.keys(out).length === 0) {
      out.LethalAIVis = "Lethal AI visibility";
      out.Backlash = "Public backlash";
      out.Regulation = "Regulatory pressure";
      out.Reputation = "Reputation";
      out.Contracts = "Contract pipeline";
    }
    return out;
  }, [schema?.stocks]);

  const getSoWhat = (): string => {
    if (!simResult || simResult.stock_ids.length === 0) return "";
    const n = simResult.t.length - 1;
    const last = simResult.Y.map((row) => row[n]);
    const start = simResult.Y.map((row) => row[0]);
    const scenarioLabel = executivePresetLabel || "this scenario";
    const parts = simResult.stock_ids.map((id, i) => {
      const v = last[i];
      const initVal = start[i];
      const val = typeof v === "number" ? (Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10) : v;
      const name = stockDisplayNames[id] ?? id;
      let trend = "";
      if (typeof initVal === "number" && typeof v === "number") {
        if (initVal > 0) {
          if (v > initVal * 1.05) trend = " (increased)";
          else if (v < initVal * 0.95) trend = " (decreased)";
          else trend = " (roughly stable)";
        } else if (v > initVal) trend = " (increased)";
        else if (v < initVal) trend = " (decreased)";
      }
      return `${name} ends at ${val}${trend}`;
    });
    return `In the "${scenarioLabel}" scenario, ${parts.join(". ")}.`;
  };

  const getInterpretation = (): string => {
    if (!simResult || simResult.stock_ids.length === 0) return "";
    const n = simResult.t.length - 1;
    const last = simResult.Y.map((row) => row[n]);
    const initial = simResult.Y.map((row) => row[0]);
    const names = simResult.stock_ids.map((id) => stockDisplayNames[id] ?? id);
    const bigRisers: string[] = [];
    const bigFallers: string[] = [];
    const fromZero: string[] = [];
    simResult.stock_ids.forEach((id, i) => {
      const init = initial[i] as number;
      const end = last[i] as number;
      if (typeof init === "number" && typeof end === "number") {
        if (init > 0) {
          const pct = ((end - init) / init) * 100;
          if (pct >= 15) bigRisers.push(names[i]);
          if (pct <= -15) bigFallers.push(names[i]);
        } else if (end > 0) fromZero.push(names[i]);
      }
    });
    const scenarioLabel = executivePresetLabel ? `The "${executivePresetLabel}" run` : "This run";
    let interp = `${scenarioLabel} is fully transparent: same inputs → same outputs. `;
    if (modelId === "aerodyn_lethal_ai" && (bigRisers.length > 0 || bigFallers.length > 0)) {
      if (bigRisers.length > 0) interp += `Notable increases: ${bigRisers.join(", ")}. `;
      if (bigFallers.length > 0) interp += `Notable decreases: ${bigFallers.join(", ")}. `;
      const visUp = bigRisers.some((n) => n.includes("visibility") || n.includes("Visibility"));
      const backUp = bigRisers.some((n) => n.toLowerCase().includes("backlash"));
      const repDown = bigFallers.some((n) => n.toLowerCase().includes("reputation"));
      const contDown = bigFallers.some((n) => n.toLowerCase().includes("contract") || n.toLowerCase().includes("Pipeline"));
      if ((visUp || backUp) && (repDown || contDown))
        interp += "This pattern fits the backlash spiral: more visibility or backlash tends to push regulation up and reputation and contracts down. ";
      interp += "You can trace each change to the flow equations and parameters in the schema.";
    } else if (bigRisers.length > 0 || bigFallers.length > 0 || fromZero.length > 0) {
      if (bigRisers.length > 0) interp += `Notable increases: ${bigRisers.join(", ")}. `;
      if (bigFallers.length > 0) interp += `Notable decreases: ${bigFallers.join(", ")}. `;
      if (fromZero.length > 0) interp += `Came into play: ${fromZero.join(", ")}. `;
      interp += "You can trace each change back to the flow equations and parameters in the schema.";
    } else {
      interp += "Stocks stay relatively stable; try other scenarios or parameter changes to see sensitivity.";
    }
    return interp;
  };

  const handleApplyFlowEdit = async () => {
    if (!schema || !editingFlowId || editingRate.trim() === "") return;
    try {
      const updated = await applyPatch(schema, {
        flows: [{ id: editingFlowId, rate: editingRate.trim() }]
      });
      setSchema(updated);
      storeSchemaForModel(modelId, updated);
      setEditingFlowId(null);
      setEditingRate("");
      setSimResult(null);
    } catch (e: any) {
      setAiError(String(e?.message || e));
    }
  };

  const startEditFlow = (f: Flow) => {
    setEditingFlowId(f.id);
    setEditingRate(f.rate);
  };

  const handleExplainSchema = async () => {
    if (!schema) return;
    setSchemaExplainBusy(true);
    setSchemaExplainResult(null);
    setSchemaExplainError(null);
    try {
      const out = await askExplainSchema(schema);
      if ("error" in out) {
        setSchemaExplainError(out.error);
      } else {
        setSchemaExplainResult(out.explanation ?? null);
      }
    } catch (e: any) {
      setSchemaExplainError(String(e?.message || e));
    } finally {
      setSchemaExplainBusy(false);
    }
  };

  const handleApplyParameterChange = async (paramId: string, value: number) => {
    if (!schema) return;
    setPatchApplyError(null);
    setPatchApplyBusy(true);
    try {
      const updated = await applyPatch(schema, { parameters: [{ id: paramId, value }] });
      setSchema(updated);
      storeSchemaForModel(modelId, updated);
      setSimResult(null);
    } catch (e: any) {
      setPatchApplyError(String(e?.message || e));
    } finally {
      setPatchApplyBusy(false);
    }
  };

  const handleApplyFlowRateChange = async (flowId: string, rate: string) => {
    if (!schema) return;
    setPatchApplyError(null);
    setPatchApplyBusy(true);
    try {
      const updated = await applyPatch(schema, { flows: [{ id: flowId, rate: rate.trim() }] });
      setSchema(updated);
      storeSchemaForModel(modelId, updated);
      setSimResult(null);
    } catch (e: any) {
      setPatchApplyError(String(e?.message || e));
    } finally {
      setPatchApplyBusy(false);
    }
  };

  const handleAddParameter = async () => {
    if (!schema) return;
    const id = newParamId.trim().replace(/\s+/g, "");
    if (!id) return;
    const value = parseFloat(newParamValue);
    if (Number.isNaN(value)) return;
    const name = newParamName.trim() || id;
    setPatchApplyError(null);
    setPatchApplyBusy(true);
    try {
      const updated = await applyPatch(schema, {
        parameters: [{ id, name, value }],
      });
      setSchema(updated);
      storeSchemaForModel(modelId, updated);
      setSimResult(null);
      setNewParamId("");
      setNewParamName("");
      setNewParamValue("");
    } catch (e: any) {
      setPatchApplyError(String(e?.message || e));
    } finally {
      setPatchApplyBusy(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!schema || !ceoQuestion.trim()) return;
    setCeoQuestionBusy(true);
    setCeoQuestionError(null);
    setCeoQuestionResult(null);
    let simSummary: string | undefined;
    if (simResult && simResult.stock_ids?.length && simResult.Y?.length) {
      const lastRow = simResult.Y.map((row) => row[row.length - 1]);
      const parts = simResult.stock_ids.map((id, i) => `${id} ${lastRow[i]?.toFixed(1) ?? "?"}`).join(", ");
      simSummary = `Latest run (${(simResult.t?.[simResult.t.length - 1] / 12)?.toFixed(0) ?? "?"}y): ${parts}.`;
    }
    try {
      const res = await askQuestion(schema, ceoQuestion.trim(), simSummary);
      if ("error" in res) {
        setCeoQuestionError(res.error);
        return;
      }
      setCeoQuestionResult(res);
    } catch (e: any) {
      setCeoQuestionError(String(e?.message || e));
    } finally {
      setCeoQuestionBusy(false);
    }
  };

  const handleApplySuggestedPatch = async () => {
    if (!schema || !ceoQuestionResult?.suggested_patch) return;
    try {
      const updated = await applyPatch(schema, ceoQuestionResult.suggested_patch);
      setSchema(updated);
      storeSchemaForModel(modelId, updated);
      setCeoQuestionResult((prev) => (prev ? { ...prev, suggested_patch: null } : null));
      setSimResult(null);
      setCeoAppliedMessage("Schema updated. New relationships appear in purple in the diagram.");
      setTimeout(() => setCeoAppliedMessage(null), 5000);
    } catch (_) {}
  };

  const handleResetSchemaToOriginal = () => {
    try {
      localStorage.removeItem(SCHEMA_STORAGE_PREFIX + modelId);
    } catch (_) {}
    fetchSchema(modelId).then((s) => {
      setSchema(s);
      setSchemaExplainResult(null);
      setPatchApplyError(null);
      const years = s.meta?.horizon_years ?? 10;
      setHorizon(years * 12);
      setSimResult(null);
    });
  };

  return (
    <Page>
      <Header>
        <Title>System Dynamics Studio</Title>
        <Badge>System Dynamics</Badge>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SubTitle>
            {viewMode === "schema"
              ? "Causal structure: stocks, flows, and feedback loops."
              : viewMode === "graph"
                ? "Simulation over time: run scenarios and compare trajectories."
                : "Schema, controls, chart, and AI in one layout."}
          </SubTitle>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.8rem", color: theme.textSecondary, fontWeight: 500 }}>Model</label>
          <Select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            style={{ width: "auto", minWidth: "180px", margin: 0 }}
          >
            {Object.values(catalog).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
          <ViewToggle $active={viewMode === "schema"} onClick={() => setViewMode("schema")}>
            Schema view
          </ViewToggle>
          <ViewToggle $active={viewMode === "graph"} onClick={() => setViewMode("graph")}>
            Graph view
          </ViewToggle>
        </div>
      </Header>

      {schema && (
        <SubjectScenarioCard>
          <p className="subject">{schema.meta?.name ?? catalog[modelId]?.name ?? "Model"}</p>
          <p className="scenario">{schema.meta?.question ?? "What happens to our business over time under different choices?"}</p>
          <p className="horizon">
            {viewMode === "graph" && executivePresetLabel ? `Scenario: ${executivePresetLabel} · ` : ""}
            Horizon: {schema.meta?.horizon_years ?? Math.round(horizon / 12)} years
          </p>
        </SubjectScenarioCard>
      )}

      {viewMode === "schema" && (
        <ExecutiveLayout>
          <SchemaLayoutWithSidebar>
            {schema && (
              <SchemaCodeSidebar>
                <div style={{ fontSize: 11, color: theme.codeComment, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Variables &amp; equations
                </div>
                <SchemaCodeBlock>
                  <span className="keyword"># State variables (stocks)</span>
                  {(schema.stocks ?? []).map((s) => (
                    <React.Fragment key={s.id}>
                      {"\n"}
                      <span className="var">{s.id}</span>
                      {" = "}
                      <span className="num">{String(s.initial)}</span>
                      {(s.name || s.unit) ? <span className="comment">  # {[s.name, s.unit].filter(Boolean).join(" · ")}</span> : null}
                    </React.Fragment>
                  ))}
                  {"\n\n"}
                  <span className="keyword"># Parameters</span>
                  {(schema.parameters ?? []).map((p) => (
                    <React.Fragment key={p.id}>
                      {"\n"}
                      <span className="var">{p.id}</span>
                      {" = "}
                      <span className="num">{String(p.value)}</span>
                      {(p.name || p.unit) ? <span className="comment">  # {[p.name, p.unit].filter(Boolean).join(" · ")}</span> : null}
                    </React.Fragment>
                  ))}
                  {"\n\n"}
                  <span className="keyword"># Flows (rate equations)</span>
                  {(schema.flows ?? []).map((f) => (
                    <React.Fragment key={f.id}>
                      {"\n"}
                      <span className="flow-id">{f.id}</span>
                      {": "}
                      <span className="eq">{(f.from ?? "source") + " → " + (f.to ?? "sink")}</span>
                      {"\n  rate = "}
                      <span className="var">{f.rate}</span>
                      {(f.name && f.name !== f.id) || f.unit ? <span className="comment">  # {[f.name && f.name !== f.id ? f.name : null, f.unit].filter(Boolean).join(" · ")}</span> : null}
                    </React.Fragment>
                  ))}
                </SchemaCodeBlock>
                <EditSectionLabel>Edit parameters &amp; flow equations</EditSectionLabel>
                {patchApplyError && (
                  <div style={{ fontSize: 10, color: theme.errorText, marginBottom: "0.5rem" }}>{patchApplyError}</div>
                )}
                <Button
                  type="button"
                  onClick={handleResetSchemaToOriginal}
                  disabled={patchApplyBusy}
                  style={{ marginBottom: "0.75rem", fontSize: 11 }}
                >
                  Reset to original (forget my edits)
                </Button>
                {(schema.parameters ?? []).length > 0 ? (
                  <>
                    <EditSectionLabel>Parameters</EditSectionLabel>
                    {(schema.parameters ?? []).map((p) => (
                      <EditParamRow key={p.id}>
                        <EditParamId>{p.id}</EditParamId>
                        <EditInput
                          type="number"
                          step="any"
                          defaultValue={String(p.value)}
                          key={`param-${p.id}-${p.value}`}
                          disabled={patchApplyBusy}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isNaN(v) && v !== p.value) {
                              handleApplyParameterChange(p.id, v);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = parseFloat((e.target as HTMLInputElement).value);
                              if (!Number.isNaN(v) && v !== p.value) {
                                handleApplyParameterChange(p.id, v);
                              }
                            }
                          }}
                        />
                      </EditParamRow>
                    ))}
                    <EditSectionLabel style={{ marginTop: "0.75rem" }}>Add parameter</EditSectionLabel>
                    <EditFlowId>id (camelCase)</EditFlowId>
                    <EditInput
                      placeholder="e.g. new_rate"
                      value={newParamId}
                      onChange={(e) => setNewParamId(e.target.value)}
                      disabled={patchApplyBusy}
                      style={{ marginBottom: "0.35rem" }}
                    />
                    <EditFlowId>name (optional)</EditFlowId>
                    <EditInput
                      placeholder="Human-readable label"
                      value={newParamName}
                      onChange={(e) => setNewParamName(e.target.value)}
                      disabled={patchApplyBusy}
                      style={{ marginBottom: "0.35rem" }}
                    />
                    <EditFlowId>value</EditFlowId>
                    <EditInput
                      type="number"
                      step="any"
                      placeholder="0"
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value)}
                      disabled={patchApplyBusy}
                      onKeyDown={(e) => e.key === "Enter" && handleAddParameter()}
                      style={{ marginBottom: "0.5rem" }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddParameter}
                      disabled={patchApplyBusy || !newParamId.trim() || newParamValue === "" || Number.isNaN(parseFloat(newParamValue))}
                      style={{ fontSize: 11 }}
                    >
                      Add parameter
                    </Button>
                  </>
                ) : schema.stocks?.length > 0 ? (
                  <>
                    <EditSectionLabel>Parameters</EditSectionLabel>
                    <EditSectionLabel style={{ marginTop: "0.75rem" }}>Add parameter</EditSectionLabel>
                    <EditFlowId>id (camelCase)</EditFlowId>
                    <EditInput
                      placeholder="e.g. new_rate"
                      value={newParamId}
                      onChange={(e) => setNewParamId(e.target.value)}
                      disabled={patchApplyBusy}
                      style={{ marginBottom: "0.35rem" }}
                    />
                    <EditFlowId>name (optional)</EditFlowId>
                    <EditInput
                      placeholder="Human-readable label"
                      value={newParamName}
                      onChange={(e) => setNewParamName(e.target.value)}
                      disabled={patchApplyBusy}
                      style={{ marginBottom: "0.35rem" }}
                    />
                    <EditFlowId>value</EditFlowId>
                    <EditInput
                      type="number"
                      step="any"
                      placeholder="0"
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value)}
                      disabled={patchApplyBusy}
                      onKeyDown={(e) => e.key === "Enter" && handleAddParameter()}
                      style={{ marginBottom: "0.5rem" }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddParameter}
                      disabled={patchApplyBusy || !newParamId.trim() || newParamValue === "" || Number.isNaN(parseFloat(newParamValue))}
                      style={{ fontSize: 11 }}
                    >
                      Add parameter
                    </Button>
                  </>
                ) : null}
                {(schema.flows ?? []).length > 0 && (
                  <>
                    <EditSectionLabel>Flow rate equations</EditSectionLabel>
                    {(schema.flows ?? []).map((f) => (
                      <EditFlowRow key={f.id}>
                        <EditFlowId>{f.id}</EditFlowId>
                        <EditInput
                          type="text"
                          defaultValue={f.rate}
                          key={`flow-${f.id}-${f.rate}`}
                          disabled={patchApplyBusy}
                          placeholder="e.g. k * Stock"
                          onBlur={(e) => {
                            const next = (e.target as HTMLInputElement).value.trim();
                            if (next !== f.rate) {
                              handleApplyFlowRateChange(f.id, next);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const next = (e.target as HTMLInputElement).value.trim();
                              if (next !== f.rate) {
                                handleApplyFlowRateChange(f.id, next);
                              }
                            }
                          }}
                        />
                      </EditFlowRow>
                    ))}
                  </>
                )}
              </SchemaCodeSidebar>
            )}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {schema && (
                <ExecutiveCard>
              <PanelTitle style={{ marginTop: 0 }}>Schema (transparent &amp; interpretable)</PanelTitle>
              <InterpretToggleBtn type="button" onClick={() => setShowSchemaExplanation((v) => !v)}>
                {showSchemaExplanation ? "Hide explanation" : "Show explanation"}
              </InterpretToggleBtn>
              {showSchemaExplanation && (
                <div style={{ marginTop: "1rem", maxHeight: "70vh", overflowY: "auto", paddingRight: "0.5rem", whiteSpace: "normal", wordWrap: "break-word" }}>
                  <Small style={{ marginBottom: "0.35rem", color: theme.textSecondary, display: "block" }}>Deterministic: same inputs → same outputs. Every result is traceable to flow equations and parameters.</Small>
                  {schema.meta?.name && (
                    <Small style={{ marginBottom: "0.25rem", color: theme.textSecondary }}>{schema.meta.name}</Small>
                  )}
                  {schema.meta?.question && (
                    <QuestionBlock style={{ marginTop: "0.5rem" }}>
                      <strong>Strategic question</strong><br />
                      {schema.meta.question}
                    </QuestionBlock>
                  )}
                  <Small style={{ display: "block", marginTop: "0.5rem" }}>
                    {schema.stocks?.length ?? 0} stocks, {schema.flows?.length ?? 0} flows
                    {schema.loops && schema.loops.length > 0 ? `, ${schema.loops.length} loops (R & B).` : "."}
                  </Small>
                  <PanelTitle style={{ marginTop: "1rem" }}>AI summary</PanelTitle>
                  <Small style={{ display: "block", marginBottom: "0.5rem", color: theme.textSecondary }}>Plain-language explanation of the model (stocks, flows, loops, causal story).</Small>
                  <Button type="button" onClick={handleExplainSchema} disabled={schemaExplainBusy || !schema} style={{ marginBottom: "0.75rem" }}>
                    {schemaExplainBusy ? "Generating…" : schemaExplainResult ? "Regenerate AI explanation" : "Get AI explanation"}
                  </Button>
                  {schemaExplainError && (
                    <div style={{ marginBottom: "0.5rem", padding: "0.5rem", background: theme.errorBg, color: theme.errorText, borderRadius: 6, fontSize: "0.85rem" }}>
                      {schemaExplainError}
                    </div>
                  )}
                  {schemaExplainResult && (
                    <div style={{ marginBottom: "1rem", padding: "0.75rem", background: theme.surfaceAlt, borderLeft: `4px solid ${theme.primary}`, borderRadius: 6, fontSize: "0.9rem", lineHeight: 1.5 }}>
                      <strong style={{ color: theme.primary }}>AI explanation:</strong>
                      <p style={{ margin: "0.5rem 0 0 0" }}>{schemaExplainResult}</p>
                    </div>
                  )}
                  {schema.loops && schema.loops.length > 0 && (
                    <>
                      <PanelTitle style={{ marginTop: "1rem" }}>Reinforcing & balancing loops</PanelTitle>
                      <LoopsExplain>
                        <strong>What are these loops?</strong>
                        <ul>
                          <li><strong>🔴 Reinforcing (R):</strong> Feedback that <em>amplifies</em> change. A small change leads to more change in the same direction — e.g. more visibility → more backlash → more regulation. Can be a vicious cycle (things get worse) or a virtuous one (things get better).</li>
                          <li><strong>🟢 Balancing (B):</strong> Feedback that <em>dampens</em> change. The system responds in a way that counteracts the initial change and moves toward equilibrium — e.g. backlash decays as attention fades, or reputation recovers with time. They limit how far the reinforcing loops can push the system.</li>
                        </ul>
                        <strong>In this model:</strong> The R loops (backlash spiral, reputation erosion, etc.) drive the story; the B loops (decay, recovery, diversification) determine how fast things correct and how much they cap the damage.
                      </LoopsExplain>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {(schema.loops as Loop[])
                          .filter((l) => l.type === "R")
                          .map((l) => (
                            <LoopCard key={l.id} $type="R">
                              <div className="loop-name">🔴 {l.name} ({l.id})</div>
                              <div className="loop-desc">{l.description}</div>
                              {l.flow_ids?.length > 0 && (
                                <LoopFlowChain>
                                  Causal chain: {(l.flow_ids as string[]).map((fid) => flowNameById[fid] || fid).join(" → ")}
                                </LoopFlowChain>
                              )}
                              {l.delay && <div className="loop-delay">Delay: {l.delay}</div>}
                            </LoopCard>
                          ))}
                        {(schema.loops as Loop[])
                          .filter((l) => l.type === "B")
                          .map((l) => (
                            <LoopCard key={l.id} $type="B">
                              <div className="loop-name">🟢 {l.name} ({l.id})</div>
                              <div className="loop-desc">{l.description}</div>
                              {l.flow_ids?.length > 0 && (
                                <LoopFlowChain>
                                  Causal chain: {(l.flow_ids as string[]).map((fid) => flowNameById[fid] || fid).join(" → ")}
                                </LoopFlowChain>
                              )}
                              {l.delay && <div className="loop-delay">Delay: {l.delay}</div>}
                            </LoopCard>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {schema.stocks && schema.stocks.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <PanelTitle style={{ marginTop: 0, marginBottom: 0 }}>Schema diagram (Mermaid)</PanelTitle>
                  </div>
                  <SchemaDiagramMermaid schema={schema} width={2000} height={620} />
                </>
              )}
              </ExecutiveCard>
              )}
              <ScenariosAndAssistantRow>
                {schema && (
                  <ExecutiveCard>
                    <PanelTitle>Scenarios</PanelTitle>
                    <Small style={{ display: "block", marginBottom: "0.5rem" }}>Run a scenario to see outcome below, or ask AI to suggest scenarios.</Small>
                    <PresetGrid>
                      {allPresetsForSchemaView.map((preset) => (
                        <PresetButton
                          key={preset.label}
                          $active={executivePresetLabel === preset.label}
                          onClick={() => runPreset(preset)}
                          disabled={loading || !schema}
                        >
                          {loading && executivePresetLabel === preset.label ? "Running…" : preset.label}
                        </PresetButton>
                      ))}
                    </PresetGrid>
                    {!showAddScenarioForm ? (
                      <Button type="button" onClick={handleOpenAddScenarioForm} disabled={!schema} style={{ marginRight: "0.5rem", marginTop: "0.25rem" }}>
                        Add new scenario
                      </Button>
                    ) : (
                      <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: theme.primaryPale, borderRadius: 8, border: `1px solid ${theme.primaryBorder}` }}>
                        <Small style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>New scenario</Small>
                        <input
                          type="text"
                          placeholder="Scenario name"
                          value={newScenarioLabel}
                          onChange={(e) => setNewScenarioLabel(e.target.value)}
                          style={{ width: "100%", marginBottom: "0.5rem", padding: "0.4rem 0.5rem", borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: "0.9rem", boxSizing: "border-box" }}
                        />
                        {(schema?.parameters ?? []).length > 0 && (
                          <>
                            <Small style={{ display: "block", marginBottom: "0.35rem" }}>Parameter overrides (optional)</Small>
                            {newScenarioOverrides.map((row, i) => (
                              <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
                                <select
                                  value={row.paramId}
                                  onChange={(e) => handleUpdateScenarioOverride(i, "paramId", e.target.value)}
                                  style={{ flex: "1 1 0", minWidth: 0, padding: "0.35rem", borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: "0.85rem" }}
                                >
                                  <option value="">—</option>
                                  {(schema?.parameters ?? []).map((p) => (
                                    <option key={p.id} value={p.id}>{p.id}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Value"
                                  value={row.value}
                                  onChange={(e) => handleUpdateScenarioOverride(i, "value", e.target.value)}
                                  style={{ width: 80, padding: "0.35rem", borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: "0.85rem" }}
                                />
                                {newScenarioOverrides.length > 1 ? (
                                  <button type="button" onClick={() => handleRemoveScenarioOverrideRow(i)} style={{ padding: "0.2rem 0.4rem", fontSize: 11, cursor: "pointer" }}>Remove</button>
                                ) : null}
                              </div>
                            ))}
                            <button type="button" onClick={handleAddScenarioOverrideRow} style={{ fontSize: 11, marginBottom: "0.5rem" }}>+ Add override</button>
                          </>
                        )}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Button type="button" onClick={handleSaveNewScenario} disabled={!newScenarioLabel.trim()}>
                            Save & run
                          </Button>
                          <button type="button" onClick={() => { setShowAddScenarioForm(false); setNewScenarioLabel(""); setNewScenarioOverrides([{ paramId: "", value: "" }]); }} style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <Button onClick={handleSuggestScenarios} disabled={suggestScenariosBusy || !schema} style={{ marginTop: "0.5rem" }}>
                      {suggestScenariosBusy ? "Asking AI…" : "Suggest scenarios with AI"}
                    </Button>
                    {suggestScenariosResult && suggestScenariosResult.length > 0 && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <Small>Suggested: {suggestScenariosResult.map((s) => s.label).join(", ")}</Small>
                        <Button onClick={handleRunSuggestedScenarios} disabled={sweepBusy} style={{ marginTop: "0.25rem" }}>
                          Run these scenarios
                        </Button>
                      </div>
                    )}
                    {simResult && simResult.stock_ids?.length > 0 && (
                      <div style={{ marginTop: "1rem" }}>
                        <PanelTitle style={{ marginTop: 0, fontSize: "0.95rem" }}>Last run: {executivePresetLabel || "Scenario"}</PanelTitle>
                        <Chart result={simResult} stockNames={stockDisplayNames} />
                      </div>
                    )}
                  </ExecutiveCard>
                )}
                {!schema && (
                  <ExecutiveCard>
                    <SubTitle style={{ color: theme.textMuted, textAlign: "center", padding: "2rem 0" }}>
                      Select a model in the header to load its schema.
                    </SubTitle>
                  </ExecutiveCard>
                )}
                <AIAssistantCard
                  showCeoSection={!!schema}
                  schema={schema}
                  ceoQuestion={ceoQuestion}
                  setCeoQuestion={(v) => { setCeoQuestion(v); setCeoQuestionError(null); setCeoQuestionResult(null); }}
                  ceoQuestionBusy={ceoQuestionBusy}
                  ceoQuestionError={ceoQuestionError}
                  ceoQuestionResult={ceoQuestionResult}
                  onAskQuestion={handleAskQuestion}
                  onApplySuggestedPatch={handleApplySuggestedPatch}
                  onDismissPatch={() => setCeoQuestionResult((prev) => (prev ? { ...prev, suggested_patch: null } : null))}
                  ceoAppliedMessage={ceoAppliedMessage}
                />
              </ScenariosAndAssistantRow>
            </div>
          </SchemaLayoutWithSidebar>
        </ExecutiveLayout>
      )}
      {viewMode === "graph" && (
        <ExecutiveLayout>
          <ScenariosAndAssistantRow>
          <ExecutiveCard>
            <ExecutiveQuestion>
              {schema?.meta?.question ?? "What happens to our business over time under different choices?"}
            </ExecutiveQuestion>
            <WhatYouSee>
              Each line in the chart is one factor over time. Pick a scenario below (horizon: {Math.round(horizon / 12)} years).
            </WhatYouSee>
            <PresetGrid>
              {executivePresets.map((preset) => (
                <PresetButton
                  key={preset.label}
                  $active={executivePresetLabel === preset.label}
                  onClick={() => runPreset(preset)}
                  disabled={loading || !schema}
                >
                  {loading && executivePresetLabel === preset.label ? "Running…" : preset.label}
                </PresetButton>
              ))}
            </PresetGrid>
            <InterpretToggleBtn type="button" onClick={() => setShowGraphExplanation((v) => !v)}>
              {showGraphExplanation ? "Hide explanation" : "Show explanation"}
            </InterpretToggleBtn>
            {showGraphExplanation && (
              <>
                <SoWhat>
                  <strong>So what?</strong>{" "}
                  {simResult && simResult.stock_ids.length > 0
                    ? getSoWhat()
                    : "Run a scenario above to see how each factor ends and whether it increased, decreased, or stayed stable."}
                </SoWhat>
                <InterpretBlock>
                  <strong>Interpretation (explainable &amp; transparent):</strong>{" "}
                  {simResult && simResult.stock_ids.length > 0
                    ? getInterpretation()
                    : "After you run a scenario, you’ll see a short summary of notable increases and decreases and how they trace back to the model’s flow equations and parameters."}
                </InterpretBlock>
              </>
            )}
          </ExecutiveCard>
            <AIAssistantCard
              showCeoSection={!!schema}
              schema={schema}
              ceoQuestion={ceoQuestion}
              setCeoQuestion={(v) => { setCeoQuestion(v); setCeoQuestionError(null); setCeoQuestionResult(null); }}
              ceoQuestionBusy={ceoQuestionBusy}
              ceoQuestionError={ceoQuestionError}
              ceoQuestionResult={ceoQuestionResult}
              onAskQuestion={handleAskQuestion}
              onApplySuggestedPatch={handleApplySuggestedPatch}
              onDismissPatch={() => setCeoQuestionResult((prev) => (prev ? { ...prev, suggested_patch: null } : null))}
              ceoAppliedMessage={ceoAppliedMessage}
            />
          </ScenariosAndAssistantRow>
          <ExecutiveCard>
            <ChartTitle>How these factors change over time</ChartTitle>
            {simResult ? (
              <>
                <Chart result={simResult} stockNames={stockDisplayNames} />
                {simResult.warnings && simResult.warnings.length > 0 && (
                  <Warnings style={{ marginTop: "1rem" }}>
                    <strong>Note:</strong> {simResult.warnings.join(" ")}
                  </Warnings>
                )}
              </>
            ) : (
              <SubTitle style={{ padding: "2rem 0", color: theme.textMuted, textAlign: "center" }}>
                Click a scenario above to see the chart.
              </SubTitle>
            )}
          </ExecutiveCard>
        </ExecutiveLayout>
      )}
      {viewMode === "full" && (
      <Layout>
        <LeftPanel>
          {schema && (
            <SchemaSection>
              <PanelTitle>Schema</PanelTitle>
              {schema.meta?.name && (
                <Small style={{ marginBottom: "0.25rem", color: theme.textSecondary }}>{schema.meta.name}</Small>
              )}
              {schema.meta?.question && (
                <QuestionBlock>
                  <strong>Strategic question</strong><br />
                  {schema.meta.question}
                </QuestionBlock>
              )}
              <Small style={{ display: "block", marginTop: "0.5rem" }}>
                {schema.stocks?.length ?? 0} stocks, {schema.flows?.length ?? 0} flows
                {schema.loops && schema.loops.length > 0 ? `, ${schema.loops.length} loops` : ""}.
              </Small>
              {schema.stocks && schema.stocks.length > 0 && (
                <>
                  <PanelTitle style={{ marginTop: "0.75rem" }}>Schema diagram</PanelTitle>
                  <SchemaDiagram schema={schema} width={2000} height={620} />
                </>
              )}
              {schema.loops && schema.loops.length > 0 && (
                <>
                  <PanelTitle style={{ marginTop: "0.75rem" }}>Reinforcing & balancing loops</PanelTitle>
                  <LoopsExplain>
                    <strong>What are these loops?</strong>
                    <ul>
                      <li><strong>🔴 Reinforcing (R):</strong> Feedback that <em>amplifies</em> change. A small change leads to more change in the same direction — e.g. more visibility → more backlash → more regulation. Can be a vicious cycle (things get worse) or a virtuous one (things get better).</li>
                      <li><strong>🟢 Balancing (B):</strong> Feedback that <em>dampens</em> change. The system responds in a way that counteracts the initial change and moves toward equilibrium — e.g. backlash decays as attention fades, or reputation recovers with time. They limit how far the reinforcing loops can push the system.</li>
                    </ul>
                    <strong>In this model:</strong> The R loops (backlash spiral, reputation erosion, etc.) drive the story; the B loops (decay, recovery, diversification) determine how fast things correct and how much they cap the damage.
                  </LoopsExplain>
                  {(schema.loops as Loop[])
                    .filter((l) => l.type === "R")
                    .map((l) => (
                      <LoopCard key={l.id} $type="R">
                        <div className="loop-name">🔴 {l.name} ({l.id})</div>
                        <div className="loop-desc">{l.description}</div>
                        {l.flow_ids?.length > 0 && (
                          <LoopFlowChain>
                            Causal chain: {(l.flow_ids as string[]).map((fid) => flowNameById[fid] || fid).join(" → ")}
                          </LoopFlowChain>
                        )}
                        {l.delay && <div className="loop-delay">Delay: {l.delay}</div>}
                      </LoopCard>
                    ))}
                  {(schema.loops as Loop[])
                    .filter((l) => l.type === "B")
                    .map((l) => (
                      <LoopCard key={l.id} $type="B">
                        <div className="loop-name">🟢 {l.name} ({l.id})</div>
                        <div className="loop-desc">{l.description}</div>
                        {l.flow_ids?.length > 0 && (
                          <LoopFlowChain>
                            Causal chain: {(l.flow_ids as string[]).map((fid) => flowNameById[fid] || fid).join(" → ")}
                          </LoopFlowChain>
                        )}
                        {l.delay && <div className="loop-delay">Delay: {l.delay}</div>}
                      </LoopCard>
                    ))}
                </>
              )}

              <TransparencyBlock>
                <PanelTitle style={{ marginTop: 0 }}>Transparency: how each variable changes</PanelTitle>
                <Small>Each stock changes by (inflows − outflows). Flows use the rate equations below. Same inputs → same outputs (deterministic).</Small>
                {schema.stocks?.map((st) => {
                  const { inflows, outflows } = stockFlows[st.id] ?? { inflows: [], outflows: [] };
                  return (
                    <div key={st.id} className="stock-row">
                      <strong>{st.name}</strong> (initial: {st.initial})
                      {inflows.length > 0 && (
                        <div style={{ marginTop: "0.2rem" }}>
                          In: {inflows.map((f, i) => (
                            <span key={f.id}>{i > 0 && ", "}<span className="flow-eq">{f.name}: {f.rate}</span></span>
                          ))}
                        </div>
                      )}
                      {outflows.length > 0 && (
                        <div style={{ marginTop: "0.2rem" }}>
                          Out: {outflows.map((f, i) => (
                            <span key={f.id}>{i > 0 && ", "}<span className="flow-eq">{f.name}: {f.rate}</span></span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <PanelTitle style={{ marginTop: "0.75rem" }}>Parameters (current values)</PanelTitle>
                {schema.parameters?.map((p) => (
                  <div key={p.id} className="param-row">
                    <span>{p.name ?? p.id}</span>
                    <span className="flow-eq">{p.value}</span>
                  </div>
                ))}
                <Small style={{ marginTop: "0.5rem", display: "block" }}>
                  <strong>Provenance:</strong> &quot;Task force&quot; = expert-defined (trusted). &quot;AI&quot; = model-suggested — review before relying.
                </Small>
              </TransparencyBlock>

              <GlossaryBlock>
                <summary>How to read this model (glossary)</summary>
                <dl>
                  <dt>Stock</dt><dd>An accumulation (e.g. Reputation, Backlash). It only changes via flows.</dd>
                  <dt>Flow</dt><dd>A rate that adds to or subtracts from a stock. Described by an equation (rate) using parameters and stock levels.</dd>
                  <dt>Reinforcing loop (R)</dt><dd>Feedback that amplifies change in one direction (vicious or virtuous cycle).</dd>
                  <dt>Balancing loop (B)</dt><dd>Feedback that dampens change and pushes toward equilibrium.</dd>
                  <dt>Delay</dt><dd>Time for an effect to show up; captured in the equations, not as a separate lag.</dd>
                  <dt>Deterministic</dt><dd>Same schema and parameters always give the same simulation result — fully reproducible and auditable.</dd>
                </dl>
              </GlossaryBlock>
            </SchemaSection>
          )}

          <PanelTitle>Model & horizon</PanelTitle>
          <Select value={modelId} onChange={(e) => setModelId(e.target.value)}>
            {Object.values(catalog).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>

          <SliderLabel>
            <span>Time horizon</span>
            <span>{Math.round(horizon / 12)} years</span>
          </SliderLabel>
          <Slider
            type="range"
            min={12}
            max={240}
            step={12}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          />

          <Section>
            <PanelTitle>Scenario presets</PanelTitle>
            <Small style={{ display: "block", marginBottom: "0.35rem" }}>One-click scenarios (same as Graph view).</Small>
            <PresetGrid style={{ marginTop: 0 }}>
              {executivePresets.map((preset) => (
                <PresetButton
                  key={preset.label}
                  $active={executivePresetLabel === preset.label}
                  onClick={() => runPreset(preset)}
                  disabled={loading || !schema}
                >
                  {loading && executivePresetLabel === preset.label ? "Running…" : preset.label}
                </PresetButton>
              ))}
            </PresetGrid>
          </Section>

          {hasMechanisms && (
            <Section>
              <PanelTitle>Exclude mechanisms</PanelTitle>
              <Small>Run without these feedback loops (same schema, fewer flows).</Small>
              {mechanismSet.map((mech) => (
                <CheckboxLabel key={mech}>
                  <input
                    type="checkbox"
                    checked={excludedMechanisms.has(mech)}
                    onChange={() => toggleMechanismExcluded(mech)}
                  />
                  Exclude &quot;{mech}&quot;
                </CheckboxLabel>
              ))}
            </Section>
          )}

          <Button $primary onClick={handleSimulate} disabled={loading || !schema}>
            {loading ? "Simulating…" : "Run scenario"}
          </Button>

          <Section>
          <PanelTitle>Parameter sweep</PanelTitle>
          <Small>Run multiple scenarios (one param from min to max); results added to compare.</Small>
          <Select
            value={sweepParamId}
            onChange={(e) => setSweepParamId(e.target.value)}
            style={{ marginTop: "0.25rem" }}
          >
            <option value="">Select parameter</option>
            {paramOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </Select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
            <div>
              <Small>Min</Small>
              <Input type="number" value={sweepMin} onChange={(e) => setSweepMin(Number(e.target.value))} step="0.1" />
            </div>
            <div>
              <Small>Max</Small>
              <Input type="number" value={sweepMax} onChange={(e) => setSweepMax(Number(e.target.value))} step="0.1" />
            </div>
          </div>
          <SliderLabel>
            <span>Steps (2–30)</span>
            <span>{sweepSteps}</span>
          </SliderLabel>
          <Slider
            type="range"
            min={2}
            max={30}
            value={sweepSteps}
            onChange={(e) => setSweepSteps(Number(e.target.value))}
          />
          <Button onClick={handleRunSweep} disabled={sweepBusy || !schema || !sweepParamId}>
            {sweepBusy ? "Running sweep…" : "Run sweep"}
          </Button>
          <Small style={{ marginTop: "0.75rem" }}>Or let AI suggest scenarios:</Small>
          <Button onClick={handleSuggestScenarios} disabled={suggestScenariosBusy || !schema} style={{ marginTop: "0.25rem" }}>
            {suggestScenariosBusy ? "Asking AI…" : "Suggest scenarios with AI"}
          </Button>
          {suggestScenariosResult && suggestScenariosResult.length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <Small>Suggested: {suggestScenariosResult.map((s) => s.label).join(", ")}</Small>
              <Button onClick={handleRunSuggestedScenarios} disabled={sweepBusy} style={{ marginTop: "0.25rem" }}>
                Run these scenarios
              </Button>
            </div>
          )}
          </Section>

          <Section>
          <PanelTitle>Compare runs</PanelTitle>
          <Input
            placeholder="Label (e.g. Base)"
            value={runLabel}
            onChange={(e) => setRunLabel(e.target.value)}
          />
          <Button onClick={handleSaveRun} disabled={!simResult || !runLabel.trim()}>
            Save current run as
          </Button>
          {savedRuns.length > 0 && (
            <>
              <Small style={{ marginTop: "0.5rem" }}>Show in chart:</Small>
              {savedRuns.map((r) => (
                <CheckboxLabel key={r.label}>
                  <input
                    type="checkbox"
                    checked={selectedRunLabels.has(r.label)}
                    onChange={() => toggleRunSelection(r.label)}
                  />
                  {r.label}
                </CheckboxLabel>
              ))}
            </>
          )}
          {compareRuns().length > 0 && (
            <Button onClick={handleCompareWithAi} disabled={compareAiBusy} style={{ marginTop: "0.5rem" }}>
              {compareAiBusy ? "Comparing…" : "Compare with AI"}
            </Button>
          )}
          {compareNarrative && (
            <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: theme.aiBg, borderRadius: 8, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
              {compareNarrative}
            </div>
          )}
          </Section>

          <Section>
          <PanelTitle>Edit one relationship</PanelTitle>
          <Small>Only the selected flow is changed; rest of model unchanged.</Small>
          {schema?.flows?.map((f) => (
            <div key={f.id}>
              {editingFlowId === f.id ? (
                <>
                  <Input
                    value={editingRate}
                    onChange={(e) => setEditingRate(e.target.value)}
                    placeholder="rate expression"
                  />
                  <InlineButtonGroup>
                    <button type="button" onClick={handleApplyFlowEdit}>Apply</button>
                    <button type="button" onClick={() => { setEditingFlowId(null); setEditingRate(""); }}>Cancel</button>
                  </InlineButtonGroup>
                </>
              ) : (
                <FlowCard type="button" $active={editingFlowId === f.id} onClick={() => startEditFlow(f)}>
                  {f.id}{f.source === "ai" ? <span className="ai">AI</span> : null}
                  <span className="rate">{f.rate}</span>
                </FlowCard>
              )}
            </div>
          ))}
          </Section>
        </LeftPanel>

        <ChartPanel>
          <PanelTitle>Stocks over time</PanelTitle>
          {(() => {
            const runs = compareRuns();
            if (simResult || runs.length > 0) {
              return (
                <>
                  {runs.length > 0 && <Chart compare={runs} stockNames={stockDisplayNames} />}
                  {simResult?.warnings && simResult.warnings.length > 0 && (
                    <Warnings>
                      <strong>Warnings (divergence):</strong>
                      <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                        {simResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </Warnings>
                  )}
                  {simResult && (
                    <>
                      <InterpretToggleBtn type="button" style={{ marginTop: "1rem" }} onClick={() => setShowInterpretation((v) => !v)}>
                        {showGraphExplanation ? "Hide explanation" : "Show explanation"}
                      </InterpretToggleBtn>
                      {showGraphExplanation && (
                        <>
                          <SoWhat>
                            <strong>So what?</strong> {getSoWhat()}
                          </SoWhat>
                          <InterpretBlock>
                            <strong>Interpretation (explainable &amp; transparent):</strong> {getInterpretation()}
                          </InterpretBlock>
                        </>
                      )}
                    </>
                  )}
                </>
              );
            }
            return <SubTitle style={{ padding: "1rem 0", color: theme.textMuted }}>Run a scenario and optionally save runs to compare trajectories.</SubTitle>;
          })()}
        </ChartPanel>

        <AIAssistantCard
          showCeoSection={!!schema}
          schema={schema}
          ceoQuestion={ceoQuestion}
          setCeoQuestion={(v) => { setCeoQuestion(v); setCeoQuestionError(null); setCeoQuestionResult(null); }}
          ceoQuestionBusy={ceoQuestionBusy}
          ceoQuestionError={ceoQuestionError}
          ceoQuestionResult={ceoQuestionResult}
          onAskQuestion={handleAskQuestion}
          onApplySuggestedPatch={handleApplySuggestedPatch}
          onDismissPatch={() => setCeoQuestionResult((prev) => (prev ? { ...prev, suggested_patch: null } : null))}
          ceoAppliedMessage={ceoAppliedMessage}
        />
      </Layout>
      )}
    </Page>
  );
}

export default App;
