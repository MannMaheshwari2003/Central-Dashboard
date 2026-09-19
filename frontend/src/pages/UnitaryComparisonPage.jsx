import { useState, useEffect, useMemo } from "react";
import { useMonth } from "../context/MonthContext.jsx";
import { fmt } from "../utils/format.js";
import { BarChart, GOV_PALETTE } from "../components/charts/index.js";
import { api } from "../api/client.js";

const round = (v, d = 2) => (v == null || Number.isNaN(Number(v)) ? null : Number(Number(v).toFixed(d)));
const num = (v) => Number(v) || 0;

export default function UnitaryComparisonPage({ mode, embedded = false }) {
  const { availableMonths, selectedMonth, baseMonth: ctxBase, targetMonth: ctxTarget } = useMonth();
  const [activeTab, setActiveTab] = useState(mode || "aspect_mom"); // "aspect_mom" | "state_cross"

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

  useEffect(() => {
    if (mode) setActiveTab(mode);
  }, [mode]);

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
        setAspectData(await api.getUnitaryAspect(Object.fromEntries(params)));
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
        const json = await api.getAnalyticsStates({ month: selectedMonth });
        setStatesList(json.data || []);
      } catch (err) {
        setStatesError(err.message);
      } finally {
        setStatesLoading(false);
      }
    }
    loadStates();
  }, [selectedMonth]);

  const objA = useMemo(() => statesList.find((s) => s.state === stateA) || {}, [statesList, stateA]);
  const objB = useMemo(() => statesList.find((s) => s.state === stateB) || {}, [statesList, stateB]);

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
  // Filtered all metrics list for Tab 1
  const allMetricsList = (aspectData?.all_metrics_comparison || []).filter((m) =>
    m.label.toLowerCase().includes(unitaryTableFilter.toLowerCase()) ||
    m.category.toLowerCase().includes(unitaryTableFilter.toLowerCase())
  );

  return (
    <div className="unitary-comparison-page uc-s001" >
      {/* Top Header */}
      <div className="panel panel-default uc-s002" >
        <div className="panel-body uc-s003" >
          <div>
            <h2 className="uc-s004" >
              <i className="fa fa-calculator uc-s005" />
              Unitary Level Comparison &amp; Hidden Intelligence Engine
            </h2>
            <p className="uc-s006" >
              Deep-dive into unitary aspects: compare specific metrics across months, view full-state operational scorecards, or execute cross-state comparative algorithms.
            </p>
          </div>

          {/* Standalone route fallback. The merged Comparison Engine owns this switcher. */}
          {!embedded && <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "aspect_mom" ? "btn-primary" : "btn-default"} uc-s007`}

              onClick={() => setActiveTab("aspect_mom")}
            >
              <i className="fa fa-sliders uc-s008" />
              Unitary State &amp; Aspect Across Months
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "state_cross" ? "btn-primary" : "btn-default"} uc-s007`}

              onClick={() => setActiveTab("state_cross")}
            >
              <i className="fa fa-columns uc-s008" />
              State vs State Cross-Comparator
            </button>
          </div>}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UNITARY STATE & ASPECT COMPARATOR (ACROSS MONTHS)                  */}
      {/* ========================================================================= */}
      {activeTab === "aspect_mom" && (
        <div>
          {/* Unitary Aspect Selectors */}
          <div className="panel panel-default uc-s009" >
            <div className="panel-body uc-s010" >
              <div className="row">
                {/* 1. State Selector */}
                <div className="col-md-3 col-sm-6 uc-s011" >
                  <label className="uc-s012" >
                    1. Select Target State / Entity:
                  </label>
                  <select
                    className="form-control input-sm uc-s007"
                    value={unitaryState}
                    onChange={(e) => setUnitaryState(e.target.value)}

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
                <div className="col-md-4 col-sm-6 uc-s011" >
                  <label className="uc-s012" >
                    2. Select Unitary Aspect / Metric:
                  </label>
                  <select
                    className="form-control input-sm uc-s007"
                    value={unitaryMetric}
                    onChange={(e) => setUnitaryMetric(e.target.value)}

                  >
                    {unitaryMetricsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.category}] {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Base Month */}
                <div className="col-md-2 col-sm-6 uc-s011" >
                  <label className="uc-s012" >
                    3. Month 1 (Base):
                  </label>
                  <select
                    className="form-control input-sm uc-s007"
                    value={monthA}
                    onChange={(e) => setMonthA(e.target.value)}

                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m} 2026
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Comparison Month */}
                <div className="col-md-3 col-sm-6 uc-s011" >
                  <label className="uc-s012" >
                    4. Month 2 (Comparison):
                  </label>
                  <select
                    className="form-control input-sm uc-s007"
                    value={monthB}
                    onChange={(e) => setMonthB(e.target.value)}

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
            <div className="panel panel-default uc-s013" >
              <i className="fa fa-spinner fa-spin fa-2x uc-s014" />
              <p className="uc-s015" >Extracting Comprehensive Unitary Metrics &amp; Derivatives...</p>
            </div>
          ) : aspectError ? (
            <div className="alert alert-danger">Error: {aspectError}</div>
          ) : aspectData ? (
            <div>
              {/* Four Executive Pillar Scorecards for the Unitary State */}
              <div className="row uc-s016" >
                {/* Pillar 1: Stock & Holding Position */}
                <div className="col-md-3 col-sm-6 uc-s017" >
                  <div className="panel panel-default uc-s018" >
                    <div className="panel-body uc-s019" >
                      <div className="uc-s020" >
                        <i className="fa fa-cubes uc-s021" />
                        Pillar 1 · Central Pool Stock
                      </div>
                      <div className="uc-s022" >
                        {fmt.num(profileTarget.central_stock_lmt || aspectData.target_value, 2)}{" "}
                        <span className="uc-s023" >LMT</span>
                      </div>
                      <div className="uc-s024" >
                        <div>Wheat: <strong>{fmt.num(profileTarget.wheat_stock_lmt, 1)}</strong> · Rice: <strong>{fmt.num(profileTarget.rice_stock_lmt, 1)}</strong> LMT</div>
                        <div className="uc-s025" >FCI Share: {fmt.pct(profileTarget.fci_share_pct)} · Paddy: {fmt.num(profileTarget.paddy_stock_lmt, 1)} LMT</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pillar 2: Grain Procurement Performance */}
                <div className="col-md-3 col-sm-6 uc-s017" >
                  <div className="panel panel-default uc-s026" >
                    <div className="panel-body uc-s019" >
                      <div className="uc-s020" >
                        <i className="fa fa-shopping-basket uc-s027" />
                        Pillar 2 · Grain Procurement
                      </div>
                      <div className="uc-s028" >
                        {fmt.num(profileTarget.procurement_total_lakh, 2)}{" "}
                        <span className="uc-s023" >Lakh MT</span>
                      </div>
                      <div className="uc-s024" >
                        <div>Wheat: <strong>{fmt.num(profileTarget.procurement_wheat_lakh, 1)}</strong> · Rice: <strong>{fmt.num(profileTarget.procurement_rice_lakh, 1)}</strong></div>
                        <div className="uc-s029" >KMS + RMS Season 2025-26 Contribution</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pillar 3: NFSA Quotas & Lifting Execution */}
                <div className="col-md-3 col-sm-6 uc-s017" >
                  <div className="panel panel-default uc-s030" >
                    <div className="panel-body uc-s019" >
                      <div className="uc-s020" >
                        <i className="fa fa-truck uc-s031" />
                        Pillar 3 · Allocation &amp; Offtake
                      </div>
                      <div className="uc-s032" >
                        {fmt.num(profileTarget.annual_nfsa_allocation_kt, 1)}{" "}
                        <span className="uc-s023" >KT Alloc</span>
                      </div>
                      <div className="uc-s024" >
                        <div>Offtake Lifted: <strong>{fmt.num(profileTarget.upto_june_offtake_kt, 1)} KT</strong> ({fmt.pct(profileTarget.offtake_rate_pct)})</div>
                        <div className={`uc-status-text ${profileTarget.offtake_gap_kt > 0 ? "uc-status-negative" : "uc-status-positive"}`}>
                          Unlifted Quota: {fmt.num(profileTarget.offtake_gap_kt, 1)} KT
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pillar 4: PDS Infrastructure & Portability */}
                <div className="col-md-3 col-sm-6 uc-s017" >
                  <div className="panel panel-default uc-s033" >
                    <div className="panel-body uc-s019" >
                      <div className="uc-s020" >
                        <i className="fa fa-id-card-o uc-s034" />
                        Pillar 4 · PDS &amp; Portability
                      </div>
                      <div className="uc-s035" >
                        {fmt.int(profileTarget.total_fps_count)}{" "}
                        <span className="uc-s023" >FPS Shops</span>
                      </div>
                      <div className="uc-s024" >
                        <div>ONORC Portability: <strong>{fmt.int(profileTarget.portability_txns)} Txns</strong></div>
                        <div className="uc-s036" >NFSA Population Coverage: {fmt.pct(profileTarget.nfsa_coverage_pct)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specific Selected Metric Quantified Change Banner */}
              <div className="panel panel-default uc-s037" >
                <div className="uc-s038" >
                  <i className="fa fa-crosshairs uc-s008" />
                  Selected Unitary Metric Focus: {aspectData.metric_label} ({aspectData.state})
                </div>
                <div className="row">
                  {/* Month A Card */}
                  <div className="col-md-3 col-sm-6">
                    <div className="uc-s039" >
                      {aspectData.base_month} 2026 Level
                    </div>
                    <div className="uc-s040" >
                      {aspectData.base_value?.toLocaleString()} <span className="uc-s023" >{aspectData.metric_unit}</span>
                    </div>
                    <div className="uc-s041" >
                      {aspectData.state !== "All India" ? `National Rank: #${aspectData.base_rank || "N/A"}` : "All-India Total"}
                    </div>
                  </div>

                  {/* Month B Card */}
                  <div className="col-md-3 col-sm-6">
                    <div className="uc-s042" >
                      {aspectData.target_month} 2026 Level
                    </div>
                    <div className="uc-s043" >
                      {aspectData.target_value?.toLocaleString()} <span className="uc-s023" >{aspectData.metric_unit}</span>
                    </div>
                    <div className="uc-s041" >
                      {aspectData.state !== "All India" ? `National Rank: #${aspectData.target_rank || "N/A"}` : "All-India Total"}
                    </div>
                  </div>

                  {/* Absolute & Percentage Delta */}
                  <div className="col-md-3 col-sm-6">
                    <div className="uc-s039" >
                      Quantified Difference (MoM Δ)
                    </div>
                    <div
                      className={`uc-delta-value ${aspectData.delta >= 0 ? "uc-delta-positive" : "uc-delta-negative"}`}
                    >
                      {aspectData.delta >= 0 ? "+" : ""}
                      {aspectData.delta?.toLocaleString()} <span className="uc-s044" >{aspectData.metric_unit}</span>
                    </div>
                    <div className={`uc-delta-caption ${aspectData.delta >= 0 ? "uc-delta-positive" : "uc-delta-negative"}`}>
                      {aspectData.delta >= 0 ? "▲ +" : "▼ "}
                      {aspectData.delta_pct != null ? `${aspectData.delta_pct}% MoM Change` : "Baseline N/A"}
                    </div>
                  </div>

                  {/* National Share & Footprint */}
                  <div className="col-md-3 col-sm-6">
                    <div className="uc-s039" >
                      National Share &amp; Footprint
                    </div>
                    <div className="uc-s045" >
                      {aspectData.target_national_share_pct}%
                    </div>
                    <div className="uc-s041" >
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
              <div className="panel panel-default uc-s046" >
                <div className="panel-body uc-s047" >
                  <h4 className="uc-s048" >
                    <i className="fa fa-lightbulb-o uc-s049" />
                    Hidden Insights &amp; Algorithmic Intelligence ({aspectData.state} — {aspectData.metric_label})
                  </h4>
                  <ul className="uc-s050" >
                    {aspectData.hidden_insights?.map((insight, idx) => (
                      <li key={idx} className="uc-s051" >
                        <strong>Intelligence Signal #{idx + 1}:</strong> {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Dual Visuals: Multi-Month Trajectory + Top 10 National Leaderboard */}
              <div className="row uc-s052" >
                {/* Left: Trajectory */}
                <div className="col-md-7">
                  <div className="panel panel-default uc-s053" >
                    <div className="panel-heading uc-s054" >
                      <i className="fa fa-line-chart uc-s055" />
                      Multi-Month Trajectory: {aspectData.state} — {aspectData.metric_label} ({aspectData.metric_unit})
                    </div>
                    <div className="panel-body uc-s056" >
                      <BarChart data={trendChartData} height={200} />
                    </div>
                  </div>
                </div>

                {/* Right: Top 10 National Leaderboard */}
                <div className="col-md-5">
                  <div className="panel panel-default uc-s053" >
                    <div className="panel-heading uc-s054" >
                      <i className="fa fa-trophy uc-s057" />
                      National Leaderboard (Top States in {aspectData.target_month} 2026)
                    </div>
                    <div className="table-responsive uc-s058" >
                      <table className="table table-condensed table-striped uc-s059" >
                        <thead>
                          <tr className="uc-s060" >
                            <th className="uc-s061" >Rank</th>
                            <th>State</th>
                            <th className="uc-s062" >Level</th>
                            <th className="uc-s062" >Share %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(aspectData.top_states || []).map((st) => (
                            <tr
                              key={st.state}
                              className={st.is_selected ? "uc-selected-row" : ""}
                            >
                              <td>#{st.rank}</td>
                              <td>
                                {st.state} {st.is_selected ? <span className="label label-primary uc-s063" >Selected</span> : null}
                              </td>
                              <td className="uc-s064" >
                                {fmt.num(st.value, 1)}
                              </td>
                              <td className="uc-s065" >
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
              <div className="panel panel-default uc-s066" >
                <div className="panel-heading uc-s067" >
                  <h3 className="panel-title uc-s068" >
                    <i className="fa fa-table uc-s055" />
                    Full Unitary Operational Profile for {aspectData.state} ({aspectData.base_month} vs {aspectData.target_month} 2026)
                  </h3>
                  <input
                    type="text"
                    className="form-control input-sm uc-s069"

                    placeholder="Search metric or category..."
                    value={unitaryTableFilter}
                    onChange={(e) => setUnitaryTableFilter(e.target.value)}
                  />
                </div>

                <div className="table-responsive">
                  <table className="table table-striped table-hover table-bordered uc-s070" >
                    <thead className="uc-s060" >
                      <tr>
                        <th className="uc-s071" >Category &amp; Metric Name</th>
                        <th className="uc-s072" >{aspectData.base_month} 2026</th>
                        <th className="uc-s073" >{aspectData.target_month} 2026</th>
                        <th className="uc-s074" >MoM Δ Difference</th>
                        <th className="uc-s075" >% Change</th>
                        <th className="uc-s076" >Trend Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMetricsList.map((m) => {
                        const isPos = m.delta >= 0;
                        return (
                          <tr key={m.id}>
                            <td className="uc-s007" >
                              <span className="uc-s077" >
                                {m.category}
                              </span>
                              {m.label} <span className="uc-s078" >({m.unit})</span>
                            </td>
                            <td className="uc-s079" >
                              {fmt.num(m.base_value, 2)}
                            </td>
                            <td className="uc-s080" >
                              {fmt.num(m.target_value, 2)}
                            </td>
                            <td className={`uc-align-right uc-weight-bold ${isPos ? "uc-status-positive" : "uc-status-negative"}`}>
                              {isPos ? "+" : ""}{fmt.num(m.delta, 2)}
                            </td>
                            <td className="uc-s062" >
                              {m.delta_pct != null ? (
                                <span className={`label ${m.delta_pct >= 0 ? "label-success" : "label-danger"} uc-s081`} >
                                  {m.delta_pct >= 0 ? "+" : ""}{m.delta_pct}%
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="uc-s082" >
                              {m.delta > 0 ? (
                                <span className="uc-s083" >▲ Expand</span>
                              ) : m.delta < 0 ? (
                                <span className="uc-s084" >▼ Contract</span>
                              ) : (
                                <span className="uc-s085" >➖ Constant</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!allMetricsList.length && (
                        <tr>
                          <td colSpan="6" className="uc-s086" >
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
          {statesLoading && <div className="alert alert-info">Loading state comparison data…</div>}
          {statesError && <div className="alert alert-danger">{statesError}</div>}
          {/* Selectors Panel */}
          <div className="panel panel-default uc-s009" >
            <div className="panel-body uc-s010" >
              <div className="row uc-s087" >
                {/* State A */}
                <div className="col-md-3 col-sm-5 uc-s088" >
                  <label className="uc-s089" >
                    <i className="fa fa-circle uc-s090" />
                    Select State A (Baseline):
                  </label>
                  <select
                    className="form-control uc-s091"
                    value={stateA}
                    onChange={(e) => setStateA(e.target.value)}

                  >
                    {statesList.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <div className="col-md-1 col-sm-2 text-center uc-s092" >
                  <button
                    type="button"
                    className="btn btn-default btn-sm uc-s068"
                    title="Swap State A and State B"
                    onClick={() => {
                      const temp = stateA;
                      setStateA(stateB);
                      setStateB(temp);
                    }}

                  >
                    <i className="fa fa-arrows-h uc-s093" />
                  </button>
                </div>

                {/* State B */}
                <div className="col-md-3 col-sm-5 uc-s088" >
                  <label className="uc-s094" >
                    <i className="fa fa-circle uc-s095" />
                    Select State B (Comparison):
                  </label>
                  <select
                    className="form-control uc-s096"
                    value={stateB}
                    onChange={(e) => setStateB(e.target.value)}

                  >
                    {statesList.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className="col-md-5 col-sm-12 uc-s088" >
                  <label className="uc-s097" >
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
              <div className="uc-s098" >
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
                    className={`btn btn-xs ${crossCategoryFilter === cat.id ? "btn-primary" : "btn-default"} uc-s099`}
                    onClick={() => setCrossCategoryFilter(cat.id)}

                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Head-to-Head Comparative Overview Scorecard */}
          <div className="row uc-s016" >
            {/* Stock Leader */}
            <div className="col-md-3 col-sm-6 uc-s011" >
              <div className="panel panel-default uc-s100" >
                <div className="panel-body uc-s101" >
                  <div className="uc-s102" >
                    Central Pool Stock Leader
                  </div>
                  <div className="uc-s103" >
                    {num(objA.central_stock_lmt) >= num(objB.central_stock_lmt) ? stateA : stateB}
                  </div>
                  <div className="uc-s104" >
                    Lead Margin: +{Math.abs(num(objA.central_stock_lmt) - num(objB.central_stock_lmt)).toFixed(1)} LMT
                  </div>
                </div>
              </div>
            </div>

            {/* Procurement Leader */}
            <div className="col-md-3 col-sm-6 uc-s011" >
              <div className="panel panel-default uc-s105" >
                <div className="panel-body uc-s101" >
                  <div className="uc-s102" >
                    Procurement Leader
                  </div>
                  <div className="uc-s106" >
                    {num(objA.procurement_total_lakh) >= num(objB.procurement_total_lakh) ? stateA : stateB}
                  </div>
                  <div className="uc-s107" >
                    Lead Margin: +{Math.abs(num(objA.procurement_total_lakh) - num(objB.procurement_total_lakh)).toFixed(1)} Lakh MT
                  </div>
                </div>
              </div>
            </div>

            {/* Offtake Rate Leader */}
            <div className="col-md-3 col-sm-6 uc-s011" >
              <div className="panel panel-default uc-s108" >
                <div className="panel-body uc-s101" >
                  <div className="uc-s102" >
                    Offtake Efficiency Leader
                  </div>
                  <div className="uc-s109" >
                    {num(objA.offtake_rate_pct) >= num(objB.offtake_rate_pct) ? stateA : stateB}
                  </div>
                  <div className="uc-s110" >
                    Lead Margin: +{Math.abs(num(objA.offtake_rate_pct) - num(objB.offtake_rate_pct)).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* PDS Outlets Leader */}
            <div className="col-md-3 col-sm-6 uc-s011" >
              <div className="panel panel-default uc-s111" >
                <div className="panel-body uc-s101" >
                  <div className="uc-s102" >
                    PDS Infrastructure Leader
                  </div>
                  <div className="uc-s112" >
                    {num(objA.total_fps_count) >= num(objB.total_fps_count) ? stateA : stateB}
                  </div>
                  <div className="uc-s113" >
                    Lead Margin: +{Math.abs(num(objA.total_fps_count) - num(objB.total_fps_count)).toLocaleString()} FPS
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Head-to-Head Comparison Chart */}
          <div className="panel panel-default uc-s114" >
            <div className="panel-heading uc-s115" >
              <i className="fa fa-bar-chart uc-s055" />
              Head-to-Head Key Volumes: {stateA} (Blue) vs {stateB} (Amber)
            </div>
            <div className="panel-body uc-s116" >
              <BarChart data={headToHeadChartData} height={200} />
            </div>
          </div>

          {/* Cross Table */}
          <div className="panel panel-default uc-s117" >
            <div className="panel-heading uc-s118" >
              <h3 className="panel-title uc-s068" >
                <i className="fa fa-table uc-s055" />
                Unitary Metrics &amp; Computational Differentials ({stateA} vs {stateB})
              </h3>
              <span className="uc-s119" >
                Active Month: <strong>{selectedMonth} 2026</strong>
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-hover table-bordered uc-s120" >
                <thead className="uc-s060" >
                  <tr>
                    <th className="uc-s121" >Unitary Aspect / Algorithmic Metric</th>
                    <th className="uc-s122" >{stateA} (A)</th>
                    <th className="uc-s123" >{stateB} (B)</th>
                    <th className="uc-s074" >Diff (B - A)</th>
                    <th className="uc-s075" >% Delta</th>
                    <th className="uc-s075" >Ratio (A / B)</th>
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
                        <td className="uc-s007" >
                          <span className="uc-s077" >
                            {m.group}
                          </span>
                          {m.name} <span className="uc-s124" >({m.unit})</span>
                        </td>
                        <td className="uc-s080" >
                          {fmt.num(m.valA, 2)}
                        </td>
                        <td className="uc-s125" >
                          {fmt.num(m.valB, 2)}
                        </td>
                        <td className={`uc-align-right uc-weight-bold ${isPos ? "uc-status-positive" : "uc-status-negative"}`}>
                          {isPos ? "+" : ""}{fmt.num(diff, 2)}
                        </td>
                        <td className="uc-s062" >
                          {pctDiff != null ? (
                            <span className={`label ${pctDiff >= 0 ? "label-success" : "label-danger"}`}>
                              {pctDiff >= 0 ? "+" : ""}{round(pctDiff, 1)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="uc-s126" >
                          {ratio != null ? `${round(ratio, 2)}x` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredCross.length && (
                    <tr>
                      <td colSpan="6" className="uc-s086" >
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
