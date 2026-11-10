@AGENTS.md

# Water-Level Forecasting System (frontend)

Website for the CFL-EDLSTM Bangladesh water level forecasting thesis. It reads from Supabase
(anon key, read-only). The DB contract is `schema.sql` in the backend repo; the system overview
is in `../../CLAUDE.md`. The map, station panel, `/forecast`, `/performance` ("Forecast Performance")
and `/ffwc` are live; `/models` and `/explainability` are switched off (see Data).

## Stack
- Next.js 16 App Router (read `node_modules/next/dist/docs/` before using Next APIs, per AGENTS.md)
- React 19, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/postcss`), Recharts 3,
  `@supabase/supabase-js` 2
- Map: custom SVG, Web Mercator (`src/lib/projection.ts`) over an inline basemap
  (`src/lib/basemapMarkup.ts`, generated from FFWC's own GeoJSON outline and full river network; major
  rivers thick and labelled, the rest thin and unlabelled; see its header). No map library. Marker popup opens on hover; clicking selects the station for the side panel.
- Fonts: Plus Jakarta Sans + IBM Plex Mono via `next/font/google`; Manrope + Noto Sans Bengali for the
  logo wordmark (`font-brand`).
- Branding: "Bonna" logo in `src/components/BonnaLogo.tsx`, from the design references
  `public/Header.dc.html` (light) / `HeaderDark.dc.html` (dark). App icon: `src/app/icon.png`, `apple-icon.png`.
  The logo (`Brand` in `Sidebar.tsx`) is the only link home to the map; the nav has no map item.
- npm (`package-lock.json`). Path alias `@/*` → `src/*`.

## Commands
- `npm run dev`: dev server on :3000
- `npm run build` / `npm run start`
- `npm run lint`: ESLint 9 flat config (`eslint.config.mjs`). Keep `eslint-config-next` on the
  same version as `next` (16.x); the 14.x line needs ESLint 8 and breaks `npm install`.
- Env: copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (needed at build time; values are inlined)

## Structure
- `src/app/`: pages `/` (map), `/forecast`, `/models`, `/ffwc`, `/performance`, `/explainability`.
  Pages are client components; selection is kept in the URL (`?station=…&h=…`, `/ffwc` also `&issue=`),
  on the map too (`router.replace`), and the sidebar carries `station`/`h` to every tab. Pages get the
  station from `useSelectedStation(param)` (`src/lib/selectedStation.ts`): URL first, else the last
  picked station (localStorage `station`), else the first station, so one station stays selected
  across tabs, reloads and new browser tabs.
- `src/components/`: charts (`ObservedPredictedChart`, `FfwcComparisonChart`,
  `ModelComparisonChart`, `ModelMetricsBarChart`, `ShapBarChart`), `BangladeshMap`,
  `Sidebar`, selects, cards, `StatusPill`, `SampleDataBadge`.
- `src/lib/`: `types.ts` (Station, Horizon, status), `stations.ts` (loads `data/stations.json`),
  `supabase.ts` (client), `liveData.ts` (all Supabase queries, hooks, chart shaping),
  `sampleData.ts` (generated values for mock pages), `csv.ts` (forecast CSV export), `modelColors.ts`.
- `src/components/LoadState.tsx`: loading (skeleton) / error / empty placeholder for live data.
- `src/components/Skeleton.tsx`: shimmer placeholder (`.skeleton` sweep in `globals.css`) and `PageSkeleton`
  for Suspense fallbacks. While live data loads, show skeletons (`KpiCard loading`, `LoadState`), not text.
- `data/stations.json`: 25 stations with cluster, district, upazila, danger level.

## Data
- Live (client-side fetch via hooks in `liveData.ts`): `station_status` (fetched once per page
  load), `observed_wl` (last 30 days) and `latest_forecasts` (`source='ours'`, 75 3-hourly steps).
- Horizons map to the forecast step nearest to now + horizon (`forecastAt`).
- Cache: every fetch in `liveData.ts` goes through `cached(key, fetcher)` (`src/lib/dataCache.ts`), which
  keeps results in localStorage (`wlcache:v2:*`) until the database has new data. On page load (and
  every 5 min in an open tab) it calls RPC `data_stamp()` (newest `observed_wl.obs_time`,
  `forecasts.created_at`, `stations.updated_at`); a different stamp clears the cache, the same stamp
  serves from it. If the stamp call fails the old cache stays in use. So new data, including a manual
  admin-panel run, shows on the next load. The key must include every query argument; results must be
  JSON (cache rows, not `Map`s). Bump `v2` if a cached shape changes.
- `/ffwc`: issue days from RPC `comparison_issues`, the chosen day's forecasts (both sources) +
  readings, and matched error per lead day from RPC `comparison_skill` (aggregated in the DB).
  Default issue = newest with `n_observed > 0` (at least one matched point). A station with no issue
  days shows only a "choose another station" message (`NoIssues`), no chart or tables.
- `/performance`: last 15 days, observed vs the forecast made N steps ahead (RPC `horizon_performance`)
  and error per horizon (RPC `horizon_skill`). Horizons are steps of our 3-hourly output (`HORIZON_STEP`),
  not wall-clock hours: 3h = step 1 = next day 06:00 after the issue day's 18:00 data.
- Switched off via `src/lib/features.ts` (hides the nav item and the page): `/models`
  (`FEATURES.modelComparison`) and `/explainability` (`FEATURES.explainability`, mock SHAP data).
  When wiring a page, add queries to `liveData.ts`, read only what backend `schema.sql` exposes,
  and remove its badge.

## Conventions
- Station ids are FFWC WL codes (`SW7.5`), the same as backend `stations.id`.
- Colors come from CSS variables in `src/app/globals.css` (`--status-*`, `--cluster-*`, `--series-ffwc`,
  `--logo-*`). Don't hard-code colours: every variable has a dark value under `.dark`.
- Dark mode: `dark` class on `<html>`, set before paint by the inline script in `app/layout.tsx` (saved
  choice in localStorage `theme`, else the system setting) and toggled by `ThemeToggle` (sidebar footer,
  mobile top bar). Tailwind `dark:` variant works. The generated basemap is recoloured by
  `.dark .basemap [fill="…"]` rules in `globals.css`; add a rule there if the basemap gains a colour.
- Responsive at Tailwind `lg` (1024px): below it the sidebar is a top bar + drawer (`Sidebar.tsx`), the map
  page stacks map over panel (panel is sticky only at `lg`), KPI cards wrap two per row. Wide tables get
  `overflow-x-auto`. Keep new pages free of horizontal overflow at 390px wide.
- Only the Supabase **anon** key may appear here (via `NEXT_PUBLIC_*`). Never the DB password
  or `service_role` key. `.env*` is gitignored.
- A change that needs a new/changed view goes in the backend `schema.sql` in the same task,
  committed separately in each repo.
