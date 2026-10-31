/**
 * localStorage cache for Supabase reads, valid for one "data day".
 *
 * The engine writes new data once a day (nightly run at 23:50 Asia/Dhaka, see the backend
 * CLAUDE.md), so a result fetched today stays good until the next day: every query is sent at most
 * once per data day per browser, and later visits read from localStorage. The data day turns over
 * at ROLLOVER_HOUR Dhaka time, not midnight, so that a visit just after midnight (before the
 * nightly run has finished writing) doesn't cache yesterday's data for the whole day.
 *
 * Entries from earlier days are deleted when first noticed. Failures (storage blocked or full)
 * fall back to fetching; errors are never cached.
 */

const PREFIX = "wlcache:v1:";
const DAY_KEY = `${PREFIX}day`;
const TZ = "Asia/Dhaka";
/** Hour (Dhaka time) at which cached data expires. */
const ROLLOVER_HOUR = 1;

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // YYYY-MM-DD

/** The current data day: the Dhaka date, shifted so it changes at ROLLOVER_HOUR. */
function dataDay(): string {
  return dayFormat.format(new Date(Date.now() - ROLLOVER_HOUR * 3600 * 1000));
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // blocked (e.g. some private modes)
  }
}

/** Remove every cache entry (keeps other localStorage keys such as theme and station). */
function clearCache(store: Storage) {
  for (let i = store.length - 1; i >= 0; i--) {
    const k = store.key(i);
    if (k?.startsWith(PREFIX)) store.removeItem(k);
  }
}

/** Storage for today's entries, after dropping any from an earlier day. */
function todaysStore(): Storage | null {
  const store = storage();
  if (!store) return null;
  try {
    const day = dataDay();
    if (store.getItem(DAY_KEY) !== day) {
      clearCache(store);
      store.setItem(DAY_KEY, day);
    }
    return store;
  } catch {
    return null;
  }
}

/** Requests in flight, so two components asking for the same key share one fetch. */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * `fetcher()`'s result, from localStorage if it was fetched earlier in the current data day.
 * The result must be JSON-serialisable (plain objects and arrays).
 */
export function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const store = todaysStore();
  const storeKey = PREFIX + key;
  const hit = store?.getItem(storeKey);
  if (hit != null) {
    try {
      return Promise.resolve(JSON.parse(hit) as T);
    } catch {
      store?.removeItem(storeKey); // corrupt entry: refetch
    }
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = fetcher()
    .then((data) => {
      if (store) {
        const json = JSON.stringify(data);
        try {
          store.setItem(storeKey, json);
        } catch {
          // Quota full: start the day's cache over and try once more; else just don't cache.
          try {
            clearCache(store);
            store.setItem(DAY_KEY, dataDay());
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
