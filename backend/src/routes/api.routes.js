const express = require("express");
const controller = require("../controllers/dataset.controller");
const analytics = require("../services/analytics.service");
const router = express.Router();

router.get("/datasets", controller.getDatasets);
router.get("/metadata", controller.getAllMetadata);
router.get("/metadata/:id", controller.getMetadata);
router.get("/data/:id", controller.getDatasetById);
router.get("/data/:id/query", controller.getDatasetQuery);
router.get("/data/:id/export", controller.exportDataset);
router.get("/geo/india-states", controller.getGeoIndiaStates);
router.get("/kpis", controller.getKpis);
router.get("/state/:name", controller.getStateInfo);
router.get("/analytics/overview", (req, res, next) => { try { res.json(analytics.overview()); } catch (e) { next(e); } });
router.get("/analytics/states", (req, res, next) => { try { res.json({ count: analytics.stateSummary().length, data: analytics.stateSummary() }); } catch (e) { next(e); } });
router.get("/analytics/state/:name", (req, res, next) => { try { const result = analytics.stateInfo(req.params.name); if (!result) return res.status(404).json({ error: "State not found" }); res.json(result); } catch (e) { next(e); } });
router.get("/analytics/insights", (req, res, next) => { try { res.json({ generated_at: new Date().toISOString(), data: analytics.insights() }); } catch (e) { next(e); } });
router.post("/admin/cache/refresh", controller.refresh);

module.exports = router;
