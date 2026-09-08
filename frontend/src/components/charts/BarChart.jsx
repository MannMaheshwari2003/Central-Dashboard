import React from "react";
import { useChart } from "./useChart.js";

export default function BarChart({ data, options, height = 210 }) {
  const ref = useChart("bar", data, options);
  return (
    <div className="chart-box" style={{ height }}>
      <canvas ref={ref}></canvas>
    </div>
  );
}
