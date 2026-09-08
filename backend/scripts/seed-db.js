/** Rebuild the local SQLite database from the checked-in SQL seed. */
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
fs.mkdirSync(path.dirname(config.paths.database), { recursive: true });
const { db } = require('../src/db');
const schema = fs.readFileSync(path.join(config.paths.root, 'database', 'schema.sql'), 'utf8');
const seed = fs.readFileSync(path.join(config.paths.root, 'database', 'seed.sql'), 'utf8');
db.exec(schema);
db.exec(seed);
const datasets = db.prepare('SELECT COUNT(*) AS n FROM datasets').get().n;
const rows = db.prepare('SELECT COUNT(*) AS n FROM dataset_rows').get().n;
const geo = db.prepare('SELECT COUNT(*) AS n FROM geo_data').get().n;
console.log(`SQLite database ready: ${config.paths.database}`);
console.log(`Datasets: ${datasets} | Rows: ${rows} | Geo records: ${geo}`);
db.close();
