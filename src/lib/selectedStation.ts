"use client";

import { useEffect, useSyncExternalStore } from "react";
import { stations } from "./stations";
import type { Station } from "./types";

/**
 * The selected station, shared by every page. The URL (?station=…) wins; without it, the last
 * station the user picked on any page (saved in localStorage) is used, else the first station.
 * So a station picked on one tab is still selected after switching tabs, reloading, or opening
 * the site in a new browser tab.
 */
const KEY = "station";

const byId = (id: string | null) => (id ? stations.find((s) => s.station_id === id) : undefined);

function readSaved(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Other browser tabs changing the station.
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function save(id: string) {
  if (readSaved() === id) return;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Storage blocked: the URL still carries the selection.
  }
  listeners.forEach((l) => l());
}

export function useSelectedStation(stationParam: string | null): Station {
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  const fromUrl = byId(stationParam);
  const station = fromUrl ?? byId(saved) ?? stations[0];

  // Remember explicit picks (they always go into the URL), so the next page opens on them. Only
  // URL values are saved: during hydration `saved` reads null, and saving the fallback would
  // overwrite the real choice.
  const urlId = fromUrl?.station_id;
  useEffect(() => {
    if (urlId) save(urlId);
  }, [urlId]);

  return station;
}
