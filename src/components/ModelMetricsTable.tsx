import type { ModelMetric } from "@/lib/sampleData";
import { MODEL_COLORS } from "@/lib/modelColors";

const COLUMNS: { key: keyof ModelMetric; label: string; digits: number }[] = [
  { key: "mae", label: "Overall MAE (m)", digits: 3 },
  { key: "rmse", label: "Overall RMSE (m)", digits: 3 },
  { key: "mse", label: "MSE (m²)", digits: 3 },
  { key: "nse", label: "NSE / R²", digits: 3 },
  { key: "evs", label: "EVS", digits: 3 },
  { key: "ioa", label: "IOA", digits: 3 },
];

export default function ModelMetricsTable({ metrics }: { metrics: ModelMetric[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-secondary">
            <th className="py-2 pr-4 font-medium">Model</th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="py-2 pr-4 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {metrics.map((row) => (
            <tr
              key={row.model}
              className={row.isProposed ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]" : undefined}
            >
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: MODEL_COLORS[row.model] }}
                  />
                  <span className={row.isProposed ? "font-semibold text-text-primary" : "text-text-primary"}>
                    {row.model}
                  </span>
                  {row.isProposed && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      Proposed
                    </span>
                  )}
                </div>
              </td>
              {COLUMNS.map((col) => (
                <td key={col.key} className="py-2.5 pr-4 font-mono text-text-primary">
                  {(row[col.key] as number).toFixed(col.digits)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
