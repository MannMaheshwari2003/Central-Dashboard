/** Rebuild the local SQLite database from all source data folders. */
const { execSync } = require('child_process');
const path = require('path');
const config = require('../src/config');
const { db } = require('../src/db');

console.log('Running python dataset ingestion script...');
const scriptPath = path.join(config.paths.root, 'scripts', 'ingest_all_data.py');
try {
  execSync(`python "${scriptPath}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to execute python ingestion script:', err);
}

const monthsRow = db.prepare("SELECT DISTINCT data_month FROM central_pool_stocks").all();
console.log(`SQLite database ready: ${config.paths.database}`);
console.log(`Loaded months: ${monthsRow.map(m => m.data_month).join(', ')}`);
