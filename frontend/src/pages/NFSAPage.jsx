import { useState } from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, FilterBar, SearchBox, DataTable, PctBadge, RankPill } from "../components/ui/index.js";
import { DoughnutChart, HBarChart, BarChart, GOV_PALETTE } from "../components/charts/index.js";
import { useDatasets } from "../hooks/useDataset.js";
import { fmt } from "../utils/format.js";

const IDS = ["nfsa_coverage", "annual_nfsa_allocation", "fair_price_shops"];

export default function NFSAPage() {
  const { data: ds, error, loading } = useDatasets(IDS);
  const [search, setSearch] = useState("");

  if (error) return <ErrorBox msg={error} />;
  if (loading || !ds) return <Loading label="Loading NFSA coverage data…" />;

  const nfsaRows = ds.nfsa_coverage?.data || ds.nfsa_coverage?.rows || [];
  const allocRows = ds.annual_nfsa_allocation?.data || ds.annual_nfsa_allocation?.rows || [];
  const fpsRows = ds.fair_price_shops?.data || ds.fair_price_shops?.rows || [];

  const totalPop = nfsaRows.reduce((s, r) => s + (r.population_lakh || 0), 0);
  const totalAcc = nfsaRows.reduce((s, r) => s + (r.accepted_total_lakh || 0), 0);
  const totalFPS = fpsRows.reduce((s, r) => s + (r.total_fps_count || 0), 0);

  const kpiItems = [
    { label: "Total Population (Census 2011)", value: fmt.num(totalPop / 100, 2), unit: "Crore", icon: "fa-globe", accent: "navy" },
    { label: "Present NFSA Coverage", value: fmt.num(totalAcc / 100, 2), unit: "Crore", icon: "fa-users", accent: "green" },
    { label: "% Population Covered", value: totalPop ? fmt.pct((totalAcc / totalPop) * 100, 1) : "—", icon: "fa-percent", accent: "saffron" },
    { label: "Total Fair Price Shops (FPS)", value: fmt.num(totalFPS, 0), unit: "Shops", icon: "fa-shopping-cart", accent: "warn" },
  ];

  const rankedByCoverage = [...nfsaRows].sort((a, b) => (b.accepted_total_lakh || 0) - (a.accepted_total_lakh || 0));
  const rankMap = new Map(rankedByCoverage.map((r, i) => [r.state.toLowerCase(), i + 1]));

  const top = rankedByCoverage.slice(0, 15);
  const topData = {
    labels: top.map((r) => r.state),
    datasets: [{ label: "Persons Covered (Lakh)", data: top.map((r) => r.accepted_total_lakh), backgroundColor: GOV_PALETTE[0] }]
  };

  const topPop = [...nfsaRows].sort((a, b) => (b.population_lakh || 0) - (a.population_lakh || 0)).slice(0, 10);
  const ruralUrbanData = {
    labels: topPop.map((r) => r.state),
    datasets: [
      { label: "Rural Coverage %", data: topPop.map((r) => r.coverage_rural_pct), backgroundColor: GOV_PALETTE[2] },
      { label: "Urban Coverage %", data: topPop.map((r) => r.coverage_urban_pct), backgroundColor: GOV_PALETTE[1] },
    ],
  };

  const aayTotal = allocRows.reduce((s, r) => s + (r.aay_kt || 0), 0);
  const phhTotal = allocRows.reduce((s, r) => s + (r.phh_kt || 0), 0);
  const tideTotal = allocRows.reduce((s, r) => s + (r.tide_over_kt || 0), 0);

  const aayPhhData = {
    labels: ["Antyodaya Anna Yojana (AAY)", "Priority Household (PHH)", "Tide Over"],
    datasets: [{
      data: [aayTotal.toFixed(1), phhTotal.toFixed(1), tideTotal.toFixed(1)],
      backgroundColor: [GOV_PALETTE[1], GOV_PALETTE[0], GOV_PALETTE[3]]
    }]
  };

  const fpsMap = new Map(fpsRows.map(r => [r.state.toLowerCase(), r.total_fps_count]));

  const tableCols = [
    { key: "state", label: "State / UT" },
    {
      key: "rank",
      label: "Rank",
      numeric: true,
      render: (r) => <RankPill rank={rankMap.get(r.state.toLowerCase())} total={nfsaRows.length} label="" />,
    },
    { key: "impl_month", label: "Implementation Month" },
    { key: "population_lakh", label: "Population (Lakh)", numeric: true, render: (r) => fmt.num(r.population_lakh) },
    { key: "coverage_total_pct", label: "Coverage %", numeric: true, render: (r) => <PctBadge value={r.coverage_total_pct} /> },
    { key: "accepted_total_lakh", label: "Persons Covered (Lakh)", numeric: true, render: (r) => fmt.num(r.accepted_total_lakh) },
    { key: "foodgrains_allocation_lmt", label: "Allocation (LMT)", numeric: true, render: (r) => fmt.num(r.foodgrains_allocation_lmt) },
    { key: "fps_count", label: "Fair Price Shops", numeric: true, render: (r) => fmt.num(fpsMap.get(r.state.toLowerCase()) || 0) },
  ];

  const tableRows = nfsaRows.filter((r) => r.state.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="NFSA Coverage &amp; Fair Price Shops" subtitle="State-wise population coverage under National Food Security Act 2013, rural/urban breakdown, FPS infrastructure, and AAY/PHH allocation." />

      <SectionTitle>Key Indicators</SectionTitle>
      <KpiGrid items={kpiItems} colMd={3} colSm={6} />

      <SectionTitle>Coverage Analysis</SectionTitle>
      <div className="row-eq">
        <div className="col-md-7 col-xs-12">
          <Panel title="Top 15 States by NFSA Coverage" sub="Present coverage in Lakh persons" badge="Lakh Persons">
            <HBarChart data={topData} height={240} />
          </Panel>
        </div>
        <div className="col-md-5 col-xs-12">
          <Panel title="Category-wise Allocation" sub="AAY vs PHH vs Tide Over annual quota" badge="Th. Tons">
            <DoughnutChart data={aayPhhData} height={200} />
          </Panel>
        </div>
      </div>

      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title="Rural vs Urban Coverage %" sub="Top 10 states by population, comparative coverage rate" badge="%">
            <BarChart data={ruralUrbanData} height={215} />
          </Panel>
        </div>
      </div>

      <SectionTitle>State-wise Detail</SectionTitle>
      <FilterBar onReset={() => setSearch("")}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search state or UT…" />
      </FilterBar>

      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title="NFSA Coverage Statement" sub="All States &amp; UTs, with national ranking and Fair Price Shops count" badge={`${tableRows.length} records`}>
            <DataTable columns={tableCols} data={tableRows} searchPlaceholder="Search state..." exportFilename="nfsa-coverage-statement" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
