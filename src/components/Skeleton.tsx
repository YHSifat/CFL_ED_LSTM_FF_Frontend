import type { CSSProperties } from "react";

/** Placeholder block with a sweeping shimmer, shown while live data loads. Size it with className. */
export default function Skeleton({
  className = "",
  onAccent = false,
  style,
}: {
  className?: string;
  onAccent?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`skeleton block rounded-md ${onAccent ? "skeleton-on-accent" : ""} ${className}`}
      style={style}
    />
  );
}

/** Generic page placeholder for the Suspense fallbacks: title, KPI row, a large card. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6" role="status" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-wrap gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 flex-1 rounded-[var(--radius-card)]" style={{ minWidth: 160 }} />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}
