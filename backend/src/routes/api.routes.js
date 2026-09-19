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

router.get("/analytics/months", (req, res, next) => {
  try {
    const months = analytics.getAvailableMonths();
    res.json({ months, latest: months[months.length - 1] || "July" });
  } catch (e) {
    next(e);
  }
});

router.get("/analytics/overview", (req, res, next) => {
  try {
    res.json(analytics.overview(req.query.month));
  } catch (e) {
    next(e);
  }
});

router.get("/analytics/states", (req, res, next) => {
  try {
    const statesData = analytics.stateSummary(req.query.month);
    res.json({ month: req.query.month || "latest", count: statesData.length, data: statesData });
  } catch (e) {
    next(e);
  }
});

router.get("/analytics/state/:name", (req, res, next) => {
  try {
    const result = analytics.stateInfo(req.params.name, req.query.month);
    if (!result) return res.status(404).json({ error: "State not found" });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get("/analytics/mom", (req, res, next) => {
  try {
    const baseMonth = req.query.baseMonth || "June";
    const targetMonth = req.query.targetMonth || "July";
    res.json(analytics.momComparisonAnalytics(baseMonth, targetMonth));
  } catch (e) {
    next(e);
  }
});

router.get("/analytics/permutations", (req, res, next) => {
  try {
    res.json(analytics.permutationAnalytics(req.query));
  } catch (e) {
    next(e);
  }
});

router.get("/analytics/unitary-aspect", (req, res, next) => {
  try {
    const { state = "All India", metric = "total_stock", baseMonth = "June", targetMonth = "July" } = req.query;
    res.json(analytics.unitaryAspectAnalytics(state, metric, baseMonth, targetMonth));
  } catch (e) {
    next(e);
  }
});

router.get("/analytics/insights", (req, res, next) => {
  try {
    res.json({ generated_at: new Date().toISOString(), data: analytics.insights(req.query.month) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
