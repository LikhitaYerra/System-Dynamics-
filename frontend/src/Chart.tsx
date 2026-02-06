import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import type { SimResult } from "./api";
import { theme } from "./theme";

interface SingleProps {
  result: SimResult;
  compare?: never;
  stockNames?: Record<string, string>;
}

interface CompareProps {
  result?: never;
  compare: Array<{ label: string; result: SimResult }>;
  stockNames?: Record<string, string>;
}

type Props = SingleProps | CompareProps;

const colors = theme.chartColors;

export const Chart: React.FC<Props> = (props) => {
  const stockNames = "stockNames" in props ? props.stockNames : undefined;
  const results = "compare" in props && props.compare?.length
    ? props.compare
    : props.result ? [{ label: "Run", result: props.result }] : [];
  if (results.length === 0) return null;

  const t = results[0].result.t;
  const data = t.map((time, idx) => {
    const row: Record<string, number | string> = { time };
    results.forEach((r) => {
      r.result.stock_ids.forEach((id, sIndex) => {
        const key = results.length > 1 ? `${r.label}: ${id}` : id;
        row[key] = r.result.Y[sIndex][idx];
      });
    });
    return row;
  });

  const lineKeys: string[] = [];
  results.forEach((r) => {
    r.result.stock_ids.forEach((id) => {
      lineKeys.push(results.length > 1 ? `${r.label}: ${id}` : id);
    });
  });

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <XAxis
          dataKey="time"
          tick={{ fill: theme.textSecondary, fontSize: 11, fontFamily: "DM Sans, sans-serif" }}
          label={{ value: "Time (years)", position: "insideBottom", offset: -4, fill: theme.textSecondary, fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: theme.textSecondary, fontSize: 11, fontFamily: "DM Sans, sans-serif" }}
          label={{ value: "Value", angle: -90, position: "insideLeft", fill: theme.textSecondary, fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: "8px",
            color: theme.text,
            fontSize: "12px",
            padding: "10px 14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
          }}
          labelStyle={{ color: theme.textSecondary, marginBottom: 4 }}
          formatter={(value: number) => [value?.toFixed(2) ?? value, null]}
        />
        <Legend
          wrapperStyle={{ paddingTop: "8px" }}
          iconType="line"
          iconSize={10}
          formatter={(value: string) => {
            const id = value.includes(": ") ? value.split(": ").slice(1).join(": ") : value;
            const label = stockNames?.[id] ?? id;
            const prefix = value.includes(": ") ? value.split(": ")[0] + ": " : "";
            return <span style={{ color: theme.textSecondary, fontSize: "12px" }}>{prefix}{label}</span>;
          }}
        />
        {lineKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            strokeWidth={2.5}
            stroke={colors[i % colors.length]}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: colors[i % colors.length] }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

