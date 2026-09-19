# Local database setup

No database setup/import is required.

## Backend
```bash
cd backend
npm install
npm run check-db
npm start
```

## Frontend
```bash
cd frontend
npm install
npm run dev
```

The backend automatically opens `backend/database/food_pds.db`.

### Database design
- Existing normalized analytical tables continue to power the dashboard.
- Every supplied Excel dataset also has an individual `src_*` table.
- June and July are stored as reporti
ng periods in those source tables.
- Future months are appended to the same tables.
- `source_table_catalog` provides the source-table registry.
