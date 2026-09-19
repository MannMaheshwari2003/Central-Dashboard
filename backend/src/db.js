/**
 * SQLite connection shared by the API.
 * Node 22+ provides node:sqlite, so no external DB driver is required.
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(path.dirname(config.paths.database), { recursive: true });
const db = new DatabaseSync(config.paths.database);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

function close() {
  try {
    db.close();
  } catch {
    // Closing an already-closed database is harmless during shutdown.
  }
}

module.exports = { db, close };
