const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const apiRoutes = require("./routes/api.routes");
const controller = require("./controllers/dataset.controller");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false
  }));
  app.use((req,res,next)=>{ res.setHeader("X-API-Version","v1"); next(); });
  app.get("/", controller.getHealth);
  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
module.exports = createApp;
