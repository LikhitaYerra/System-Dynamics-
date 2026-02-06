import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Schema, Stock, Flow } from "./types";
import { theme } from "./theme";

const W = 2000;
const H = 620;
const NODE_RX = 160;
const NODE_RY = 56;
const PAD = 140;
const STROKE_R = theme.loopRBorder;
const STROKE_B = theme.primary;
const STROKE_NEUTRAL = theme.textMuted;
const STROKE_AI = theme.ai;
const FILL_NODE = theme.surface;
const FILL_SOURCE_SINK = theme.primaryPale;
const GRID_COLOR = theme.chartGrid;

// Wrap long text into lines (break at space when possible)
function wrapText(text: string, maxChars: number): string[] {
  if (!text || text.length <= maxChars) return [text];
  const lines: string[] = [];
  let rest = text.trim();
  while (rest.length > maxChars) {
    const chunk = rest.slice(0, maxChars + 1);
    const lastSpace = chunk.lastIndexOf(" ");
    const breakAt = lastSpace > maxChars * 0.5 ? lastSpace : maxChars;
    lines.push(rest.slice(0, breakAt).trim());
    rest = rest.slice(breakAt).trim();
  }
  if (rest) lines.push(rest);
  return lines;
}

/** Shorten flow name for diagram to reduce clutter (e.g. "Visibility → backlash" → "Vis → Backlash"). */
function shortFlowLabel(name: string, maxLen: number = 28): string {
  if (!name || name.length <= maxLen) return name;
  const m = name.replace(/\s*→\s*/g, " → ").trim();
  const abbrev: Record<string, string> = {
    "Visibility": "Vis", "visibility": "Vis", "Backlash": "Backlash", "backlash": "backlash",
    "Regulation": "Reg", "regulation": "Reg", "Reputation": "Rep", "reputation": "Rep",
    "Contracts": "Cont", "contracts": "Cont", "Investment": "Invest", "diversification": "divers.",
    "decay": "decay", "recovery": "recovery", "policy": "policy", "media": "media",
    "transparency": "transp.", "compliance": "compl.", "fulfilled": "fulfill.",
    "constrains": "constr.", "fulfillment": "fulfill.",
  };
  let out = m;
  Object.entries(abbrev).forEach(([full, short]) => {
    out = out.replace(new RegExp(full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), short);
  });
  return out.length > maxLen ? out.slice(0, maxLen - 1) + "…" : out;
}

/** Simple two-row layout: top row (first 3), bottom row (rest). Even X spacing, fewer crossings. */
function getInitialPositions(stocks: Stock[], _flows: Flow[]): Record<string, { x: number; y: number }> {
  const n = stocks.length;
  const row0Count = Math.min(3, n);
  const row1Count = n - row0Count;
  const centerX = W / 2;
  const row0Y = H * 0.26;
  const row1Y = H * 0.74;
  const maxSpan0 = 1100;
  const maxSpan1 = row1Count <= 1 ? 0 : 880;
  const spacing0 = row0Count <= 1 ? 0 : maxSpan0 / (row0Count - 1);
  const spacing1 = row1Count <= 1 ? 0 : maxSpan1 / (row1Count - 1);
  const startX0 = centerX - (row0Count - 1) * (spacing0 / 2);
  const startX1 = centerX - (row1Count - 1) * (spacing1 / 2);
  const map = new Map<string, { x: number; y: number }>();
  stocks.forEach((s, i) => {
    if (i < row0Count) {
      const x = row0Count === 1 ? centerX : startX0 + i * spacing0;
      map.set(s.id, { x, y: row0Y });
    } else {
      const j = i - row0Count;
      const x = row1Count === 1 ? centerX : startX1 + j * spacing1;
      map.set(s.id, { x, y: row1Y });
    }
  });
  const rec: Record<string, { x: number; y: number }> = {};
  map.forEach((v, k) => { rec[k] = v; });
  return rec;
}

const ROW0_Y = H * 0.26;
const ROW1_Y = H * 0.74;
const SOURCE_POS = { x: PAD, y: ROW0_Y };
const SINK_POS = { x: W - PAD, y: ROW1_Y };

function ellipseRadiusAlong(ux: number, uy: number, rx: number, ry: number): number {
  const u = Math.hypot(ux, uy) || 1;
  const uxN = ux / u;
  const uyN = uy / u;
  return 1 / Math.sqrt((uxN * uxN) / (rx * rx) + (uyN * uyN) / (ry * ry));
}

function boxEdgePoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromBox: boolean,
  toBox: boolean
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const offOut = fromBox ? ellipseRadiusAlong(ux, uy, NODE_RX, NODE_RY) + 6 : 18;
  const offIn = toBox ? ellipseRadiusAlong(-ux, -uy, NODE_RX, NODE_RY) + 6 : 18;
  return {
    start: { x: from.x + ux * offOut, y: from.y + uy * offOut },
    end: { x: to.x - ux * offIn, y: to.y - uy * offIn },
  };
}

function curvedPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  curveIndex: number
): string {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const perpX = -dy;
  const perpY = dx;
  const len = Math.hypot(perpX, perpY) || 1;
  const offset = (curveIndex - 0.5) * 68;
  const cpx = midX + (perpX / len) * offset;
  const cpy = midY + (perpY / len) * offset;
  return `M ${start.x} ${start.y} Q ${cpx} ${cpy} ${end.x} ${end.y}`;
}

function clientToSVG(svg: SVGSVGElement | null, clientX: number, clientY: number): { x: number; y: number } | null {
  if (!svg) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const s = pt.matrixTransform(ctm.inverse());
  return { x: s.x, y: s.y };
}

export const SchemaDiagram: React.FC<{ schema: Schema; width?: number; height?: number }> = ({
  schema,
  width = 2000,
  height = 620,
}) => {
  const stocks = schema.stocks ?? [];
  const flows = schema.flows ?? [];
  const stockIds = stocks.map((s) => s.id).join(",");

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    stocks.length ? getInitialPositions(stocks, flows) : {}
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (stocks.length) setPositions(getInitialPositions(stocks, flows));
  }, [stockIds]);

  const getPos = useCallback(
    (id: string) => positions[id] ?? { x: W / 2, y: H / 2 },
    [positions]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, stockId: string) => {
      e.preventDefault();
      const pt = clientToSVG(svgRef.current, e.clientX, e.clientY);
      if (!pt) return;
      const center = getPos(stockId);
      setDragging(stockId);
      setDragOffset({ x: pt.x - center.x, y: pt.y - center.y });
    },
    [getPos]
  );

  useEffect(() => {
    if (!dragging || dragOffset === null) return;
    const onMove = (e: MouseEvent) => {
      const pt = clientToSVG(svgRef.current, e.clientX, e.clientY);
      if (!pt) return;
      setPositions((prev) => ({
        ...prev,
        [dragging]: { x: pt.x - dragOffset.x, y: pt.y - dragOffset.y },
      }));
    };
    const onUp = () => {
      setDragging(null);
      setDragOffset(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragOffset]);

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

  const flowSegments: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    flow: Flow;
    fromBox: boolean;
    toBox: boolean;
    curveIndex: number;
  }> = [];
  const pairKey = (a: string, b: string) => `${a ?? "src"}-${b ?? "snk"}`;
  const pairCount: Record<string, number> = {};
  flows.forEach((flow) => {
    const fr = flow.from ?? null;
    const to = flow.to ?? null;
    const fromPos = fr ? getPos(fr) : SOURCE_POS;
    const toPos = to ? getPos(to) : SINK_POS;
    const key = pairKey(fr ?? "src", to ?? "snk");
    pairCount[key] = (pairCount[key] ?? 0) + 1;
    flowSegments.push({
      from: fromPos,
      to: toPos,
      flow,
      fromBox: !!fr,
      toBox: !!to,
      curveIndex: pairCount[key] - 1,
    });
  });

  return (
    <div style={{ position: "relative" }}>
      <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.8rem", color: theme.textSecondary }}>
        Nodes = stocks (variables). Arrows = flows. Arrow colour = loop type (R amplifies, B dampens). +/− = link polarity.
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        style={{
          maxWidth: width,
          display: "block",
          margin: "0.5rem 0",
          cursor: dragging ? "grabbing" : "default",
          userSelect: "none",
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={GRID_COLOR} strokeWidth="0.8" />
          </pattern>
          <marker id="arr-r" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={STROKE_R} />
          </marker>
          <marker id="arr-b" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={STROKE_B} />
          </marker>
          <marker id="arr-n" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={STROKE_NEUTRAL} />
          </marker>
          <marker id="arr-ai" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={STROKE_AI} />
          </marker>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill={theme.surfaceAlt} />
        <rect x={0} y={0} width={W} height={H} fill="url(#grid)" />

        <ellipse
          cx={SOURCE_POS.x}
          cy={SOURCE_POS.y}
          rx="36"
          ry="28"
          fill={FILL_SOURCE_SINK}
          stroke={theme.borderStrong}
          strokeWidth="2"
        />
        <text x={SOURCE_POS.x} y={SOURCE_POS.y + 2} textAnchor="middle" fontSize="16" fill={theme.textSecondary} fontWeight="500">
          source
        </text>
        <ellipse
          cx={SINK_POS.x}
          cy={SINK_POS.y}
          rx="36"
          ry="28"
          fill={FILL_SOURCE_SINK}
          stroke={theme.borderStrong}
          strokeWidth="2"
        />
        <text x={SINK_POS.x} y={SINK_POS.y + 2} textAnchor="middle" fontSize="16" fill={theme.textSecondary} fontWeight="500">
          sink
        </text>

        {flowSegments.map((seg, idx) => {
          const { start, end } = boxEdgePoint(seg.from, seg.to, seg.fromBox, seg.toBox);
          const pathD = curvedPath(start, end, seg.curveIndex);
          const isAI = seg.flow.source === "ai";
          const loopType = seg.flow.loop_type || "";
          const stroke = isAI ? STROKE_AI : (loopType === "R" ? STROKE_R : loopType === "B" ? STROKE_B : STROKE_NEUTRAL);
          const markerEnd = isAI ? "url(#arr-ai)" : (loopType === "R" ? "url(#arr-r)" : loopType === "B" ? "url(#arr-b)" : "url(#arr-n)");
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const polarityX = end.x - ux * 22;
          const polarityY = end.y - uy * 22;
          const polarity = seg.toBox ? "+" : "−";
          return (
            <g key={`flow-${seg.flow.id}-${idx}`}>
              <path
                d={pathD}
                fill="none"
                stroke={stroke}
                strokeWidth="3.2"
                strokeDasharray={isAI ? "8 5" : undefined}
                markerEnd={markerEnd}
                strokeLinecap="round"
              />
              <text
                x={polarityX}
                y={polarityY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="20"
                fill={stroke}
                fontWeight="700"
                pointerEvents="none"
              >
                {polarity}
              </text>
              <text
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="15"
                fill={theme.textSecondary}
                fontWeight="500"
                pointerEvents="none"
              >
                {shortFlowLabel(seg.flow.name || seg.flow.id)}
              </text>
            </g>
          );
        })}

        {stocks.map((s) => {
          const pos = getPos(s.id);
          const isDragging = dragging === s.id;
          return (
            <g
              key={s.id}
              style={{ cursor: "grab" }}
              onMouseDown={(e) => handleMouseDown(e, s.id)}
            >
              <ellipse
                cx={pos.x}
                cy={pos.y}
                rx={NODE_RX}
                ry={NODE_RY}
                fill={FILL_NODE}
                stroke={theme.primary}
                strokeWidth={isDragging ? 3 : 2.5}
                style={{ pointerEvents: "all" }}
              />
              <text
                x={pos.x}
                y={pos.y - 12}
                textAnchor="middle"
                fontSize="18"
                fontWeight="700"
                fill={theme.primary}
                pointerEvents="none"
              >
                {s.id === "LethalAIVis" ? "Lethal AI Vis" : s.id}
              </text>
              <text x={pos.x} y={pos.y + 14} textAnchor="middle" fontSize="14" fill={theme.textSecondary} pointerEvents="none">
                {(() => {
                  const name = s.name || s.id;
                  const lines = wrapText(name, 24);
                  return lines.map((line, i) => (
                    <tspan key={i} x={pos.x} dy={i === 0 ? 0 : 20}>
                      {line}
                    </tspan>
                  ));
                })()}
              </text>
            </g>
          );
        })}

        <g transform={`translate(${W / 2}, ${H - 36})`}>
          <text x="-280" y={0} textAnchor="middle" fontSize="15" fill={STROKE_R} fontWeight="600">
            R
          </text>
          <text x="-258" y={0} textAnchor="start" fontSize="13" fill={theme.textSecondary}>
            Reinforcing (amplifies)
          </text>
          <text x="-80" y={0} textAnchor="middle" fontSize="15" fill={STROKE_B} fontWeight="600">
            B
          </text>
          <text x="-58" y={0} textAnchor="start" fontSize="13" fill={theme.textSecondary}>
            Balancing (dampens)
          </text>
          <text x="120" y={0} textAnchor="start" fontSize="13" fill={theme.textMuted}>
            + / − = link polarity (same/opposite direction)
          </text>
          <text x="380" y={0} textAnchor="start" fontSize="13" fill={STROKE_AI} fontWeight="600">
            Purple dashed = AI-suggested
          </text>
        </g>
      </svg>
    </div>
  );
};
