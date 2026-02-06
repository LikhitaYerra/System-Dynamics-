/**
 * System Dynamics Studio — UI theme
 * Refined palette: warm paper, blue primary for schema, clear hierarchy.
 */
export const theme = {
  // Surfaces
  pageBg: "#f2f0ed",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  surfaceCode: "#1e293b",

  // Borders
  border: "#e4e2df",
  borderStrong: "#d2cfcb",
  borderMuted: "#ebe9e6",

  // Text
  text: "#1a1918",
  textSecondary: "#4f4d4a",
  textMuted: "#6e6c68",
  textInverse: "#ffffff",

  // Primary (blue — schema diagram, buttons, links)
  primary: "#1e40af",
  primaryHover: "#1d4ed8",
  primaryLight: "#dbeafe",
  primaryPale: "#eff6ff",
  primaryBorder: "#60a5fa",

  // AI / accent (violet)
  ai: "#6d28d9",
  aiHover: "#5b21b6",
  aiLight: "#ede9fe",
  aiPale: "#f5f3ff",

  // Reinforcing loop (warm amber)
  loopR: "#b45309",
  loopRBg: "#fef7ed",
  loopRBorder: "#c2410c",

  // Balancing loop (blue, matches primary)
  loopB: "#1e40af",
  loopBBg: "#dbeafe",
  loopBBorder: "#1e40af",

  // Feedback
  successBg: "#eff6ff",
  successBorder: "#93c5fd",
  successText: "#1e40af",
  warningBg: "#fef9e7",
  warningBorder: "#f5e6b3",
  warningText: "#8b6914",
  errorText: "#b91c1c",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",

  // Code sidebar
  codeText: "#c8d0db",
  codeBorder: "#2d3a4a",
  codeComment: "#94a3b8",
  codeKeyword: "#7dd3fc",
  codeVar: "#fde047",
  codeNum: "#86efac",
  codeFlowId: "#c4b5fd",
  codeEq: "#a5b4fc",

  // Chart
  chartGrid: "rgba(0,0,0,0.06)",
  chartColors: ["#1e40af", "#c2410c", "#2563eb", "#b91c1c", "#6d28d9", "#ca8a04", "#0891b2", "#be185d"],
} as const;
