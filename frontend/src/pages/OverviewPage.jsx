import React from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, MiniStat } from "../components/ui/index.js";
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

  const states = statesRes?.data || [];

  const err = kErr || oErr || sErr;
  if (err) return <ErrorBox msg={err} />;
  if (kLoading || oLoading || sLoading || !kpis || !overview) {
    return <Loading label={`Loading ${selectedMonth} 2026 national summary & analytics...`} />;
  }

  const prodDelta = kpis.production_prev_value_mt ? (((kpis.production_latest_value_mt - kpis.production_prev_value_mt) / kpis.production_prev_value_mt) * 100).toFixed(1) : null;
  const offtakeRate = kpis.fy2627_allocation_lakh ? ((kpis.fy2627_offtake_lakh / kpis.fy2627_allocation_lakh) * 100).toFixed(1) : null;

  const kpiItems = [
    { label: `Central Pool Stock (${selectedMonth})`, value: fmt.num(overview.stock?.latest_total_lmt || kpis.total_central_pool_stock_lmt, 1), unit: "Lakh MT", icon: "fa-cubes", accent: "navy", foot: `Data month: ${selectedMonth} 2026` },
    { label: "NFSA Persons Covered", value: fmt.num(kpis.nfsa_persons_covered_lakh / 100, 2), unit: "Crore", icon: "fa-users", accent: "saffron", foot: (kpis.nfsa_pct_accepted || 67.2) + "% of total population" },
    {
      label: `Foodgrain Production ${kpis.production_latest_year}`,
      value: fmt.num(kpis.production_latest_value_mt, 1),
      unit: "Million T",
      icon: "fa-leaf",
      accent: "green",
      foot: prodDelta ? `${prodDelta >= 0 ? "▲" : "▼"} ${Math.abs(prodDelta)}% vs prior year` : "",
      footDir: prodDelta >= 0 ? "up" : "down",
    },
    { label: `Procurement ${kpis.procurement_year} (Rice+Wheat)`, value: fmt.num((kpis.procurement_rice_lakh || 0) + (kpis.procurement_wheat_lakh || 0), 1), unit: "Lakh T", icon: "fa-shopping-basket", accent: "warn", foot: "KMS + RMS total" },
    { label: "FY 2026-27 Allocation", value: fmt.num(kpis.fy2627_allocation_lakh, 1), unit: "Lakh T", icon: "fa-truck", accent: "navy", foot: "All schemes, Central Pool" },
    { label: "FY 2026-27 Offtake Rate", value: (offtakeRate || "0") + "%", icon: "fa-check-circle", accent: Number(offtakeRate) > 70 ? "green" : "warn", foot: fmt.num(kpis.fy2627_offtake_lakh, 1) + " Lakh T lifted" },
    { label: `Wheat Stock (${selectedMonth})`, value: fmt.num(overview.stock?.latest_wheat_lmt || kpis.total_stock_wheat_lmt, 1), unit: "Lakh MT", icon: "fa-database", accent: "saffron", foot: "FCI + State Agencies" },
    { label: `Rice Stock (${selectedMonth})`, value: fmt.num(overview.stock?.latest_rice_lmt || kpis.total_stock_rice_lmt, 1), unit: "Lakh MT", icon: "fa-database", accent: "green", foot: "FCI + State Agencies" },
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
  const covered = overview.nfsa?.present_coverage_lakh || kpis.nfsa_persons_covered_lakh || 813.5;
  const totalPop = overview.nfsa?.population_lakh || kpis.nfsa_population_lakh || 1210.0;
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

  // National Leaders at a glance
  const topStockState = [...states].sort((a, b) => b.central_stock_lmt - a.central_stock_lmt)[0];
  const topCoverageState = [...states].sort((a, b) => b.nfsa_coverage_pct - a.nfsa_coverage_pct)[0];
  const topProcState = topProcStates[0];

  const glanceItems = [
    { label: "Leading State — Stock Held", value: topStockState?.state || "N/A", foot: fmt.num(topStockState?.central_stock_lmt, 1) + ` Lakh MT (${selectedMonth})` },
    { label: "Leading State — Coverage %", value: topCoverageState?.state || "N/A", foot: fmt.pct(topCoverageState?.nfsa_coverage_pct) + " of population covered" },
    { label: "Top Procuring State", value: topProcState?.state || "N/A", foot: fmt.num(topProcState?.procurement_total_lakh, 1) + " Lakh MT, " + kpis.procurement_year },
    { label: "National Allocation Offtake", value: (overview.allocation_offtake?.current?.rate_pct || 0) + "%", foot: "Overall utilization rate" }
  ];

  return (
    <div>
      <PageHeader
        title={`Central Dashboard Overview — ${selectedMonth} 2026`}
        subtitle={`National Food & Public Distribution System (DFPD) Analytics for ${selectedMonth} 2026`}
      />

      <SectionTitle>Key Performance Indicators ({selectedMonth} 2026)</SectionTitle>
      <KpiGrid items={kpiItems} colMd={3} colSm={6} />

      <SectionTitle>At a Glance ({selectedMonth} 2026)</SectionTitle>
      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title={`National Performance Indicators — ${selectedMonth} 2026`} sub="Real-time aggregation from multi-month SQLite database" badge={selectedMonth}>
            <div className="stat-grid stat-grid-4">
              {glanceItems.map((g) => (
                <MiniStat key={g.label} label={g.label} value={g.value} />
              ))}
            </div>
            <div className="glance-foot-grid">
              {glanceItems.map((g) => (
                <div key={g.label} className="small-note" style={{ margin: 0 }}>
                  {g.foot}
                </div>
              ))}
            </div>
          </Panel>
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
              {fmt.num(covered / 100, 2)} Cr covered out of {fmt.num(totalPop / 100, 2)} Cr population ({overview.nfsa?.pct_accepted || 67.2}%)
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
    </div>
  );
}
