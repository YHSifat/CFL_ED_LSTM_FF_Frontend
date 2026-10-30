"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ObservedPredictedChart from "@/components/ObservedPredictedChart";
import HorizonSelect from "@/components/HorizonSelect";
import KpiCard from "@/components/KpiCard";
import StatusPill from "@/components/StatusPill";
import LoadState from "@/components/LoadState";
import StationSelect from "@/components/StationSelect";
import { downloadCsv, buildForecastCsv } from "@/lib/csv";
import {
  buildSeries,
  forecastAt,
  forecastSummary,
  formatTime,
  latestReadings,
  toStatus,
  useStationDetail,
  useStationStatus,
} from "@/lib/liveData";
import { stations } from "@/lib/stations";
import { HORIZONS, type Horizon } from "@/lib/types";

function isHorizon(v: string | null): v is Horizon {
  return !!v && (HORIZONS as string[]).includes(v);
}

function ForecastContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stationParam = searchParams.get("station");
  const station = stations.find((s) => s.station_id === stationParam) ?? stations[0];
  const horizon = isHorizon(searchParams.get("h")) ? (searchParams.get("h") as Horizon) : "15D";

  function updateParams(next: { station?: string; h?: Horizon }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.station) params.set("station", next.station);
    if (next.h) params.set("h", next.h);
    router.push(`/forecast?${params.toString()}`, { scroll: false });
  }

  const statusMap = useStationStatus();
  const detail = useStationDetail(station.station_id);

  const live = statusMap.state === "ready" ? statusMap.data.get(station.station_id) : undefined;
  const dangerLevel = live?.danger_level ?? station.danger_level_m;
  const data = detail.state === "ready" ? detail.data : null;
  const { current, previous } = data ? latestReadings(data) : { current: null, previous: null };
  const forecast = data ? forecastAt(data, horizon) : null;
  const summary = data ? forecastSummary(data, HORIZONS, current?.wl ?? null) : [];
  const series = data && data.observed.length ? buildSeries(data, horizon, dangerLevel) : null;

  function handleDownload() {
    if (!series || !current) return;
    const csv = buildForecastCsv(station, horizon, current.wl, previous?.wl ?? current.wl, summary, series);
    downloadCsv(`${station.station_id}_forecast.csv`, csv);
  }

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
            {station.cluster} · {station.river_name} · {station.district}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StationSelect stations={stations} value={station.station_id} onChange={(id) => updateParams({ station: id })} />
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Station details</h2>
        <dl className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-text-secondary">Type</dt>
            <dd className="mt-0.5 text-text-primary">{station.station_type}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">District</dt>
            <dd className="mt-0.5 text-text-primary">{station.district}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Upazila</dt>
            <dd className="mt-0.5 text-text-primary">{station.upazila}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Cluster</dt>
            <dd className="mt-0.5 text-text-primary">{station.cluster}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <KpiCard
          label="Current WL"
          value={current ? current.wl.toFixed(2) : "–"}
          unit="m"
          sub={current && <span className="text-xs text-text-tertiary">{formatTime(current.time)}</span>}
        />
        <KpiCard
          label="Previous day WL"
          value={previous ? previous.wl.toFixed(2) : "–"}
          unit="m"
          sub={previous && <span className="text-xs text-text-tertiary">{formatTime(previous.time)}</span>}
        />
        <KpiCard
          label="Danger level"
          value={dangerLevel.toFixed(2)}
          unit="m"
          valueColor="var(--status-danger-fg)"
          sub={statusMap.state === "ready" && <StatusPill status={toStatus(live)} />}
        />
        <KpiCard
          label={`Predicted WL (${horizon})`}
          value={forecast ? forecast.wl.toFixed(2) : "–"}
          unit="m"
          sub={
            forecast && (
              <span className="inline-flex flex-col">
                {current && <DeltaLabel delta={forecast.wl - current.wl} onAccent />}
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {formatTime(forecast.time)}
                </span>
              </span>
            )
          }
          accent
        />
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Observed vs. predicted</h2>
          <HorizonSelect value={horizon} onChange={(h) => updateParams({ h })} />
        </div>
        {series ? (
          <ObservedPredictedChart series={series} height={320} />
        ) : (
          <LoadState result={detail} empty="No readings for this station yet." height={320} />
        )}
        {data?.issuedOn && (
          <p className="mt-2 text-xs text-text-tertiary">
            Forecast issued {data.issuedOn} (input up to that day&apos;s 18:00 reading).
          </p>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Forecast summary</h2>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!series || !current}
            className="inline-flex disabled:opacity-50 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download CSV
          </button>
        </div>
        {summary.length === 0 && <LoadState result={detail} empty="No forecast for this station yet." />}
        <ul className="divide-y divide-border">
          {summary.map((row) => (
            <li key={row.horizon} className="flex items-center justify-between py-2 text-sm">
              <span className="font-mono text-text-secondary">
                {row.horizon} <span className="text-xs text-text-tertiary">({formatTime(row.time)})</span>
              </span>
              <span className="font-mono font-medium text-text-primary">{row.value.toFixed(2)} m</span>
              <DeltaLabel delta={row.deltaVsCurrent} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeltaLabel({ delta, onAccent = false }: { delta: number; onAccent?: boolean }) {
  const up = delta > 0;
  const flat = Math.abs(delta) < 0.005;
  const color = onAccent
    ? "rgba(255,255,255,0.85)"
    : flat
      ? "var(--text-tertiary)"
      : up
        ? "var(--status-danger-fg)"
        : "var(--status-normal-fg)";
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs font-medium" style={{ color }}>
      {!flat && (up ? "▲" : "▼")} {Math.abs(delta).toFixed(2)} m
    </span>
  );
}

export default function ForecastPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading…</div>}>
      <ForecastContent />
    </Suspense>
  );
}
