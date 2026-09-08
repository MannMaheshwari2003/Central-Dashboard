import React from "react";
import { useChart } from "./useChart.js";

export default function HBarChart({ data, options, height = 210 }) {
  const opts = { indexAxis: "y", ...(options || {}) };
  const ref = useChart("bar", data, opts);
  return (
    <div className="chart-box" style={{ height }}>
      <canvas ref={ref}></canvas>
    </div>
  );
}
