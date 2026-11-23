# Bonna · Flood Forecast (frontend)

Website for **Bonna**, the water-level forecasting system built for the B.Sc. thesis
*Clustered Federated Learning with Encoder-Decoder LSTM for Multi-Horizon Water-Level
Forecasting in Bangladesh* (Reshma Kakoli and Md Yusuf Hasan, supervised by Dr Sajeeb Saha,
Department of CSE, Jagannath University).

It shows observed and forecast river water levels for 25 Bangladesh Water Development Board
(BWDB) gauge stations on a map, with 15-day forecasts and comparisons against the official
forecasts of the Flood Forecasting and Warning Centre (FFWC).

## Overview

Bangladesh lies downstream of the Ganges-Brahmaputra-Meghna basin, and timely water-level
forecasts help people prepare for floods. The thesis model, **CFL-EDLSTM**, combines:

- **Clustered federated learning**: the 25 stations are grouped into 4 hydrological clusters
  (Upstream, Mid-river, Downstream, Urban). Each cluster trains its own model, and the clusters
  share what they learn through weighted FedAvg without pooling their data.
- **Multi-horizon forecasting**: from the last 30 days of readings (5 a day, 06:00 to 18:00),
  the model predicts the next 15 days (75 values), from 3 hours up to 15 days ahead.

In the thesis tests, CFL-EDLSTM had the lowest error of the five models compared (MAE 0.321 m,
RMSE 0.521 m, against XGBoost, Vanilla LSTM, GRU and TCN). This website is the thesis's
web-based visualization step: it puts the live forecasts in front of users.

The forecasts are produced by the local engine in the backend repo
([`CFL_ED_LSTM_FF_Backend`](../CFL_ED_LSTM_FF_Backend/flood-engine/README.md)), which scrapes FFWC,
runs the model every night and writes the results to Supabase. This site only reads them.

## Features

- **Station map** (`/`): a Bangladesh map with the river network and all 25 stations, coloured
  by status (normal, warning, danger) against each station's danger level. Hover for current
  water level; click to open the station panel with its recent history and forecast.
- **Station forecast** (`/forecast`): the past 30 days of observed water level and the 15-day
  forecast on one chart, the forecast value at a chosen horizon (3h, 6h, 12h, 1D, 3D, 7D, 15D),
  the danger level, and CSV download of the forecast.
- **Forecast performance** (`/performance`): for the last 15 days, observed water level against
  the forecast made N steps earlier, with MAE and RMSE per horizon.
- **FFWC comparison** (`/ffwc`): our forecast and FFWC's for the same issue day, plotted against
  what was then observed, with the error per lead day for both on matched times.
- **Model comparison** and **Explainability (SHAP)**: built but switched off in
  `src/lib/features.ts` until the thesis results are loaded (they use sample data today).
- Light and dark themes, works on phones, and the selected station and horizon stay in the URL
  so a view can be shared.
- Data is cached in the browser and refreshed only when the database has new readings or forecasts.

### Stations

| Cluster | Stations |
|---|---|
| Upstream (6) | Dalia, Kaunia, Kurigram, Badarganj, Noonkhawa, Chilmari |
| Mid-river (8) | Chak-Rahimpur, Gaibandha, Fulchari, Bogra, Sirajganj, Kazipur, Mathurpara, Jamalpur |
| Downstream (5) | Baghabari, Singra, Mymensingh, Elashin, Taraghat |
| Urban (6) | Jagir, Dhaka (Mill Barrack), Mirpur, Lakhpur, Narayanganj, Demra |

Station metadata (river, district, upazila, cluster, danger level) is in `data/stations.json`.
Station ids are FFWC water-level codes such as `SW7.5`, the same as in the backend.

## Architecture

```
 ffwc.gov.bd ──► backend engine (scrape → model → db) ──► Supabase Postgres ──► this website
                                                          tables, views, RLS     (anon key, read-only)
```

- There is no server of its own: pages are client components that query Supabase's REST API
  with the public **anon** key. Row-level security makes that key read-only.
- What the site may read is defined in the backend's `schema.sql`: tables `stations`,
  `observed_wl`, `forecasts`, views such as `station_status` and `latest_forecasts`, and
  functions such as `comparison_skill()` and `horizon_skill()`.

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts 3,
`@supabase/supabase-js` 2. The map is a hand-made SVG (Web Mercator projection, basemap built
from FFWC's own river network), with no map library.

```
src/
  app/            pages: / (map), /forecast, /performance, /ffwc, /models, /explainability
  components/     map, charts, sidebar, station panel, cards, selects
  lib/
    liveData.ts   all Supabase queries and data hooks
    dataCache.ts  browser cache, cleared when data_stamp() changes
    supabase.ts   Supabase client
    stations.ts   loads data/stations.json
    features.ts   switches pages on or off
    projection.ts, basemapMarkup.ts   map projection and basemap
data/stations.json  the 25 stations
```

## How to run

Requirements: Node.js 20+ and npm, plus the URL and anon key of the Supabase project the
backend writes to.

```bash
npm install
cp .env.example .env.local     # then fill in the two values below
npm run dev                    # http://localhost:3000
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` public key |

Only the anon key belongs here. Never put the `service_role` key or the database password in
this repo or in any `NEXT_PUBLIC_*` variable.

Other commands:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

### Deploying

Any static-friendly Next.js host works (for example Vercel's free plan). Set the two
`NEXT_PUBLIC_*` variables in the host's settings before building: their values are written into
the build.

## Limitations

- Forecasts exist only for the 25 stations the model was trained on.
- Before the nightly job ran, past forecasts (October 2026) were made as hindcasts. FFWC
  comparisons use the FFWC bulletins that have been imported so far.
- Model comparison and SHAP pages are switched off until real thesis results replace the sample data.
