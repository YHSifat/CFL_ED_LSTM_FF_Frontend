import { HORIZONS, type Horizon } from "@/lib/types";
import SelectChevron from "./SelectChevron";

export default function HorizonSelect({
  value,
  onChange,
}: {
  value: Horizon;
  onChange: (h: Horizon) => void;
}) {
  return (
    <div className="relative inline-block shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Horizon)}
        className="appearance-none rounded-full border border-border bg-card py-2 pl-4 pr-10 font-mono text-sm font-medium text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        {HORIZONS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <SelectChevron />
    </div>
  );
}
