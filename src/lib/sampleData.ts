import type { Horizon, Station, WaterLevelStatus } from "./types";

/**
 * Every number here is generated, not real. It's seeded deterministically
 * per station (+ horizon where relevant) so the UI is fully explorable and
 * stable across reloads. Swap the internals for real API/model calls later
 * without touching callers.
 */

export const HORIZON_HOURS: Record<Horizon, number> = {
  "3h": 3,
  "6h": 6,
  "12h": 12,
  "1D": 24,
  "3D": 72,
  "7D": 168,
  "15D": 360,
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRand(...parts: (string | number)[]): () => number {
  return mulberry32(hashString(parts.join("|")));
}

/** Deterministic current water level, expressed relative to danger level. */
export function getCurrentWL(station: Station): number {
  const rand = seededRand(station.station_id, "current");
  // Most stations sit comfortably below danger; a handful run high, for variety.
  const bucket = rand();
  let factor: number;
  if (bucket < 0.12) {
    factor = 1.02 + rand() * 0.08; // above danger
  } else if (bucket < 0.32) {
    factor = 0.88 + rand() * 0.12; // warning band
  } else {
    factor = 0.55 + rand() * 0.3; // normal
  }
  return round2(station.danger_level_m * factor);
}

export function getPreviousWL(station: Station): number {
  const rand = seededRand(station.station_id, "previous");
  const current = getCurrentWL(station);
  const drift = (rand() - 0.5) * 0.04 * station.danger_level_m;
  return round2(current - drift);
}

export function getStatus(currentWL: number, dangerLevelM: number): WaterLevelStatus {
  const ratio = currentWL / dangerLevelM;
  if (ratio >= 1) return "Above danger";
  if (ratio >= 0.85) return "Warning";
  return "Normal";
}

export const STATUS_STYLE: Record<WaterLevelStatus, { fg: string; bg: string }> = {
  Normal: { fg: "var(--status-normal-fg)", bg: "var(--status-normal-bg)" },
  Warning: { fg: "var(--status-warning-fg)", bg: "var(--status-warning-bg)" },
  "Above danger": { fg: "var(--status-danger-fg)", bg: "var(--status-danger-bg)" },
};

/** Deterministic forecast value + delta vs current, for one horizon. */
export function getForecast(
  station: Station,
  horizon: Horizon
): { value: number; deltaVsCurrent: number } {
  const rand = seededRand(station.station_id, "forecast", horizon);
  const current = getCurrentWL(station);
  const hours = HORIZON_HOURS[horizon];
  const magnitude = 0.015 * station.danger_level_m * Math.sqrt(hours / 24);
  const drift = (rand() - 0.42) * magnitude;
  const value = round2(current + drift);
  return { value, deltaVsCurrent: round2(value - current) };
}

export function getForecastSummary(station: Station, horizons: Horizon[]) {
  return horizons.map((horizon) => ({ horizon, ...getForecast(station, horizon) }));
}

export interface SeriesPoint {
  index: number;
  timeLabel: string;
  observed?: number;
  predicted?: number;
}

export interface ObservedPredictedSeries {
  points: SeriesPoint[];
  nowIndex: number;
  dangerLevel: number;
}

const HISTORY_POINTS = 24;
const FORECAST_POINTS = 24;
// The observed side always shows a fixed 30-day history, regardless of the
// selected horizon; the predicted side never extends past 15 days out.
const HISTORY_SPAN_HOURS = 30 * 24;
const FORECAST_CAP_HOURS = 15 * 24;

/**
 * Observed-vs-predicted series around "now". History always spans a fixed
 * 30 days back, for every horizon (3h through 15D); the predicted line is
 * capped at 15 days out regardless of horizon, tracking toward (but not
 * necessarily reaching) the true horizon-target value.
 */
export function getObservedPredictedSeries(
  station: Station,
  horizon: Horizon
): ObservedPredictedSeries {
  const rand = seededRand(station.station_id, "series", horizon);
  const current = getCurrentWL(station);
  const previous = getPreviousWL(station);
  const { value: forecastValue } = getForecast(station, horizon);
  const hours = HORIZON_HOURS[horizon];
  const noise = 0.01 * station.danger_level_m;

  const historySpacingHours = HISTORY_SPAN_HOURS / (HISTORY_POINTS - 1);
  const forecastCapHours = Math.min(hours, FORECAST_CAP_HOURS);
  const forecastSpacingHours = forecastCapHours / FORECAST_POINTS;

  const points: SeriesPoint[] = [];

  for (let i = 0; i < HISTORY_POINTS; i++) {
    const t = (i - (HISTORY_POINTS - 1)) * historySpacingHours;
    const progress = i / (HISTORY_POINTS - 1);
    const base = previous + (current - previous) * progress;
    const wobble = (rand() - 0.5) * noise;
    const observed = round2(base + wobble);
    const predicted = round2(observed + (rand() - 0.5) * noise * 0.6);
    points.push({ index: i, timeLabel: formatOffset(t), observed, predicted });
  }

  const nowIndex = HISTORY_POINTS - 1;
  points[nowIndex].predicted = points[nowIndex].observed;

  for (let i = 1; i <= FORECAST_POINTS; i++) {
    const t = i * forecastSpacingHours;
    const progress = t / hours; // fraction of the way toward the true horizon-target value
    const base = current + (forecastValue - current) * progress;
    const wobble = (rand() - 0.5) * noise * 0.5;
    points.push({
      index: nowIndex + i,
      timeLabel: formatOffset(t),
      predicted: round2(base + wobble),
    });
  }

  return { points, nowIndex, dangerLevel: station.danger_level_m };
}

function formatOffset(hoursFromNow: number): string {
  const sign = hoursFromNow > 0 ? "+" : hoursFromNow < 0 ? "-" : "";
  const abs = Math.abs(hoursFromNow);
  if (abs < 24) return `${sign}${abs.toFixed(abs < 1 ? 1 : 0)}h`;
  return `${sign}${(abs / 24).toFixed(1)}d`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Model comparison — CFL-EDLSTM (the proposed model) vs. 4 baselines.
 * `errorFactor` scales each baseline's simulated error relative to
 * CFL-EDLSTM (1.0 = same), `r2Base` is its rough R² at a 1-day horizon.
 */
const MODEL_DEFS: { name: string; isProposed: boolean; errorFactor: number; r2Base: number }[] = [
  { name: "CFL-EDLSTM", isProposed: true, errorFactor: 1.0, r2Base: 0.97 },
  { name: "Vanilla LSTM", isProposed: false, errorFactor: 1.6, r2Base: 0.9 },
  { name: "GRU", isProposed: false, errorFactor: 1.75, r2Base: 0.89 },
  { name: "XGBoost", isProposed: false, errorFactor: 2.1, r2Base: 0.85 },
  { name: "TCN", isProposed: false, errorFactor: 1.9, r2Base: 0.87 },
];

export const MODEL_NAMES = MODEL_DEFS.map((m) => m.name);

export function modelSeriesKey(model: string): string {
  return `m_${model.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

export interface ModelMetric {
  model: string;
  isProposed: boolean;
  mae: number;
  rmse: number;
  mse: number;
  nse: number;
  evs: number;
  ioa: number;
}

/** Deterministic MAE/RMSE/MSE/NSE(R²)/EVS/IOA per model, degrading a bit at longer horizons. */
export function getModelMetrics(station: Station, horizon: Horizon): ModelMetric[] {
  const hours = HORIZON_HOURS[horizon];
  const horizonPenalty = Math.sqrt(hours / 24);
  return MODEL_DEFS.map(({ name, isProposed, errorFactor, r2Base }) => {
    const rand = seededRand(station.station_id, "model-metric", horizon, name);
    const rmse = round3(0.03 * station.danger_level_m * errorFactor * horizonPenalty * (0.85 + rand() * 0.3));
    const mae = round3(rmse * (0.75 + rand() * 0.1));
    const mse = round3(rmse * rmse);
    const nse = round3(
      Math.max(0.4, Math.min(0.995, r2Base - horizonPenalty * 0.05 * errorFactor + (rand() - 0.5) * 0.02))
    );
    const evs = round3(Math.max(0.35, Math.min(0.995, nse - 0.01 + (rand() - 0.5) * 0.015)));
    const ioa = round3(Math.max(nse, Math.min(0.999, nse + 0.015 + rand() * 0.015)));
    return { model: name, isProposed, mae, rmse, mse, nse, evs, ioa };
  });
}

export interface ModelSeriesPoint {
  index: number;
  timeLabel: string;
  observed?: number;
  [modelKey: string]: number | string | undefined;
}

export interface ModelComparisonSeries {
  points: ModelSeriesPoint[];
  nowIndex: number;
  dangerLevel: number;
}

/** Observed history + all 5 models' predictions, for the overlay chart. */
export function getModelComparisonSeries(station: Station, horizon: Horizon): ModelComparisonSeries {
  const current = getCurrentWL(station);
  const previous = getPreviousWL(station);
  const hours = HORIZON_HOURS[horizon];
  const noise = 0.01 * station.danger_level_m;
  const historySpacingHours = Math.max(hours / FORECAST_POINTS, 1 / 6);
  const forecastSpacingHours = hours / FORECAST_POINTS;
  const nowIndex = HISTORY_POINTS - 1;

  const points: ModelSeriesPoint[] = [];

  for (let i = 0; i < HISTORY_POINTS; i++) {
    const progress = i / (HISTORY_POINTS - 1);
    const base = previous + (current - previous) * progress;
    const rand = seededRand(station.station_id, "model-series-hist", horizon, i);
    const observed = round2(base + (rand() - 0.5) * noise);
    const point: ModelSeriesPoint = {
      index: i,
      timeLabel: formatOffset((i - nowIndex) * historySpacingHours),
      observed,
    };
    for (const m of MODEL_DEFS) {
      const mRand = seededRand(station.station_id, "model-series-hist", horizon, i, m.name);
      point[modelSeriesKey(m.name)] = round2(observed + (mRand() - 0.5) * noise * m.errorFactor);
    }
    points.push(point);
  }

  for (const m of MODEL_DEFS) {
    const targetRand = seededRand(station.station_id, "model-series-target", horizon, m.name);
    const magnitude = 0.015 * station.danger_level_m * Math.sqrt(hours / 24);
    const target = current + (targetRand() - 0.42) * magnitude * m.errorFactor;
    for (let i = 1; i <= FORECAST_POINTS; i++) {
      const progress = i / FORECAST_POINTS;
      const rand = seededRand(station.station_id, "model-series-fut", horizon, m.name, i);
      const base = current + (target - current) * progress;
      const idx = nowIndex + i;
      if (!points[idx]) {
        points[idx] = { index: idx, timeLabel: formatOffset(i * forecastSpacingHours) };
      }
      points[idx][modelSeriesKey(m.name)] = round2(base + (rand() - 0.5) * noise * 0.5 * m.errorFactor);
    }
  }

  return { points, nowIndex, dangerLevel: station.danger_level_m };
}

/**
 * FFWC comparison — our CFL-EDLSTM prediction vs. the FFWC (BWDB) number for
 * the same target time. FFWC publishes two different kinds of numbers that
 * are not interchangeable: an *observed* gauge reading (only exists for the
 * past) and an *official forecast* (only exists from the issue date forward)
 * — the mode toggle picks which one is being compared against.
 */
export type FfwcMode = "Observed" | "Official forecast";

const FFWC_WINDOW_DAYS = 6;

function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Our model's point prediction for `station` at `dateIso` + `horizon`. */
export function getFfwcPrediction(station: Station, horizon: Horizon, dateIso: string): number {
  const rand = seededRand(station.station_id, "ffwc-our-point", horizon, dateIso);
  const current = getCurrentWL(station);
  const magnitude = 0.02 * station.danger_level_m * Math.sqrt(HORIZON_HOURS[horizon] / 24);
  return round2(current + (rand() - 0.45) * magnitude);
}

/** The FFWC number for the same target time — a station-specific, mode-specific offset from our own prediction. */
export function getFfwcValue(station: Station, horizon: Horizon, dateIso: string, mode: FfwcMode): number {
  const ours = getFfwcPrediction(station, horizon, dateIso);
  const rand = seededRand(station.station_id, "ffwc-bias", horizon, dateIso, mode);
  // Official forecasts tend to diverge a bit more from our nowcast than same-day observed readings do.
  const spread = (mode === "Observed" ? 0.02 : 0.035) * station.danger_level_m;
  return round2(ours + (rand() - 0.5) * spread);
}

export interface FfwcSeriesPoint {
  index: number;
  dateIso: string;
  dateLabel: string;
  our: number;
  /** Only present for d <= 0 (the past) — an observed reading can't exist for a future date. */
  ffwcObserved?: number;
  /** Only present for d >= 0 (today forward) — a forecast issued "today" doesn't cover the past. */
  ffwcForecast?: number;
}

export interface FfwcComparisonSeries {
  points: FfwcSeriesPoint[];
  dateIndex: number;
  dangerLevel: number;
}

/**
 * ~12-day window (6 days either side of `dateIso`) comparing our prediction
 * against FFWC. Observed and official-forecast FFWC values are shown
 * together in one series — they cover complementary, non-overlapping halves
 * of the window, so there's no need to toggle between them to see both.
 */
export function getFfwcComparisonSeries(station: Station, horizon: Horizon, dateIso: string): FfwcComparisonSeries {
  const current = getCurrentWL(station);
  const noise = 0.012 * station.danger_level_m;

  const startRand = seededRand(station.station_id, "ffwc-our-start", horizon, dateIso);
  const endRand = seededRand(station.station_id, "ffwc-our-end", horizon, dateIso);
  const startVal = current + (startRand() - 0.5) * noise * 4;
  const endVal = current + (endRand() - 0.5) * noise * 4;

  const span = FFWC_WINDOW_DAYS * 2;
  const points: FfwcSeriesPoint[] = [];

  for (let d = -FFWC_WINDOW_DAYS; d <= FFWC_WINDOW_DAYS; d++) {
    const idx = d + FFWC_WINDOW_DAYS;
    const progress = idx / span;
    const pointDateIso = addDaysIso(dateIso, d);
    const ourRand = seededRand(station.station_id, "ffwc-our-point-series", horizon, dateIso, d);
    const our = round2(startVal + (endVal - startVal) * progress + (ourRand() - 0.5) * noise);

    const point: FfwcSeriesPoint = { index: idx, dateIso: pointDateIso, dateLabel: formatDateLabel(pointDateIso), our };

    if (d === 0) {
      // The observed reading and the forecast issued "today" describe the
      // same instant — anchor both lines to one shared value so they meet
      // at a single point instead of two overlapping dots.
      const anchorRand = seededRand(station.station_id, "ffwc-series-bias", horizon, dateIso, "anchor", d);
      const anchor = round2(our + (anchorRand() - 0.5) * 0.02 * station.danger_level_m);
      point.ffwcObserved = anchor;
      point.ffwcForecast = anchor;
    } else if (d < 0) {
      const biasRand = seededRand(station.station_id, "ffwc-series-bias", horizon, dateIso, "Observed", d);
      point.ffwcObserved = round2(our + (biasRand() - 0.5) * 0.02 * station.danger_level_m);
    } else {
      const biasRand = seededRand(station.station_id, "ffwc-series-bias", horizon, dateIso, "Official forecast", d);
      point.ffwcForecast = round2(our + (biasRand() - 0.5) * 0.035 * station.danger_level_m);
    }

    points.push(point);
  }

  return { points, dateIndex: FFWC_WINDOW_DAYS, dangerLevel: station.danger_level_m };
}

/**
 * SHAP explainability — relative importance of the 5 model inputs.
 * Water Level (autoregressive signal) and Discharge dominate at short
 * horizons; longer horizons lean a bit more on the upstream/rainfall
 * signal, which is the more realistic hydrological pattern.
 */
const SHAP_FEATURES = ["Water Level", "Discharge", "Rainfall", "Temperature", "Evaporation"] as const;
export type ShapFeatureName = (typeof SHAP_FEATURES)[number];

const SHAP_BASE_WEIGHT: Record<ShapFeatureName, number> = {
  "Water Level": 0.38,
  Discharge: 0.24,
  Rainfall: 0.18,
  Temperature: 0.12,
  Evaporation: 0.08,
};

export interface ShapFeature {
  feature: ShapFeatureName;
  /** 0–1, sums to 1 across all 5 features. */
  share: number;
}

/** Deterministic SHAP shares per station+horizon, ranked descending. */
export function getShapImportance(station: Station, horizon: Horizon): ShapFeature[] {
  const hours = HORIZON_HOURS[horizon];
  const horizonShift = Math.min(0.15, Math.sqrt(hours / 24) * 0.04);

  const raw = SHAP_FEATURES.map((feature) => {
    const rand = seededRand(station.station_id, "shap", horizon, feature);
    let base = SHAP_BASE_WEIGHT[feature];
    if (feature === "Water Level") base -= horizonShift;
    if (feature === "Rainfall" || feature === "Discharge") base += horizonShift / 2;
    return { feature, weight: Math.max(0.02, base * (0.75 + rand() * 0.5)) };
  });

  const total = raw.reduce((sum, r) => sum + r.weight, 0);
  return raw.map((r) => ({ feature: r.feature, share: r.weight / total })).sort((a, b) => b.share - a.share);
}
