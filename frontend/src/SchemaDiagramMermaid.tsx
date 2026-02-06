import React, { useMemo, useState } from "react";
import type { Schema } from "./types";
import { schemaToMermaid, mermaidInkSvgUrl } from "./schemaToMermaid";
import { theme } from "./theme";

export const SchemaDiagramMermaid: React.FC<{
  schema: Schema;
  width?: number;
  height?: number;
}> = ({ schema, width = 2000, height = 720 }) => {
  const [imgError, setImgError] = useState(false);
  const { mermaidCode, svgUrl } = useMemo(() => {
    const code = schemaToMermaid(schema);
    const url = mermaidInkSvgUrl(code);
    return { mermaidCode: code, svgUrl: url };
  }, [schema]);

  const stocks = schema.stocks ?? [];
  if (stocks.length === 0) {
    return (
      <div
        style={{
          width,
          height: 200,
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
    <div style={{ marginTop: "0.5rem" }}>
      <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.8rem", color: "#57534e" }}>
        Rendered via Mermaid API (mermaid.ink). Top-down flow: nodes = stocks (stadium) and source/sink (circles); edges = flows with (R) reinforcing / (B) balancing.
      </p>
      {imgError ? (
        <div
          style={{
            padding: "1.5rem",
            background: theme.errorBg,
            border: `1px solid ${theme.errorBorder}`,
            borderRadius: 8,
            fontSize: 13,
            color: theme.errorText,
          }}
        >
          Could not load diagram from Mermaid API. Check network or view the code below.
        </div>
      ) : (
        <div
          style={{
            overflow: "auto",
            maxHeight: height,
            background: theme.surfaceAlt,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            padding: 8,
          }}
        >
          <img
            src={svgUrl}
            alt="Schema as Mermaid diagram"
            style={{ maxWidth: "100%", height: "auto", display: "block" }}
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <details style={{ marginTop: "0.75rem", fontSize: 12, color: "#57534e" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Mermaid code (for API)</summary>
        <pre
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem",
            background: theme.surfaceCode,
            color: theme.codeText,
            borderRadius: 8,
            overflow: "auto",
            fontSize: 11,
            fontFamily: "ui-monospace, monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {mermaidCode}
        </pre>
      </details>
    </div>
  );
};
