/**
 * config/index.js — single source of truth for backend configuration.
 * Reads from environment variables with sensible defaults, so the same
 * code runs unchanged across local dev, staging, and production.
 */
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..", "..");

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,

  paths: {
    root: ROOT_DIR,
    database: path.join(ROOT_DIR, "database", "food_pds.db"),
  },

  cors: {
    // Explicit allow-list. Public deployments must set CORS_ORIGIN to the
    // exact frontend origin(s); wildcard CORS is intentionally not used.
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(v => v.trim()).filter(Boolean) : "http://localhost:5173",
  },

  app: {
    name: "Food & PDS Dashboard API",
    version: "5.0.0",
  },
};
