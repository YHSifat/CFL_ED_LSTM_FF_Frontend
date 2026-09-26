import { STATUS_STYLE } from "@/lib/sampleData";
import type { WaterLevelStatus } from "@/lib/types";

export default function StatusPill({ status }: { status: WaterLevelStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: style.fg, background: style.bg }}
    >
      {status}
    </span>
  );
}
