"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import FfwcComparisonChart from "@/components/FfwcComparisonChart";
import HorizonSelect from "@/components/HorizonSelect";
import KpiCard from "@/components/KpiCard";
import SampleDataBadge from "@/components/SampleDataBadge";
import StationSelect from "@/components/StationSelect";
import {
  getFfwcComparisonSeries,
  getFfwcPrediction,
  getFfwcValue,
  type FfwcMode,
} from "@/lib/sampleData";
import { stations } from "@/lib/stations";
import { HORIZONS, type Horizon } from "@/lib/types";

const FFWC_MODES: FfwcMode[] = ["Observed", "Official forecast"];

function isHorizon(v: string | null): v is Horizon {
  return !!v && (HORIZONS as string[]).includes(v);
}

function isFfwcMode(v: string | null): v is FfwcMode {
  return v === "Observed" || v === "Official forecast";
}

function todayIso(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function FfwcContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stationParam = searchParams.get("station");
  const station = stations.find((s) => s.station_id === stationParam) ?? stations[0];
  const horizon = isHorizon(searchParams.get("h")) ? (searchParams.get("h") as Horizon) : "15D";
  const date = searchParams.get("date") || todayIso();
  const mode = isFfwcMode(searchParams.get("mode")) ? (searchParams.get("mode") as FfwcMode) : "Observed";

  function updateParams(next: { station?: string; h?: Horizon; date?: string; mode?: FfwcMode }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.station) params.set("station", next.station);
    if (next.h) params.set("h", next.h);
    if (next.date) params.set("date", next.date);
    if (next.mode) params.set("mode", next.mode);
    if (!params.get("date")) params.set("date", date);
    if (!params.get("mode")) params.set("mode", mode);
    router.push(`/ffwc?${params.toString()}`, { scroll: false });
  }

  const ourPrediction = getFfwcPrediction(station, horizon, date);
  const ffwcValue = getFfwcValue(station, horizon, date, mode);
  const difference = ourPrediction - ffwcValue;
  const series = getFfwcComparisonSeries(station, horizon, date);

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
          <p className="text-sm text-text-secondary">FFWC comparison</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StationSelect stations={stations} value={station.station_id} onChange={(id) => updateParams({ station: id })} />
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && updateParams({ date: e.target.value })}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <HorizonSelect value={horizon} onChange={(h) => updateParams({ h })} />
          <SampleDataBadge />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1.5">
          {FFWC_MODES.map((m) => {
            const active = m === mode;
            return (
              <button
                key={m}
                type="button"
                onClick={() => updateParams({ mode: m })}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                style={
                  active
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                }
              >
                FFWC: {m}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-tertiary">
          {mode === "Observed"
            ? "Cards below use FFWC's observed gauge reading — a measured value, not a forecast."
            : "Cards below use FFWC's official forecast — a published projection, not a measured value."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <KpiCard label={`Our CFL-EDLSTM prediction (${horizon})`} value={ourPrediction.toFixed(2)} unit="m" />
        <KpiCard label={`FFWC value — ${mode}`} value={ffwcValue.toFixed(2)} unit="m" accent />
        <KpiCard label="Difference (ours − FFWC)" value={`${difference >= 0 ? "+" : ""}${difference.toFixed(2)}`} unit="m" />
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Our prediction vs. FFWC — 15-day window around {date}
        </h2>
        <FfwcComparisonChart series={series} height={320} />
        <p className="mt-3 text-xs text-text-tertiary">
          Data source:{" "}
          <a
            href="https://www.ffwc.gov.bd/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent"
          >
            Flood Forecasting &amp; Warning Centre (FFWC), Bangladesh Water Development Board (BWDB)
          </a>
          . Observed readings and official forecasts are distinct products and are not interchangeable.
        </p>
      </div>
    </div>
  );
}

export default function FfwcPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading…</div>}>
      <FfwcContent />
    </Suspense>
  );
}
