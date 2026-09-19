// Shared Chart.js defaults for the national MIS dashboard.
export { GOV_PALETTE } from "../../constants/colors.js";

export function baseOptions(type) {
  const circular = type === "doughnut" || type === "pie" || type === "polarArea" || type === "radar";
  const line = type === "line";

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 280 },
    interaction: circular
      ? undefined
      : line
        ? { mode: "nearest", intersect: true }
        : { mode: "index", intersect: true },
    hover: circular
      ? undefined
      : line
        ? { mode: "nearest", intersect: true }
        : { mode: "index", intersect: true },
    elements: {
      point: {
        pointStyle: "circle",
        radius: line ? 3.5 : 0,
        hoverRadius: line ? 6.5 : 5,
        hoverBorderWidth: 2,
        hitRadius: 10,
      },
      line: { borderWidth: 2, hoverBorderWidth: 3, tension: 0.25 },
      bar: { borderRadius: 3, borderSkipped: false },
    },
    plugins: {
      legend: {
        labels: {
          color: "#263442",
          font: { size: 12, family: "Noto Sans, Segoe UI, Arial, sans-serif", weight: "600" },
          padding: 12,
          usePointStyle: true,
          pointStyle: "rect",
          boxWidth: 8,
          boxHeight: 8,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        enabled: true,
        mode: circular ? "nearest" : line ? "nearest" : "index",
        intersect: true,
        backgroundColor: "rgba(7,26,47,0.97)",
        titleColor: "#ffffff",
        bodyColor: "#f4f8fb",
        borderColor: "rgba(255,255,255,.14)",
        borderWidth: 1,
        padding: 11,
        cornerRadius: 4,
        displayColors: true,
        usePointStyle: true,
        boxWidth: 8,
        boxHeight: 8,
        titleFont: { size: 12.5, weight: "700" },
        bodyFont: { size: 12, weight: "500" },
        callbacks: {
          label(context) {
            const label = context.dataset?.label ? `${context.dataset.label}: ` : "";
            return `${label}${context.formattedValue}`;
          },
        },
      },
    },
    scales: circular
      ? undefined
      : {
          x: {
            ticks: { color: "#465666", font: { size: 11.5, weight: "500" }, padding: 5 },
            grid: { color: "#e9eef3", drawBorder: false },
            border: { display: false },
          },
          y: {
            ticks: { color: "#465666", font: { size: 11.5, weight: "500" }, padding: 5 },
            grid: { color: "#e9eef3", drawBorder: false },
            border: { display: false },
          },
        },
  };
}
