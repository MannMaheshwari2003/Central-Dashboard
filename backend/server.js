/**
 * server.js — runtime entry point. Boots the Express app assembled in
 * src/app.js and starts listening. Kept minimal on purpose: anything
 * beyond "start the process" belongs in src/.
 */
const config = require("./src/config");
const createApp = require("./src/app");
const datasetService = require("./src/services/dataset.service");
const { close } = require("./src/db");
require("./src/services/database.service").init();

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`${config.app.name} running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Datasets loaded: ${datasetService.loadRegistry().length}`);
});

function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(() => {
    close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
