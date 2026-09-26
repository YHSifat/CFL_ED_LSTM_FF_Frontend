import type { Cluster } from "@/lib/types";
import { CLUSTER_COLOR_VAR } from "@/lib/stations";

export default function ClusterCard({
  cluster,
  count,
  active,
  onClick,
}: {
  cluster: Cluster;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center gap-3 rounded-[var(--radius-card)] border bg-card px-4 py-3.5 text-left transition-shadow hover:shadow-sm"
      style={{
        borderColor: active ? CLUSTER_COLOR_VAR[cluster] : "var(--border)",
        boxShadow: active ? `0 0 0 1px ${CLUSTER_COLOR_VAR[cluster]}` : undefined,
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: CLUSTER_COLOR_VAR[cluster] }}
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-text-secondary">{cluster}</span>
        <span className="block font-mono text-xl font-semibold text-text-primary">{count}</span>
      </span>
    </button>
  );
}
