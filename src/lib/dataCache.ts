/**
 * localStorage cache for Supabase reads, kept until the database has newer data.
 *
 * Before the first read on a page load, and again whenever the last check is older than
 * CHECK_INTERVAL_MS, the site calls the RPC `data_stamp()` (backend schema.sql). It returns
 * the newest reading time, the newest forecast write and the last station edit, and is cheap
 * (index lookups only). If the stamp differs from the one saved with the cache, the database
 * has new water levels or predictions: every cached entry is dropped and queries go to
 * Supabase again. If it matches, cached results are used and no other query is sent.
 *
 * If the stamp can't be fetched (offline, Supabase paused), the existing cache stays in use.
 * Failures to use storage (blocked or full) fall back to fetching; errors are never cached.
 */

import { supabase } from "./supabase";

const ROOT = "wlcache:"; // every version's entries start with this
const PREFIX = `${ROOT}v2:`;
const STAMP_KEY = `${PREFIX}stamp`;
/** How often an open tab asks the database whether it has new data. */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // blocked (e.g. some private modes)
  }
}

/** Remove every cache entry, this version's and older ones (keeps theme, station, ...). */
function clearCache(store: Storage) {
  for (let i = store.length - 1; i >= 0; i--) {
    const k = store.key(i);
    if (k?.startsWith(ROOT)) store.removeItem(k);
  }
}

async function fetchStamp(): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("data_stamp");
  if (error) throw new Error(error.message);
  return JSON.stringify((data as unknown[] | null)?.[0] ?? null);
}

let check: { at: number; done: Promise<void> } | null = null;

/** Make sure the cache belongs to the database's current data (at most once per interval). */
function validate(store: Storage): Promise<void> {
  if (check && Date.now() - check.at < CHECK_INTERVAL_MS) return check.done;
  const done = fetchStamp().then(
    (stamp) => {
      try {
        if (store.getItem(STAMP_KEY) !== stamp) {
          clearCache(store);
          store.setItem(STAMP_KEY, stamp);
        }
      } catch {
        /* storage unusable: reads below just miss */
      }
    },
    () => {
      check = null; // couldn't reach the DB: keep the cache, ask again next time
    }
  );
  check = { at: Date.now(), done };
  return done;
}

/** Requests in flight, so two components asking for the same key share one fetch. */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * `fetcher()`'s result, from localStorage if it was fetched since the database last changed.
 * The key must include every query argument; the result must be JSON (plain objects and arrays).
 */
export async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const store = storage();
  if (store) await validate(store);

  const storeKey = PREFIX + key;
  let stamp: string | null = null;
  if (store) {
    try {
      stamp = store.getItem(STAMP_KEY);
      const hit = store.getItem(storeKey);
      if (hit != null) return JSON.parse(hit) as T;
    } catch {
      try {
        store.removeItem(storeKey); // corrupt entry: refetch
      } catch {
        /* ignore */
      }
    }
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = fetcher()
    .then((data) => {
      // Only store if the cache still belongs to the stamp this fetch started under, so a
      // result that raced a data change isn't saved as current.
      if (store && stamp != null) {
        const json = JSON.stringify(data);
        try {
          if (store.getItem(STAMP_KEY) === stamp) store.setItem(storeKey, json);
        } catch {
          // Quota full: start the cache over (same stamp) and try once more; else don't cache.
          try {
            clearCache(store);
            store.setItem(STAMP_KEY, stamp);
            store.setItem(storeKey, json);
          } catch {
            /* not cached */
          }
        }
      }
      return data;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
