export interface Stock {
  id: string;
  name: string;
  initial: number;
  /** Optional unit label for this stock (e.g. "contracts", "index 0–100"). */
  unit?: string;
}

export interface Flow {
  id: string;
  name: string;
  from?: string | null;
  to?: string | null;
  rate: string;
  source?: string;
  loop_type?: "R" | "B" | "";
  delay?: string;
  mechanism?: string;
  loop_ids?: string[];
  /** Optional unit label for this flow's rate (e.g. "contracts/month"). */
  unit?: string;
}

export interface Parameter {
  id: string;
  name: string;
  value: number;
  /** Optional unit label for this parameter (e.g. "1/month"). */
  unit?: string;
}

export interface Loop {
  id: string;
  name: string;
  type: "R" | "B";
  description: string;
  flow_ids: string[];
  delay?: string;
}

export interface SchemaMeta {
  id?: string;
  name?: string;
  question?: string;
  building_blocks?: string[];
  horizon_years?: number;
}

/** Cluster: component; contents shown in diagram are the *functions* of that component (flows). */
export interface Cluster {
  id: string;
  name: string;
  stock_ids: string[];
}

/** Alternatives: optional right-side group (e.g. scenario choices). */
export interface Alternatives {
  id: string;
  name: string;
  stock_ids?: string[];
}

export interface Schema {
  meta?: SchemaMeta;
  loops?: Loop[];
  clusters?: Cluster[];
  alternatives?: Alternatives;
  stocks: Stock[];
  flows: Flow[];
  parameters: Parameter[];
}

