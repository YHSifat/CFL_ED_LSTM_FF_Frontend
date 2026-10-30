export type Cluster = "Upstream" | "Mid-river" | "Downstream" | "Urban";

export interface Station {
  station_id: string;
  station_name: string;
  river_name: string;
  station_type: "Tidal" | "Non Tidal";
  district: string;
  upazila: string;
  latitude: number;
  longitude: number;
  cluster: Cluster;
  danger_level_m: number;
}

export type Horizon = "3h" | "6h" | "12h" | "1D" | "3D" | "7D" | "15D";

export const HORIZONS: Horizon[] = ["3h", "6h", "12h", "1D", "3D", "7D", "15D"];

export type WaterLevelStatus = "Normal" | "Warning" | "Above danger" | "No data";
