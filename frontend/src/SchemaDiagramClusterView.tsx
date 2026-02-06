import React, { useMemo } from "react";
import type { Schema, Flow, Cluster } from "./types";

import { theme } from "./theme";

const W = 2000;
const H = 620;

const CLUSTER_STROKE = theme.text;
const FUNCTION_STROKE = theme.textSecondary;
const ARROW_STROKE = theme.primary;

/** Assign each flow to the cluster that "owns" it: cluster containing flow.from, or flow.to if from is source. */
function flowsByCluster(
  flows: Flow[],
  clusterStockIds: Record<string, Set<string>>
): Record<string, Flow[]> {
  const out: Record<string, Flow[]> = {};
  flows.forEach((f) => {
    const from = f.from ?? null;
    const to = f.to ?? null;
    let cid: string | null = null;
    if (from) {
      for (const [id, ids] of Object.entries(clusterStockIds)) {
        if (ids.has(from)) {
          cid = id;
          break;
        }
      }
    }
    if (cid == null && to) {
      for (const [id, ids] of Object.entries(clusterStockIds)) {
        if (ids.has(to)) {
          cid = id;
          break;
        }
      }
    }
    if (cid) {
      if (!out[cid]) out[cid] = [];
      out[cid].push(f);
    }
  });
  return out;
}

interface ClusterBox {
  cluster: Cluster;
  x: number;
  y: number;
  width: number;
  height: number;
  functions: Flow[];
}

function buildLayout(
  schema: Schema,
  width: number,
  height: number
): { clusterBoxes: ClusterBox[]; clusterStockIds: Record<string, Set<string>> } {
  const clusters = schema.clusters ?? [];
  const schemaFlows = schema.flows ?? [];

  const clusterStockIds: Record<string, Set<string>> = {};
  clusters.forEach((c) => {
    clusterStockIds[c.id] = new Set(c.stock_ids);
  });

  const flowsPerCluster = flowsByCluster(schemaFlows, clusterStockIds);

  const pad = 100;
  const c1W = 380;
  const c2W = 520;
  const c3W = 520;

  const clusterBoxes: ClusterBox[] = [];
  if (clusters.length >= 3) {
    const [c1, c2, c3] = clusters;
    const funcs1 = flowsPerCluster[c1.id] ?? [];
    const funcs2 = flowsPerCluster[c2.id] ?? [];
    const funcs3 = flowsPerCluster[c3.id] ?? [];
    const rowH = 42;
    const h1 = Math.max(180, funcs1.length * rowH + 72);
    const h2 = Math.max(140, funcs2.length * rowH + 72);
    const h3 = Math.max(140, funcs3.length * rowH + 72);

    clusterBoxes.push({
      cluster: c1,
      x: pad,
      y: (height - h1) / 2,
      width: c1W,
      height: h1,
      functions: funcs1,
    });
    clusterBoxes.push({
      cluster: c2,
      x: pad + c1W + 60,
      y: pad,
      width: c2W,
      height: h2,
      functions: funcs2,
    });
    clusterBoxes.push({
      cluster: c3,
      x: pad + c1W + 60,
      y: height - pad - h3,
      width: c3W,
      height: h3,
      functions: funcs3,
    });
  } else {
    const stocks = schema.stocks ?? [];
    const n = stocks.length;
    const g1 = Math.min(2, n);
    const g2 = n - g1;
    const defaultClusters: Cluster[] = [
      { id: "C1", name: "Component 1", stock_ids: stocks.slice(0, g1).map((s) => s.id) },
      { id: "C2", name: "Component 2", stock_ids: g2 > 0 ? stocks.slice(g1, g1 + 1).map((s) => s.id) : [] },
      { id: "C3", name: "Component 3", stock_ids: g2 > 1 ? stocks.slice(g1 + 1).map((s) => s.id) : [] },
    ].filter((c) => c.stock_ids.length > 0);
    defaultClusters.forEach((c) => { clusterStockIds[c.id] = new Set(c.stock_ids); });
    const flowsPer = flowsByCluster(schemaFlows, clusterStockIds);
    defaultClusters.forEach((c, i) => {
      const funcs = flowsPer[c.id] ?? [];
      const h = Math.max(120, funcs.length * 42 + 72);
      const rect =
        i === 0
          ? { x: pad, y: (height - h) / 2, w: c1W, h }
          : i === 1
            ? { x: pad + c1W + 60, y: pad, w: c2W, h }
            : { x: pad + c1W + 60, y: height - pad - h, w: c3W, h };
      clusterBoxes.push({
        cluster: c,
        x: rect.x,
        y: rect.y,
        width: rect.w,
        height: rect.h,
        functions: funcs,
      });
    });
  }

  return { clusterBoxes, clusterStockIds };
}

export const SchemaDiagramClusterView: React.FC<{
  schema: Schema;
  width?: number;
  height?: number;
}> = ({ schema, width = W, height = H }) => {
  const stocks = schema.stocks ?? [];
  const flows = schema.flows ?? [];

  const { clusterBoxes, clusterStockIds } = useMemo(
    () => buildLayout(schema, width, height),
    [schema, width, height]
  );

  const clusterCenter = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    clusterBoxes.forEach((b) => {
      out[b.cluster.id] = {
        x: b.x + b.width / 2,
        y: b.y + b.height / 2,
      };
    });
    return out;
  }, [clusterBoxes]);

  const betweenClusterFlows = useMemo(() => {
    const list: Array<{ flow: Flow; fromC: string; toC: string }> = [];
    flows.forEach((f) => {
      const from = f.from ?? null;
      const to = f.to ?? null;
      if (!from || !to) return;
      let fromC: string | null = null;
      let toC: string | null = null;
      for (const [cid, ids] of Object.entries(clusterStockIds)) {
        if (ids.has(from)) fromC = cid;
        if (ids.has(to)) toC = cid;
      }
      if (fromC && toC && fromC !== toC) list.push({ flow: f, fromC, toC });
    });
    return list;
  }, [flows, clusterStockIds]);

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
    <div style={{ position: "relative" }}>
      <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.8rem", color: theme.textSecondary }}>
        Each cluster is a component; inside it are the <strong>functions</strong> of that component (flows).
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{
          maxWidth: width,
          display: "block",
          margin: "0.5rem 0",
          background: theme.surfaceAlt,
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="cluster-arr" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={ARROW_STROKE} />
          </marker>
        </defs>

        {clusterBoxes.map((box) => (
          <g key={box.cluster.id}>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill="none"
              stroke={CLUSTER_STROKE}
              strokeWidth={2.5}
            />
            <text
              x={box.x + box.width / 2}
              y={box.y + 28}
              textAnchor="middle"
              fontSize={16}
              fontWeight={700}
              fill={theme.text}
            >
              {box.cluster.name}
            </text>
            <text
              x={box.x + box.width / 2}
              y={box.y + 50}
              textAnchor="middle"
              fontSize={12}
              fill={theme.textMuted}
            >
              Functions:
            </text>
            {box.functions.length === 0 ? (
              <text
                x={box.x + box.width / 2}
                y={box.y + 88}
                textAnchor="middle"
                fontSize={13}
                fill={theme.borderStrong}
              >
                —
              </text>
            ) : (
              box.functions.map((flow, i) => {
                const label = flow.name || flow.id;
                const short = label.length > 32 ? label.slice(0, 30) + "…" : label;
                const fy = box.y + 72 + (i + 1) * 42;
                return (
                  <g key={flow.id}>
                    <rect
                      x={box.x + 16}
                      y={fy - 18}
                      width={box.width - 32}
                      height={36}
                      fill={theme.surface}
                      stroke={FUNCTION_STROKE}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                    />
                    <text
                      x={box.x + box.width / 2}
                      y={fy + 2}
                      textAnchor="middle"
                      fontSize={13}
                      fill={theme.textSecondary}
                    >
                      {short}
                    </text>
                  </g>
                );
              })
            )}
          </g>
        ))}

        {betweenClusterFlows.map(({ flow, fromC, toC }) => {
          const from = clusterCenter[fromC];
          const to = clusterCenter[toC];
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const box = clusterBoxes.find((b) => b.cluster.id === fromC);
          const boxTo = clusterBoxes.find((b) => b.cluster.id === toC);
          const offFrom = box ? Math.max(box.width, box.height) / 2 + 8 : 20;
          const offTo = boxTo ? Math.max(boxTo.width, boxTo.height) / 2 + 8 : 20;
          const start = { x: from.x + ux * offFrom, y: from.y + uy * offFrom };
          const end = { x: to.x - ux * offTo, y: to.y - uy * offTo };
          const pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
          return (
            <path
              key={flow.id}
              d={pathD}
              fill="none"
              stroke={ARROW_STROKE}
              strokeWidth={2}
              markerEnd="url(#cluster-arr)"
            />
          );
        })}
      </svg>
      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span style={{ color: CLUSTER_STROKE, fontWeight: 600 }}>Solid</span> Component (cluster)
        <span style={{ color: FUNCTION_STROKE, fontWeight: 600 }}>Dashed</span> Functions of that component
      </div>
    </div>
  );
};
