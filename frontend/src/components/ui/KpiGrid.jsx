export function KpiCard({ label, value, unit, icon, accent, foot, footDir, breakdown, onClick }) {
  const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0;
  const isClickable = typeof onClick === "function";

  const handleKeyDown = (e) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`kpi-card accent-${accent || "navy"}${isClickable ? " kpi-card-interactive" : ""}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title={isClickable ? `Click to inspect ${label} analytics & trends` : undefined}
    >
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        {icon && (
          <div className="kpi-icon">
            <i className={"fa " + icon}></i>
          </div>
        )}
      </div>

      <div className={hasBreakdown ? "kpi-content kpi-content-split" : "kpi-content"}>
        <div className="kpi-primary">
          <div className="kpi-value">
            {value} {unit && <small>{unit}</small>}
          </div>
        </div>

        {hasBreakdown && (
          <div className="kpi-breakdown">
            {breakdown.map((item) => (
              <div className="kpi-breakdown-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="kpi-bottom-row">
        {foot && <div className={"kpi-foot " + (footDir || "")}>{foot}</div>}
        {isClickable && (
          <span className="kpi-interactive-hint">
            <i className="fa fa-line-chart"></i> View
          </span>
        )}
      </div>
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
