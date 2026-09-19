# Central DFPD MIS Dashboard — Backend

Express and SQLite API for the monthly Food & Public Distribution dashboard.

## Requirements

- Node.js 22.5 or newer
- Python 3 with the packages in `requirements.txt` (only required when rebuilding data)

## Install and run

```bash
npm ci
npm run lint
npm run check-db
npm run validate-data
npm start
```

The API listens on `http://localhost:5000` by default. Copy `.env.example` to `.env` or provide the variables through the deployment environment.

## Rebuild monthly data

Keep one directory per reporting month under `source-data/` (for example, `June/`, `July/`, `August/`), then run:

```bash
python3 -m pip install -r requirements.txt
npm run seed-db
npm run check-db
npm run validate-data
npm run generate-seed
```

`seed-db` invokes the canonical multi-month ingestion script, `scripts/ingest_all_data.py`. Re-ingestion is intentionally a server-side maintenance command; it is not exposed to dashboard visitors through an HTTP endpoint.

## API groups

- `GET /` — service health
- `GET /api/datasets` — dataset registry
- `GET /api/metadata` and `/api/metadata/:id` — dataset metadata
- `GET /api/data/:id` — complete dataset, optionally filtered by `month`
- `GET /api/data/:id/query` — paginated/filterable dataset query
- `GET /api/data/:id/export` — CSV export
- `GET /api/geo/india-states` — India state geometry
- `GET /api/kpis` — KPI snapshot
- `GET /api/state/:name` — consolidated state data
- `GET /api/analytics/months` — reporting months
- `GET /api/analytics/overview` — national overview analytics
- `GET /api/analytics/states` and `/api/analytics/state/:name` — state intelligence
- `GET /api/analytics/mom` — month-over-month comparison
- `GET /api/analytics/permutations` — dynamic filtering/grouping analytics
- `GET /api/analytics/unitary-aspect` — metric comparison engine
- `GET /api/analytics/insights` — generated analytical observations

## Data files

- `database/food_pds.db` — ready-to-run SQLite database
- `database/schema.sql` — relational schema
- `database/seed.sql` — reproducible data seed
- `data/india_states.geojson` — canonical geometry used during ingestion
- `source-data/` — original monthly workbooks retained for provenance
