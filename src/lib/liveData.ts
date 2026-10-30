"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { HORIZON_HOURS, type ObservedPredictedSeries, type SeriesPoint } from "./sampleData";
import type { Horizon, WaterLevelStatus } from "./types";

/**
 * Live data from Supabase (views defined in the backend's schema.sql).
 * Station status, observed WL and our latest forecast are real; the model
 * comparison, FFWC comparison and explainability pages still use sampleData.
 */

const HISTORY_DAYS = 30;
const TZ = "Asia/Dhaka";

/** One row of the `station_status` view. */
export interface StationLive {
  id: string;
  current_wl: number | null;
  last_obs_time: string | null;
  danger_level: number | null;
  warning_level: number | null;
  status: "normal" | "warning" | "danger" | "unknown";
  forecast_peak_wl: number | null;
  forecast_peak_time: string | null;
  forecast_exceeds_danger: boolean;
}

export interface Reading {
  time: string; // ISO timestamp
  wl: number;
}

export interface StationDetail {
  observed: Reading[];
  forecast: Reading[];
  issuedOn: string | null;
}

const STATUS_LABEL: Record<StationLive["status"], WaterLevelStatus> = {
  normal: "Normal",
  warning: "Warning",
  danger: "Above danger",
  unknown: "No data",
};

export function toStatus(live: StationLive | undefined): WaterLevelStatus {
  return live ? STATUS_LABEL[live.status] : "No data";
}

function client() {
  if (!supabase) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  }
  return supabase;
}

// ---- queries ---------------------------------------------------------------
let statusPromise: Promise<Map<string, StationLive>> | null = null;

/** All tracked stations' status, fetched once per page load. */
export function fetchStationStatus(): Promise<Map<string, StationLive>> {
  statusPromise ??= (async () => {
    const { data, error } = await client()
      .from("station_status")
      .select(
        "id,current_wl,last_obs_time,danger_level,warning_level,status,forecast_peak_wl,forecast_peak_time,forecast_exceeds_danger"
      );
    if (error) throw new Error(error.message);
    return new Map((data as StationLive[]).map((row) => [row.id, row]));
  })();
  statusPromise.catch(() => (statusPromise = null)); // allow a retry after a failure
  return statusPromise;
}

export async function fetchStationDetail(stationId: string): Promise<StationDetail> {
  const from = new Date(Date.now() - HISTORY_DAYS * 24 * 3600 * 1000).toISOString();
  const [obs, fc] = await Promise.all([
    client()
      .from("observed_wl")
      .select("obs_time,wl")
      .eq("station_id", stationId)
      .gte("obs_time", from)
      .order("obs_time"),
    client()
      .from("latest_forecasts")
      .select("issued_on,target_time,wl")
      .eq("station_id", stationId)
      .eq("source", "ours")
      .order("target_time"),
  ]);
  if (obs.error) throw new Error(obs.error.message);
  if (fc.error) throw new Error(fc.error.message);
  return {
    observed: obs.data.map((r) => ({ time: r.obs_time as string, wl: r.wl as number })),
    forecast: fc.data.map((r) => ({ time: r.target_time as string, wl: r.wl as number })),
    issuedOn: (fc.data[0]?.issued_on as string | undefined) ?? null,
  };
}

// ---- hooks -----------------------------------------------------------------
export type Loadable<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: T };

function useLoadable<T>(load: (() => Promise<T>) | null, key: string): Loadable<T> {
  const [result, setResult] = useState<{ key: string; value: Loadable<T> }>({ key, value: { state: "loading" } });
  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    load().then(
      (data) => !cancelled && setResult({ key, value: { state: "ready", data } }),
      (err: Error) => !cancelled && setResult({ key, value: { state: "error", message: err.message } })
    );
    return () => {
      cancelled = true;
    };
    // `key` identifies the request; `load` is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result.key === key ? result.value : { state: "loading" };
}

export function useStationStatus(): Loadable<Map<string, StationLive>> {
  return useLoadable(fetchStationStatus, "status");
}

export function useStationDetail(stationId: string | null): Loadable<StationDetail> {
  return useLoadable(stationId ? () => fetchStationDetail(stationId) : null, stationId ?? "");
}

// ---- shaping for the existing charts ---------------------------------------
const labelFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatTime(iso: string): string {
  return labelFormat.format(new Date(iso));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The forecast step closest to `horizon` from now (clamped to the forecast's range). */
export function forecastAt(detail: StationDetail, horizon: Horizon): Reading | null {
  if (!detail.forecast.length) return null;
  const target = Date.now() + HORIZON_HOURS[horizon] * 3600 * 1000;
  let best = detail.forecast[0];
  for (const step of detail.forecast) {
    if (Math.abs(Date.parse(step.time) - target) < Math.abs(Date.parse(best.time) - target)) best = step;
  }
  return best;
}

export function forecastSummary(detail: StationDetail, horizons: Horizon[], current: number | null) {
  return horizons.flatMap((horizon) => {
    const step = forecastAt(detail, horizon);
    if (!step) return [];
    return [{ horizon, value: step.wl, deltaVsCurrent: current == null ? 0 : round2(step.wl - current), time: step.time }];
  });
}

/** Last 30 days observed + forecast up to the selected horizon, in the chart's series shape. */
export function buildSeries(detail: StationDetail, horizon: Horizon, dangerLevel: number): ObservedPredictedSeries {
  const points: SeriesPoint[] = detail.observed.map((r, index) => ({
    index,
    timeLabel: formatTime(r.time),
    observed: r.wl,
  }));
  const nowIndex = points.length - 1;
  if (nowIndex >= 0) points[nowIndex].predicted = points[nowIndex].observed; // join the two lines

  const end = forecastAt(detail, horizon);
  for (const step of detail.forecast) {
    points.push({ index: points.length, timeLabel: formatTime(step.time), predicted: step.wl });
    if (step === end) break;
  }
  return { points, nowIndex: Math.max(nowIndex, 0), dangerLevel };
}

/** Latest reading, and the previous day's reading at the same time (or that day's
 *  closest earlier reading if that slot is missing). */
export function latestReadings(detail: StationDetail): { current: Reading | null; previous: Reading | null } {
  const current = detail.observed.at(-1) ?? null;
  if (!current) return { current: null, previous: null };
  const dayBefore = Date.parse(current.time) - 24 * 3600 * 1000;
  const dayKey = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(t));
  const previous =
    detail.observed.findLast((r) => Date.parse(r.time) <= dayBefore && dayKey(Date.parse(r.time)) === dayKey(dayBefore)) ??
    null;
  return { current, previous };
}

// ---- ours vs FFWC (forecast_comparison view + RPCs in schema.sql) ------------
export const FFWC_PRODUCT_LABEL: Record<string, string> = {
  "ffwc-5day": "FFWC 5-day forecast",
  "ffwc-10day-mean": "FFWC 10-day forecast (mean)",
};

export interface ComparisonIssue {
  issued_on: string;
  ffwc_product: string;
  n: number;
  n_observed: number;
}

export interface SkillRow {
  ffwc_product: string;
  lead_days: number;
  n: number;
  mae_ours: number;
  mae_ffwc: number;
  rmse_ours: number;
  rmse_ffwc: number;
}

export interface ComparisonDetail {
  ours: Reading[];
  ffwc: Reading[];
  observed: Reading[];
}

export async function fetchComparisonIssues(stationId: string): Promise<ComparisonIssue[]> {
  const { data, error } = await client().rpc("comparison_issues", { p_station: stationId });
  if (error) throw new Error(error.message);
  return data as ComparisonIssue[];
}

export async function fetchComparisonSkill(stationId: string | null): Promise<SkillRow[]> {
  const { data, error } = await client().rpc("comparison_skill", { p_station: stationId });
  if (error) throw new Error(error.message);
  return data as SkillRow[];
}

/** One issue day: our full forecast, FFWC's, and readings over the same span. */
export async function fetchComparisonDetail(stationId: string, issue: ComparisonIssue): Promise<ComparisonDetail> {
  const forecast = (source: string, product?: string) => {
    let q = client()
      .from("forecasts")
      .select("target_time,wl")
      .eq("station_id", stationId)
      .eq("source", source)
      .eq("issued_on", issue.issued_on);
    if (product) q = q.eq("model_version", product);
    return q.order("target_time");
  };
  const [ffwc, ours] = await Promise.all([forecast("ffwc", issue.ffwc_product), forecast("ours")]);
  if (ffwc.error) throw new Error(ffwc.error.message);
  if (ours.error) throw new Error(ours.error.message);
  const toReadings = (rows: { target_time: string; wl: number }[]) => rows.map((r) => ({ time: r.target_time, wl: r.wl }));
  const ffwcSteps = toReadings(ffwc.data);
  const end = ffwcSteps.at(-1)?.time;
  // Start at 06:00 on the issue day (Asia/Dhaka, UTC+6) so the last observed day shows too.
  const start = new Date(`${issue.issued_on}T06:00:00+06:00`).toISOString();
  const obs = await client()
    .from("observed_wl")
    .select("obs_time,wl")
    .eq("station_id", stationId)
    .gte("obs_time", start)
    .lte("obs_time", end ?? start)
    .order("obs_time");
  if (obs.error) throw new Error(obs.error.message);
  return {
    ours: toReadings(ours.data).filter((r) => !end || r.time <= end),
    ffwc: ffwcSteps,
    observed: obs.data.map((r) => ({ time: r.obs_time as string, wl: r.wl as number })),
  };
}

export function useComparisonIssues(stationId: string): Loadable<ComparisonIssue[]> {
  return useLoadable(() => fetchComparisonIssues(stationId), `issues:${stationId}`);
}

export function useComparisonSkill(stationId: string | null): Loadable<SkillRow[]> {
  return useLoadable(() => fetchComparisonSkill(stationId), `skill:${stationId ?? "all"}`);
}

export function useComparisonDetail(stationId: string, issue: ComparisonIssue | null): Loadable<ComparisonDetail> {
  return useLoadable(
    issue ? () => fetchComparisonDetail(stationId, issue) : null,
    issue ? `detail:${stationId}:${issue.issued_on}:${issue.ffwc_product}` : ""
  );
}

export interface ComparisonPoint {
  time: string;
  label: string;
  observed?: number;
  ours?: number;
  ffwc?: number;
}

/** Merge the three series on their timestamps for the chart. */
export function buildComparisonPoints(detail: ComparisonDetail): ComparisonPoint[] {
  const byTime = new Map<string, ComparisonPoint>();
  const add = (rows: Reading[], key: "observed" | "ours" | "ffwc") => {
    for (const r of rows) {
      const t = new Date(r.time).toISOString();
      const point = byTime.get(t) ?? { time: t, label: formatTime(t) };
      point[key] = r.wl;
      byTime.set(t, point);
    }
  };
  add(detail.observed, "observed");
  add(detail.ours, "ours");
  add(detail.ffwc, "ffwc");
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}

// ---- performance by horizon (forecast_steps view + RPCs in schema.sql) -------
/** Horizon -> step of our 3-hourly output (1 = first reading after issue, next day 06:00). */
export const HORIZON_STEP: Record<Horizon, number> = {
  "3h": 1,
  "6h": 2,
  "12h": 4,
  "1D": 5,
  "3D": 15,
  "7D": 35,
  "15D": 75,
};

export const PERFORMANCE_DAYS = 15;

/** The last PERFORMANCE_DAYS complete days (Asia/Dhaka), as ISO dates. */
export function performanceWindow(): { from: string; to: string } {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
  const shift = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return { from: shift(today, -PERFORMANCE_DAYS), to: shift(today, -1) };
}

export interface HorizonPoint {
  issued_on: string;
  target_time: string;
  predicted: number;
  observed: number | null;
}

export interface HorizonSkillRow {
  step: number;
  n: number;
  mae: number;
  rmse: number;
  nse: number | null;
  mae_persistence: number | null;
}

export async function fetchHorizonPerformance(stationId: string, step: number, from: string, to: string): Promise<HorizonPoint[]> {
  const { data, error } = await client().rpc("horizon_performance", { p_station: stationId, p_step: step, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return data as HorizonPoint[];
}

export async function fetchHorizonSkill(stationId: string | null, from: string, to: string): Promise<HorizonSkillRow[]> {
  const { data, error } = await client().rpc("horizon_skill", { p_station: stationId, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return data as HorizonSkillRow[];
}

export function useHorizonPerformance(stationId: string, step: number, from: string, to: string): Loadable<HorizonPoint[]> {
  return useLoadable(() => fetchHorizonPerformance(stationId, step, from, to), `hp:${stationId}:${step}:${from}:${to}`);
}

export function useHorizonSkill(stationId: string | null, from: string, to: string): Loadable<HorizonSkillRow[]> {
  return useLoadable(() => fetchHorizonSkill(stationId, from, to), `hs:${stationId ?? "all"}:${from}:${to}`);
}

/** Observed vs the forecast made `step` readings ahead, in the chart's series shape. */
export function buildHorizonSeries(points: HorizonPoint[], dangerLevel: number): ObservedPredictedSeries {
  return {
    points: points.map((p, index) => ({
      index,
      timeLabel: formatTime(p.target_time),
      observed: p.observed ?? undefined,
      predicted: p.predicted,
    })),
    nowIndex: -1,
    dangerLevel,
  };
}
