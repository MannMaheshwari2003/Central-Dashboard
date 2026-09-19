import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, DataTable, DetailRow } from "../components/ui/index.js";
import { BarChart, LineChart, GOV_PALETTE } from "../components/charts/index.js";
import { useDatasets } from "../hooks/useDataset.js";
import { api } from "../api/client.js";
import { useAsync } from "../hooks/useAsync.js";
import { fmt } from "../utils/format.js";
import { useMonth } from "../context/MonthContext.jsx";

const IDS = ["production_foodgrains", "sugar_production"];

export default function ProductionPage() {
  const { selectedMonth } = useMonth();
  const { data: ds, error: dErr, loading: dLoading } = useDatasets(IDS);
  const { data: overview, error: oErr, loading: oLoading } = useAsync(() => api.getAnalyticsOverview({ month: selectedMonth }), [selectedMonth]);

  if (dErr || oErr) return <ErrorBox msg={dErr || oErr} />;
  if (dLoading || oLoading || !ds || !overview) return <Loading label="Loading production data…" />;

  const prodRows = ds.production_foodgrains?.data || ds.production_foodgrains?.rows || [];
  const sugarRows = ds.sugar_production?.data || ds.sugar_production?.rows || [];

  const prodDetail = overview.production_detail || {};
  const latestYear = prodDetail.latest_year || "2025-26";
  const latestTotal = prodDetail.latest_total_mt ?? 0;

  const years = [...new Set(prodRows.map(r => r.year))].sort();

  const kpis = [
    { label: `Latest Production (${latestYear})`, value: fmt.num(latestTotal, 2), unit: "Million Tonnes", icon: "fa-leaf", accent: "green", foot: "Total Foodgrains" },
    { label: "Crop Groups Tracked", value: (prodDetail.by_crop || []).length, unit: "groups", icon: "fa-bar-chart", accent: "navy", foot: "Rice, Wheat, Coarse Grains, Pulses" },
    { label: `Rice Production (${latestYear})`, value: fmt.num(prodDetail.by_crop?.find(c => c.crop === "Rice")?.latest_mt, 2), unit: "Million T", icon: "fa-circle", accent: "green" },
    { label: `Wheat Production (${latestYear})`, value: fmt.num(prodDetail.by_crop?.find(c => c.crop === "Wheat")?.latest_mt, 2), unit: "Million T", icon: "fa-circle", accent: "saffron" }
  ];

  const trendData = {
    labels: (overview.production || []).map(p => p.year),
    datasets: [{
      label: "Total Foodgrains (Million MT)",
      data: (overview.production || []).map(p => p.total_mt),
      borderColor: GOV_PALETTE[0],
      backgroundColor: GOV_PALETTE[0] + "22",
      fill: true,
      tension: 0.3
    }]
  };

  const cropBarData = {
    labels: (prodDetail.by_crop || []).map(c => c.crop),
    datasets: [{
      label: `${latestYear} Production (Million MT)`,
      data: (prodDetail.by_crop || []).map(c => c.latest_mt),
      backgroundColor: GOV_PALETTE[1]
    }]
  };

  const seasonBarData = {
    labels: (prodDetail.seasons || []).map(s => s.season),
    datasets: [{
      label: latestYear,
      data: (prodDetail.seasons || []).map(s => s.latest_mt),
      backgroundColor: GOV_PALETTE[2]
    }]
  };

  const cols = [
    { key: "crop", label: "Crop Group" },
    { key: "season", label: "Season" },
    { key: "year", label: "Year" },
    { key: "production_mt", label: "Production (Million MT)", numeric: true, render: r => fmt.num(r.production_mt, 2) }
  ];

  const sugarCols = [
    { key: "year", label: "Marketing Year" },
    { key: "month", label: "Month" },
    { key: "production_lakh_tons", label: "Production (Lakh Tons)", numeric: true, render: r => fmt.num(r.production_lakh_tons, 2) }
  ];

  return (
    <div>
      <PageHeader title="All-India Foodgrain &amp; Sugar Production" subtitle="National production estimates by crop, season, and marketing year." />

      <SectionTitle>Key Indicators</SectionTitle>
      <KpiGrid items={kpis} colMd={3} colSm={6} />

      <SectionTitle>National Trend &amp; Composition</SectionTitle>
      <div className="row-eq">
        <div className="col-md-7 col-xs-12">
          <Panel title="Total Foodgrain Production Trend" sub="Multi-year trend across all foodgrain categories" badge="Million MT">
            <LineChart data={trendData} height={250} />
          </Panel>
        </div>
        <div className="col-md-5 col-xs-12">
          <Panel title={`Crop Group Breakdown (${latestYear})`} sub="Production by major crop category" badge="Million MT">
            <BarChart data={cropBarData} height={215} />
          </Panel>
        </div>
      </div>

      <SectionTitle>Season Analysis</SectionTitle>
      <div className="row-eq">
        <div className="col-md-6 col-xs-12">
          <Panel title="Kharif / Rabi / Summer Breakdown" sub={`Season-wise total foodgrain production • ${latestYear}`} badge="Million MT">
            <BarChart data={seasonBarData} height={225} />
          </Panel>
        </div>
        <div className="col-md-6 col-xs-12">
          <Panel title="Production Summary Notes" sub="Key insights derived from national statements">
            <div className="state-summary-list">
              <DetailRow label="Latest Total Production" value={`${fmt.num(latestTotal, 2)} Million MT`} />
              <DetailRow label="Reporting Period" value={`${years[0]} to ${latestYear}`} />
              <DetailRow label="Largest Crop Group" value={`Rice (${fmt.num(prodDetail.by_crop?.find(c => c.crop === "Rice")?.latest_mt, 2)} MT)`} />
              <DetailRow label="Second Largest Crop Group" value={`Wheat (${fmt.num(prodDetail.by_crop?.find(c => c.crop === "Wheat")?.latest_mt, 2)} MT)`} />
            </div>
          </Panel>
        </div>
      </div>

      <SectionTitle>Detailed Production Datasets</SectionTitle>
      <div className="row-eq">
        <div className="col-md-6 col-xs-12">
          <Panel title="Foodgrain Production Matrix" sub="Relational production records by crop, season, and year" badge="SQL Table">
            <DataTable columns={cols} data={prodRows} searchPlaceholder="Search crop or season..." exportFilename="foodgrain-production" />
          </Panel>
        </div>
        <div className="col-md-6 col-xs-12">
          <Panel title="Month-wise Sugar Production" sub="Monthly sugar production records in Lakh Tons" badge="Lakh Tons">
            <DataTable columns={sugarCols} data={sugarRows} searchPlaceholder="Search year or month..." exportFilename="sugar-production" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
