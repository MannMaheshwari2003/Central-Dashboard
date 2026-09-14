import React, { useState, useEffect, useMemo } from "react";
import { useMonth } from "../context/MonthContext.jsx";
import { fmt } from "../utils/format.js";
import { BarChart, HBarChart, GOV_PALETTE } from "../components/charts/index.js";

const round = (v, d = 2) => (v == null || Number.isNaN(Number(v)) ? null : Number(Number(v).toFixed(d)));
const num = (v) => Number(v) || 0;

export default function UnitaryComparisonPage() {
  const { availableMonths, selectedMonth, baseMonth: ctxBase, targetMonth: ctxTarget } = useMonth();
  const [activeTab, setActiveTab] = useState("aspect_mom"); // "aspect_mom" | "state_cross"

  // Tab 1 state: Unitary Aspect Across Months
  const [unitaryState, setUnitaryState] = useState("Punjab");
  const [unitaryMetric, setUnitaryMetric] = useState("wheat_procurement");
  const [monthA, setMonthA] = useState(ctxBase || "June");
  const [monthB, setMonthB] = useState(ctxTarget || "July");
  const [aspectData, setAspectData] = useState(null);
  const [aspectLoading, setAspectLoading] = useState(false);
  const [aspectError, setAspectError] = useState(null);
  const [unitaryTableFilter, setUnitaryTableFilter] = useState("");

  // Tab 2 state: State A vs State B Cross-Comparison
  const [statesList, setStatesList] = useState([]);
  const [stateA, setStateA] = useState("Punjab");
  const [stateB, setStateB] = useState("Haryana");
  const [statesLoading, setStatesLoading] = useState(true);
  const [statesError, setStatesError] = useState(null);
  const [crossCategoryFilter, setCrossCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const unitaryMetricsList = [
    { id: "wheat_procurement", label: "Wheat Procurement (Lakh MT)", category: "Procurement" },
    { id: "rice_procurement", label: "Rice Procurement (Lakh MT)", category: "Procurement" },
    { id: "total_procurement", label: "Total Grain Procurement (Lakh MT)", category: "Procurement" },
    { id: "wheat_stock", label: "Central Pool Wheat Stock (Lakh MT)", category: "Stock & Storage" },
    { id: "rice_stock", label: "Central Pool Rice Stock (Lakh MT)", category: "Stock & Storage" },
    { id: "total_stock", label: "Total Central Pool Stock (Lakh MT)", category: "Stock & Storage" },
    { id: "fci_stock", label: "FCI Operational Stock (Lakh MT)", category: "Stock & Storage" },
    { id: "state_agency_stock", label: "State Agencies Holding (Lakh MT)", category: "Stock & Storage" },
    { id: "paddy_stock", label: "Paddy in Stock (Lakh MT)", category: "Stock & Storage" },
    { id: "annual_nfsa_allocation", label: "Annual NFSA Allocation (KT)", category: "Allocation & Offtake" },
    { id: "aay_allocation", label: "Antyodaya (AAY) Allocation (KT)", category: "Allocation & Offtake" },
    { id: "phh_allocation", label: "Priority Households (PHH) Allocation (KT)", category: "Allocation & Offtake" },
    { id: "offtake_total", label: "Foodgrain Offtake Lifted (KT)", category: "Allocation & Offtake" },
    { id: "offtake_rate", label: "Offtake Utilization Rate (%)", category: "Allocation & Offtake" },
    { id: "buffer_coverage", label: "Buffer Security Coverage (Months of Supply)", category: "Derived Intelligence" },
    { id: "fps_count", label: "Fair Price Shops Outlets Count", category: "Infrastructure & PDS" },
    { id: "portability_txns", label: "ONORC Portability Transactions", category: "Infrastructure & PDS" },
  ];

  // Sync with global month when changed
  useEffect(() => {
    if (selectedMonth && selectedMonth !== "all") {
      setMonthB(selectedMonth);
    }
  }, [selectedMonth]);

  // Fetch Unitary Aspect Data
  useEffect(() => {
    async function loadUnitaryAspect() {
      try {
        setAspectLoading(true);
        setAspectError(null);
        const params = new URLSearchParams({
          state: unitaryState,
          metric: unitaryMetric,
          baseMonth: monthA,
          targetMonth: monthB,
        });
        const res = await fetch(`/api/analytics/unitary-aspect?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load unitary aspect comparison");
        const json = await res.json();
        setAspectData(json);
      } catch (err) {
        setAspectError(err.message);
      } finally {
        setAspectLoading(false);
      }
    }
    loadUnitaryAspect();
  }, [unitaryState, unitaryMetric, monthA, monthB]);

  // Fetch States for Cross-Comparison
  useEffect(() => {
    async function loadStates() {
      try {
        setStatesLoading(true);
        setStatesError(null);
        const res = await fetch(`/api/analytics/states?month=${selectedMonth}`);
        if (!res.ok) throw new Error("Failed to load state analytics data");
        const json = await res.json();
        setStatesList(json.data || []);
      } catch (err) {
        setStatesError(err.message);
      } finally {
        setStatesLoading(false);
      }
    }
    loadStates();
  }, [selectedMonth]);

  const objA = statesList.find((s) => s.state === stateA) || {};
  const objB = statesList.find((s) => s.state === stateB) || {};

  const calcDiff = (vA, vB) => num(vB) - num(vA);
  const calcPctDiff = (vA, vB) => (num(vA) ? ((num(vB) - num(vA)) / num(vA)) * 100 : null);
  const calcRatio = (vA, vB) => (num(vB) ? num(vA) / num(vB) : null);

  const crossMetrics = useMemo(() => [
    { group: "Grain Procurement", name: "Total Grain Procurement", unit: "Lakh MT", valA: objA.procurement_total_lakh, valB: objB.procurement_total_lakh },
    { group: "Grain Procurement", name: "Wheat Procurement", unit: "Lakh MT", valA: objA.procurement_wheat_lakh, valB: objB.procurement_wheat_lakh },
    { group: "Grain Procurement", name: "Rice Procurement", unit: "Lakh MT", valA: objA.procurement_rice_lakh, valB: objB.procurement_rice_lakh },
    { group: "Grain Procurement", name: "Coarse Grain Procurement", unit: "Lakh MT", valA: objA.procurement_coarse_lakh, valB: objB.procurement_coarse_lakh },

    { group: "Stocks & Storage", name: "Total Central Pool Stock", unit: "Lakh MT", valA: objA.central_stock_lmt, valB: objB.central_stock_lmt },
    { group: "Stocks & Storage", name: "Wheat Stock in Central Pool", unit: "Lakh MT", valA: objA.wheat_stock_lmt, valB: objB.wheat_stock_lmt },
    { group: "Stocks & Storage", name: "Rice Stock in Central Pool", unit: "Lakh MT", valA: objA.rice_stock_lmt, valB: objB.rice_stock_lmt },
    { group: "Stocks & Storage", name: "FCI Owned Stock", unit: "Lakh MT", valA: objA.fci_stock_lmt, valB: objB.fci_stock_lmt },
    { group: "Stocks & Storage", name: "State Agency Stock", unit: "Lakh MT", valA: objA.state_agency_stock_lmt, valB: objB.state_agency_stock_lmt },
    { group: "Stocks & Storage", name: "Paddy in Stock", unit: "Lakh MT", valA: objA.paddy_stock_lmt, valB: objB.paddy_stock_lmt },

    { group: "NFSA Beneficiaries & Coverage", name: "Total Census Population", unit: "Lakh", valA: objA.population_lakh, valB: objB.population_lakh },
    { group: "NFSA Beneficiaries & Coverage", name: "Covered Beneficiaries", unit: "Lakh", valA: objA.present_coverage_lakh, valB: objB.present_coverage_lakh },
    { group: "NFSA Beneficiaries & Coverage", name: "Overall NFSA Coverage", unit: "%", valA: objA.nfsa_coverage_pct, valB: objB.nfsa_coverage_pct },
    { group: "NFSA Beneficiaries & Coverage", name: "Rural vs Urban Coverage Gap", unit: "pp", valA: objA.rural_urban_gap_pct, valB: objB.rural_urban_gap_pct },

    { group: "Allocation & Distribution", name: "Annual NFSA Allocation", unit: "KT", valA: objA.annual_nfsa_allocation_kt, valB: objB.annual_nfsa_allocation_kt },
    { group: "Allocation & Distribution", name: "AAY Antyodaya Allocation", unit: "KT", valA: objA.aay_kt, valB: objB.aay_kt },
    { group: "Allocation & Distribution", name: "Priority Households (PHH) Allocation", unit: "KT", valA: objA.phh_kt, valB: objB.phh_kt },
    { group: "Allocation & Distribution", name: "Period Foodgrain Offtake Lifted", unit: "KT", valA: objA.upto_june_offtake_kt, valB: objB.upto_june_offtake_kt },
    { group: "Allocation & Distribution", name: "Offtake Utilization Rate", unit: "%", valA: objA.offtake_rate_pct, valB: objB.offtake_rate_pct },

    { group: "Infrastructure & Portability", name: "Fair Price Shops Count", unit: "Shops", valA: objA.total_fps_count, valB: objB.total_fps_count },
    { group: "Infrastructure & Portability", name: "ONORC Portability Txns", unit: "Txns", valA: objA.portability_txns, valB: objB.portability_txns },

    {
      group: "Computed Derived Algorithms",
      name: "Buffer Security Index (Stock / Monthly Allocation)",
      unit: "Months",
      valA: num(objA.annual_nfsa_allocation_kt) ? (num(objA.central_stock_lmt) / ((num(objA.annual_nfsa_allocation_kt) / 12) / 100)) : 0,
      valB: num(objB.annual_nfsa_allocation_kt) ? (num(objB.central_stock_lmt) / ((num(objB.annual_nfsa_allocation_kt) / 12) / 100)) : 0,
    },
    {
      group: "Computed Derived Algorithms",
      name: "Beneficiary Stock Intensity (Stock / Lakh Beneficiary)",
      unit: "LMT / Lakh Pop",
      valA: num(objA.present_coverage_lakh) ? (num(objA.central_stock_lmt) / num(objA.present_coverage_lakh)) : 0,
      valB: num(objB.present_coverage_lakh) ? (num(objB.central_stock_lmt) / num(objB.present_coverage_lakh)) : 0,
    },
  ], [objA, objB]);

  const filteredCross = crossMetrics.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.group.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = crossCategoryFilter === "all" || m.group === crossCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Unitary Trend Bar Chart
  const trendChartData = {
    labels: (aspectData?.multi_month_trend || []).map((t) => `${t.month} 2026`),
    datasets: [
      {
        label: `${aspectData?.metric_label || "Metric"} (${aspectData?.metric_unit || ""})`,
        data: (aspectData?.multi_month_trend || []).map((t) => t.value),
        backgroundColor: [GOV_PALETTE[0], GOV_PALETTE[1], GOV_PALETTE[2]],
        borderWidth: 1,
      },
    ],
  };

  // State vs State Head-to-Head Comparison Chart Data
  const headToHeadChartData = {
    labels: ["Central Stock (LMT)", "Wheat Stock (LMT)", "Rice Stock (LMT)", "Total Proc. (LMT)", "Offtake Lifted (KT / 10)"],
    datasets: [
      {
        label: stateA,
        data: [
          num(objA.central_stock_lmt),
          num(objA.wheat_stock_lmt),
          num(objA.rice_stock_lmt),
          num(objA.procurement_total_lakh),
          round(num(objA.upto_june_offtake_kt) / 10, 1),
        ],
        backgroundColor: "#0284c7",
      },
      {
        label: stateB,
        data: [
          num(objB.central_stock_lmt),
          num(objB.wheat_stock_lmt),
          num(objB.rice_stock_lmt),
          num(objB.procurement_total_lakh),
          round(num(objB.upto_june_offtake_kt) / 10, 1),
        ],
        backgroundColor: "#d97706",
      },
    ],
  };

  // Unitary Top Profile objects
  const profileTarget = aspectData?.target_state_profile || {};
  const profileBase = aspectData?.base_state_profile || {};

  // Filtered all metrics list for Tab 1
  const allMetricsList = (aspectData?.all_metrics_comparison || []).filter((m) =>
    m.label.toLowerCase().includes(unitaryTableFilter.toLowerCase()) ||
    m.category.toLowerCase().includes(unitaryTableFilter.toLowerCase())
  );

  return (
    <div className="unitary-comparison-page" style={{ padding: "10px 0" }}>
      {/* Top Header */}
      <div className="panel panel-default" style={{ borderLeft: "5px solid #0284c7", background: "#f8fafc", marginBottom: "16px" }}>
        <div className="panel-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.45rem", fontWeight: "700", color: "#0f172a" }}>
              <i className="fa fa-calculator" style={{ color: "#0284c7", marginRight: "8px" }} />
              Unitary Level Comparison &amp; Hidden Intelligence Engine
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
              Deep-dive into unitary aspects: compare specific metrics across months, view full-state operational scorecards, or execute cross-state comparative algorithms.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "aspect_mom" ? "btn-primary" : "btn-default"}`}
              style={{ fontWeight: "600" }}
              onClick={() => setActiveTab("aspect_mom")}
            >
              <i className="fa fa-sliders" style={{ marginRight: "6px" }} />
              Unitary State &amp; Aspect Across Months
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "state_cross" ? "btn-primary" : "btn-default"}`}
              style={{ fontWeight: "600" }}
              onClick={() => setActiveTab("state_cross")}
            >
              <i className="fa fa-columns" style={{ marginRight: "6px" }} />
              State vs State Cross-Comparator
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UNITARY STATE & ASPECT COMPARATOR (ACROSS MONTHS)                  */}
      {/* ========================================================================= */}
      {activeTab === "aspect_mom" && (
        <div>
          {/* Unitary Aspect Selectors */}
          <div className="panel panel-default" style={{ background: "#ffffff", marginBottom: "18px" }}>
            <div className="panel-body" style={{ padding: "16px" }}>
              <div className="row">
                {/* 1. State Selector */}
                <div className="col-md-3 col-sm-6" style={{ marginBottom: "10px" }}>
                  <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                    1. Select Target State / Entity:
                  </label>
                  <select
                    className="form-control input-sm"
                    value={unitaryState}
                    onChange={(e) => setUnitaryState(e.target.value)}
                    style={{ fontWeight: "600" }}
                  >
                    <option value="All India">🇮🇳 All India (National Total)</option>
                    {statesList.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Aspect / Metric Selector */}
                <div className="col-md-4 col-sm-6" style={{ marginBottom: "10px" }}>
                  <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                    2. Select Unitary Aspect / Metric:
                  </label>
                  <select
                    className="form-control input-sm"
                    value={unitaryMetric}
                    onChange={(e) => setUnitaryMetric(e.target.value)}
                    style={{ fontWeight: "600" }}
                  >
                    {unitaryMetricsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.category}] {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Base Month */}
                <div className="col-md-2 col-sm-6" style={{ marginBottom: "10px" }}>
                  <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                    3. Month 1 (Base):
                  </label>
                  <select
                    className="form-control input-sm"
                    value={monthA}
                    onChange={(e) => setMonthA(e.target.value)}
                    style={{ fontWeight: "600" }}
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m} 2026
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Comparison Month */}
                <div className="col-md-3 col-sm-6" style={{ marginBottom: "10px" }}>
                  <label style={{ fontWeight: "600", fontSize: "0.82rem", color: "#334155", display: "block" }}>
                    4. Month 2 (Comparison):
                  </label>
                  <select
                    className="form-control input-sm"
                    value={monthB}
                    onChange={(e) => setMonthB(e.target.value)}
                    style={{ fontWeight: "600" }}
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m} 2026
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {aspectLoading ? (
            <div className="panel panel-default" style={{ padding: "40px", textAlign: "center" }}>
              <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#0284c7" }} />
              <p style={{ marginTop: "10px", fontWeight: "600" }}>Extracting Comprehensive Unitary Metrics &amp; Derivatives...</p>
            </div>
          ) : aspectError ? (
            <div className="alert alert-danger">Error: {aspectError}</div>
          ) : aspectData ? (
            <div>
              {/* Four Executive Pillar Scorecards for the Unitary State */}
              <div className="row" style={{ marginBottom: "16px" }}>
                {/* Pillar 1: Stock & Holding Position */}
                <div className="col-md-3 col-sm-6" style={{ marginBottom: "12px" }}>
                  <div className="panel panel-default" style={{ height: "100%", borderTop: "3px solid #0284c7", borderRadius: "6px" }}>
                    <div className="panel-body" style={{ padding: "14px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                        <i className="fa fa-cubes" style={{ color: "#0284c7", marginRight: "5px" }} />
                        Pillar 1 · Central Pool Stock
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", margin: "4px 0" }}>
                        {fmt.num(profileTarget.central_stock_lmt || aspectData.target_value, 2)}{" "}
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>LMT</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: "1.5" }}>
                        <div>Wheat: <strong>{fmt.num(profileTarget.wheat_stock_lmt, 1)}</strong> · Rice: <strong>{fmt.num(profileTarget.rice_stock_lmt, 1)}</strong> LMT</div>
                        <div style={{ color: "#0284c7", fontWeight: "600" }}>FCI Share: {fmt.pct(profileTarget.fci_share_pct)} · Paddy: {fmt.num(profileTarget.paddy_stock_lmt, 1)} LMT</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pillar 2: Grain Procurement Performance */}
                <div className="col-md-3 col-sm-6" style={{ marginBottom: "12px" }}>
                  <div className="panel panel-default" style={{ height: "100%", borderTop: "3px solid #16a34a", borderRadius: "6px" }}>
                    <div className="panel-body" style={{ padding: "14px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                        <i className="fa fa-shopping-basket" style={{ color: "#16a34a", marginRight: "5px" }} />
                        Pillar 2 · Grain Procurement
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#15803d", margin: "4px 0" }}>
                        {fmt.num(profileTarget.procurement_total_lakh, 2)}{" "}
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Lakh MT</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: "1.5" }}>
                        <div>Wheat: <strong>{fmt.num(profileTarget.procurement_wheat_lakh, 1)}</strong> · Rice: <strong>{fmt.num(profileTarget.procurement_rice_lakh, 1)}</strong></div>
                        <div style={{ color: "#16a34a", fontWeight: "600" }}>KMS + RMS Season 2025-26 Contribution</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pillar 3: NFSA Quotas & Lifting Execution */}
                <div className="col-md-3 col-sm-6" style={{ marginBottom: "12px" }}>
                  <div className="panel panel-default" style={{ height: "100%", borderTop: "3px solid #d97706", borderRadius: "6px" }}>
                    <div className="panel-body" style={{ padding: "14px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                        <i className="fa fa-truck" style={{ color: "#d97706", marginRight: "5px" }} />
                        Pillar 3 · Allocation &amp; Offtake
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#b45309", margin: "4px 0" }}>
                        {fmt.num(profileTarget.annual_nfsa_allocation_kt, 1)}{" "}
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>KT Alloc</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: "1.5" }}>
                        <div>Offtake Lifted: <strong>{fmt.num(profileTarget.upto_june_offtake_kt, 1)} KT</strong> ({fmt.pct(profileTarget.offtake_rate_pct)})</div>
                        <div style={{ color: profileTarget.offtake_gap_kt > 0 ? "#dc2626" : "#16a34a", fontWeight: "600" }}>
                          Unlifted Quota: {fmt.num(profileTarget.offtake_gap_kt, 1)} KT
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pillar 4: PDS Infrastructure & Portability */}
                <div className="col-md-3 col-sm-6" style={{ marginBottom: "12px" }}>
                  <div className="panel panel-default" style={{ height: "100%", borderTop: "3px solid #8b5cf6", borderRadius: "6px" }}>
                    <div className="panel-body" style={{ padding: "14px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                        <i className="fa fa-id-card-o" style={{ color: "#8b5cf6", marginRight: "5px" }} />
                        Pillar 4 · PDS &amp; Portability
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#6d28d9", margin: "4px 0" }}>
                        {fmt.int(profileTarget.total_fps_count)}{" "}
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>FPS Shops</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: "1.5" }}>
                        <div>ONORC Portability: <strong>{fmt.int(profileTarget.portability_txns)} Txns</strong></div>
                        <div style={{ color: "#6d28d9", fontWeight: "600" }}>NFSA Population Coverage: {fmt.pct(profileTarget.nfsa_coverage_pct)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specific Selected Metric Quantified Change Banner */}
              <div className="panel panel-default" style={{ background: "#ffffff", borderRadius: "6px", marginBottom: "16px", padding: "14px 18px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#0369a1", marginBottom: "10px", textTransform: "uppercase" }}>
                  <i className="fa fa-crosshairs" style={{ marginRight: "6px" }} />
                  Selected Unitary Metric Focus: {aspectData.metric_label} ({aspectData.state})
                </div>
                <div className="row">
                  {/* Month A Card */}
                  <div className="col-md-3 col-sm-6">
                    <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "700" }}>
                      {aspectData.base_month} 2026 Level
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0f172a" }}>
                      {aspectData.base_value?.toLocaleString()} <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{aspectData.metric_unit}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {aspectData.state !== "All India" ? `National Rank: #${aspectData.base_rank || "N/A"}` : "All-India Total"}
                    </div>
                  </div>

                  {/* Month B Card */}
                  <div className="col-md-3 col-sm-6">
                    <div style={{ fontSize: "0.78rem", color: "#0284c7", fontWeight: "700" }}>
                      {aspectData.target_month} 2026 Level
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0369a1" }}>
                      {aspectData.target_value?.toLocaleString()} <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{aspectData.metric_unit}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {aspectData.state !== "All India" ? `National Rank: #${aspectData.target_rank || "N/A"}` : "All-India Total"}
                    </div>
                  </div>

                  {/* Absolute & Percentage Delta */}
                  <div className="col-md-3 col-sm-6">
                    <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "700" }}>
                      Quantified Difference (MoM Δ)
                    </div>
                    <div
                      style={{
                        fontSize: "1.6rem",
                        fontWeight: "800",
                        color: aspectData.delta >= 0 ? "#15803d" : "#b91c1c",
                      }}
                    >
                      {aspectData.delta >= 0 ? "+" : ""}
                      {aspectData.delta?.toLocaleString()} <span style={{ fontSize: "0.8rem" }}>{aspectData.metric_unit}</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "700", color: aspectData.delta >= 0 ? "#15803d" : "#b91c1c" }}>
                      {aspectData.delta >= 0 ? "▲ +" : "▼ "}
                      {aspectData.delta_pct != null ? `${aspectData.delta_pct}% MoM Change` : "Baseline N/A"}
                    </div>
                  </div>

                  {/* National Share & Footprint */}
                  <div className="col-md-3 col-sm-6">
                    <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "700" }}>
                      National Share &amp; Footprint
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#6d28d9" }}>
                      {aspectData.target_national_share_pct}%
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {aspectData.national_share_delta_pct !== 0 ? (
                        <span>
                          {aspectData.national_share_delta_pct > 0 ? "▲ +" : "▼ "}
                          {Math.abs(aspectData.national_share_delta_pct)} pp vs {aspectData.base_month}
                        </span>
                      ) : (
                        "Share unchanged"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Automated Hidden Insights & Algorithmic Intelligence Card */}
              <div className="panel panel-default" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", marginBottom: "18px" }}>
                <div className="panel-body" style={{ padding: "14px 18px" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: "700", color: "#166534" }}>
                    <i className="fa fa-lightbulb-o" style={{ marginRight: "8px", color: "#15803d" }} />
                    Hidden Insights &amp; Algorithmic Intelligence ({aspectData.state} — {aspectData.metric_label})
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.88rem", color: "#14532d", lineHeight: "1.6" }}>
                    {aspectData.hidden_insights?.map((insight, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>
                        <strong>Intelligence Signal #{idx + 1}:</strong> {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Dual Visuals: Multi-Month Trajectory + Top 10 National Leaderboard */}
              <div className="row" style={{ marginBottom: "18px" }}>
                {/* Left: Trajectory */}
                <div className="col-md-7">
                  <div className="panel panel-default" style={{ borderRadius: "6px", height: "100%" }}>
                    <div className="panel-heading" style={{ fontWeight: "700", fontSize: "0.88rem" }}>
                      <i className="fa fa-line-chart" style={{ marginRight: "6px", color: "#0284c7" }} />
                      Multi-Month Trajectory: {aspectData.state} — {aspectData.metric_label} ({aspectData.metric_unit})
                    </div>
                    <div className="panel-body" style={{ height: "240px" }}>
                      <BarChart data={trendChartData} height={200} />
                    </div>
                  </div>
                </div>

                {/* Right: Top 10 National Leaderboard */}
                <div className="col-md-5">
                  <div className="panel panel-default" style={{ borderRadius: "6px", height: "100%" }}>
                    <div className="panel-heading" style={{ fontWeight: "700", fontSize: "0.88rem" }}>
                      <i className="fa fa-trophy" style={{ marginRight: "6px", color: "#d97706" }} />
                      National Leaderboard (Top States in {aspectData.target_month} 2026)
                    </div>
                    <div className="table-responsive" style={{ maxHeight: "240px", overflowY: "auto" }}>
                      <table className="table table-condensed table-striped" style={{ marginBottom: 0, fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ width: "12%" }}>Rank</th>
                            <th>State</th>
                            <th style={{ textAlign: "right" }}>Level</th>
                            <th style={{ textAlign: "right" }}>Share %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(aspectData.top_states || []).map((st) => (
                            <tr
                              key={st.state}
                              style={{
                                background: st.is_selected ? "#e0f2fe" : "transparent",
                                fontWeight: st.is_selected ? "700" : "normal",
                              }}
                            >
                              <td>#{st.rank}</td>
                              <td>
                                {st.state} {st.is_selected ? <span className="label label-primary" style={{ fontSize: "0.68rem" }}>Selected</span> : null}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: "700" }}>
                                {fmt.num(st.value, 1)}
                              </td>
                              <td style={{ textAlign: "right", color: "#64748b" }}>
                                {st.share_pct}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive Multi-Metric MoM State Matrix Table */}
              <div className="panel panel-default" style={{ borderRadius: "6px", marginBottom: "20px" }}>
                <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <h3 className="panel-title" style={{ fontWeight: "700" }}>
                    <i className="fa fa-table" style={{ marginRight: "6px", color: "#0284c7" }} />
                    Full Unitary Operational Profile for {aspectData.state} ({aspectData.base_month} vs {aspectData.target_month} 2026)
                  </h3>
                  <input
                    type="text"
                    className="form-control input-sm"
                    style={{ width: "240px" }}
                    placeholder="Search metric or category..."
                    value={unitaryTableFilter}
                    onChange={(e) => setUnitaryTableFilter(e.target.value)}
                  />
                </div>

                <div className="table-responsive">
                  <table className="table table-striped table-hover table-bordered" style={{ marginBottom: 0, fontSize: "0.86rem" }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th style={{ width: "32%" }}>Category &amp; Metric Name</th>
                        <th style={{ textAlign: "right", width: "16%", color: "#64748b" }}>{aspectData.base_month} 2026</th>
                        <th style={{ textAlign: "right", width: "16%", color: "#0284c7" }}>{aspectData.target_month} 2026</th>
                        <th style={{ textAlign: "right", width: "14%" }}>MoM Δ Difference</th>
                        <th style={{ textAlign: "right", width: "12%" }}>% Change</th>
                        <th style={{ textAlign: "center", width: "10%" }}>Trend Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMetricsList.map((m) => {
                        const isPos = m.delta >= 0;
                        return (
                          <tr key={m.id}>
                            <td style={{ fontWeight: "600" }}>
                              <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", textTransform: "uppercase" }}>
                                {m.category}
                              </span>
                              {m.label} <span style={{ color: "#64748b", fontSize: "0.75rem" }}>({m.unit})</span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "600", color: "#64748b" }}>
                              {fmt.num(m.base_value, 2)}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "700", color: "#0369a1" }}>
                              {fmt.num(m.target_value, 2)}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "700", color: isPos ? "#16a34a" : "#dc2626" }}>
                              {isPos ? "+" : ""}{fmt.num(m.delta, 2)}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {m.delta_pct != null ? (
                                <span className={`label ${m.delta_pct >= 0 ? "label-success" : "label-danger"}`} style={{ fontSize: "0.75rem" }}>
                                  {m.delta_pct >= 0 ? "+" : ""}{m.delta_pct}%
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {m.delta > 0 ? (
                                <span style={{ color: "#16a34a", fontWeight: "700" }}>▲ Expand</span>
                              ) : m.delta < 0 ? (
                                <span style={{ color: "#dc2626", fontWeight: "700" }}>▼ Contract</span>
                              ) : (
                                <span style={{ color: "#64748b" }}>➖ Constant</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!allMetricsList.length && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                            No metrics match "{unitaryTableFilter}"
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STATE A VS STATE B CROSS-COMPARATOR                                */}
      {/* ========================================================================= */}
      {activeTab === "state_cross" && (
        <div>
          {/* Selectors Panel */}
          <div className="panel panel-default" style={{ background: "#ffffff", marginBottom: "18px" }}>
            <div className="panel-body" style={{ padding: "16px" }}>
              <div className="row" style={{ alignItems: "center" }}>
                {/* State A */}
                <div className="col-md-3 col-sm-5" style={{ marginBottom: "8px" }}>
                  <label style={{ fontWeight: "600", fontSize: "0.85rem", color: "#0369a1", display: "block" }}>
                    <i className="fa fa-circle" style={{ color: "#0284c7", marginRight: "6px" }} />
                    Select State A (Baseline):
                  </label>
                  <select
                    className="form-control"
                    value={stateA}
                    onChange={(e) => setStateA(e.target.value)}
                    style={{ fontWeight: "700", borderColor: "#0284c7" }}
                  >
                    {statesList.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <div className="col-md-1 col-sm-2 text-center" style={{ marginBottom: "8px", paddingTop: "18px" }}>
                  <button
                    type="button"
                    className="btn btn-default btn-sm"
                    title="Swap State A and State B"
                    onClick={() => {
                      const temp = stateA;
                      setStateA(stateB);
                      setStateB(temp);
                    }}
                    style={{ fontWeight: "700" }}
                  >
                    <i className="fa fa-arrows-h" style={{ fontSize: "1.1rem", color: "#475569" }} />
                  </button>
                </div>

                {/* State B */}
                <div className="col-md-3 col-sm-5" style={{ marginBottom: "8px" }}>
                  <label style={{ fontWeight: "600", fontSize: "0.85rem", color: "#b45309", display: "block" }}>
                    <i className="fa fa-circle" style={{ color: "#d97706", marginRight: "6px" }} />
                    Select State B (Comparison):
                  </label>
                  <select
                    className="form-control"
                    value={stateB}
                    onChange={(e) => setStateB(e.target.value)}
                    style={{ fontWeight: "700", borderColor: "#d97706" }}
                  >
                    {statesList.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className="col-md-5 col-sm-12" style={{ marginBottom: "8px" }}>
                  <label style={{ fontWeight: "600", fontSize: "0.85rem", color: "#475569", display: "block" }}>
                    Filter Metric Name:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search metric name (e.g. wheat, offtake, buffer)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {[
                  { id: "all", label: "All Categories" },
                  { id: "Stocks & Storage", label: "Stocks & Storage" },
                  { id: "Grain Procurement", label: "Grain Procurement" },
                  { id: "Allocation & Distribution", label: "Allocation & Distribution" },
                  { id: "NFSA Beneficiaries & Coverage", label: "Coverage & Population" },
                  { id: "Infrastructure & Portability", label: "PDS Infrastructure" },
                  { id: "Computed Derived Algorithms", label: "Derived Algorithms" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`btn btn-xs ${crossCategoryFilter === cat.id ? "btn-primary" : "btn-default"}`}
                    onClick={() => setCrossCategoryFilter(cat.id)}
                    style={{ borderRadius: "12px", padding: "3px 10px", fontWeight: "600" }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Head-to-Head Comparative Overview Scorecard */}
          <div className="row" style={{ marginBottom: "16px" }}>
            {/* Stock Leader */}
            <div className="col-md-3 col-sm-6" style={{ marginBottom: "10px" }}>
              <div className="panel panel-default" style={{ borderRadius: "6px", borderLeft: "4px solid #0284c7" }}>
                <div className="panel-body" style={{ padding: "12px" }}>
                  <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    Central Pool Stock Leader
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", margin: "3px 0" }}>
                    {num(objA.central_stock_lmt) >= num(objB.central_stock_lmt) ? stateA : stateB}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#0284c7", fontWeight: "600" }}>
                    Lead Margin: +{Math.abs(num(objA.central_stock_lmt) - num(objB.central_stock_lmt)).toFixed(1)} LMT
                  </div>
                </div>
              </div>
            </div>

            {/* Procurement Leader */}
            <div className="col-md-3 col-sm-6" style={{ marginBottom: "10px" }}>
              <div className="panel panel-default" style={{ borderRadius: "6px", borderLeft: "4px solid #16a34a" }}>
                <div className="panel-body" style={{ padding: "12px" }}>
                  <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    Procurement Leader
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#15803d", margin: "3px 0" }}>
                    {num(objA.procurement_total_lakh) >= num(objB.procurement_total_lakh) ? stateA : stateB}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: "600" }}>
                    Lead Margin: +{Math.abs(num(objA.procurement_total_lakh) - num(objB.procurement_total_lakh)).toFixed(1)} Lakh MT
                  </div>
                </div>
              </div>
            </div>

            {/* Offtake Rate Leader */}
            <div className="col-md-3 col-sm-6" style={{ marginBottom: "10px" }}>
              <div className="panel panel-default" style={{ borderRadius: "6px", borderLeft: "4px solid #d97706" }}>
                <div className="panel-body" style={{ padding: "12px" }}>
                  <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    Offtake Efficiency Leader
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#b45309", margin: "3px 0" }}>
                    {num(objA.offtake_rate_pct) >= num(objB.offtake_rate_pct) ? stateA : stateB}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#d97706", fontWeight: "600" }}>
                    Lead Margin: +{Math.abs(num(objA.offtake_rate_pct) - num(objB.offtake_rate_pct)).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* PDS Outlets Leader */}
            <div className="col-md-3 col-sm-6" style={{ marginBottom: "10px" }}>
              <div className="panel panel-default" style={{ borderRadius: "6px", borderLeft: "4px solid #8b5cf6" }}>
                <div className="panel-body" style={{ padding: "12px" }}>
                  <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    PDS Infrastructure Leader
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#6d28d9", margin: "3px 0" }}>
                    {num(objA.total_fps_count) >= num(objB.total_fps_count) ? stateA : stateB}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#8b5cf6", fontWeight: "600" }}>
                    Lead Margin: +{Math.abs(num(objA.total_fps_count) - num(objB.total_fps_count)).toLocaleString()} FPS
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Head-to-Head Comparison Chart */}
          <div className="panel panel-default" style={{ borderRadius: "6px", marginBottom: "18px" }}>
            <div className="panel-heading" style={{ fontWeight: "700", fontSize: "0.9rem" }}>
              <i className="fa fa-bar-chart" style={{ marginRight: "6px", color: "#0284c7" }} />
              Head-to-Head Key Volumes: {stateA} (Blue) vs {stateB} (Amber)
            </div>
            <div className="panel-body" style={{ height: "230px" }}>
              <BarChart data={headToHeadChartData} height={200} />
            </div>
          </div>

          {/* Cross Table */}
          <div className="panel panel-default" style={{ borderRadius: "6px" }}>
            <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="panel-title" style={{ fontWeight: "700" }}>
                <i className="fa fa-table" style={{ marginRight: "6px", color: "#0284c7" }} />
                Unitary Metrics &amp; Computational Differentials ({stateA} vs {stateB})
              </h3>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Active Month: <strong>{selectedMonth} 2026</strong>
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-hover table-bordered" style={{ marginBottom: 0, fontSize: "0.88rem" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={{ width: "30%" }}>Unitary Aspect / Algorithmic Metric</th>
                    <th style={{ textAlign: "right", width: "16%", color: "#0369a1" }}>{stateA} (A)</th>
                    <th style={{ textAlign: "right", width: "16%", color: "#b45309" }}>{stateB} (B)</th>
                    <th style={{ textAlign: "right", width: "14%" }}>Diff (B - A)</th>
                    <th style={{ textAlign: "right", width: "12%" }}>% Delta</th>
                    <th style={{ textAlign: "right", width: "12%" }}>Ratio (A / B)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCross.map((m, idx) => {
                    const diff = calcDiff(m.valA, m.valB);
                    const pctDiff = calcPctDiff(m.valA, m.valB);
                    const ratio = calcRatio(m.valA, m.valB);
                    const isPos = diff >= 0;

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: "600" }}>
                          <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", textTransform: "uppercase" }}>
                            {m.group}
                          </span>
                          {m.name} <span style={{ color: "#64748b", fontSize: "0.78rem" }}>({m.unit})</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#0369a1" }}>
                          {fmt.num(m.valA, 2)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#b45309" }}>
                          {fmt.num(m.valB, 2)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: isPos ? "#16a34a" : "#dc2626" }}>
                          {isPos ? "+" : ""}{fmt.num(diff, 2)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {pctDiff != null ? (
                            <span className={`label ${pctDiff >= 0 ? "label-success" : "label-danger"}`}>
                              {pctDiff >= 0 ? "+" : ""}{round(pctDiff, 1)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ textAlign: "right", color: "#475569", fontWeight: "600" }}>
                          {ratio != null ? `${round(ratio, 2)}x` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredCross.length && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                        No metrics found matching "{searchTerm}"
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
