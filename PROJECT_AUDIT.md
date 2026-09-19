# Production Cleanup Audit

## Removed

- Commented duplicate implementation from `UnitaryComparisonPage.jsx` (940 lines).
- Unused frontend copy of India state geometry; the backend copy remains canonical and is served through the API.
- Obsolete single-month database builder superseded by `ingest_all_data.py`.
- Duplicate `source-data-backup-before-latest` tree and empty incoming-data staging directory.
- Browser-accessible re-ingestion and no-op cache-refresh code.
- Unused imports, variables, hooks, configuration fields, dataset fetches, CSS selectors, and dead API client methods.

## Improved

- Added lazy route loading to reduce the initial JavaScript payload.
- Added frontend and backend ESLint configurations and repeatable `npm run lint` commands.
- Added searchable data tables and corrected per-table CSV filenames.
- Added graceful backend shutdown and safer Python ingestion invocation.
- Corrected the displayed dataset count and aligned documentation with the actual API.
- Upgraded React Router to the patched v7 line and resolved all backend dependency advisories.

## Dependency note

The frontend production audit reports one moderate advisory in Bootstrap 3.4.1. Bootstrap 3 is an explicit project requirement, and the available automated fix is a breaking upgrade to Bootstrap 5. The dashboard does not load Bootstrap's JavaScript plugins, including the affected tooltip/popover behavior; it imports the CSS only. Plan a separately tested Bootstrap migration when the Bootstrap 3 requirement can be retired.

## Required verification

Run before release:

```bash
cd backend
npm ci
npm run lint
npm run check-db
npm run validate-data

cd ../frontend
npm ci
npm run lint
npm run build
```
