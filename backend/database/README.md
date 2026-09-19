# Project-local database

`food_pds.db` is the single database used by the project. It is SQLite and runs directly through Node.js (`node:sqlite`), so MySQL Workbench, MySQL Server, SQL imports and database credentials are not required.

The database contains two complementary layers:

1. **Analytical tables** used by the existing dashboard APIs, KPIs, charts and comparisons.
2. **28 `src_*` source tables**: one table for each Excel dataset. These preserve June/July source rows and include `reporting_period`, `source_file`, `source_sheet` and `excel_row_number` for monthly append/audit.

`source_table_catalog` lists all source tables and their available periods. Future August, September and later data should be appended to the same `src_*` tables with the appropriate `reporting_period`; do not create a database per month.

The database file is the source of truth at runtime. The removed schema/seed/Excel ingestion files are not required to start the application.
