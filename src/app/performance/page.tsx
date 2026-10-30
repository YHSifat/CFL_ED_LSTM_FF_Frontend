"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import HorizonSelect from "@/components/HorizonSelect";
import KpiCard from "@/components/KpiCard";
import LoadState from "@/components/LoadState";
import ObservedPredictedChart from "@/components/ObservedPredictedChart";
import StationSelect from "@/components/StationSelect";
import {
  HORIZON_STEP,
  PERFORMANCE_DAYS,
  buildHorizonSeries,
  performanceWindow,
  useHorizonPerformance,
  useHorizonSkill,
  useStationStatus,
  type HorizonSkillRow,
} from "@/lib/liveData";
import { stations } from "@/lib/stations";
import { HORIZONS, type Horizon } from "@/lib/types";

type Scope = "station" | "all";

function isHorizon(v: string | null): v is Horizon {
  return !!v && (HORIZONS as string[]).includes(v);
}

const fmt = (v: number | null | undefined, digits = 3) => (v == null ? "–" : v.toFixed(digits));

function PerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stationParam = searchParams.get("station");
  const station = stations.find((s) => s.station_id === stationParam) ?? stations[0];
  const horizon = isHorizon(searchParams.get("h")) ? (searchParams.get("h") as Horizon) : "1D";
  const scope: Scope = searchParams.get("scope") === "all" ? "all" : "station";
  const step = HORIZON_STEP[horizon];
  const { from, to } = performanceWindow();

  function updateParams(next: { station?: string; h?: Horizon; scope?: Scope }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.station) params.set("station", next.station);
    if (next.h) params.set("h", next.h);
    if (next.scope) params.set("scope", next.scope);
    router.push(`/performance?${params.toString()}`, { scroll: false });
  }

  const statusMap = useStationStatus();
  const points = useHorizonPerformance(station.station_id, step, from, to);
  const stationSkill = useHorizonSkill(station.station_id, from, to);
  const tableSkill = useHorizonSkill(scope === "station" ? station.station_id : null, from, to);

  const live = statusMap.state === "ready" ? statusMap.data.get(station.station_id) : undefined;
  const dangerLevel = live?.danger_level ?? station.danger_level_m;
  const current = stationSkill.state === "ready" ? stationSkill.data.find((r) => r.step === step) : undefined;
  const series = points.state === "ready" && points.data.length ? buildHorizonSeries(points.data, dangerLevel) : null;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-xs font-medium text-text-secondary hover:text-accent">
            ← Map
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-text-primary">
            {station.station_name}{" "}
            <span className="font-mono text-sm font-normal text-text-tertiary">{station.station_id}</span>
          </h1>
          <p className="text-sm text-text-secondary">
            Forecast performance · last {PERFORMANCE_DAYS} days ({from} to {to})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StationSelect stations={stations} value={station.station_id} onChange={(id) => updateParams({ station: id })} />
          <HorizonSelect value={horizon} onChange={(h) => updateParams({ h })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <KpiCard label={`MAE (${horizon})`} value={fmt(current?.mae)} unit="m" accent />
        <KpiCard label="RMSE" value={fmt(current?.rmse)} unit="m" />
        <KpiCard label="NSE" value={fmt(current?.nse)} />
        <KpiCard
          label="MAE, repeat last reading"
          value={fmt(current?.mae_persistence)}
          unit="m"
          sub={current && <span className="text-xs text-text-tertiary">{current.n} readings scored</span>}
        />
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Observed vs. predicted {horizon} ahead</h2>
        <p className="mb-3 text-xs text-text-tertiary">
          Each predicted point comes from the forecast issued {stepDescription(step)} before that reading.
        </p>
        {series ? (
          <ObservedPredictedChart series={series} height={320} />
        ) : (
          <LoadState result={points} empty="No forecasts for this horizon in the window yet." height={320} />
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">All horizons</h2>
          <div className="inline-flex gap-1.5">
            {(["station", "all"] as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateParams({ scope: s })}
                className="rounded-full px-4 py-1.5 text-xs font-medium"
                style={
                  scope === s
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                }
              >
                {s === "station" ? "This station" : "All stations"}
              </button>
            ))}
          </div>
        </div>
        {tableSkill.state === "ready" ? (
          <HorizonTable rows={tableSkill.data} selected={horizon} onSelect={(h) => updateParams({ h })} />
        ) : (
          <LoadState result={tableSkill} empty="" />
        )}
        <p className="mt-3 text-xs text-text-tertiary">
          Errors in metres, only for readings FFWC has posted. Horizons count our forecast&apos;s 3-hourly steps after
          the issue day&apos;s 18:00 data: 3h = next day 06:00 (step 1), 6h = 09:00, 12h = 15:00, 1D = 18:00 (step 5),
          3D = step 15, 7D = step 35, 15D = step 75. NSE (Nash–Sutcliffe) is shown per station only. Forecasts issued
          before 30 Oct 2026 are hindcasts: the model was run later, using only data available on the issue day.
        </p>
      </div>
    </div>
  );
}

function stepDescription(step: number): string {
  const days = Math.ceil(step / 5);
  return `${days} day${days > 1 ? "s" : ""}`;
}

function HorizonTable({
  rows,
  selected,
  onSelect,
}: {
  rows: HorizonSkillRow[];
  selected: Horizon;
  onSelect: (h: Horizon) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-text-tertiary">
          <th className="py-1 font-medium">Horizon</th>
          <th className="py-1 text-right font-medium">Scored</th>
          <th className="py-1 text-right font-medium">MAE</th>
          <th className="py-1 text-right font-medium">RMSE</th>
          <th className="py-1 text-right font-medium">NSE</th>
          <th className="py-1 text-right font-medium">MAE repeat last</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border font-mono">
        {HORIZONS.map((h) => {
          const r = rows.find((row) => row.step === HORIZON_STEP[h]);
          const active = h === selected;
          const beatsPersistence = r && r.mae_persistence != null && r.mae < r.mae_persistence;
          return (
            <tr
              key={h}
              onClick={() => onSelect(h)}
              className="cursor-pointer hover:bg-background"
              style={active ? { background: "color-mix(in srgb, var(--accent) 10%, transparent)" } : undefined}
            >
              <td className="py-1.5 text-text-secondary">{h}</td>
              <td className="py-1.5 text-right text-text-tertiary">{r?.n ?? 0}</td>
              <td className="py-1.5 text-right" style={beatsPersistence ? { color: "var(--accent)", fontWeight: 600 } : undefined}>
                {fmt(r?.mae)}
              </td>
              <td className="py-1.5 text-right">{fmt(r?.rmse)}</td>
              <td className="py-1.5 text-right">{fmt(r?.nse)}</td>
              <td className="py-1.5 text-right text-text-tertiary">{fmt(r?.mae_persistence)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function PerformancePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading…</div>}>
      <PerformanceContent />
    </Suspense>
  );
}
