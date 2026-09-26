"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ModelMetric } from "@/lib/sampleData";
import { MODEL_COLORS } from "@/lib/modelColors";

type MetricKey = "mae" | "rmse" | "mse" | "nse" | "evs" | "ioa";

const METRIC_OPTIONS: { key: MetricKey; label: string; unit?: string; higherIsBetter: boolean }[] = [
  { key: "mae", label: "Overall MAE", unit: "m", higherIsBetter: false },
  { key: "rmse", label: "Overall RMSE", unit: "m", higherIsBetter: false },
  { key: "mse", label: "MSE", unit: "m²", higherIsBetter: false },
  { key: "nse", label: "NSE / R²", higherIsBetter: true },
  { key: "evs", label: "EVS", higherIsBetter: true },
  { key: "ioa", label: "IOA", higherIsBetter: true },
];

export default function ModelMetricsBarChart({ metrics }: { metrics: ModelMetric[] }) {
  const [metricKey, setMetricKey] = useState<MetricKey>("rmse");
  const active = METRIC_OPTIONS.find((m) => m.key === metricKey)!;

  const data = metrics.map((m) => ({ model: m.model, value: m[metricKey], isProposed: m.isProposed }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1.5">
          {METRIC_OPTIONS.map((opt) => {
            const isActive = opt.key === metricKey;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMetricKey(opt.key)}
                className="rounded-full px-3.5 py-2 text-sm font-medium transition-colors"
                style={
                  isActive
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--background)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-text-tertiary">
          {active.higherIsBetter ? "Higher is better" : "Lower is better"}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="model"
            tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval={0}
          />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ fill: "var(--background)" }}
            contentStyle={{ borderRadius: 10, borderColor: "var(--border)", fontSize: 12 }}
            formatter={(value) => [`${Number(value).toFixed(3)}${active.unit ? ` ${active.unit}` : ""}`, active.label]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.model} fill={MODEL_COLORS[d.model]} fillOpacity={d.isProposed ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
