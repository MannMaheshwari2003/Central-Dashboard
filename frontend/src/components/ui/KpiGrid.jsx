import React from "react";

export function KpiCard({ label, value, unit, icon, accent, foot, footDir }) {
  return (
    <div className={"kpi-card accent-" + (accent || "navy")}>
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        {icon && (
          <div className="kpi-icon">
            <i className={"fa " + icon}></i>
          </div>
        )}
      </div>
      <div className="kpi-value">
        {value} {unit && <small>{unit}</small>}
      </div>
      {foot && <div className={"kpi-foot " + (footDir || "")}>{foot}</div>}
    </div>
  );
}

/** Equal-width, equal-height KPI row. colMd = bootstrap col width at md breakpoint. */
export default function KpiGrid({ items, colMd = 3, colSm = 6 }) {
  return (
    <div className="kpi-grid">
      {items.map((it, i) => (
        <div key={i} className={`kpi-col col-md-${colMd} col-sm-${colSm} col-xs-12`}>
          <KpiCard {...it} />
        </div>
      ))}
    </div>
  );
}
