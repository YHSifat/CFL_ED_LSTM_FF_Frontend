import type { Loadable } from "@/lib/liveData";
import Skeleton from "./Skeleton";

/** Placeholder while live data loads (shimmer skeleton), fails, or comes back empty. */
export default function LoadState<T>({
  result,
  empty,
  height = 120,
}: {
  result: Loadable<T>;
  empty: string;
  height?: number;
}) {
  if (result.state === "loading") {
    return (
      <div role="status" aria-label="Loading">
        <Skeleton className="w-full rounded-[calc(var(--radius-card)_-_4px)]" style={{ height }} />
      </div>
    );
  }
  const text = result.state === "error" ? `Couldn't load data: ${result.message}` : empty;
  return (
    <div
      className="flex items-center justify-center rounded-[calc(var(--radius-card)_-_4px)] border border-dashed border-border px-4 text-center text-xs"
      style={{ minHeight: height, color: result.state === "error" ? "var(--status-danger-fg)" : "var(--text-tertiary)" }}
    >
      {text}
    </div>
  );
}
