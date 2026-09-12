import React, { useEffect, useState } from "react";
import { useMonth } from "../context/MonthContext.jsx";

export default function MoMComparisonPage() {
  const { availableMonths, baseMonth, setBaseMonth, targetMonth, setTargetMonth } = useMonth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol] = useState("stock_change_lmt");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    async function loadMoM() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/analytics/mom?baseMonth=${baseMonth}&targetMonth=${targetMonth}`);
        if (!res.ok) throw new Error("Failed to fetch MoM analytics");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadMoM();
  }, [baseMonth, targetMonth]);

  if (loading) {
    return (
      <div className="panel panel-default" style={{ padding: "40px", textAlign: "center" }}>
        <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#2563eb" }} />
        <p style={{ marginTop: "10px", fontWeight: "600" }}>Loading Month-over-Month Comparative Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: "20px" }}>
        <strong>Error loading MoM comparison:</strong> {error}
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const stateComp = data?.state_comparison || [];

  const filteredStates = stateComp.filter((s) =>
    s.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStates = [...filteredStates].sort((a, b) => {
    let valA = a[sortCol] || 0;
    let valB = b[sortCol] || 0;
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  return (
    <div className="mom-comparison-page" style={{ padding: "10px 0" }}>
      {/* Top Header & Selector */}
      <div className="row" style={{ marginBottom: "20px" }}>
        <div className="col-md-12">
          <div className="panel panel-default" style={{ borderLeft: "5px solid #2563eb", background: "#f8fafc" }}>
            <div className="panel-body" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "15px" }}>
              <div>
                <h2 style={{ margin: "0 0 5px 0", fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>
                  <i className="fa fa-exchange" style={{ color: "#2563eb", marginRight: "8px" }} />
                  Month-over-Month (MoM) Comparative Analytics
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                  Quantifying absolute &amp; percentage changes between <strong>{baseMonth} 2026</strong> and <strong>{targetMonth} 2026</strong> across all Central Pool metrics.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#475569", display: "block", marginBottom: "2px" }}>Base Month:</label>
                  <select
                    className="form-control input-sm"
                    value={baseMonth}
                    onChange={(e) => setBaseMonth(e.target.value)}
                    style={{ fontWeight: "600" }}
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>{m} 2026</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#94a3b8", paddingTop: "14px" }}>→</div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#475569", display: "block", marginBottom: "2px" }}>Target Month:</label>
                  <select
                    className="form-control input-sm"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    style={{ fontWeight: "600" }}
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>{m} 2026</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row" style={{ marginBottom: "20px" }}>
        {/* KPI 1: Central Pool Stock */}
        <div className="col-md-4">
          <div className="panel panel-default" style={{ borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <div className="panel-body">
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Total Central Pool Stock
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#0f172a", margin: "8px 0" }}>
                {kpis.total_central_stock?.target?.toLocaleString()} <span style={{ fontSize: "0.9rem", color: "#64748b" }}>LMT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                <span style={{ color: "#64748b" }}>Base ({baseMonth}): {kpis.total_central_stock?.base?.toLocaleString()} LMT</span>
                <span className={`label ${kpis.total_central_stock?.change_lmt >= 0 ? "label-success" : "label-danger"}`} style={{ fontSize: "0.85rem", padding: "4px 8px" }}>
                  {kpis.total_central_stock?.change_lmt >= 0 ? "▲ +" : "▼ "}
                  {kpis.total_central_stock?.change_lmt?.toLocaleString()} LMT ({kpis.total_central_stock?.change_pct}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Fair Price Shops */}
        <div className="col-md-4">
          <div className="panel panel-default" style={{ borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <div className="panel-body">
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Active Fair Price Shops (FPS)
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#0f172a", margin: "8px 0" }}>
                {kpis.total_fps_count?.target?.toLocaleString()} <span style={{ fontSize: "0.9rem", color: "#64748b" }}>Shops</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                <span style={{ color: "#64748b" }}>Base ({baseMonth}): {kpis.total_fps_count?.base?.toLocaleString()}</span>
                <span className={`label ${kpis.total_fps_count?.change >= 0 ? "label-success" : "label-warning"}`} style={{ fontSize: "0.85rem", padding: "4px 8px" }}>
                  {kpis.total_fps_count?.change >= 0 ? "▲ +" : "▼ "}
                  {kpis.total_fps_count?.change?.toLocaleString()} FPS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Portability Transactions */}
        <div className="col-md-4">
          <div className="panel panel-default" style={{ borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <div className="panel-body">
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                Portability Transactions (ONORC)
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#0f172a", margin: "8px 0" }}>
                {kpis.total_portability_txns?.target?.toLocaleString()} <span style={{ fontSize: "0.9rem", color: "#64748b" }}>Txns</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                <span style={{ color: "#64748b" }}>Base ({baseMonth}): {kpis.total_portability_txns?.base?.toLocaleString()}</span>
                <span className={`label ${kpis.total_portability_txns?.change >= 0 ? "label-success" : "label-danger"}`} style={{ fontSize: "0.85rem", padding: "4px 8px" }}>
                  {kpis.total_portability_txns?.change >= 0 ? "▲ +" : "▼ "}
                  {kpis.total_portability_txns?.change?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* State-by-State Quantified Comparison Matrix */}
      <div className="panel panel-default">
        <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="panel-title" style={{ fontWeight: "700" }}>
            <i className="fa fa-table" style={{ marginRight: "6px", color: "#2563eb" }} />
            State-by-State Quantified Change Matrix ({baseMonth} vs {targetMonth})
          </h3>
          <div style={{ width: "250px" }}>
            <input
              type="text"
              className="form-control input-sm"
              placeholder="Search State..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-striped table-hover table-bordered" style={{ marginBottom: 0, fontSize: "0.9rem" }}>
            <thead style={{ background: "#f1f5f9" }}>
              <tr>
                <th onClick={() => handleSort("state")} style={{ cursor: "pointer" }}>
                  State / UT {sortCol === "state" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("base_stock_lmt")} style={{ cursor: "pointer", textAlign: "right" }}>
                  {baseMonth} Stock (LMT) {sortCol === "base_stock_lmt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("target_stock_lmt")} style={{ cursor: "pointer", textAlign: "right" }}>
                  {targetMonth} Stock (LMT) {sortCol === "target_stock_lmt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("stock_change_lmt")} style={{ cursor: "pointer", textAlign: "right" }}>
                  Stock Diff (LMT) {sortCol === "stock_change_lmt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("stock_change_pct")} style={{ cursor: "pointer", textAlign: "right" }}>
                  Stock Change % {sortCol === "stock_change_pct" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("target_fps_count")} style={{ cursor: "pointer", textAlign: "right" }}>
                  {targetMonth} FPS {sortCol === "target_fps_count" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("target_portability_txns")} style={{ cursor: "pointer", textAlign: "right" }}>
                  {targetMonth} Portability Txns {sortCol === "target_portability_txns" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStates.map((row) => {
                const isPos = row.stock_change_lmt >= 0;
                return (
                  <tr key={row.state}>
                    <td style={{ fontWeight: "600" }}>{row.state}</td>
                    <td style={{ textAlign: "right" }}>{row.base_stock_lmt?.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: "600" }}>{row.target_stock_lmt?.toLocaleString()}</td>
                    <td style={{ textAlign: "right", color: isPos ? "#16a34a" : "#dc2626", fontWeight: "700" }}>
                      {isPos ? "+" : ""}{row.stock_change_lmt?.toLocaleString()}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`label ${isPos ? "label-success" : "label-danger"}`}>
                        {isPos ? "+" : ""}{row.stock_change_pct}%
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>{row.target_fps_count?.toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>{row.target_portability_txns?.toLocaleString()}</td>
                  </tr>
                );
              })}
              {!sortedStates.length && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                    No state records found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
