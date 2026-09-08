/**
 * middleware/errorHandler.js — catches anything that falls through to
 * Express's error pipeline and returns a consistent JSON error shape
 * instead of leaking stack traces or defaulting to HTML error pages.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.publicMessage || "Internal server error",
    detail: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
}

module.exports = { notFoundHandler, errorHandler };
