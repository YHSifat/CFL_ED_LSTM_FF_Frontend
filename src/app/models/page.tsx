"use client";

import Link from "next/link";
import { FEATURES } from "@/lib/features";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import ModelComparisonChart from "@/components/ModelComparisonChart";
import ModelMetricsTable from "@/components/ModelMetricsTable";
import ModelMetricsBarChart from "@/components/ModelMetricsBarChart";
import StationSelect from "@/components/StationSelect";
import SampleDataBadge from "@/components/SampleDataBadge";
import { getModelComparisonSeries, getModelMetrics } from "@/lib/sampleData";
import { useSelectedStation } from "@/lib/selectedStation";
import { stations } from "@/lib/stations";

// Model comparison is always evaluated over the full 15-day window, so the
// "Overall" metrics and the trajectory chart both use a fixed horizon —
// there's no separate lead-time selector on this page.
const EVAL_HORIZON = "15D";

function ModelsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stationParam = searchParams.get("station");
  const station = useSelectedStation(stationParam);

  function updateStation(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("station", id);
    router.push(`/models?${params.toString()}`, { scroll: false });
  }

  const metrics = getModelMetrics(station, EVAL_HORIZON);
  const series = getModelComparisonSeries(station, EVAL_HORIZON);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/?station=${encodeURIComponent(station.station_id)}`} className="text-xs font-medium text-text-secondary hover:text-accent">
            ← Map
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-text-primary">
            {station.station_name}{" "}
            <span className="font-mono text-sm font-normal text-text-tertiary">{station.station_id}</span>
          </h1>
          <p className="text-sm text-text-secondary">Model comparison · 15-day evaluation window</p>
        </div>

        <div className="flex items-center gap-3">
          <StationSelect stations={stations} value={station.station_id} onChange={updateStation} />
          <SampleDataBadge />
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Metrics matrix</h2>
        <ModelMetricsTable metrics={metrics} />
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Metric comparison</h2>
        <ModelMetricsBarChart metrics={metrics} />
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Observed vs. all models (15 days)</h2>
        <ModelComparisonChart series={series} height={340} />
      </div>
    </div>
  );
}

export default function ModelsPage() {
  if (!FEATURES.modelComparison) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        Model comparison is turned off for now.{" "}
        <Link href="/" className="font-medium text-accent">
          Back to the map
        </Link>
      </div>
    );
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModelsContent />
    </Suspense>
  );
}
