import Link from "next/link";
import { CLUSTER_COLOR_VAR } from "@/lib/stations";
import { getCurrentWL, getPreviousWL, getStatus, getObservedPredictedSeries } from "@/lib/sampleData";
import type { Horizon, Station } from "@/lib/types";
import StatusPill from "./StatusPill";
import ObservedPredictedChart from "./ObservedPredictedChart";
import HorizonSelect from "./HorizonSelect";
import SampleDataBadge from "./SampleDataBadge";

export default function StationDetailsPanel({
  station,
  horizon,
  onHorizonChange,
}: {
  station: Station | null;
  horizon: Horizon;
  onHorizonChange: (h: Horizon) => void;
}) {
  if (!station) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border bg-card px-6 text-center">
        <div className="text-sm font-medium text-text-secondary">No station selected</div>
        <p className="text-xs text-text-tertiary">
          Click a marker on the map, or pick a station from the dropdown above, to see its details here.
        </p>
      </div>
    );
  }

  const current = getCurrentWL(station);
  const previous = getPreviousWL(station);
  const status = getStatus(current, station.danger_level_m);
  const series = getObservedPredictedSeries(station, horizon);

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-[var(--radius-card)] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-text-primary">{station.station_name}</div>
          <div className="font-mono text-xs text-text-tertiary">{station.station_id}</div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary">
        <span className="h-2 w-2 rounded-full" style={{ background: CLUSTER_COLOR_VAR[station.cluster] }} />
        {station.cluster} · {station.river_name} · {station.district}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-text-secondary">Type</dt>
        <dd className="text-right text-text-primary">{station.station_type}</dd>
        <dt className="text-text-secondary">Upazila</dt>
        <dd className="text-right text-text-primary">{station.upazila}</dd>
      </dl>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Current WL" value={`${current.toFixed(2)} m`} accent />
        <Stat label="Previous WL" value={`${previous.toFixed(2)} m`} />
        <Stat label="Danger level" value={`${station.danger_level_m.toFixed(2)} m`} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-text-secondary">Observed vs. predicted</h3>
        <HorizonSelect value={horizon} onChange={onHorizonChange} />
      </div>
      <div className="mt-2">
        <ObservedPredictedChart series={series} height={200} />
      </div>

      <Link
        href={`/forecast?station=${station.station_id}&h=${horizon}`}
        className="mt-4 block rounded-full px-4 py-3.5 text-center text-base font-semibold text-white"
        style={{ background: "var(--accent)" }}
      >
        View Full Forecast
      </Link>

      <div className="mt-3 flex justify-end">
        <SampleDataBadge />
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-[calc(var(--radius-card)_-_4px)] px-2.5 py-2"
      style={
        accent
          ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }
          : { background: "var(--background)", border: "1px solid var(--border)" }
      }
    >
      <div className="text-[11px] text-text-secondary">{label}</div>
      <div
        className="font-mono text-sm font-semibold"
        style={{ color: accent ? "var(--accent)" : "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}
