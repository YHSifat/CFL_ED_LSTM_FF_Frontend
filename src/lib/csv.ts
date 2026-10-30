import type { ObservedPredictedSeries } from "./sampleData";
import type { Horizon, Station } from "./types";

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

export function buildForecastCsv(
  station: Station,
  horizon: Horizon,
  current: number,
  previous: number,
  summary: { horizon: Horizon; value: number; deltaVsCurrent: number }[],
  series: ObservedPredictedSeries
): string {
  const lines: string[] = [];

  lines.push("Station metadata");
  lines.push(csvRow(["station_id", station.station_id]));
  lines.push(csvRow(["station_name", station.station_name]));
  lines.push(csvRow(["river_name", station.river_name]));
  lines.push(csvRow(["district", station.district]));
  lines.push(csvRow(["upazila", station.upazila]));
  lines.push(csvRow(["cluster", station.cluster]));
  lines.push(csvRow(["station_type", station.station_type]));
  lines.push(csvRow(["danger_level_m", station.danger_level_m]));
  lines.push(csvRow(["current_wl_m", current]));
  lines.push(csvRow(["previous_day_wl_m", previous]));
  lines.push(csvRow(["selected_horizon", horizon]));
  lines.push(csvRow(["generated_at", new Date().toISOString()]));
  lines.push("");

  lines.push("Forecast summary (all horizons)");
  lines.push(csvRow(["horizon", "predicted_wl_m", "delta_vs_current_m"]));
  for (const row of summary) {
    lines.push(csvRow([row.horizon, row.value, row.deltaVsCurrent]));
  }
  lines.push("");

  lines.push(`Time series (horizon = ${horizon})`);
  lines.push(csvRow(["index", "time_offset", "observed_m", "predicted_m"]));
  for (const p of series.points) {
    lines.push(csvRow([p.index, p.timeLabel, p.observed ?? "", p.predicted ?? ""]));
  }

  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
