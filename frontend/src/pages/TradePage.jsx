import React from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, DataTable } from "../components/ui/index.js";
import { BarChart, LineChart, DoughnutChart, GOV_PALETTE } from "../components/charts/index.js";
import { useDatasets } from "../hooks/useDataset.js";
import { fmt } from "../utils/format.js";

const IDS = ["export_import", "export_prices", "omss_domestic"];

export default function TradePage() {
  const { data: ds, error, loading } = useDatasets(IDS);

  if (error) return <ErrorBox msg={error} />;
  if (loading || !ds) return <Loading label="Loading trade data…" />;

  const tradeRows = ds.export_import?.data || ds.export_import?.rows || [];
  const exportPrices = ds.export_prices?.data || ds.export_prices?.rows || [];
  const omssRows = ds.omss_domestic?.data || ds.omss_domestic?.rows || [];

  const latest = tradeRows[tradeRows.length - 1] || { year: "2024-25", total_lakh_tons: 0 };
  const totalAllYears = tradeRows.reduce((s, r) => s + (r.total_lakh_tons || 0), 0);

  const kpiItems = [
    { label: `Latest Trade Volume (${latest.year})`, value: fmt.num(latest.total_lakh_tons, 2), unit: "Lakh T", icon: "fa-exchange", accent: "navy" },
    { label: "Cumulative Trade", value: fmt.num(totalAllYears, 2), unit: "Lakh T", icon: "fa-globe", accent: "green" },
    { label: "International Export Quotes", value: exportPrices.length, unit: "quotes", icon: "fa-usd", accent: "saffron" },
    { label: "OMSS (Domestic) Sales Years", value: omssRows.length, unit: "years", icon: "fa-shopping-cart", accent: "warn" },
  ];

  const trendData = {
    labels: tradeRows.map((r) => r.year),
    datasets: [
      { label: "Wheat", data: tradeRows.map((r) => r.wheat_lakh_tons), backgroundColor: GOV_PALETTE[1] },
      { label: "Rice", data: tradeRows.map((r) => r.rice_lakh_tons), backgroundColor: GOV_PALETTE[2] },
    ],
  };

  const mixData = {
    labels: ["Wheat", "Rice"],
    datasets: [{
      data: [
        tradeRows.reduce((s, r) => s + (r.wheat_lakh_tons || 0), 0).toFixed(2),
        tradeRows.reduce((s, r) => s + (r.rice_lakh_tons || 0), 0).toFixed(2)
      ],
      backgroundColor: [GOV_PALETTE[1], GOV_PALETTE[2]]
    }]
  };

  const lineData = {
    labels: tradeRows.map((r) => r.year),
    datasets: [{
      label: "Total (Wheat + Rice)",
      data: tradeRows.map((r) => r.total_lakh_tons),
      borderColor: GOV_PALETTE[0],
      backgroundColor: GOV_PALETTE[0] + "22",
      fill: true,
      tension: 0.3
    }]
  };

  const tableCols = [
    { key: "year", label: "Year" },
    { key: "wheat_lakh_tons", label: "Wheat (Lakh T)", numeric: true, render: (r) => fmt.num(r.wheat_lakh_tons, 4) },
    { key: "rice_lakh_tons", label: "Rice (Lakh T)", numeric: true, render: (r) => fmt.num(r.rice_lakh_tons, 4) },
    { key: "total_lakh_tons", label: "Total (Lakh T)", numeric: true, render: (r) => <strong>{fmt.num(r.total_lakh_tons, 4)}</strong> },
  ];

  const priceCols = [
    { key: "variety", label: "Variety" },
    { key: "country", label: "Currency" },
    { key: "port", label: "Port" },
    { key: "month_year", label: "Month" },
    { key: "price_range_usd", label: "Price Range (USD / Ton)", numeric: true },
  ];

  const omssCols = [
    { key: "year", label: "Year" },
    { key: "wheat_lmt", label: "Wheat Sales (LMT)", numeric: true, render: (r) => fmt.num(r.wheat_lmt, 2) },
    { key: "rice_lmt", label: "Rice Sales (LMT)", numeric: true, render: (r) => fmt.num(r.rice_lmt, 2) },
  ];

  return (
    <div>
      <PageHeader title="Export, Import &amp; Open Market Sales (OMSS)" subtitle="Central Pool foodgrain trade volumes, international wheat export price indicators, and domestic OMSS sales." />

      <SectionTitle>Key Indicators</SectionTitle>
      <KpiGrid items={kpiItems} colMd={3} colSm={6} />

      <SectionTitle>Trade Trend</SectionTitle>
      <div className="row-eq">
        <div className="col-md-4 col-xs-12">
          <Panel title="Wheat vs Rice Trade Volume" sub="Year-wise breakdown" badge="Lakh Tons">
            <BarChart data={trendData} height={215} />
          </Panel>
        </div>
        <div className="col-md-4 col-xs-12">
          <Panel title="Total Trade Trend" sub="Combined wheat + rice" badge="Lakh Tons">
            <LineChart data={lineData} height={215} />
          </Panel>
        </div>
        <div className="col-md-4 col-xs-12">
          <Panel title="Commodity Mix" sub="All available years combined" badge="Lakh Tons">
            <DoughnutChart data={mixData} height={165} unit="Lakh T" />
          </Panel>
        </div>
      </div>

      <SectionTitle>Detailed Trade &amp; OMSS Datasets</SectionTitle>
      <div className="row-eq">
        <div className="col-md-4 col-xs-12">
          <Panel title="Export &amp; Import History" sub="Central Pool exports/imports" badge="Lakh Tons">
            <DataTable columns={tableCols} data={tradeRows} searchPlaceholder="Search year..." filename="export-import-foodgrains" />
          </Panel>
        </div>
        <div className="col-md-4 col-xs-12">
          <Panel title="International Export Prices" sub="Monthly export price quotations by variety and port" badge="USD / Ton">
            <DataTable columns={priceCols} data={exportPrices} searchPlaceholder="Search variety or month..." filename="export-prices" />
          </Panel>
        </div>
        <div className="col-md-4 col-xs-12">
          <Panel title="OMSS Domestic Sales" sub="Open Market Sales Scheme wheat &amp; rice sales" badge="Lakh MT">
            <DataTable columns={omssCols} data={omssRows} searchPlaceholder="Search year..." filename="omss-domestic-sales" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
