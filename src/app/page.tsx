"use client";

import { useMemo, useState } from "react";
import BangladeshMap from "@/components/BangladeshMap";
import ClusterCard from "@/components/ClusterCard";
import SampleDataBadge from "@/components/SampleDataBadge";
import StationDetailsPanel from "@/components/StationDetailsPanel";
import StationSelect from "@/components/StationSelect";
import { CLUSTERS, getStationsByCluster, stations } from "@/lib/stations";
import type { Cluster, Horizon } from "@/lib/types";

type ClusterFilter = Cluster | "All";

const DEFAULT_STATION_ID = stations.find((s) => s.station_name === "Dalia")?.station_id ?? stations[0].station_id;

export default function HomePage() {
  const [filter, setFilter] = useState<ClusterFilter>("All");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(DEFAULT_STATION_ID);
  const [horizon, setHorizon] = useState<Horizon>("15D");

  const counts = useMemo(() => {
    const map = new Map<Cluster, number>();
    for (const c of CLUSTERS) map.set(c, getStationsByCluster(c).length);
    return map;
  }, []);

  const visibleStations = useMemo(
    () => (filter === "All" ? stations : stations.filter((s) => s.cluster === filter)),
    [filter]
  );

  const selectedStation = stations.find((s) => s.station_id === selectedStationId) ?? null;

  function toggleCluster(cluster: Cluster) {
    setFilter((prev) => (prev === cluster ? "All" : cluster));
  }

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Home / Interactive Map</h1>
          <p className="text-sm text-text-secondary">25 BWDB gauge stations across 4 federated-learning clusters</p>
        </div>
        <SampleDataBadge />
      </div>

      <div className="flex flex-wrap gap-3">
        {CLUSTERS.map((cluster) => (
          <ClusterCard
            key={cluster}
            cluster={cluster}
            count={counts.get(cluster) ?? 0}
            active={filter === cluster}
            onClick={() => toggleCluster(cluster)}
          />
        ))}
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
          onChange={(id) => setSelectedStationId(id || null)}
          placeholder="Jump to station…"
        />
      </div>

      <div className="grid min-h-[480px] flex-1 grid-cols-3 gap-5">
        <div className="col-span-2 h-full w-full">
          <BangladeshMap
            stations={visibleStations}
            selectedStationId={selectedStationId}
            onSelectStation={setSelectedStationId}
          />
        </div>
        <div className="col-span-1 h-full w-full">
          <StationDetailsPanel station={selectedStation} horizon={horizon} onHorizonChange={setHorizon} />
        </div>
      </div>
    </div>
  );
}
