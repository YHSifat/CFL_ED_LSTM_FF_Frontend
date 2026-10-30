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
  (`src/lib/basemapMarkup.ts`, generated from FFWC's own GeoJSON outline and river layers; see its
  header). No map library. Marker popup opens on hover; clicking selects the station for the side panel.
- Fonts: Plus Jakarta Sans + IBM Plex Mono via `next/font/google`.
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
  Pages are client components; selection is kept in the URL (`?station=…&h=…`, `/ffwc` also `&date=`).
- `src/components/`: charts (`ObservedPredictedChart`, `FfwcComparisonChart`,
  `ModelComparisonChart`, `ModelMetricsBarChart`, `ShapBarChart`), `BangladeshMap`,
  `Sidebar`, selects, cards, `StatusPill`, `SampleDataBadge`.
- `src/lib/`: `types.ts` (Station, Horizon, status), `stations.ts` (loads `data/stations.json`),
  `supabase.ts` (client), `liveData.ts` (all Supabase queries, hooks, chart shaping),
  `sampleData.ts` (generated values for mock pages), `csv.ts` (forecast CSV export), `modelColors.ts`.
- `src/components/LoadState.tsx`: loading / error / empty placeholder for live data.
- `data/stations.json`: 25 stations with cluster, district, upazila, danger level.

## Data
- Live (client-side fetch via hooks in `liveData.ts`): `station_status` (fetched once per page
  load), `observed_wl` (last 30 days) and `latest_forecasts` (`source='ours'`, 75 3-hourly steps).
- Horizons map to the forecast step nearest to now + horizon (`forecastAt`).
- `/ffwc`: issue days from RPC `comparison_issues`, the chosen day's forecasts (both sources) +
  readings, and matched error per lead day from RPC `comparison_skill` (aggregated in the DB).
- `/performance`: last 15 days, observed vs the forecast made N steps ahead (RPC `horizon_performance`)
  and error per horizon (RPC `horizon_skill`). Horizons are steps of our 3-hourly output (`HORIZON_STEP`),
  not wall-clock hours: 3h = step 1 = next day 06:00 after the issue day's 18:00 data.
- Switched off via `src/lib/features.ts` (hides the nav item and the page): `/models`
  (`FEATURES.modelComparison`) and `/explainability` (`FEATURES.explainability`, mock SHAP data).
  When wiring a page, add queries to `liveData.ts`, read only what backend `schema.sql` exposes,
  and remove its badge.

## Conventions
- Station ids are FFWC WL codes (`SW7.5`), the same as backend `stations.id`.
- Colors come from CSS variables in `src/app/globals.css` (`--status-*`, `--cluster-*`).
- Only the Supabase **anon** key may appear here (via `NEXT_PUBLIC_*`). Never the DB password
  or `service_role` key. `.env*` is gitignored.
- A change that needs a new/changed view goes in the backend `schema.sql` in the same task,
  committed separately in each repo.
