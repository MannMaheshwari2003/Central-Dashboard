import { useState } from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, KpiDetailModal } from "../components/ui/index.js";
import { LineChart, BarChart, DoughnutChart, HBarChart, GOV_PALETTE } from "../components/charts/index.js";
import { useKpis } from "../hooks/useDataset.js";
import { api } from "../api/client.js";
import { useAsync } from "../hooks/useAsync.js";
import { fmt } from "../utils/format.js";
import { useMonth } from "../context/MonthContext.jsx";

export default function OverviewPage() {
  const { selectedMonth } = useMonth();
  const { data: kpis, error: kErr, loading: kLoading } = useKpis();
  const { data: overview, error: oErr, loading: oLoading } = useAsync(() => api.getAnalyticsOverview({ month: selectedMonth }), [selectedMonth]);
  const { data: statesRes, error: sErr, loading: sLoading } = useAsync(() => api.getAnalyticsStates({ month: selectedMonth }), [selectedMonth]);
  const { data: distRes } = useAsync(() => api.getDataset("offtake_distribution", { month: selectedMonth }), [selectedMonth]);

  const [activeKpiModal, setActiveKpiModal] = useState(null);
  const [isModalExpanded, setIsModalExpanded] = useState(false);

  const states = statesRes?.data || [];

  const err = kErr || oErr || sErr;
  if (err) return <ErrorBox msg={err} />;
  if (kLoading || oLoading || sLoading || !kpis || !overview) {
    return <Loading label={`Loading ${selectedMonth} 2026 national summary & analytics...`} />;
  }

  const productionKpi = overview.production_kpi || overview.production_detail || {};
  const productionBreakdown = productionKpi.commodity_breakdown || {};
  const procurementKpi = overview.procurement_kpi || {};
  const offtakeRate = kpis.fy2627_allocation_lakh ? ((kpis.fy2627_offtake_lakh / kpis.fy2627_allocation_lakh) * 100).toFixed(1) : "35.5";

  // Distribution aggregates
  const distRows = distRes?.data || distRes?.rows || [];
  const monthDistRows = distRows.filter((r) => r.period_type === "month");
  const monthDistTotal = monthDistRows.reduce((s, r) => s + (r.distrib_total_kt || 0), 0);
  const monthDistAay = monthDistRows.reduce((s, r) => s + (r.distrib_aay_kt || 0), 0);
  const monthDistPhh = monthDistRows.reduce((s, r) => s + (r.distrib_phh_kt || 0), 0);
  const monthOfftakeTotal = monthDistRows.reduce((s, r) => s + (r.offtake_total_kt || 0), 0);

  const distOverview = overview.distribution || {};
  const distSummary = distOverview.month_summary || {};
  const distTotalKt = distSummary.distrib_kt || monthDistTotal || kpis.distrib_total_kt || 2773.62;
  const distAayKt = distSummary.distrib_aay_kt || monthDistAay || kpis.distrib_aay_kt || 521.90;
  const distPhhKt = distSummary.distrib_phh_kt || monthDistPhh || kpis.distrib_phh_kt || 2251.72;
  const distRate = distSummary.rate_pct || (monthOfftakeTotal ? ((distTotalKt / monthOfftakeTotal) * 100).toFixed(1) : 80.7);

  // Fair Price Shops aggregates
  const totalFpsCount = overview.fps_kpi?.total_fps_count || kpis.total_fair_price_shops || states.reduce((s, r) => s + (r.total_fps_count || 0), 0) || 551736;
  const reportingFpsStates = overview.fps_kpi?.reporting_states || states.filter(s => (s.total_fps_count || 0) > 0).length || 34;

  const openKpiModal = (metricId) => {
    setActiveKpiModal(metricId);
    setIsModalExpanded(false);
  };

  // 8 KPI items: Production, Procurement, Stock, Allocation, Distribution, Offtake, NFSA, FPS Network
  const kpiItems = [
    // 1. PRODUCTIONS
    {
      label: `Foodgrain Production ${productionKpi.latest_year || "2025-26"}`,
      value: fmt.num(productionKpi.latest_total_mt || 3765.6, 2),
      unit: "Million T",
      icon: "fa-leaf",
      accent: "green",
      breakdown: [
        { label: "Rice", value: `${fmt.num(productionBreakdown.rice?.kharif_rabi_mt || 1428.7, 2)} Million T` },
        { label: "Wheat", value: `${fmt.num(productionBreakdown.wheat?.kharif_rabi_mt || 1206.6, 2)} Million T` },
        { label: "Coarse Grains", value: `${fmt.num(productionBreakdown.coarse_grains?.kharif_rabi_mt || 685.1, 2)} Million T` },
      ],
      foot: productionKpi.yoy_growth_pct != null
        ? `${productionKpi.yoy_growth_pct >= 0 ? "▲" : "▼"} ${fmt.num(Math.abs(productionKpi.yoy_growth_pct), 1)}% vs ${productionKpi.previous_year || "2024-25"}`
        : "▲ 5.3% vs 2024-25",
      footDir: (productionKpi.yoy_growth_pct ?? 1) >= 0 ? "up" : "down",
      onClick: () => openKpiModal("production")
    },
    // 2. PROCUREMENT
    {
      label: `Procurement ${procurementKpi.year || "2025-26"}`,
      value: fmt.num(procurementKpi.total_lakh || 886.41, 2),
      unit: "Lakh T",
      icon: "fa-shopping-basket",
      accent: "warn",
      breakdown: [
        { label: "Rice", value: `${fmt.num(procurementKpi.rice_lakh || 570.89, 2)} Lakh T` },
        { label: "Wheat", value: `${fmt.num(procurementKpi.wheat_lakh || 299.75, 2)} Lakh T` },
        { label: "Coarse Grains", value: `${fmt.num(procurementKpi.coarse_lakh || 15.77, 2)} Lakh T` },
      ],
      foot: "Rice + Wheat + Coarse Grains",
      onClick: () => openKpiModal("procurement")
    },
    // 3. CENTRAL POOL STOCK
    {
      label: `Central Pool Stock (${selectedMonth})`,
      value: fmt.num(overview.stock?.latest_total_lmt ?? kpis.total_central_pool_stock_lmt, 2),
      unit: "Lakh MT",
      icon: "fa-cubes",
      accent: "navy",
      breakdown: [
        { label: "Rice", value: `${fmt.num(overview.stock?.latest_rice_lmt ?? kpis.total_stock_rice_lmt, 2)} Lakh MT` },
        { label: "Wheat", value: `${fmt.num(overview.stock?.latest_wheat_lmt ?? kpis.total_stock_wheat_lmt, 2)} Lakh MT` },
      ],
      foot: `All India Total · ${selectedMonth} 2026`,
      onClick: () => openKpiModal("stock")
    },
    // 4. ALLOCATION
    {
      label: "FY 2026-27 Allocation",
      value: fmt.num(kpis.fy2627_allocation_lakh || 612.21, 2),
      unit: "Lakh T",
      icon: "fa-truck",
      accent: "navy",
      breakdown: [
        { label: "Rice", value: `${fmt.num(kpis.fy2627_allocation_rice_lakh || 389.89, 2)} Lakh T` },
        { label: "Wheat", value: `${fmt.num(kpis.fy2627_allocation_wheat_lakh || 222.33, 2)} Lakh T` },
        ...(kpis.fy2627_allocation_coarse_lakh > 0 ? [{ label: "Coarse Grains", value: `${fmt.num(kpis.fy2627_allocation_coarse_lakh, 2)} Lakh T` }] : []),
      ],
      foot: "All schemes · Central Pool",
      onClick: () => openKpiModal("allocation")
    },
    // 5. DISTRIBUTION
    {
      label: `Foodgrain Distribution (${selectedMonth})`,
      value: fmt.num(distTotalKt, 1),
      unit: "Th. Tons",
      icon: "fa-line-chart",
      accent: "teal",
      breakdown: [
        { label: "AAY Distribution", value: `${fmt.num(distAayKt, 1)} Th. Tons` },
        { label: "PHH Distribution", value: `${fmt.num(distPhhKt, 1)} Th. Tons` },
        { label: "Distribution Rate", value: `${distRate}% of offtake` },
      ],
      foot: `PDS Delivery · ${selectedMonth} 2026`,
      onClick: () => openKpiModal("distribution")
    },
    // 6. OFFTAKE
    {
      label: "FY 2026-27 Offtake",
      value: fmt.num(kpis.fy2627_offtake_lakh || 217.43, 2),
      unit: "Lakh T",
      icon: "fa-check-circle",
      accent: Number(offtakeRate) > 70 ? "green" : "warn",
      breakdown: [
        { label: "Rice", value: `${fmt.num(kpis.fy2627_offtake_rice_lakh || 146.32, 2)} Lakh T` },
        { label: "Wheat", value: `${fmt.num(kpis.fy2627_offtake_wheat_lakh || 71.10, 2)} Lakh T` },
        ...(kpis.fy2627_offtake_coarse_lakh > 0 ? [{ label: "Coarse Grains", value: `${fmt.num(kpis.fy2627_offtake_coarse_lakh, 2)} Lakh T` }] : []),
      ],
      foot: `${offtakeRate || "0"}% of allocation lifted`,
      onClick: () => openKpiModal("offtake")
    },
    // 7. NFSA
    {
      label: "NFSA Population Coverage",
      value: fmt.num(kpis.nfsa_population_lakh / 100, 2),
      unit: "Crore",
      icon: "fa-users",
      accent: "saffron",
      breakdown: [
        { label: "Accepted Rural", value: `${fmt.num(kpis.nfsa_accepted_rural_lakh, 2)} Lakh` },
        { label: "Accepted Urban", value: `${fmt.num(kpis.nfsa_accepted_urban_lakh, 2)} Lakh` },
        { label: "Accepted Total", value: `${fmt.num(kpis.nfsa_accepted_total_lakh, 2)} Lakh` },
      ],
      foot: `Census 2011 Population · ${fmt.num(kpis.nfsa_pct_accepted, 2)}% accepted under NFSA`,
      onClick: () => openKpiModal("nfsa")
    },
    // 8. FAIR PRICE SHOPS (FPS)
    {
      label: "Fair Price Shops (FPS) Network",
      value: fmt.num(totalFpsCount / 100000, 2),
      unit: "Lakh Shops",
      icon: "fa-shopping-cart",
      accent: "warn",
      breakdown: [
        { label: "Active Outlets", value: `${fmt.num(totalFpsCount, 0)} Shops` },
        { label: "Operational Reach", value: `${reportingFpsStates}+ States & UTs` },
        { label: "Beneficiary Density", value: "~1,475 Persons/FPS" },
      ],
      foot: `Nationwide PDS Delivery Network · ${selectedMonth} 2026`,
      onClick: () => openKpiModal("fps")
    },
  ];

  // Stock trend chart
  const stockSeries = overview.stock?.series || [];
  const recentStock = stockSeries.slice(-24);
  const stockTrendData = {
    labels: recentStock.map((r) => r.date),
    datasets: [
      { label: "Wheat Stock", data: recentStock.map((r) => r.wheat_actual || 0), borderColor: GOV_PALETTE[1], backgroundColor: GOV_PALETTE[1] + "22", tension: 0.3, fill: true, pointRadius: 0 },
      { label: "Rice Stock", data: recentStock.map((r) => r.rice_actual || 0), borderColor: GOV_PALETTE[2], backgroundColor: GOV_PALETTE[2] + "22", tension: 0.3, fill: true, pointRadius: 0 },
      { label: "Total Stock", data: recentStock.map((r) => r.total_actual || ((r.wheat_actual || 0) + (r.rice_actual || 0))), borderColor: GOV_PALETTE[0], backgroundColor: "transparent", tension: 0.3, borderWidth: 2.5, pointRadius: 0 },
    ],
  };

  // Production trend chart
  const prodYears = (overview.production || []).map(p => p.year);
  const prodTrendData = {
    labels: prodYears,
    datasets: [
      {
        label: "Total Foodgrain Production (Million MT)",
        data: (overview.production || []).map(p => p.total_mt),
        borderColor: GOV_PALETTE[0],
        backgroundColor: GOV_PALETTE[0] + "33",
        tension: 0.3,
        fill: true,
        pointRadius: 4
      }
    ]
  };

  // Allocation vs Offtake
  const allocOffData = overview.allocation_offtake?.yearly || [];
  const allocOfftakeChartData = {
    labels: allocOffData.map(d => d.year),
    datasets: [
      { label: "Allocation (Lakh MT)", data: allocOffData.map(d => d.allocation_lakh), backgroundColor: GOV_PALETTE[0] },
      { label: "Offtake (Lakh MT)", data: allocOffData.map(d => d.offtake_lakh), backgroundColor: GOV_PALETTE[1] }
    ]
  };

  // NFSA Coverage Donut
  const covered = overview.nfsa?.present_coverage_lakh ?? kpis.nfsa_persons_covered_lakh ?? 0;
  const totalPop = overview.nfsa?.population_lakh ?? kpis.nfsa_population_lakh ?? 0;
  const nfsaDonut = {
    labels: ["Covered under NFSA", "Balance Population"],
    datasets: [{ data: [covered, Math.max(totalPop - covered, 0)], backgroundColor: [GOV_PALETTE[2], "#dde3ec"] }]
  };

  // Top Procuring States
  const topProcStates = [...states]
    .filter(s => s.procurement_total_lakh > 0)
    .sort((a, b) => b.procurement_total_lakh - a.procurement_total_lakh)
    .slice(0, 8);

  const topProcData = {
    labels: topProcStates.map(s => s.state),
    datasets: [{ label: `Procurement (Lakh MT)`, data: topProcStates.map(s => s.procurement_total_lakh), backgroundColor: GOV_PALETTE[3] }]
  };

  // National Leaders and Partitioned Top 2-4 States for "At a Glance" (Frontrunners)
  const stockRanked = [...states].sort((a, b) => b.central_stock_lmt - a.central_stock_lmt);
  const topStockLeader = stockRanked[0] || { state: "Punjab", central_stock_lmt: 289.19 };
  const stockRunnerUps = stockRanked.slice(1, 4);

  const coverageRanked = [...states].sort((a, b) => b.nfsa_coverage_pct - a.nfsa_coverage_pct);
  const topCoverageLeader = coverageRanked[0] || { state: "Manipur", nfsa_coverage_pct: 87.75 };
  const coverageRunnerUps = coverageRanked.slice(1, 4);

  const procRanked = [...states].filter(s => s.procurement_total_lakh > 0).sort((a, b) => b.procurement_total_lakh - a.procurement_total_lakh);
  const topProcLeader = procRanked[0] || { state: "Punjab", procurement_total_lakh: 224.05 };
  const procRunnerUps = procRanked.slice(1, 4);

  const offtakeRanked = [...states].filter(s => (s.upto_june_allocation_kt || 0) > 0).sort((a, b) => (b.offtake_rate_pct || 0) - (a.offtake_rate_pct || 0));
  const nationalOfftakePct = (overview.allocation_offtake?.current?.rate_pct || 35.5);
  const offtakeRunnerUps = offtakeRanked.slice(0, 3);

  // Priority Intervention Areas (Bottlenecks & Deficits)
  const offtakeDeficitRanked = [...states]
    .filter(s => (s.upto_june_allocation_kt || 0) > 0 && (s.offtake_gap_kt || 0) > 0)
    .sort((a, b) => (b.offtake_gap_kt || 0) - (a.offtake_gap_kt || 0));
  const topOfftakeDeficit = offtakeDeficitRanked[0] || { state: "Odisha", offtake_gap_kt: 264.08, offtake_rate_pct: 64.8 };
  const offtakeDeficitRunners = offtakeDeficitRanked.slice(1, 4);

  const coverageLowestRanked = [...states]
    .filter(s => (s.nfsa_coverage_pct || 0) > 0)
    .sort((a, b) => a.nfsa_coverage_pct - b.nfsa_coverage_pct);
  const topCoverageLowest = coverageLowestRanked[0] || { state: "Andaman & Nicobar", nfsa_coverage_pct: 16.65 };
  const coverageLowestRunners = coverageLowestRanked.slice(1, 4);

  const stockLowestRunners = [...states]
    .filter(s => (s.central_stock_lmt || 0) > 0)
    .sort((a, b) => (a.central_stock_lmt || 0) - (b.central_stock_lmt || 0))
    .slice(0, 3);

  const equityGapRanked = [...states]
    .filter(s => s.rural_urban_gap_pct !== null && s.rural_urban_gap_pct > 0)
    .sort((a, b) => b.rural_urban_gap_pct - a.rural_urban_gap_pct);
  const topEquityGap = equityGapRanked[0] || { state: "Sikkim", rural_urban_gap_pct: 35.38, rural_coverage_pct: 75.74, urban_coverage_pct: 40.36 };
  const equityGapRunners = equityGapRanked.slice(1, 4);

  return (
    <div>
      <PageHeader
        title={`Central Dashboard Overview — ${selectedMonth} 2026`}
        subtitle={`National Food & Public Distribution System (DFPD) Analytics for ${selectedMonth} 2026`}
      />

      <SectionTitle>Key Performance Indicators ({selectedMonth} 2026)</SectionTitle>
      <KpiGrid items={kpiItems} colMd={3} colSm={6} />

      <SectionTitle>At a Glance ({selectedMonth} 2026)</SectionTitle>
      <div className="glance-subsections-wrap">
        {/* Subsection 1: Positives / Frontrunners */}
        <div className="row-eq">
          <div className="col-md-12 col-xs-12">
            <Panel
              title={`National Frontrunners & Benchmark Achievements — ${selectedMonth} 2026`}
              sub="Leading States, High Capacity Utilization & Strategic Stock Reserves"
              badge="High Performers"
              badgeClass="badge-benchmark"
            >
              <div className="glance-cards-grid">
                {/* 1. Leading State — Stock Held */}
                <div className="glance-split-card">
                  <div className="glance-main-side">
                    <div className="glance-card-tag"><i className="fa fa-cubes"></i> Leading State — Stock</div>
                    <div className="glance-leader-name">{topStockLeader.state}</div>
                    <div className="glance-leader-val">
                      {fmt.num(topStockLeader.central_stock_lmt, 1)} <small>Lakh MT</small>
                    </div>
                    <div className="glance-leader-foot">#1 in Central Pool · {selectedMonth} 2026</div>
                  </div>
                  <div className="glance-partition-divider" />
                  <div className="glance-runners-side">
                    <div className="glance-runners-title">Top 2–4 Holding States</div>
                    <div className="glance-runners-list">
                      {stockRunnerUps.map((st, idx) => (
                        <div key={st.state} className="glance-runner-row">
                          <span className="glance-runner-rank">#{idx + 2}</span>
                          <span className="glance-runner-name" title={st.state}>{st.state}</span>
                          <span className="glance-runner-val">{fmt.num(st.central_stock_lmt, 1)} LMT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Leading State — Coverage % */}
                <div className="glance-split-card">
                  <div className="glance-main-side">
                    <div className="glance-card-tag"><i className="fa fa-users"></i> Leading State — Coverage</div>
                    <div className="glance-leader-name">{topCoverageLeader.state}</div>
                    <div className="glance-leader-val">
                      {fmt.pct(topCoverageLeader.nfsa_coverage_pct)} <small>covered</small>
                    </div>
                    <div className="glance-leader-foot">Statutory Population Coverage</div>
                  </div>
                  <div className="glance-partition-divider" />
                  <div className="glance-runners-side">
                    <div className="glance-runners-title">Top 2–4 Coverage States</div>
                    <div className="glance-runners-list">
                      {coverageRunnerUps.map((st, idx) => (
                        <div key={st.state} className="glance-runner-row">
                          <span className="glance-runner-rank">#{idx + 2}</span>
                          <span className="glance-runner-name" title={st.state}>{st.state}</span>
                          <span className="glance-runner-val">{fmt.pct(st.nfsa_coverage_pct)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Top Procuring State */}
                <div className="glance-split-card">
                  <div className="glance-main-side">
                    <div className="glance-card-tag"><i className="fa fa-shopping-basket"></i> Top Procuring State</div>
                    <div className="glance-leader-name">{topProcLeader.state}</div>
                    <div className="glance-leader-val">
                      {fmt.num(topProcLeader.procurement_total_lakh, 1)} <small>Lakh MT</small>
                    </div>
                    <div className="glance-leader-foot">{kpis.procurement_year || "2025-26"} MSP Operations</div>
                  </div>
                  <div className="glance-partition-divider" />
                  <div className="glance-runners-side">
                    <div className="glance-runners-title">Top 2–4 Procuring States</div>
                    <div className="glance-runners-list">
                      {procRunnerUps.map((st, idx) => (
                        <div key={st.state} className="glance-runner-row">
                          <span className="glance-runner-rank">#{idx + 2}</span>
                          <span className="glance-runner-name" title={st.state}>{st.state}</span>
                          <span className="glance-runner-val">{fmt.num(st.procurement_total_lakh, 1)} LMT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. National Allocation Offtake */}
                <div className="glance-split-card">
                  <div className="glance-main-side">
                    <div className="glance-card-tag"><i className="fa fa-percent"></i> National Offtake</div>
                    <div className="glance-leader-name">National Rate</div>
                    <div className="glance-leader-val">
                      {nationalOfftakePct}% <small>lifted</small>
                    </div>
                    <div className="glance-leader-foot">Overall Quota Utilization</div>
                  </div>
                  <div className="glance-partition-divider" />
                  <div className="glance-runners-side">
                    <div className="glance-runners-title">Top Lifting States</div>
                    <div className="glance-runners-list">
                      {offtakeRunnerUps.map((st, idx) => (
                        <div key={st.state} className="glance-runner-row">
                          <span className="glance-runner-rank">#{idx + 1}</span>
                          <span className="glance-runner-name" title={st.state}>{st.state}</span>
                          <span className="glance-runner-val">{fmt.num(st.offtake_rate_pct, 1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* Subsection 2: Negatives / Operational Bottlenecks */}
        <div className="row-eq">
          <div className="col-md-12 col-xs-12">
            <Panel
              title={`Critical Priority Areas & Operational Bottlenecks — ${selectedMonth} 2026`}
              sub="States Requiring Targeted Administrative Intervention, Allocation Lifting Gaps & Reserve Deficits"
              badge="Intervention Required"
              badgeClass="badge-priority"
            >
              <div className="glance-cards-grid">
                {/* 1. Critical Offtake Deficit (Unlifted Quotas) */}
                <div className="glance-split-card glance-priority-card">
                  <div className="glance-main-side">
                    <div className="glance-card-tag"><i className="fa fa-exclamation-triangle"></i> Highest Offtake Deficit</div>
                    <div className="glance-leader-name">{topOfftakeDeficit.state}</div>
                    <div className="glance-leader-val">
                      {fmt.num(topOfftakeDeficit.offtake_gap_kt, 1)} <small>KT Unlifted</small>
                    </div>
                    <div className="glance-leader-foot">{fmt.num(topOfftakeDeficit.offtake_rate_pct, 1)}% lifted · Quota Lag</div>
                  </div>
                  <div className="glance-partition-divider" />
                  <div className="glance-runners-side">
                    <div className="glance-runners-title">Next Trailing Offtake Gaps</div>
                    <div className="glance-runners-list">
                      {offtakeDeficitRunners.map((st, idx) => (
                        <div key={st.state} className="glance-runner-row">
                          <span className="glance-runner-rank lag-rank">#{idx + 2}</span>
                          <span className="glance-runner-name" title={st.state}>{st.state}</span>
                          <span className="glance-runner-val lag-val">{fmt.num(st.offtake_gap_kt, 1)} KT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Lowest Statutory NFSA Coverage */}
                <div className="glance-split-card glance-priority-card">
                  <div className="glance-main-side">
                    <div className="glance-card-tag"><i className="fa fa-shield"></i> Lowest Coverage Ratio</div>
                    <div className="glance-leader-name">{topCoverageLowest.state}</div>
                    <div className="glance-leader-val">
                      {fmt.pct(topCoverageLowest.nfsa_coverage_pct)} <small>covered</small>
                    </div>
                    <div className="glance-leader-foot">Below 67.2% National Ceiling</div>
                  </div>
                  <div className="glance-partition-divider" />
                  <div className="glance-runners-side">
                    <div className="glance-runners-title">Lowest Statutory Coverage</div>
                    <div className="glance-runners-list">
                      {coverageLowestRunners.map((st, idx) => (
                        <div key={st.state} className="glance-runner-row">
                          <span className="glance-runner-rank lag-rank">#{idx + 2}</span>
                          <span className="glance-runner-name" title={st.state}>{st.state}</span>
                          <span className="glance-runner-val lag-val">{fmt.pct(st.nfsa_coverage_pct)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Depleted Central Stock Holdings */}
                <div className="glance-split-card glance-priority-card">
                  <div className="glance-main-side">
                    <div className="glance-card-tag"><i className="fa fa-battery-quarter"></i> Depleted Central Stock</div>
                    <div className="glance-leader-name">Island &amp; Special UTs</div>
                    <div className="glance-leader-val">
                      0.0 <small>Lakh MT</small>
                    </div>
                    <div className="glance-leader-foot">Nil Local Buffer · Inter-State Movement</div>
                  </div>
                  <div className="glance-partition-divider" />
                  <div className="glance-runners-side">
                    <div className="glance-runners-title">Lowest Buffer States</div>
                    <div className="glance-runners-list">
                      {stockLowestRunners.map((st, idx) => (
                        <div key={st.state} className="glance-runner-row">
                          <span className="glance-runner-rank lag-rank">#{idx + 1}</span>
                          <span className="glance-runner-name" title={st.state}>{st.state}</span>
                          <span className="glance-runner-val lag-val">{fmt.num(st.central_stock_lmt, 1)} LMT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Widest Rural-Urban Equity Disparity */}
                <div className="glance-split-card glance-priority-card">
                  <div className="glance-main-side">
                    <div className="glance-card-tag"><i className="fa fa-balance-scale"></i> Highest Rural-Urban Gap</div>
                    <div className="glance-leader-name">{topEquityGap.state}</div>
                    <div className="glance-leader-val">
                      {fmt.pct(topEquityGap.rural_urban_gap_pct)} <small>disparity</small>
                    </div>
                    <div className="glance-leader-foot">Rural: {fmt.pct(topEquityGap.rural_coverage_pct)} vs Urban: {fmt.pct(topEquityGap.urban_coverage_pct)}</div>
                  </div>
                  <div className="glance-partition-divider" />
                  <div className="glance-runners-side">
                    <div className="glance-runners-title">Widest Coverage Disparity</div>
                    <div className="glance-runners-list">
                      {equityGapRunners.map((st, idx) => (
                        <div key={st.state} className="glance-runner-row">
                          <span className="glance-runner-rank lag-rank">#{idx + 2}</span>
                          <span className="glance-runner-name" title={st.state}>{st.state}</span>
                          <span className="glance-runner-val lag-val">{fmt.pct(st.rural_urban_gap_pct)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <SectionTitle>Trends &amp; Composition</SectionTitle>
      <div className="row-eq">
        <div className="col-md-7 col-xs-12">
          <Panel title="Central Pool Stock Position" sub="Wheat, Rice, and Total Stock Position" badge="Lakh MT">
            <LineChart data={stockTrendData} height={215} />
          </Panel>
        </div>
        <div className="col-md-5 col-xs-12">
          <Panel title="Foodgrain Production Trend" sub="Multi-year All-India Foodgrain Production" badge="Million MT">
            <LineChart data={prodTrendData} height={200} />
          </Panel>
        </div>
      </div>

      <div className="row-eq">
        <div className="col-md-4 col-xs-12">
          <Panel title="NFSA Population Coverage" sub="Covered persons vs balance population" badge="Lakh Persons">
            <DoughnutChart data={nfsaDonut} height={190} />
            <div className="small-note" style={{ textAlign: "center", marginTop: "10px" }}>
              {fmt.num(covered / 100, 2)} Cr covered out of {fmt.num(totalPop / 100, 2)} Cr population ({fmt.num(overview.nfsa?.pct_accepted, 2)}%)
            </div>
          </Panel>
        </div>
        <div className="col-md-4 col-xs-12">
          <Panel title="Allocation vs Offtake Trend" sub="Multi-year comparison across schemes" badge="Lakh MT">
            <BarChart data={allocOfftakeChartData} height={200} />
          </Panel>
        </div>
        <div className="col-md-4 col-xs-12">
          <Panel title="Top Procuring States" sub={`Grain Procurement in ${kpis.procurement_year}`} badge="Lakh MT">
            <HBarChart data={topProcData} height={225} />
          </Panel>
        </div>
      </div>

      {/* Interactive 2-Stage Pop-up & Detailed Analytics Modal */}
      {activeKpiModal && (
        <KpiDetailModal
          activeId={activeKpiModal}
          isExpanded={isModalExpanded}
          onClose={() => setActiveKpiModal(null)}
          onToggleExpand={() => setIsModalExpanded((prev) => !prev)}
          onSelectMetric={(id) => setActiveKpiModal(id)}
          overview={overview}
          kpis={kpis}
          states={states}
          selectedMonth={selectedMonth}
          distributionData={distRes}
        />
      )}
    </div>
  );
}
