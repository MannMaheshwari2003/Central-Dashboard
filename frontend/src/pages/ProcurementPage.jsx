import { useState } from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, FilterBar, FilterSelect, SearchBox, DataTable, RankPill, DeltaTag } from "../components/ui/index.js";
import { LineChart, HBarChart, GOV_PALETTE } from "../components/charts/index.js";
import { useDatasets } from "../hooks/useDataset.js";
import { fmt } from "../utils/format.js";

const IDS = ["statewise_procurement", "msp_comparison", "procurement_incidentals"];

export default function ProcurementPage() {
  const { data: ds, error, loading } = useDatasets(IDS);
  const [selectedYear, setSelectedYear] = useState("2025-26");
  const [commodity, setCommodity] = useState("all");
  const [search, setSearch] = useState("");

  if (error) return <ErrorBox msg={error} />;
  if (loading || !ds) return <Loading label="Loading procurement data…" />;

  const procRows = ds.statewise_procurement?.data || ds.statewise_procurement?.rows || [];
  const mspRows = ds.msp_comparison?.data || ds.msp_comparison?.rows || [];
  const incidentalRows = ds.procurement_incidentals?.data || ds.procurement_incidentals?.rows || [];

  const years = [...new Set(procRows.map((r) => r.year))].sort();
  const effectiveYear = selectedYear && years.includes(selectedYear) ? selectedYear : years[years.length - 1] || "2025-26";

  const prevYearIdx = years.indexOf(effectiveYear) - 1;
  const prevYear = prevYearIdx >= 0 ? years[prevYearIdx] : null;

  const currentProcRows = procRows.filter((r) => r.year === effectiveYear);
  const totalsByYear = years.map((y) => {
    const rowsY = procRows.filter((r) => r.year === y);
    const rice = rowsY.reduce((s, r) => s + (r.rice_lmt || 0), 0);
    const wheat = rowsY.reduce((s, r) => s + (r.wheat_lmt || 0), 0);
    const coarse = rowsY.reduce((s, r) => s + (r.coarse_lmt || 0), 0);
    return { year: y, rice, wheat, coarse, total: rice + wheat + coarse };
  });

  const currentTotals = totalsByYear.find((t) => t.year === effectiveYear) || { rice: 0, wheat: 0, coarse: 0, total: 0 };
  const prevTotals = prevYear ? totalsByYear.find((t) => t.year === prevYear) : null;
  const totalGrowth = prevTotals ? fmt.growth(currentTotals.total, prevTotals.total) : null;

  const kpiItems = [
    { label: `Rice Procurement ${effectiveYear}`, value: fmt.num(currentTotals.rice, 1), unit: "Lakh T", icon: "fa-circle", accent: "green" },
    { label: `Wheat Procurement ${effectiveYear}`, value: fmt.num(currentTotals.wheat, 1), unit: "Lakh T", icon: "fa-circle", accent: "saffron" },
    { label: `Coarse Grain Procurement ${effectiveYear}`, value: fmt.num(currentTotals.coarse, 2), unit: "Lakh T", icon: "fa-circle", accent: "navy" },
    {
      label: `Total vs ${prevYear || "prior year"}`,
      value: fmt.num(currentTotals.total, 1),
      unit: "Lakh T",
      icon: "fa-line-chart",
      accent: totalGrowth >= 0 ? "green" : "warn",
      foot: prevTotals ? <DeltaTag value={totalGrowth} /> : "No prior-year data",
    },
  ];

  const trendData = {
    labels: totalsByYear.map((t) => t.year),
    datasets: [
      { label: "Rice", data: totalsByYear.map((t) => t.rice.toFixed(1)), borderColor: GOV_PALETTE[2], backgroundColor: GOV_PALETTE[2], tension: 0.25 },
      { label: "Wheat", data: totalsByYear.map((t) => t.wheat.toFixed(1)), borderColor: GOV_PALETTE[1], backgroundColor: GOV_PALETTE[1], tension: 0.25 },
      { label: "Coarse Grains", data: totalsByYear.map((t) => t.coarse.toFixed(2)), borderColor: GOV_PALETTE[3], backgroundColor: GOV_PALETTE[3], tension: 0.25 },
    ],
  };

  const getVal = (r) => {
    if (commodity === "rice") return r.rice_lmt || 0;
    if (commodity === "wheat") return r.wheat_lmt || 0;
    if (commodity === "coarse") return r.coarse_lmt || 0;
    return (r.rice_lmt || 0) + (r.wheat_lmt || 0) + (r.coarse_lmt || 0);
  };

  const filteredCurrent = currentProcRows.filter((r) => r.state.toLowerCase().includes(search.toLowerCase()));

  const rankedStates = [...currentProcRows]
    .map((r) => ({ state: r.state, val: getVal(r) }))
    .filter((s) => s.val > 0)
    .sort((a, b) => b.val - a.val);

  const topStates = rankedStates.slice(0, 15);
  const topStatesData = {
    labels: topStates.map((s) => s.state),
    datasets: [{ label: `Procurement (${effectiveYear})`, data: topStates.map((s) => s.val.toFixed(2)), backgroundColor: GOV_PALETTE[0] }],
  };

  const rankMap = new Map(rankedStates.map((s, i) => [s.state.toLowerCase(), i + 1]));

  const tableCols = [
    { key: "state", label: "State / UT" },
    {
      key: "rank",
      label: "Rank",
      numeric: true,
      render: (r) => (rankMap.get(r.state.toLowerCase()) ? <RankPill rank={rankMap.get(r.state.toLowerCase())} total={rankedStates.length} label="" /> : "—"),
    },
    { key: "rice_lmt", label: "Rice (Lakh T)", numeric: true, render: (r) => fmt.num(r.rice_lmt) },
    { key: "wheat_lmt", label: "Wheat (Lakh T)", numeric: true, render: (r) => fmt.num(r.wheat_lmt) },
    { key: "coarse_lmt", label: "Coarse Grains (Lakh T)", numeric: true, render: (r) => fmt.num(r.coarse_lmt) },
    {
      key: "total_lmt",
      label: "Total (Lakh T)",
      numeric: true,
      render: (r) => <strong>{fmt.num((r.rice_lmt || 0) + (r.wheat_lmt || 0) + (r.coarse_lmt || 0))}</strong>,
    },
  ];

  const mspCols = [
    { key: "commodity", label: "Commodity" },
    { key: "crop_year", label: "Crop Year" },
    { key: "marketing_year", label: "Marketing Year" },
    { key: "msp_rs_qtl", label: "MSP (Rs. / Quintal)", numeric: true, render: (r) => "₹" + fmt.num(r.msp_rs_qtl) },
    { key: "pct_increase", label: "% Increase", numeric: true, render: (r) => (r.pct_increase ? r.pct_increase + "%" : "—") },
  ];

  return (
    <div>
      <PageHeader title="Grain Procurement Analytics" subtitle="State-wise procurement of rice, wheat, coarse grains, MSP history, and incidentals." />

      <SectionTitle>Key Indicators</SectionTitle>
      <KpiGrid items={kpiItems} colMd={3} colSm={6} />

      <FilterBar onReset={() => { setSelectedYear("2025-26"); setCommodity("all"); setSearch(""); }}>
        <FilterSelect
          label="Marketing Year"
          value={effectiveYear}
          onChange={setSelectedYear}
          options={years.map((y) => ({ value: y, label: y }))}
        />
        <FilterSelect
          label="Commodity"
          value={commodity}
          onChange={setCommodity}
          options={[
            { value: "all", label: "All Commodities" },
            { value: "rice", label: "Rice" },
            { value: "wheat", label: "Wheat" },
            { value: "coarse", label: "Coarse Grains" },
          ]}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search state..." />
      </FilterBar>

      <SectionTitle>Procurement Trends</SectionTitle>
      <div className="row-eq">
        <div className="col-md-7 col-xs-12">
          <Panel title="All-India Procurement Trend" sub="Multi-year comparison by commodity" badge="Lakh Tons">
            <LineChart data={trendData} height={230} />
          </Panel>
        </div>
        <div className="col-md-5 col-xs-12">
          <Panel title={`Top Procuring States (${effectiveYear})`} sub="State-wise procurement rankings" badge="Lakh Tons">
            <HBarChart data={topStatesData} height={230} />
          </Panel>
        </div>
      </div>

      <SectionTitle>State-wise Procurement Table</SectionTitle>
      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title={`Procurement Details — ${effectiveYear}`} sub="State-level breakdown for Rice, Wheat, and Coarse Grains" badge="Lakh Tons">
            <DataTable columns={tableCols} data={filteredCurrent} searchPlaceholder="Search state in table..." exportFilename={`procurement-${effectiveYear}`} />
          </Panel>
        </div>
      </div>

      <SectionTitle>Minimum Support Price (MSP) &amp; Incidentals</SectionTitle>
      <div className="row-eq">
        <div className="col-md-6 col-xs-12">
          <Panel title="Year-wise Comparison of MSP" sub="Minimum Support Price evolution for Wheat, Paddy, and Coarse Grains" badge="Rs. / Qtl">
            <DataTable columns={mspCols} data={mspRows} searchPlaceholder="Search crop or year..." exportFilename="msp-comparison" />
          </Panel>
        </div>
        <div className="col-md-6 col-xs-12">
          <Panel title="Procurement Incidentals &amp; Economic Cost" sub="Weighted average MSP, incidentals, and distribution costs" badge="Rs. / Qtl">
            <DataTable
              columns={[
                { key: "year", label: "Year" },
                { key: "rice_msp_qtl", label: "Rice MSP", numeric: true, render: (r) => "₹" + fmt.num(r.rice_msp_qtl) },
                { key: "rice_economic_cost_qtl", label: "Rice Economic Cost", numeric: true, render: (r) => "₹" + fmt.num(r.rice_economic_cost_qtl) },
                { key: "wheat_msp_qtl", label: "Wheat MSP", numeric: true, render: (r) => "₹" + fmt.num(r.wheat_msp_qtl) },
                { key: "wheat_economic_cost_qtl", label: "Wheat Economic Cost", numeric: true, render: (r) => "₹" + fmt.num(r.wheat_economic_cost_qtl) },
              ]}
              data={incidentalRows}
              searchPlaceholder="Filter year..."
              exportFilename="procurement-incidentals"
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
