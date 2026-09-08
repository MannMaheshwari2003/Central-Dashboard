import React from "react";
import { fmt } from "../../utils/format.js";

export function Loading({ label }) {
  return (
    <div className="loading-inline">
      <i className="fa fa-spinner fa-spin feedback-icon feedback-icon--spinner"></i>
      {label || "Loading data…"}
    </div>
  );
}

export function ErrorBox({ msg }) {
  return (
    <div className="loading-inline error-box">
      <i className="fa fa-exclamation-triangle feedback-icon"></i>
      {msg || "Failed to load data."}
    </div>
  );
}

export function PctBadge({ value, digits = 1 }) {
  return <span className={"badge badge-pct " + fmt.pctBadgeClass(value)}>{fmt.pct(value, digits)}</span>;
}
