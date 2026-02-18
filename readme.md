# Auburn Parking Analytics

**Parking occupancy data collection and heatmap visualization for Auburn University parking decks.**

A full-stack data pipeline that crawls parking lot occupancy data every 5 minutes, stores it in PostgreSQL, aggregates it into heatmaps, and serves an interactive dashboard — all running 24/7 on free-tier cloud infrastructure.

> 🔗 **Live Site**: [auburn-parking-analytics.vercel.app](https://auburn-parking-analytics.vercel.app)

---

## Architecture Overview

```
  Auburn Parking API          Oracle Cloud (Ubuntu)              Cloudflare
  ┌───────────────┐     ┌──────────────────────────────┐    ┌──────────────┐
  │  FoPark API   │────▶│  Python Crawler (every 5min) │    │  R2 Bucket   │
  │  (3 decks)    │     │         │                    │    │  (JSON store)│
  └───────────────┘     │         ▼                    │    └──────┬───────┘
                        │    PostgreSQL DB             │           │
                        │         │                    │           │
                        │         ▼                    │    ┌──────▼───────┐
                        │  Heatmap Aggregator ─────────│───▶│  R2 Worker   │
                        │  (daily at midnight)         │    │  (CDN proxy) │
                        └──────────────────────────────┘    └──────┬───────┘
                                                                   │
                                                            ┌──────▼───────┐
                                                            │   Vercel     │
                                                            │  React App   │
                                                            │  (frontend)  │
                                                            └──────────────┘
```

---

## Tech Stack

| Layer                  | Technology                      | Purpose                                |
| ---------------------- | ------------------------------- | -------------------------------------- |
| **Data Collection**    | Python 3 + `requests`           | Crawl parking API every 5 minutes      |
| **Database**           | PostgreSQL                      | Store all historical occupancy data    |
| **Aggregation**        | Python + SQL                    | Compute heatmap matrices from raw data |
| **Object Storage**     | Cloudflare R2                    | Host pre-computed heatmap JSON files   |
| **CDN / API**          | Cloudflare Workers (TypeScript)  | Serve R2 objects with CORS headers     |
| **Frontend**           | React + Vite                    | Interactive heatmap dashboard          |
| **Hosting (Server)**   | Oracle Cloud — Ubuntu VM        | Runs crawler, DB, and scheduler 24/7   |
| **Hosting (Frontend)** | Vercel                          | Deploys and serves the React app       |

---

## Project Structure

```
auburn-parking-analytics/
├── server/                    # Backend — runs on Oracle Cloud Ubuntu VM
│   ├── start.py               # Central scheduler (crawl + daily tasks)
│   ├── parking_crawl.py       # API crawler for 3 parking decks
│   ├── db.py                  # PostgreSQL database layer (ORM-free)
│   ├── aggregate_heatmaps.py  # Generates heatmap JSON from DB data
│   ├── run.sh                 # Deployment script (nohup)
│   └── requirements.txt       # Python dependencies
│
├── r2-worker/                 # Cloudflare Worker — CDN proxy for R2
│   ├── src/index.ts           # Worker entrypoint (GET proxy with CORS)
│   ├── wrangler.jsonc         # Cloudflare config & R2 bucket binding
│   └── package.json
│
├── frontend/                  # React + Vite — deployed on Vercel
│   ├── src/
│   │   ├── App.jsx            # Main app with header, heatmaps, legend
│   │   ├── hooks/
│   │   │   └── useHeatmapData.js  # Data fetching + client-side aggregation
│   │   └── components/
│   │       ├── Header.jsx     # Controls: lot picker, day range, cell size, time range
│   │       ├── HeatmapGrid.jsx  # Canvas-rendered heatmap with tooltips
│   │       └── Legend.jsx     # Color scale legend
│   └── index.css              # Dark theme styles
│
├── data/                      # Weekly CSV exports (auto-committed by server)
├── .env_exmaple               # Environment variable template
└── readme1.md                 # ← You are here
```

---

## How It Works

### 1. Data Collection — `parking_crawl.py`

A Python crawler queries Auburn University's FoPark API for real-time EV charger occupancy across three parking decks:

- **Stadium Deck** — 4 EV spots (identified by GPS coordinates)
- **Athletics Deck** — 4 EV spots (identified by index position in status array)
- **Haley Deck** — 2 EV spots (identified by GPS coordinates)

Each crawl returns `[occupied, available]` counts per lot. The crawler runs every **5 minutes**, aligned to clock marks (`:00`, `:05`, `:10`, etc.), and writes directly to PostgreSQL with a timezone-aware timestamp (Central Time).

### 2. Central Scheduler — `start.py`

A long-running process on the Ubuntu server that orchestrates everything:

- **Every 5 minutes** → Crawls parking data and saves to PostgreSQL
- **Daily at midnight** → Runs three tasks:
  1. **Generate heatmaps** — Aggregates DB data into JSON matrices
  2. **Upload to R2** — Pushes JSON files to Cloudflare R2 via `boto3` (S3-compatible API)
  3. **Export CSV + Git push** — Exports weekly CSV files and auto-commits to this repo

The scheduler runs as a background process using `nohup`, managed by `run.sh`.

### 3. Database — PostgreSQL

Schema:

```sql
CREATE TABLE parking_data (
    id              SERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL,
    lot_id          INT NOT NULL,
    occupied_spots  INT NOT NULL,
    available_spots INT NOT NULL
);
```

Indexed on `timestamp` and `lot_id` for fast aggregation queries. Supports importing historical data from CSV files with timezone localization.

### 4. Heatmap Aggregation — `aggregate_heatmaps.py`

Generates pre-computed heatmap matrices using PostgreSQL aggregation:

- Divides each day into **288 five-minute slots** (24h × 12 slots/hr)
- Groups by `(lot, day_of_week, time_slot)` and computes average occupancy %
- Outputs JSON files for multiple time ranges: `7d`, `30d`, `90d`, `120d`, `all`
- Includes `meta.json` with available lots and last update timestamp

Aggregation is done in SQL for performance:

```sql
SELECT lot_id,
       EXTRACT(DOW FROM timestamp AT TIME ZONE 'America/Chicago') AS day_of_week,
       FLOOR((EXTRACT(HOUR FROM ts) * 60 + EXTRACT(MINUTE FROM ts)) / 5) AS time_slot,
       ROUND(AVG(occupied::float / NULLIF(occupied + available, 0) * 100), 1) AS avg_occupancy,
       COUNT(*) AS sample_count
FROM parking_data
GROUP BY lot_id, day_of_week, time_slot
```

### 5. CDN Layer — Cloudflare R2 + Worker

- **R2 Bucket** (`parking-stat`) stores the heatmap JSON files
- **Cloudflare Worker** (`r2-worker/src/index.ts`) acts as a public GET proxy:
  - Reads objects from the R2 bucket
  - Adds `Access-Control-Allow-Origin: *` for CORS
  - Returns proper HTTP metadata and ETags for caching

This gives the frontend a fast, globally-distributed API endpoint without exposing R2 credentials.

### 6. Frontend — React + Vite (Vercel)

An interactive dark-themed dashboard with:

- **Lot selector** — Checkbox dropdown to show/hide parking decks
- **Day range** — Switch between 7D / 30D / 90D / 120D / All time
- **Cell size** — Aggregate time slots into 5M / 15M / 30M / 1H buckets
- **Time range filter** — Restrict visible hours (e.g., 06:00–22:00)
- **Canvas-rendered heatmaps** — Color-coded occupancy grids (Sun–Sat × time of day)
- **Hover tooltips** — Show exact occupancy %, time range, and sample count

Client-side aggregation in `useHeatmapData.js` allows instant switching between time resolutions without re-fetching data.

### 6-1. Website

- Title
  - Auburn Parking Analytics

- Toggles
  - Lists
    - Checkbox Dropdown for lots
    - Dropdown for day range (all, 120D, 90D, 30D, 7D)
    - Dropdown for timerange of each cell (5M, 15M, 30M, 1H)
    - 2 Dropdowns for time range of heatmap (00, 24)
  - Style
    - All in horizontal row
    - Left centered
    - Checkbox(lots) | dropdown(Day range) ⌄ dropdown(timerange of each cell) ⌄ dropdown(time range of heatmap) ⌄

- Heatmap
  - x axis: time range of heatmap
  - y axis: day of week
  - color: occupancy rate
  - square cell
  - hover: Time range & Occupancy rate & Sample count
  - All heatmap is inside on window, no scroll

---

## Data Pipeline Summary

```
FoPark API  ──(every 5min)──▶  PostgreSQL
                                    │
                              (daily midnight)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Heatmap JSON    Weekly CSV       Git Auto-Commit
                    │          (./data/)        (git push)
                    ▼
              Cloudflare R2
                    │
                    ▼
            Cloudflare Worker
                    │
                    ▼
             React Dashboard
              (Vercel)
```

---

## Deployment

### Server (Oracle Cloud)

```bash
# SSH into the Ubuntu VM
ssh ubuntu@<server-ip>

# Set up environment
cp .env_exmaple .env   # Fill in DB + R2 credentials
pip install -r server/requirements.txt

# Start the scheduler (runs in background)
bash server/run.sh
```

### Frontend (Vercel)

- Connected to this GitHub repo
- Auto-deploys on push to `main`
- Build command: `cd frontend && npm run build`

### R2 Worker (Cloudflare)

```bash
cd r2-worker
npm install
npx wrangler deploy   # Deploys to Cloudflare Workers
```

---

## Environment Variables

```env
# PostgreSQL
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=
DB_NAME=

# Cloudflare R2 (S3-compatible)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET=
```

---

## Skills Demonstrated

- **Full-stack development** — Python backend, TypeScript CDN worker, React frontend
- **Data engineering** — Automated ETL pipeline: API → DB → aggregation → CDN → dashboard
- **Cloud infrastructure** — Oracle Cloud VM, Cloudflare R2/Workers, Vercel, PostgreSQL
- **API reverse engineering** — Identified EV charger spots from parking API by GPS coordinates
- **Database design** — Indexed time-series schema with timezone-aware queries
- **DevOps / Automation** — Cron-style scheduler, nohup process management, auto git commits
- **Frontend visualization** — Canvas-rendered heatmaps with real-time filtering and aggregation
- **Cost optimization** — Entire stack runs on free tiers (Oracle Cloud, Cloudflare, Vercel)
