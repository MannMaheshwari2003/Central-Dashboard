import { useState } from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, FilterBar, FilterSelect, DataTable, PctBadge } from "../components/ui/index.js";
import { BarChart, GOV_PALETTE } from "../components/charts/index.js";
import { useDatasets } from "../hooks/useDataset.js";
import { fmt } from "../utils/format.js";

const IDS = ["comparative_allocation_offtake", "annual_allocation_summary", "welfare_institutions_allocation", "festivals_calamity_allocation"];

export default function AllocationPage() {
  const { data: ds, error, loading } = useDatasets(IDS);
  const [festYear, setFestYear] = useState("2026-27");
  const [schemeFilter, setSchemeFilter] = useState("all");

  if (error) return <ErrorBox msg={error} />;
  if (loading || !ds) return <Loading label="Loading allocation &amp; offtake data…" />;

  const compRows = ds.comparative_allocation_offtake?.data || ds.comparative_allocation_offtake?.rows || [];
  const annualSummary = ds.annual_allocation_summary?.data || ds.annual_allocation_summary?.rows || [];
  const welfareRows = ds.welfare_institutions_allocation?.data || ds.welfare_institutions_allocation?.rows || [];
  const festRowsAll = ds.festivals_calamity_allocation?.data || ds.festivals_calamity_allocation?.rows || [];

  const schemes = [...new Set(compRows.map((r) => r.scheme).filter(Boolean))];
  const compYears = [...new Set(compRows.map((r) => r.year))].sort();

  const filteredComp = schemeFilter === "all" ? compRows : compRows.filter((r) => r.scheme === schemeFilter);

  const yearTotals = compYears.map((y) => {
    const rowsY = filteredComp.filter(r => r.year === y);
    const alloc = rowsY.reduce((s, r) => s + (r.allocation_lakh_tons || 0), 0);
    const off = rowsY.reduce((s, r) => s + (r.offtake_lakh_tons || 0), 0);
    return { year: y, alloc, off };
  });

  const trendData = {
    labels: yearTotals.map((t) => t.year),
    datasets: [
      { label: "Allocation (Lakh MT)", data: yearTotals.map((t) => t.alloc.toFixed(1)), backgroundColor: GOV_PALETTE[0] },
      { label: "Offtake (Lakh MT)", data: yearTotals.map((t) => t.off.toFixed(1)), backgroundColor: GOV_PALETTE[1] },
    ],
  };

  const latestYear = compYears[compYears.length - 1] || "2026-27";
  const latestTotals = yearTotals[yearTotals.length - 1] || { alloc: 0, off: 0 };

  const kpiItems = [
    { label: `Total Allocation ${latestYear}`, value: fmt.num(latestTotals.alloc, 1), unit: "Lakh T", icon: "fa-truck", accent: "navy" },
    { label: `Total Offtake ${latestYear}`, value: fmt.num(latestTotals.off, 1), unit: "Lakh T", icon: "fa-check", accent: "green" },
    { label: "Offtake Efficiency", value: latestTotals.alloc ? fmt.pct((latestTotals.off / latestTotals.alloc) * 100, 1) : "—", icon: "fa-percent", accent: "warn" },
    { label: "Active Schemes Tracked", value: schemes.length, icon: "fa-list", accent: "saffron" },
  ];

  const welfareCols = [
    { key: "state", label: "State / UT" },
    { key: "alloc_wheat_kt", label: "Wheat Alloc (KT)", numeric: true, render: (r) => fmt.num(r.alloc_wheat_kt) },
    { key: "alloc_rice_kt", label: "Rice Alloc (KT)", numeric: true, render: (r) => fmt.num(r.alloc_rice_kt) },
    { key: "alloc_total_kt", label: "Allocation Total (KT)", numeric: true, render: (r) => fmt.num(r.alloc_total_kt) },
    { key: "offtake_total_kt", label: "Offtake Total (KT)", numeric: true, render: (r) => fmt.num(r.offtake_total_kt) },
    {
      key: "rate",
      label: "Offtake Rate",
      numeric: true,
      render: (r) => (r.alloc_total_kt ? <PctBadge value={(r.offtake_total_kt / r.alloc_total_kt) * 100} /> : "—"),
    },
  ];

  const festRows = festRowsAll.filter(r => r.year === festYear);
  const festCols = [
    { key: "state", label: "State / UT" },
    { key: "rice_kt", label: "Rice (KT)", numeric: true, render: (r) => fmt.num(r.rice_kt) },
    { key: "wheat_kt", label: "Wheat (KT)", numeric: true, render: (r) => fmt.num(r.wheat_kt) },
    { key: "total_kt", label: "Total (KT)", numeric: true, render: (r) => fmt.num(r.total_kt) },
    { key: "issue_price_cip", label: "Issue Price (CIP)" },
    { key: "date_of_issue", label: "Date of Issue" },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <div>
      <PageHeader title="Allocation &amp; Offtake Performance" subtitle="Scheme-wise allocation and offtake, annual quotas, welfare institutions, and special relief allocations." />

      <SectionTitle>Key Indicators</SectionTitle>
      <KpiGrid items={kpiItems} colMd={3} colSm={6} />

      <FilterBar onReset={() => setSchemeFilter("all")}>
        <FilterSelect label="Scheme Filter" value={schemeFilter} onChange={setSchemeFilter} options={[{ value: "all", label: "All Schemes" }, ...schemes.map((s) => ({ value: s, label: s }))]} />
      </FilterBar>

      <SectionTitle>5-Year Comparative Position</SectionTitle>
      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title="Allocation vs Offtake — Multi-Year Trend" sub={`Comparative totals across all major Central Pool schemes (${latestYear})`} badge="Lakh Tons">
            <BarChart data={trendData} height={220} />
          </Panel>
        </div>
      </div>

      <SectionTitle>Detailed Allocation Datasets</SectionTitle>
      <div className="row-eq">
        <div className="col-md-6 col-xs-12">
          <Panel title="Annual Allocation Summary (FY 2026-27)" sub="Breakdown by scheme and commodity" badge="Lakh Tons">
            <DataTable
              columns={[
                { key: "scheme_group", label: "Group" },
                { key: "scheme_name", label: "Scheme" },
                { key: "rice_lakh_tons", label: "Rice (Lakh T)", numeric: true, render: r => fmt.num(r.rice_lakh_tons) },
                { key: "wheat_lakh_tons", label: "Wheat (Lakh T)", numeric: true, render: r => fmt.num(r.wheat_lakh_tons) },
                { key: "total_lakh_tons", label: "Total (Lakh T)", numeric: true, render: r => fmt.num(r.total_lakh_tons) },
              ]}
              data={annualSummary}
              searchPlaceholder="Search scheme..."
              exportFilename="annual-allocation-summary"
            />
          </Panel>
        </div>
        <div className="col-md-6 col-xs-12">
          <Panel title="Welfare Institutions Allocation &amp; Offtake" sub="Hostels &amp; Welfare Institutions scheme performance by state" badge="Thousand Tons">
            <DataTable columns={welfareCols} data={welfareRows} searchPlaceholder="Search state..." exportFilename="welfare-institutions-allocation" />
          </Panel>
        </div>
      </div>

      <SectionTitle>Festivals &amp; Calamity Relief Allocation</SectionTitle>
      <FilterBar onReset={() => setFestYear("2026-27")}>
        <FilterSelect label="Relief Year" value={festYear} onChange={setFestYear} options={[{ value: "2025-26", label: "2025-26" }, { value: "2026-27", label: "2026-27" }]} />
      </FilterBar>

      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title={`Special Allocations — ${festYear}`} sub="Additional foodgrain allocations for festivals, floods, and calamity relief" badge="Thousand Tons">
            <DataTable columns={festCols} data={festRows} searchPlaceholder="Search state or remarks..." exportFilename={`festivals-calamity-${festYear}`} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
