import type { ReactNode } from "react";
import Skeleton from "./Skeleton";

export default function KpiCard({
  label,
  value,
  unit,
  sub,
  accent = false,
  valueColor,
  loading = false,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: ReactNode;
  /** Solid accent-colored "featured" card, e.g. for the headline prediction. */
  accent?: boolean;
  /** Override the value's color, e.g. to flag a threshold like a danger level. */
  valueColor?: string;
  /** Show a shimmer bar instead of the value (and no sub line) while data loads. */
  loading?: boolean;
}) {
  return (
    <div
      // basis + min width: two per row on phones, one row on wide screens
      className="min-w-[140px] flex-1 basis-[140px] rounded-[var(--radius-card)] border px-4 py-3.5"
      style={
        accent
          ? { background: "var(--accent)", borderColor: "var(--accent)" }
          : { background: "var(--card)", borderColor: "var(--border)" }
      }
    >
      <div
        className="text-xs font-medium"
        style={{ color: accent ? "rgba(255,255,255,0.85)" : "var(--text-secondary)" }}
      >
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" onAccent={accent} />
      ) : (
        <div className="mt-1.5 flex items-baseline gap-1">
          <span
            className="font-mono text-2xl font-semibold"
            style={{ color: accent ? "#fff" : (valueColor ?? "var(--text-primary)") }}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs" style={{ color: accent ? "rgba(255,255,255,0.75)" : "var(--text-tertiary)" }}>
              {unit}
            </span>
          )}
        </div>
      )}
      {sub && !loading && (
        <div className="mt-1.5" style={accent ? { color: "rgba(255,255,255,0.85)" } : undefined}>
          {sub}
        </div>
      )}
    </div>
  );
}
