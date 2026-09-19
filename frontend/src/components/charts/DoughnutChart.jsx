import { useMemo } from "react";
import { useChart } from "./useChart.js";

export default function DoughnutChart({ data, options, height = 220, showDetails = true, unit = "" }) {
  const labels = data?.labels || [];
  const values = data?.datasets?.[0]?.data || [];
  const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);

  const chartData = useMemo(() => {
    if (!data?.labels) return data;
    return {
      ...data,
      labels: data.labels.map((label) => String(label).length > 28 ? `${String(label).slice(0, 26)}…` : label),
    };
  }, [data]);

  const chartOptions = useMemo(() => ({
    cutout: "62%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "rect", padding: 10, font: { size: 11.5, weight: "600" } },
      },
      tooltip: {
        callbacks: {
          label(context) {
            const value = Number(context.raw) || 0;
            const share = total ? ((value / total) * 100).toFixed(1) : "0.0";
            return `${context.label}: ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""} (${share}%)`;
          },
        },
      },
    },
    ...(options || {}),
  }), [options, total, unit]);

  const ref = useChart("doughnut", chartData, chartOptions);

  const formatValue = (value) => Number.isFinite(Number(value))
    ? Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "—";

  return (
    <div className="donut-wrap">
      <div className="chart-box donut-chart-box" style={{ height }}>
        <canvas ref={ref} aria-label="Doughnut chart" role="img" />
      </div>
      {showDetails && labels.length > 0 && (
        <div className="donut-detail-list" aria-label="Chart details">
          {labels.map((label, index) => {
            const value = Number(values[index]) || 0;
            const share = total ? (value / total) * 100 : 0;
            return (
              <div className="donut-detail-row" key={`${label}-${index}`}>
                <div className="donut-detail-label" title={label}>{label}</div>
                <div className="donut-detail-value"><strong>{formatValue(value)}</strong>{unit ? ` ${unit}` : ""}</div>
                <div className="donut-detail-share">{share.toFixed(1)}%</div>
              </div>
            );
          })}
          <div className="donut-detail-row donut-total-row">
            <div className="donut-detail-label"><strong>Total</strong></div>
            <div className="donut-detail-value"><strong>{formatValue(total)}</strong>{unit ? ` ${unit}` : ""}</div>
            <div className="donut-detail-share">100%</div>
          </div>
        </div>
      )}
    </div>
  );
}
