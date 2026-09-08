import React from "react";

export default function Panel({ title, sub, badge, children, style, actions }) {
  return (
    <div className="panel panel-default panel-card" style={style}>
      {(title || actions) && (
        <div className="panel-heading">
          <h3 className="panel-title">
            <span>{title}</span>
            <span className="panel-title-actions">
              {actions}
              {badge && <span className="badge panel-badge">{badge}</span>}
            </span>
          </h3>
        </div>
      )}
      <div className="panel-body">
        {sub && <div className="panel-sub">{sub}</div>}
        {children}
      </div>
    </div>
  );
}
