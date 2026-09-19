# National Food & Public Distribution MIS Dashboard

Production-oriented React + Node.js application for analytical presentation of the supplied Department of Food & Public Distribution datasets. All dashboard datasets and India-state geometry are stored in SQLite and exposed through REST APIs; the React app does not read the dataset files directly.

## Architecture

```text
Source Excel statements
        ↓
SQLite database (backend/database/food_pds.db)
        ↓
Node.js / Express REST API
        ↓
Analytics service + dataset service
        ↓
React dashboard
        ↓
KPIs • charts • comparisons • rankings • maps • state intelligence • tables
```

The frontend does not read Excel files directly. It consumes the backend API. This keeps data access, calculations and future live-data integration in one controlled layer.

## Frontend

- React 18 + Vite
- Bootstrap 3 compatible layout primitives
- Chart.js
- React Router
- Responsive national-MIS style shell
- API-driven pages
- Sortable, paginated, CSV-exportable tables
- Analytical state drill-down and map views

## Backend

- Node.js 22.5+ (uses the built-in `node:sqlite` driver)
- Express 4
- Helmet security headers
- CORS configuration
- API rate limiting
- Versioned API header (`X-API-Version: v1`)
- SQLite-backed dataset service (no runtime JSON dataset reads)
- Server-side analytics service

## Main API groups

- `GET /api/datasets` — dataset registry
- `GET /api/data/:id` — dataset records
- `GET /api/kpis` — national KPI snapshot
- `GET /api/geo/india-states` — India state geometry
- `GET /api/state/:name` — state detail
- `GET /api/analytics/overview` — consolidated national analytics
- `GET /api/analytics/states` — state indicator matrix
- `GET /api/analytics/state/:name` — consolidated state intelligence
- `GET /api/analytics/insights` — server-generated analytical observations

## Database

The backend database is `backend/database/food_pds.db`. The checked-in `backend/database/seed.sql` is the reproducible seed for the supplied dataset. To rebuild the database:

```bash
cd backend
npm run seed-db
npm run check-db
```

Runtime APIs read from SQLite only. The original Excel statements remain under `backend/source-data/` as provenance/reference material.

## Run locally

### Backend

```bash
cd backend
npm ci
npm run lint
npm run check-db
npm run validate-data
npm start
```

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run dev
```

For a separately hosted production API, set `VITE_API_BASE` before building the frontend.

## Production build

```bash
cd frontend
npm ci
npm run lint
npm run build
```

Deploy `frontend/dist/` as the static web application and run the backend with `NODE_ENV=production`, an explicit `CORS_ORIGIN`, and a process supervisor. Client routes must fall back to `index.html` on the web server.

## Data governance principles

1. Source values are preserved; missing values are not silently converted into meaningful zeroes.
2. Derived indicators are calculated server-side and labelled as derived analytics.
3. Partial-year figures are not presented as equivalent to completed-year figures.
4. Source Excel statements are retained as provenance/reference material.
5. The dashboard is an analytical interface; official statistics remain governed by the source publications.
