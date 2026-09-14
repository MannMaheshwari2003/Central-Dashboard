import React, { useEffect, useState } from "react";
import { useMonth } from "../context/MonthContext.jsx";
import { BarChart, DoughnutChart, GOV_PALETTE } from "../components/charts/index.js";

export default function DynamicPermutationsPage() {
  const { availableMonths, selectedMonth } = useMonth();
  const [metric, setMetric] = useState("central_stock");
  const [groupBy, setGroupBy] = useState("state");
  const [monthFilter, setMonthFilter] = useState(selectedMonth);
  const [regionFilter, setRegionFilter] = useState("all");
  const [commodityFilter, setCommodityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedMonth) setMonthFilter(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    async function fetchPermutations() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          metric,
          groupBy,
          month: monthFilter,
          region: regionFilter,
          commodity: commodityFilter,
          state: searchTerm,
        });
        const res = await fetch(`/api/analytics/permutations?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load permutation data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPermutations();
  }, [metric, groupBy, monthFilter, regionFilter, commodityFilter, searchTerm]);

  const metricsList = [
    { id: "central_stock", label: "Central Pool Foodgrain Stocks (LMT)", unit: "LMT" },
    { id: "wheat_stock", label: "Central Pool Wheat Stock (LMT)", unit: "LMT" },
    { id: "rice_stock", label: "Central Pool Rice Stock (LMT)", unit: "LMT" },
    { id: "procurement", label: "Grain Procurement (Lakh MT)", unit: "Lakh MT" },
    { id: "procurement_wheat", label: "Wheat Procurement (Lakh MT)", unit: "Lakh MT" },
    { id: "procurement_rice", label: "Rice Procurement (Lakh MT)", unit: "Lakh MT" },
    { id: "allocation", label: "Annual NFSA Allocation (KT)", unit: "KT" },
    { id: "offtake", label: "Foodgrain Offtake Upto Month (KT)", unit: "KT" },
    { id: "offtake_gap", label: "Offtake Gap / Unlifted Quota (KT)", unit: "KT" },
    { id: "paddy_stock", label: "Paddy & Coarse Grain Stocks (LMT)", unit: "LMT" },
    { id: "fps_count", label: "Fair Price Shops Count (Outlets)", unit: "FPS" },
    { id: "portability_txns", label: "Portability Transactions (ONORC)", unit: "Txns" },
  ];

  const currMetricObj = metricsList.find((m) => m.id === metric) || metricsList[0];

  // Chart data preparation
  const chartItems = (data?.data || []).slice(0, 10);
  const barChartData = {
    labels: chartItems.map((d) => d.label),
    datasets: [
      {
        label: `${currMetricObj.label}`,
        data: chartItems.map((d) => d.total_value),
        backgroundColor: GOV_PALETTE[0],
      },
    ],
  };

  const regEntries = Object.entries(data?.regional_breakdown || {}).filter(([_, v]) => v > 0);
  const doughnutData = {
    labels: regEntries.map(([k]) => k),
    datasets: [
      {
        data: regEntries.map(([_, v]) => v),
        backgroundColor: [
          "#2563eb",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#ec4899",
          "#06b6d4",
          "#64748b",
        ],
      },
    ],
  };

  const handleExportCSV = () => {
    if (!data?.data?.length) return;
    const headers = ["Group", "Metric Value", "Share Pct", "Record Count"];
    const rows = data.data.map((r) => [
      `"${r.label}"`,
      r.total_value,
      `${r.pct_share || 0}%`,
      r.record_count,
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `permutation_${metric}_${groupBy}_${monthFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dynamic-permutations-page" style={{ padding: "10px 0" }}>
      {/* Header Panel */}
      <div className="panel panel-default" style={{ borderLeft: "5px solid #8b5cf6", background: "#f8fafc", marginBottom: "16px" }}>
        <div className="panel-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.45rem", fontWeight: "700", color: "#0f172a" }}>
              <i className="fa fa-sliders" style={{ color: "#8b5cf6", marginRight: "8px" }} />
              Dynamic Multi-Aspect Permutations &amp; Intelligence Console
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
              Slice, dice, and uncover hidden structural insights across any combination of foodgrain metrics, grouping dimensions, commodities, and regions.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="btn btn-default btn-sm"
            style={{ fontWeight: "600", borderColor: "#cbd5e1" }}
            title="Download active permutation as CSV"
          >
            <i className="fa fa-download" style={{ marginRight: "6px", color: "#8b5cf6" }} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Control Filters */}
      <div className="panel panel-default" style={{ background: "#ffffff", marginBottom: "18px" }}>
        <div className="panel-body" style={{ padding: "16px" }}>
          <div className="row">
            {/* Metric Selector */}
            <div className="col-md-3 col-sm-6" style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                1. Analytical Metric:
              </label>
              <select
                className="form-control input-sm"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                style={{ fontWeight: "600" }}
              >
                {metricsList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Group By Selector */}
            <div className="col-md-2 col-sm-6" style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                2. Group Dimension:
              </label>
              <select
                className="form-control input-sm"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                style={{ fontWeight: "600" }}
              >
                <option value="state">State / Union Territory</option>
                <option value="region">Geographic Region / Zone</option>
                <option value="month">Month Dataset (MoM)</option>
                <option value="tier">Volume Scale Tier</option>
              </select>
            </div>

            {/* Commodity Slicer */}
            <div className="col-md-2 col-sm-6" style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                3. Commodity:
              </label>
              <select
                className="form-control input-sm"
                value={commodityFilter}
                onChange={(e) => setCommodityFilter(e.target.value)}
                style={{ fontWeight: "600" }}
              >
                <option value="all">All Commodities</option>
                <option value="wheat">Wheat Only</option>
                <option value="rice">Rice Only</option>
                <option value="coarse">Coarse Grains</option>
              </select>
            </div>

            {/* Region Filter */}
            <div className="col-md-2 col-sm-6" style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                4. Region Slicer:
              </label>
              <select
                className="form-control input-sm"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                style={{ fontWeight: "600" }}
              >
                <option value="all">All Regions</option>
                <option value="North">North Zone</option>
                <option value="South">South Zone</option>
                <option value="East">East Zone</option>
                <option value="West">West Zone</option>
                <option value="Central">Central Zone</option>
                <option value="North-East">North-East Zone</option>
              </select>
            </div>

            {/* Month Filter */}
            <div className="col-md-2 col-sm-6" style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                5. Month Dataset:
              </label>
              <select
                className="form-control input-sm"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                style={{ fontWeight: "600" }}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m} 2026
                  </option>
                ))}
                <option value="all">All Available</option>
              </select>
            </div>

            {/* Search Filter */}
            <div className="col-md-1 col-sm-6" style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                Search:
              </label>
              <input
                type="text"
                className="form-control input-sm"
                placeholder="Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results View */}
      {loading ? (
        <div className="panel panel-default" style={{ padding: "40px", textAlign: "center" }}>
          <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#8b5cf6" }} />
          <p style={{ marginTop: "10px", fontWeight: "600" }}>Calculating Dynamic Permutations &amp; Cross-Tabulations...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">Error: {error}</div>
      ) : (
        <div>
          {/* KPI Intelligence Summary Cards */}
          <div className="row" style={{ marginBottom: "16px" }}>
            <div className="col-md-3 col-sm-6">
              <div className="panel panel-default" style={{ borderLeft: "4px solid #8b5cf6", borderRadius: "6px" }}>
                <div className="panel-body" style={{ padding: "14px" }}>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    Total Slice Aggregate
                  </div>
                  <div style={{ fontSize: "1.7rem", fontWeight: "800", color: "#0f172a", margin: "4px 0" }}>
                    {data?.total_aggregate?.toLocaleString()} <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{currMetricObj.unit}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Active filters: {monthFilter} 2026 | {commodityFilter}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="panel panel-default" style={{ borderLeft: "4px solid #2563eb", borderRadius: "6px" }}>
                <div className="panel-body" style={{ padding: "14px" }}>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    Leading Entity (Max)
                  </div>
                  <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#1e40af", margin: "4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {data?.summary?.leader?.label || "N/A"}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#475569", fontWeight: "600" }}>
                    {data?.summary?.leader?.value?.toLocaleString()} {currMetricObj.unit} ({data?.summary?.leader?.pct_share}% share)
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="panel panel-default" style={{ borderLeft: "4px solid #f59e0b", borderRadius: "6px" }}>
                <div className="panel-body" style={{ padding: "14px" }}>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    Top-4 Concentration Ratio
                  </div>
                  <div style={{ fontSize: "1.7rem", fontWeight: "800", color: "#b45309", margin: "4px 0" }}>
                    {data?.summary?.top4_concentration_pct}%
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Held by top 4 contributors
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="panel panel-default" style={{ borderLeft: "4px solid #10b981", borderRadius: "6px" }}>
                <div className="panel-body" style={{ padding: "14px" }}>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    Average per Unit
                  </div>
                  <div style={{ fontSize: "1.7rem", fontWeight: "800", color: "#065f46", margin: "4px 0" }}>
                    {data?.summary?.average_value?.toLocaleString()} <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{currMetricObj.unit}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Computed across {data?.summary?.count} entities
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Uncovered Insights Panel */}
          {data?.insights?.length > 0 && (
            <div className="panel panel-default" style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "6px", marginBottom: "18px" }}>
              <div className="panel-body" style={{ padding: "14px 18px" }}>
                <div style={{ fontWeight: "700", fontSize: "0.92rem", color: "#6b21a8", marginBottom: "8px" }}>
                  <i className="fa fa-lightbulb-o" style={{ marginRight: "6px", color: "#9333ea" }} />
                  Automated Algorithmic Insights &amp; Structural Takeaways:
                </div>
                <div className="row">
                  {data.insights.map((txt, idx) => (
                    <div key={idx} className="col-md-6" style={{ marginBottom: "4px", fontSize: "0.86rem", color: "#374151" }}>
                      <span style={{ color: "#9333ea", marginRight: "6px", fontWeight: "bold" }}>•</span>
                      {txt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Chart Visualizations */}
          <div className="row" style={{ marginBottom: "18px" }}>
            <div className="col-md-8">
              <div className="panel panel-default" style={{ borderRadius: "6px" }}>
                <div className="panel-heading" style={{ fontWeight: "700", fontSize: "0.9rem" }}>
                  <i className="fa fa-bar-chart" style={{ marginRight: "6px", color: "#8b5cf6" }} />
                  Top Distribution Ranking: {currMetricObj.label} ({monthFilter})
                </div>
                <div className="panel-body" style={{ height: "260px" }}>
                  <BarChart data={barChartData} height={230} />
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="panel panel-default" style={{ borderRadius: "6px" }}>
                <div className="panel-heading" style={{ fontWeight: "700", fontSize: "0.9rem" }}>
                  <i className="fa fa-pie-chart" style={{ marginRight: "6px", color: "#2563eb" }} />
                  Regional Share Breakdown
                </div>
                <div className="panel-body" style={{ height: "260px" }}>
                  <DoughnutChart data={doughnutData} height={210} />
                </div>
              </div>
            </div>
          </div>

          {/* Comprehensive Results Table */}
          <div className="panel panel-default" style={{ borderRadius: "6px" }}>
            <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="panel-title" style={{ fontWeight: "700", fontSize: "0.92rem" }}>
                <i className="fa fa-table" style={{ marginRight: "6px", color: "#8b5cf6" }} />
                Aggregated Permutation Data Grid ({data?.data?.length} rows)
              </h3>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Sorted by Value (Descending)
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-striped table-hover table-bordered" style={{ marginBottom: 0, fontSize: "0.88rem" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={{ width: "28%" }}>Group / Dimension ({groupBy.toUpperCase()})</th>
                    {groupBy === "state" && <th style={{ width: "12%" }}>Zone</th>}
                    <th style={{ textAlign: "right", width: "18%" }}>
                      Value ({currMetricObj.unit})
                    </th>
                    <th style={{ textAlign: "right", width: "12%" }}>National Share</th>
                    <th style={{ width: "30%" }}>Relative Distribution Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((row, idx) => {
                    const sharePct = row.pct_share != null ? row.pct_share : (data.total_aggregate ? ((row.total_value / data.total_aggregate) * 100).toFixed(1) : 0);
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: "600", color: "#0f172a" }}>
                          <span style={{ color: "#94a3b8", marginRight: "8px", fontSize: "0.78rem" }}>#{idx + 1}</span>
                          {row.label}
                        </td>
                        {groupBy === "state" && (
                          <td>
                            <span className="label label-default" style={{ fontSize: "0.76rem" }}>
                              {row.region || "Other"}
                            </span>
                          </td>
                        )}
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#1e293b" }}>
                          {row.total_value?.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "600", color: "#6b21a8" }}>
                          {sharePct}%
                        </td>
                        <td>
                          <div className="progress" style={{ height: "14px", marginBottom: 0, background: "#f1f5f9", borderRadius: "3px" }}>
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={{ width: `${Math.min(sharePct, 100)}%`, background: "#8b5cf6", borderRadius: "3px" }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!data?.data?.length && (
                    <tr>
                      <td colSpan={groupBy === "state" ? 5 : 4} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                        No records match the selected permutation parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
