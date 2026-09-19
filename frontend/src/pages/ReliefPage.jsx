import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, DataTable } from "../components/ui/index.js";
import { BarChart, DoughnutChart, GOV_PALETTE } from "../components/charts/index.js";
import { useDatasets } from "../hooks/useDataset.js";
import { fmt } from "../utils/format.js";

const IDS = ["festivals_calamity_allocation", "consumer_subsidy"];

export default function ReliefPage() {
  const { data: ds, error, loading } = useDatasets(IDS);

  if (error) return <ErrorBox msg={error} />;
  if (loading || !ds) return <Loading label="Loading relief allocation &amp; subsidy data…" />;

  const festRows = ds.festivals_calamity_allocation?.data || ds.festivals_calamity_allocation?.rows || [];
  const subsidyRows = ds.consumer_subsidy?.data || ds.consumer_subsidy?.rows || [];

  const allTotal = festRows.reduce((s, r) => s + (r.total_kt || 0), 0);
  const allRice = festRows.reduce((s, r) => s + (r.rice_kt || 0), 0);
  const allWheat = festRows.reduce((s, r) => s + (r.wheat_kt || 0), 0);

  const kpis = [
    { label: "Total Relief Allocation", value: fmt.num(allTotal, 2), unit: "Thousand Tons", icon: "fa-ambulance", accent: "navy" },
    { label: "Rice Share", value: fmt.num(allRice, 2), unit: "Thousand Tons", icon: "fa-leaf", accent: "green", foot: fmt.pct(allTotal ? (allRice / allTotal) * 100 : 0) + " of total" },
    { label: "Wheat Share", value: fmt.num(allWheat, 2), unit: "Thousand Tons", icon: "fa-leaf", accent: "saffron", foot: fmt.pct(allTotal ? (allWheat / allTotal) * 100 : 0) + " of total" },
    { label: "Total Food Subsidy (2025-26)", value: fmt.num(subsidyRows.find(r => r.year === "2025-26")?.total_subsidy_crores, 0), unit: "Rs. Crores", icon: "fa-money", accent: "warn" }
  ];

  const yearMap = {};
  festRows.forEach(r => {
    yearMap[r.year] = (yearMap[r.year] || 0) + (r.total_kt || 0);
  });

  const yearTrend = {
    labels: Object.keys(yearMap),
    datasets: [{ label: "Total allocation (KT)", data: Object.values(yearMap), backgroundColor: GOV_PALETTE[0] }]
  };

  const commodityMix = {
    labels: ["Rice", "Wheat"],
    datasets: [{ data: [allRice.toFixed(1), allWheat.toFixed(1)], backgroundColor: [GOV_PALETTE[2], GOV_PALETTE[1]] }]
  };

  const cols = [
    { key: "year", label: "Reporting Year" },
    { key: "state", label: "State / UT" },
    { key: "date_of_issue", label: "Date of Issue" },
    { key: "rice_kt", label: "Rice (KT)", numeric: true, render: (r) => fmt.num(r.rice_kt, 2) },
    { key: "wheat_kt", label: "Wheat (KT)", numeric: true, render: (r) => fmt.num(r.wheat_kt, 2) },
    { key: "total_kt", label: "Total (KT)", numeric: true, render: (r) => <strong>{fmt.num(r.total_kt, 2)}</strong> },
    { key: "issue_price_cip", label: "CIP / Rate" },
    { key: "remarks", label: "Remarks" }
  ];

  const subCols = [
    { key: "year", label: "Financial Year" },
    { key: "wheat_nfsa_rs_qtl", label: "Wheat NFSA (Rs/Qtl)", numeric: true, render: r => "₹" + fmt.num(r.wheat_nfsa_rs_qtl) },
    { key: "rice_nfsa_rs_qtl", label: "Rice NFSA (Rs/Qtl)", numeric: true, render: r => "₹" + fmt.num(r.rice_nfsa_rs_qtl) },
    { key: "subsidy_dcp_crores", label: "DCP Subsidy (Rs Cr)", numeric: true, render: r => "₹" + fmt.num(r.subsidy_dcp_crores) },
    { key: "subsidy_fci_crores", label: "FCI Subsidy (Rs Cr)", numeric: true, render: r => "₹" + fmt.num(r.subsidy_fci_crores) },
    { key: "total_subsidy_crores", label: "Total Subsidy (Rs Cr)", numeric: true, render: r => <strong>{"₹" + fmt.num(r.total_subsidy_crores)}</strong> },
  ];

  return (
    <div>
      <PageHeader title="Festivals &amp; Calamity Relief Allocation &amp; Food Subsidy" subtitle="Special/additional foodgrain allocations for festivals and calamity relief, consumer subsidy rates, and total food subsidy releases." />

      <SectionTitle>Key Indicators</SectionTitle>
      <KpiGrid items={kpis} colMd={3} colSm={6} />

      <SectionTitle>Relief Analytics</SectionTitle>
      <div className="row-eq">
        <div className="col-md-7 col-xs-12">
          <Panel title="Reporting-Year Allocation Trend" sub="Total additional allocation for relief/festivals" badge="Thousand Tons">
            <BarChart data={yearTrend} height={230} />
          </Panel>
        </div>
        <div className="col-md-5 col-xs-12">
          <Panel title="Commodity Composition" sub="All relief allocations combined" badge="Thousand Tons">
            <DoughnutChart data={commodityMix} height={175} unit="KT" />
          </Panel>
        </div>
      </div>

      <SectionTitle>Detailed Relief &amp; Subsidy Registers</SectionTitle>
      <div className="row-eq">
        <div className="col-md-6 col-xs-12">
          <Panel title="Festivals &amp; Calamity Relief Register" sub="State allocations, CIP basis, and release dates" badge="Thousand Tons">
            <DataTable columns={cols} data={festRows} searchPlaceholder="Search state or remarks..." exportFilename="festivals-calamity-allocation" />
          </Panel>
        </div>
        <div className="col-md-6 col-xs-12">
          <Panel title="Consumer Subsidy &amp; Releases" sub="Per-quintal subsidy rates and total food subsidy released" badge="Rs. Crores">
            <DataTable columns={subCols} data={subsidyRows} searchPlaceholder="Search financial year..." exportFilename="consumer-subsidy-releases" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
