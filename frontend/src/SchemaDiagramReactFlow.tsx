import React, { useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Schema, Stock, Flow } from "./types";
import { theme } from "./theme";

const STROKE_R = theme.loopRBorder;
const STROKE_B = theme.primary;
const STROKE_NEUTRAL = theme.textMuted;
const STROKE_AI = theme.ai;

function shortLabel(name: string, maxLen: number = 20): string {
  if (!name || name.length <= maxLen) return name;
  const abbrev: Record<string, string> = {
    Visibility: "Vis", visibility: "Vis", Backlash: "Backlash", Regulation: "Reg",
    Reputation: "Rep", Contracts: "Cont", Investment: "Invest", diversification: "divers.",
    decay: "decay", recovery: "recovery", transparency: "transp.", compliance: "compl.",
  };
  let out = name;
  Object.entries(abbrev).forEach(([full, short]) => {
    out = out.replace(new RegExp(full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), short);
  });
  return out.length > maxLen ? out.slice(0, maxLen - 1) + "…" : out;
}

function StockNode({ data }: NodeProps<{ label: string; sublabel?: string }>) {
  return (
    <>
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
      <div
        style={{
          padding: "12px 28px",
          borderRadius: "999px",
          background: theme.surface,
          border: `3px solid ${theme.primary}`,
          minWidth: 110,
          textAlign: "center",
          fontSize: 16,
          fontWeight: 700,
          color: theme.primary,
        }}
      >
        <div>{data.label}</div>
        {data.sublabel && (
          <div style={{ fontSize: 13, fontWeight: 400, color: theme.textSecondary, marginTop: 4 }}>
            {data.sublabel}
          </div>
        )}
      </div>
    </>
  );
}

function SourceSinkNode({ data }: NodeProps<{ label: string }>) {
  return (
    <>
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
      <div
        style={{
          padding: "10px 22px",
          borderRadius: "999px",
          background: theme.primaryPale,
          border: `2px solid ${theme.borderStrong}`,
          fontSize: 15,
          fontWeight: 500,
          color: theme.textSecondary,
        }}
      >
        {data.label}
      </div>
    </>
  );
}

const nodeTypes = { stock: StockNode, sourceSink: SourceSinkNode };

function buildNodesAndEdges(
  stocks: Stock[],
  flows: Flow[],
  width: number,
  height: number
): { nodes: Node[]; edges: Edge[] } {
  const row0Y = height * 0.26;
  const row1Y = height * 0.74;
  const pad = 120;
  const centerX = width / 2;
  const n = stocks.length;
  const row0Count = Math.min(3, n);
  const row1Count = n - row0Count;
  const maxSpan0 = 1000;
  const maxSpan1 = row1Count <= 1 ? 0 : 820;
  const spacing0 = row0Count <= 1 ? 0 : maxSpan0 / Math.max(1, row0Count - 1);
  const spacing1 = row1Count <= 1 ? 0 : maxSpan1 / Math.max(1, row1Count - 1);
  const startX0 = centerX - (row0Count - 1) * (spacing0 / 2);
  const startX1 = centerX - (row1Count - 1) * (spacing1 / 2);

  const nodes: Node[] = [];
  nodes.push({
    id: "source",
    type: "sourceSink",
    position: { x: pad, y: row0Y - 28 },
    data: { label: "source" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });
  nodes.push({
    id: "sink",
    type: "sourceSink",
    position: { x: width - pad - 100, y: row1Y - 28 },
    data: { label: "sink" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  stocks.forEach((s, i) => {
    const isRow0 = i < row0Count;
    const x = isRow0
      ? (row0Count === 1 ? centerX : startX0 + i * spacing0) - 80
      : (row1Count === 1 ? centerX : startX1 + (i - row0Count) * spacing1) - 80;
    const y = isRow0 ? row0Y - 32 : row1Y - 32;
    const displayLabel = (s.name && s.name.length <= 28) ? s.name : (s.id === "LethalAIVis" ? "Lethal AI Vis" : s.id);
    nodes.push({
      id: s.id,
      type: "stock",
      position: { x, y },
      data: {
        label: displayLabel,
        sublabel: displayLabel === s.name ? undefined : s.name,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  const edgeCount: Record<string, number> = {};
  const edges: Edge[] = [];
  flows.forEach((flow) => {
    const from = flow.from ?? "source";
    const to = flow.to ?? "sink";
    const key = `${from}-${to}`;
    const idx = (edgeCount[key] ?? 0);
    edgeCount[key] = idx + 1;
    const isAI = flow.source === "ai";
    const loopType = flow.loop_type || "";
    const stroke = isAI ? STROKE_AI : (loopType === "R" ? STROKE_R : loopType === "B" ? STROKE_B : STROKE_NEUTRAL);
    const polarity = to === "sink" || !to ? "−" : "+";
    edges.push({
      id: `${flow.id}-${idx}`,
      source: from === null || from === undefined ? "source" : from,
      target: to === null || to === undefined ? "sink" : to,
      sourceHandle: "right",
      targetHandle: "left",
      label: `${shortLabel(flow.name || flow.id)} ${polarity}`,
      type: "smoothstep",
      style: { stroke, strokeWidth: 3, strokeDasharray: isAI ? "8 5" : undefined },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
      labelStyle: { fontSize: 13, fontWeight: 500, fill: theme.textSecondary },
      labelBgStyle: { fill: theme.surfaceAlt, fillOpacity: 0.98 },
      labelBgPadding: [6, 5] as [number, number],
      labelBgBorderRadius: 6,
      labelBgBorder: `1px solid ${theme.border}`,
    });
  });

  return { nodes, edges };
}

export const SchemaDiagramReactFlow: React.FC<{
  schema: Schema;
  width?: number;
  height?: number;
}> = ({ schema, width = 2000, height = 620 }) => {
  const stocks = schema.stocks ?? [];
  const flows = schema.flows ?? [];

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(stocks, flows, width, height),
    [stocks, flows, width, height]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (stocks.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          background: theme.surfaceAlt,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.textMuted,
          fontSize: 14,
        }}
      >
        No stocks in schema
      </div>
    );
  }

  return (
    <div style={{ width, height, position: "relative", border: `1px solid ${theme.border}`, borderRadius: 8, overflow: "hidden" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: "smoothstep" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={theme.chartGrid} gap={40} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 12,
          color: theme.textSecondary,
          display: "flex",
          gap: 20,
          pointerEvents: "none",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span><span style={{ color: STROKE_R, fontWeight: 600 }}>R</span> Reinforcing (amplifies)</span>
        <span><span style={{ color: STROKE_B, fontWeight: 600 }}>B</span> Balancing (dampens)</span>
        <span>+ / − = link polarity</span>
        <span style={{ color: STROKE_AI, fontWeight: 600 }}>Purple = AI-suggested</span>
      </div>
    </div>
  );
};
