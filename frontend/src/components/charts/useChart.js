import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { baseOptions } from "./theme.js";

Chart.register(...registerables);

/** Mounts/updates/destroys a Chart.js instance bound to a <canvas> ref. */
export function useChart(type, data, options) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type,
      data,
      options: { ...baseOptions(type), ...(options || {}) },
    });
    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), JSON.stringify(options), type]);

  return canvasRef;
}
