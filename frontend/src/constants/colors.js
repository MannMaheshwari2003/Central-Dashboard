/**
 * constants/colors.js — canonical chart palette and status colors.
 * components/charts/theme.js re-exports GOV_PALETTE from here so there is
 * exactly one place that defines "what this app's colors are".
 */
export const GOV_PALETTE = ["#0b2e59", "#FF9933", "#128807", "#3a7bd5", "#c0392b", "#8e44ad", "#16a085", "#b8860b", "#5b6472", "#0097a7"];

export const STATUS_COLORS = {
  good: "#1a7d3c",
  warn: "#b8860b",
  bad: "#c0392b",
  neutral: "#5b6472",
};
