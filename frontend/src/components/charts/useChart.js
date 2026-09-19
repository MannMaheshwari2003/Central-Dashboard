import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { baseOptions } from "./theme.js";
import { useUnit, replaceMassUnitText } from "../../context/UnitContext.jsx";

Chart.register(...registerables);

function mapLabels(value, unitLabel) {
  if (Array.isArray(value)) return value.map(v => mapLabels(v, unitLabel));
  if (!value || typeof value !== "object") return typeof value === "string" ? replaceMassUnitText(value, unitLabel) : value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapLabels(v, unitLabel)]));
}

/** Mounts/updates/destroys a Chart.js instance bound to a <canvas> ref. */
export function useChart(type, data, options) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { unitLabel } = useUnit();
  const displayData = mapLabels(data, unitLabel);
  const displayOptions = mapLabels(options || {}, unitLabel);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type,
      data: displayData,
      options: { ...baseOptions(type), ...displayOptions },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(displayData), JSON.stringify(displayOptions), type, unitLabel]);

  return canvasRef;
}
