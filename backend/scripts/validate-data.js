const database = require('../src/services/database.service');
const datasets = database.listDatasets();
let bad = 0;
for (const item of datasets) {
  const data = database.getDataset(item.id);
  if (!data) { console.error('MISSING DATASET', item.id); bad++; continue; }
  const rows = Array.isArray(data.rows) ? data.rows.length : Object.values(data.years || {}).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
  if (!rows && !item.id.includes('annual_allocation_2026_27')) console.warn('NO ROWS', item.id);
}
console.log(`Validated ${datasets.length} datasets from SQLite.`);
process.exitCode = bad ? 1 : 0;
