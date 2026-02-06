import type { Schema, Stock, Flow, Cluster } from "./types";
import { theme } from "./theme";

/** Escape a string for use inside Mermaid node or subgraph labels. */
function escapeLabel(s: string): string {
  return s.replace(/\]/g, "\\]").replace(/\[/g, "\\[").replace(/"/g, "'").slice(0, 50);
}

/** Base64-encode UTF-8 string for mermaid.ink API (URL-safe: no +/). */
export function base64EncodeUnicode(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Convert schema to Mermaid flowchart syntax.
 * - Layout: TB (top-bottom) for clearer causal flow.
 * - Stock nodes: stadium shape ([]); source/sink: circles (()).
 * - Clusters = Mermaid subgraphs (if schema.clusters present).
 * - Edges = flows with short labels and loop-type markers (R/B).
 */
/** Mermaid theme directive so the rendered diagram uses app theme colors (blue). */
function mermaidThemeDirective(): string {
  return [
    "%%{init: {",
    "  'theme': 'base',",
    "  'themeVariables': {",
    `    'primaryColor': '${theme.primaryPale}',`,
    `    'primaryBorderColor': '${theme.primary}',`,
    `    'primaryTextColor': '${theme.text}',`,
    `    'lineColor': '${theme.primary}',`,
    `    'secondaryColor': '${theme.surface}',`,
    `    'tertiaryColor': '${theme.primaryLight}'`,
    "  }",
    "}}%%",
  ].join("\n");
}

export function schemaToMermaid(schema: Schema): string {
  const stocks = schema.stocks ?? [];
  const flows = schema.flows ?? [];
  const clusters = (schema.clusters ?? []) as Cluster[];

  const lines: string[] = [mermaidThemeDirective(), "flowchart TB"];

  // Source/sink as circles so they're visually distinct from stocks.
  lines.push("  source((source))");
  lines.push("  sink((sink))");

  // Map stock id -> Stock for quick lookup.
  const stockById = new Map<string, Stock>();
  stocks.forEach((s) => {
    stockById.set(s.id, s);
  });

  // Track which stocks are already declared (e.g. inside a subgraph).
  const declaredStockIds = new Set<string>();

  // Emit stock node: stadium shape for stocks (rounded rectangle).
  const emitStockNode = (s: Stock, indent: string = "  ") => {
    if (!s || declaredStockIds.has(s.id)) return;
    declaredStockIds.add(s.id);
    const labelMain = escapeLabel(s.name || s.id);
    const labelId = s.id !== labelMain ? `\\n(${s.id})` : "";
    lines.push(`${indent}${s.id}(["${labelMain}${labelId}"])`);
  };

  // Subgraphs for clusters (components).
  const clusterStockIds = new Set<string>();
  clusters.forEach((c) => {
    if (!c || !c.id) return;
    const label = escapeLabel(c.name || c.id);
    lines.push(`  subgraph ${c.id}["${label}"]`);
    (c.stock_ids ?? []).forEach((sid) => {
      const s = stockById.get(sid);
      if (!s) return;
      emitStockNode(s, "    ");
      clusterStockIds.add(s.id);
    });
    lines.push("  end");
    lines.push("");
  });

  // Stocks not in any cluster: declare at top level.
  stocks
    .filter((s) => !clusterStockIds.has(s.id))
    .forEach((s) => emitStockNode(s, "  "));

  // Edges for all flows (with R/B markers for loop type).
  flows.forEach((f: Flow) => {
    const fromId = f.from ?? "source";
    const toId = f.to ?? "sink";

    const from = fromId == null ? "source" : fromId;
    const to = toId == null ? "sink" : toId;

    const baseLabel = (f.name || f.id || "").toString();
    const shortLabel = escapeLabel(baseLabel.slice(0, 45));
    const polarity =
      f.loop_type === "R" ? " (R)" : f.loop_type === "B" ? " (B)" : "";

    const edgeLabel = shortLabel ? `${shortLabel}${polarity}` : polarity.trim();
    if (edgeLabel) {
      lines.push(`  ${from} -->|"${edgeLabel}"| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  });

  return lines.join("\n");
}

/** mermaid.ink image URL for PNG (encoded diagram). */
export function mermaidInkImgUrl(mermaidCode: string): string {
  const encoded = base64EncodeUnicode(mermaidCode);
  return `https://mermaid.ink/img/${encoded}`;
}

/** mermaid.ink SVG URL (encoded diagram). */
export function mermaidInkSvgUrl(mermaidCode: string): string {
  const encoded = base64EncodeUnicode(mermaidCode);
  return `https://mermaid.ink/svg/${encoded}`;
}
