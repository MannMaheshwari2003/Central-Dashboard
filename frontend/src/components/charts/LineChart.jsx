import React from "react";
import { useChart } from "./useChart.js";

export default function LineChart({ data, options, height = 210 }) {
  const ref = useChart("line", data, options);
  return (
    <div className="chart-box" style={{ height }}>
      <canvas ref={ref}></canvas>
    </div>
  );
}
