import { useState } from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, FilterBar, FilterSelect, SearchBox, DataTable, PctBadge } from "../components/ui/index.js";
import { HBarChart, DoughnutChart, GOV_PALETTE } from "../components/charts/index.js";
import { useDatasets } from "../hooks/useDataset.js";
import { fmt } from "../utils/format.js";

const IDS = ["offtake_distribution", "portability_transactions"];

export default function DistributionPage() {
  const { data: ds, error, loading } = useDatasets(IDS);
  const [period, setPeriod] = useState("for_month");
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState("all");

  if (error) return <ErrorBox msg={error} />;
  if (loading || !ds) return <Loading label="Loading distribution data…" />;

  const allOfftakeRows = ds.offtake_distribution?.data || ds.offtake_distribution?.rows || [];
  const portRows = ds.portability_transactions?.data || ds.portability_transactions?.rows || [];

  const ptype = period === "for_month" ? "month" : "upto_month";
  const activeRows = allOfftakeRows.filter(r => r.period_type === ptype);

  const totalAlloc = activeRows.reduce((s, r) => s + (r.alloc_total_kt || 0), 0);
  const totalOff = activeRows.reduce((s, r) => s + (r.offtake_total_kt || 0), 0);
  const avgDist = totalAlloc ? (totalOff / totalAlloc) * 100 : 0;
  const underDistributed = activeRows.filter((r) => r.alloc_total_kt > 0 && (r.offtake_total_kt / r.alloc_total_kt) < 0.6).length;

  const kpiItems = [
    { label: "Total Allocation", value: fmt.num(totalAlloc, 0), unit: "Th. Tons", icon: "fa-truck", accent: "navy" },
    { label: "Total Offtake", value: fmt.num(totalOff, 0), unit: "Th. Tons", icon: "fa-check-circle", accent: "green" },
    { label: "Average Offtake Rate", value: fmt.pct(avgDist, 1), icon: "fa-percent", accent: "saffron" },
    { label: "States Below 60% Offtake", value: underDistributed, icon: "fa-exclamation-triangle", accent: "warn" },
  ];

  const catTotals = { aay: 0, phh: 0, tide_over: 0 };
  activeRows.forEach((r) => {
    catTotals.aay += r.offtake_aay_kt || 0;
    catTotals.phh += r.offtake_phh_kt || 0;
    catTotals.tide_over += r.offtake_tide_over_kt || 0;
  });

  const catData = {
    labels: ["AAY", "Priority Household (PHH)", "Tide Over"],
    datasets: [{
      data: [catTotals.aay.toFixed(1), catTotals.phh.toFixed(1), catTotals.tide_over.toFixed(1)],
      backgroundColor: [GOV_PALETTE[1], GOV_PALETTE[0], GOV_PALETTE[3]]
    }]
  };

  const validRows = activeRows.filter((r) => r.alloc_total_kt > 0);
  const sortedByDist = [...validRows].sort((a, b) => (a.offtake_total_kt / a.alloc_total_kt) - (b.offtake_total_kt / b.alloc_total_kt));
  const bottom10 = sortedByDist.slice(0, 10);

  const bottomData = {
    labels: bottom10.map((r) => r.state),
    datasets: [{
      label: "Offtake %",
      data: bottom10.map((r) => ((r.offtake_total_kt / r.alloc_total_kt) * 100).toFixed(1)),
      backgroundColor: bottom10.map((r) => ((r.offtake_total_kt / r.alloc_total_kt) < 0.6 ? GOV_PALETTE[4] : GOV_PALETTE[7]))
    }]
  };

  const thresholdFilter = (r) => {
    if (threshold === "all") return true;
    const rate = r.alloc_total_kt ? (r.offtake_total_kt / r.alloc_total_kt) * 100 : 0;
    if (threshold === "below60") return rate < 60;
    if (threshold === "60to90") return rate >= 60 && rate < 90;
    if (threshold === "above90") return rate >= 90;
    return true;
  };

  const tableCols = [
    { key: "state", label: "State / UT" },
    { key: "alloc_total_kt", label: "Allocation (KT)", numeric: true, render: (r) => fmt.num(r.alloc_total_kt) },
    { key: "offtake_total_kt", label: "Offtake (KT)", numeric: true, render: (r) => fmt.num(r.offtake_total_kt) },
    { key: "distrib_total_kt", label: "Distribution (KT)", numeric: true, render: (r) => fmt.num(r.distrib_total_kt || (r.distrib_aay_kt + r.distrib_phh_kt)) },
    {
      key: "dist_total",
      label: "Offtake %",
      numeric: true,
      render: (r) => <PctBadge value={r.alloc_total_kt ? (r.offtake_total_kt / r.alloc_total_kt) * 100 : 0} />,
    },
    { key: "offtake_aay_kt", label: "AAY Offtake", numeric: true, render: (r) => fmt.num(r.offtake_aay_kt) },
    { key: "offtake_phh_kt", label: "PHH Offtake", numeric: true, render: (r) => fmt.num(r.offtake_phh_kt) },
  ];

  const tableRows = activeRows
    .filter((r) => r.state.toLowerCase().includes(search.toLowerCase()))
    .filter(thresholdFilter);

  const portCols = [
    { key: "state", label: "State / UT" },
    { key: "interstate_txns", label: "Inter-State Txns", numeric: true, render: r => fmt.num(r.interstate_txns) },
    { key: "interstate_distrib_mt", label: "Inter-State Distrib (MT)", numeric: true, render: r => fmt.num(r.interstate_distrib_mt) },
    { key: "intrastate_txns", label: "Intra-State Txns", numeric: true, render: r => fmt.num(r.intrastate_txns) },
    { key: "intrastate_distrib_mt", label: "Intra-State Distrib (MT)", numeric: true, render: r => fmt.num(r.intrastate_distrib_mt) }
  ];

  return (
    <div>
      <PageHeader title="Offtake, Distribution &amp; Portability" subtitle="Monthly and cumulative foodgrain allocation, offtake, distribution, and ONORC portability metrics." />

      <FilterBar
        onReset={() => {
          setPeriod("for_month");
          setSearch("");
          setThreshold("all");
        }}
      >
        <FilterSelect
          label="Reporting Period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "for_month", label: "For the Month (June 2026)" },
            { value: "upto_month", label: "Cumulative (Upto June 2026)" },
          ]}
        />
        <FilterSelect
          label="Offtake Threshold"
          value={threshold}
          onChange={setThreshold}
          options={[
            { value: "all", label: "All States" },
            { value: "below60", label: "Below 60% Offtake" },
            { value: "60to90", label: "60% - 90% Offtake" },
            { value: "above90", label: "Above 90% Offtake" },
          ]}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search state..." />
      </FilterBar>

      <SectionTitle>Key Indicators</SectionTitle>
      <KpiGrid items={kpiItems} colMd={3} colSm={6} />

      <SectionTitle>Distribution Performance</SectionTitle>
      <div className="row-eq">
        <div className="col-md-7 col-xs-12">
          <Panel title="Lowest Offtake % States" sub="States needing distribution &amp; lifting follow-up" badge="Bottom 10">
            <HBarChart data={bottomData} height={225} />
          </Panel>
        </div>
        <div className="col-md-5 col-xs-12">
          <Panel title="Offtake by Category" sub="AAY / PHH / Tide Over" badge="Th. Tons">
            <DoughnutChart data={catData} height={225} />
          </Panel>
        </div>
      </div>

      <SectionTitle>State Offtake &amp; Distribution Table</SectionTitle>
      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title="State-wise Offtake &amp; Distribution Details" sub="Allocations, lifting, and distribution figures" badge="Thousand Tons">
            <DataTable columns={tableCols} data={tableRows} searchPlaceholder="Search state..." exportFilename={`distribution-${period}`} />
          </Panel>
        </div>
      </div>

      <SectionTitle>One Nation One Ration Card (ONORC) Portability</SectionTitle>
      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title="Portability Transactions &amp; Distribution (June 2026)" sub="Inter-state and Intra-state transactions with Aadhaar authentication" badge="Transactions / MT">
            <DataTable columns={portCols} data={portRows} searchPlaceholder="Search state..." exportFilename="portability-transactions" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
