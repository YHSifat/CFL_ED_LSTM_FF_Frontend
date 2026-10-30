import type { Station } from "@/lib/types";
import SelectChevron from "./SelectChevron";

export default function StationSelect({
  stations,
  value,
  onChange,
  placeholder,
}: {
  stations: Station[];
  value: string;
  onChange: (id: string) => void;
  /** Shown as a disabled, unselectable first option when nothing should be pre-selected. */
  placeholder?: string;
}) {
  return (
    <div className="relative inline-block max-w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-full appearance-none truncate rounded-full border border-border bg-card py-2 pl-4 pr-10 text-sm font-medium text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {stations.map((s) => (
          <option key={s.station_id} value={s.station_id}>
            {s.station_name} ({s.station_id})
          </option>
        ))}
      </select>
      <SelectChevron />
    </div>
  );
}
