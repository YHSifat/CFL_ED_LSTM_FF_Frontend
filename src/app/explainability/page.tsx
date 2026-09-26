"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ShapBarChart from "@/components/ShapBarChart";
import HorizonSelect from "@/components/HorizonSelect";
import StationSelect from "@/components/StationSelect";
import SampleDataBadge from "@/components/SampleDataBadge";
import { getShapImportance, type ShapFeature } from "@/lib/sampleData";
import { stations } from "@/lib/stations";
import { HORIZONS, type Horizon } from "@/lib/types";

function isHorizon(v: string | null): v is Horizon {
  return !!v && (HORIZONS as string[]).includes(v);
}

/** Names the top 2 contributors, or 3 if the top 2 don't already dominate. */
function buildShapSummary(ranked: ShapFeature[]): string {
  const topTwoShare = ranked[0].share + ranked[1].share;
  const top = ranked.slice(0, topTwoShare >= 0.55 ? 2 : 3);
  const names = top.map((f) => f.feature);
  const list =
    names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names[0]}, ${names[1]}, and ${names[2]}`;
  const combinedPercent = Math.round(top.reduce((sum, f) => sum + f.share, 0) * 100);
  const verb = names.length > 1 ? "are" : "is";
  const noun = names.length > 1 ? "contributors" : "contributor";
  return `${list} ${verb} the top ${noun} to this forecast, together accounting for ${combinedPercent}% of the model's attributed importance.`;
}

function ExplainabilityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stationParam = searchParams.get("station");
  const station = stations.find((s) => s.station_id === stationParam) ?? stations[0];
  const horizon = isHorizon(searchParams.get("h")) ? (searchParams.get("h") as Horizon) : "15D";

  function updateParams(next: { station?: string; h?: Horizon }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.station) params.set("station", next.station);
    if (next.h) params.set("h", next.h);
    router.push(`/explainability?${params.toString()}`, { scroll: false });
  }

  const shares = getShapImportance(station, horizon);
  const summary = buildShapSummary(shares);

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
          <p className="text-sm text-text-secondary">SHAP explainability</p>
        </div>

        <div className="flex items-center gap-3">
          <StationSelect stations={stations} value={station.station_id} onChange={(id) => updateParams({ station: id })} />
          <HorizonSelect value={horizon} onChange={(h) => updateParams({ h })} />
          <SampleDataBadge />
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Feature importance</h2>
        <p className="mb-4 text-sm text-text-secondary">{summary}</p>
        <ShapBarChart shares={shares} height={220} />
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Ranked contributors</h2>
        <ol className="divide-y divide-border">
          {shares.map((s, i) => (
            <li key={s.feature} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-5 shrink-0 font-mono text-xs text-text-tertiary">{i + 1}</span>
              <span className="flex-1 text-text-primary">{s.feature}</span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.share * 100}%`, background: "var(--accent)", opacity: 1 - i * 0.15 }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-text-primary">
                {(s.share * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function ExplainabilityPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-secondary">Loading…</div>}>
      <ExplainabilityContent />
    </Suspense>
  );
}
