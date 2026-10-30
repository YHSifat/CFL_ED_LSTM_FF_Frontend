import type { Loadable } from "@/lib/liveData";

/** Placeholder shown while live data loads, fails, or comes back empty. */
export default function LoadState<T>({
  result,
  empty,
  height = 120,
}: {
  result: Loadable<T>;
  empty: string;
  height?: number;
}) {
  const text =
    result.state === "loading" ? "Loading…" : result.state === "error" ? `Couldn't load data: ${result.message}` : empty;
  return (
    <div
      className="flex items-center justify-center rounded-[calc(var(--radius-card)_-_4px)] border border-dashed border-border px-4 text-center text-xs"
      style={{ minHeight: height, color: result.state === "error" ? "var(--status-danger-fg)" : "var(--text-tertiary)" }}
    >
      {text}
    </div>
  );
}
