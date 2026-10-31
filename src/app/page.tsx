"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import BangladeshMap from "@/components/BangladeshMap";
import { PageSkeleton } from "@/components/Skeleton";
import StationDetailsPanel from "@/components/StationDetailsPanel";
import StationSelect from "@/components/StationSelect";
import { useSelectedStation } from "@/lib/selectedStation";
import { CLUSTERS, stations } from "@/lib/stations";
import { HORIZONS, type Cluster, type Horizon } from "@/lib/types";

type ClusterFilter = Cluster | "All";

function isHorizon(v: string | null): v is Horizon {
  return !!v && (HORIZONS as string[]).includes(v);
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<ClusterFilter>("All");

  // Station and horizon live in the URL (?station=…&h=…) like on the other pages; without
  // ?station the last selected station is shown (lib/selectedStation.ts).
  const stationParam = searchParams.get("station");
  const selectedStationId = useSelectedStation(stationParam).station_id;
  const horizon = isHorizon(searchParams.get("h")) ? (searchParams.get("h") as Horizon) : "15D";

  function updateParams(next: { station?: string; h?: Horizon }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.station) params.set("station", next.station);
    if (next.h) params.set("h", next.h);
    // replace, not push: clicking through markers shouldn't fill the back-button history.
    router.replace(`/?${params.toString()}`, { scroll: false });
  }
  const setSelectedStationId = (id: string | null) => id && updateParams({ station: id });
  const setHorizon = (h: Horizon) => updateParams({ h });

  const visibleStations = useMemo(
    () => (filter === "All" ? stations : stations.filter((s) => s.cluster === filter)),
    [filter]
  );

  const selectedStation = stations.find((s) => s.station_id === selectedStationId) ?? null;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Home / Interactive Map</h1>
          <p className="text-sm text-text-secondary">25 BWDB gauge stations across 4 federated-learning clusters</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1.5">
          {(["All", ...CLUSTERS] as ClusterFilter[]).map((c) => {
            const active = filter === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                style={
                  active
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                }
              >
                {c}
              </button>
            );
          })}
        </div>

        <StationSelect
          stations={visibleStations}
          value={selectedStationId ?? ""}
          onChange={setSelectedStationId}
          placeholder="Jump to station…"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* The map keeps the basemap's proportions (704x937), so the page scrolls through it. */}
        <div className="aspect-[704/937] w-full lg:col-span-2">
          <BangladeshMap
            stations={visibleStations}
            selectedStationId={selectedStationId}
            onSelectStation={setSelectedStationId}
          />
        </div>
        {/* Wide screens: sticky, so once the grid reaches the top only the map keeps scrolling.
            Narrow screens: the panel simply follows the map. */}
        <div className="flex w-full flex-col lg:sticky lg:top-6 lg:col-span-1 lg:max-h-[calc(100vh-3rem)] lg:self-start">
          <StationDetailsPanel station={selectedStation} horizon={horizon} onHorizonChange={setHorizon} />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
