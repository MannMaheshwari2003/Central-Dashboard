import React from "react";
import { fmt } from "../../utils/format.js";

/** Inline label/value row used inside detail cards (map, drill-downs). */
export function DetailRow({ label, value, strong }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 700 }}>{value}</span>
    </div>
  );
}

/** Small pill showing rank e.g. "#3 of 36" with an optional percentile note. */
export function RankPill({ rank, total, label = "Rank" }) {
  if (!rank || !total) return null;
  const pct = Math.round((1 - (rank - 1) / total) * 100);
  return (
    <span className="badge rank-pill" title={`${label}: ${rank} of ${total} (top ${pct}%)`}>
      <i className="fa fa-trophy"></i> {label} #{rank} of {total}
    </span>
  );
}

/** Up/down delta indicator, e.g. year-over-year growth. */
export function DeltaTag({ value, digits = 1, suffix = "%" }) {
  if (value === null || value === undefined || isNaN(value)) return <span className="badge delta-tag neutral">—</span>;
  const up = value >= 0;
  return (
    <span className={"badge delta-tag " + (up ? "up" : "down")}>
      <i className={"fa fa-caret-" + (up ? "up" : "down")}></i> {Math.abs(value).toFixed(digits)}
      {suffix}
    </span>
  );
}

/** Mini KPI used inside side panels / drill-down cards (smaller than the main KpiCard). */
export function MiniStat({ label, value, unit, delta }) {
  return (
    <div className="mini-stat">
      <div className="mini-stat-label">{label}</div>
      <div className="mini-stat-value">
        {value} {unit && <small>{unit}</small>}
      </div>
      {delta !== undefined && <DeltaTag value={delta} />}
    </div>
  );
}

/** Simple pill tag, e.g. scheme name badges. */
export function Pill({ children, tone = "navy" }) {
  return <span className={"badge pill-tag pill-" + tone}>{children}</span>;
}
