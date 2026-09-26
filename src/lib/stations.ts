import stationsData from "../../data/stations.json";
import type { Cluster, Station } from "./types";

export const stations = stationsData as Station[];

export const CLUSTERS: Cluster[] = ["Upstream", "Mid-river", "Downstream", "Urban"];

export function getStation(stationId: string): Station | undefined {
  return stations.find((s) => s.station_id === stationId);
}

export function getStationsByCluster(cluster: Cluster): Station[] {
  return stations.filter((s) => s.cluster === cluster);
}

export const CLUSTER_COLOR_VAR: Record<Cluster, string> = {
  Upstream: "var(--cluster-upstream)",
  "Mid-river": "var(--cluster-midriver)",
  Downstream: "var(--cluster-downstream)",
  Urban: "var(--cluster-urban)",
};
