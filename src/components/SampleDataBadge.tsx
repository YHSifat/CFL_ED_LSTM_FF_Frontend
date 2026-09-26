export default function SampleDataBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary ${className}`}
      title="Placeholder values — not live model output yet"
    >
      Sample data
    </span>
  );
}
