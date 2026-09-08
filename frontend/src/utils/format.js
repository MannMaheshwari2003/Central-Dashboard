// ===========================================================
// utils/format.js — number/date formatting helpers used across pages
// ===========================================================
export const fmt = {
  num(v, digits = 2) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Number(v).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  },
  int(v) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Math.round(Number(v)).toLocaleString("en-IN");
  },
  pct(v, digits = 1) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Number(v).toFixed(digits) + "%";
  },
  lakhToCr(lakh) {
    if (lakh === null || lakh === undefined) return "—";
    return (lakh / 100).toFixed(2);
  },
  pctBadgeClass(v) {
    if (v === null || v === undefined || isNaN(v)) return "badge-mid";
    if (v >= 90) return "badge-good";
    if (v >= 60) return "badge-mid";
    return "badge-low";
  },
  titleCase(s) {
    if (!s) return s;
    return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
  },
  growth(curr, prev) {
    if (curr === null || curr === undefined || prev === null || prev === undefined || !prev) return null;
    return ((curr - prev) / prev) * 100;
  },
};
