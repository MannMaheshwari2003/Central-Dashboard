import React, { useState } from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, FilterBar, FilterSelect, DataTable } from "../components/ui/index.js";
import { LineChart, HBarChart, DoughnutChart, GOV_PALETTE } from "../components/charts/index.js";
import { useDatasets } from "../hooks/useDataset.js";
import { fmt } from "../utils/format.js";

const IDS = ["monthwise_stocks_norm", "central_pool_stocks", "stock_paddy_coarsegrain"];

export default function StockPage() {
  const { data: ds, error, loading } = useDatasets(IDS);
  const [commodity, setCommodity] = useState("total");
  const [yearsBack, setYearsBack] = useState("24");

  if (error) return <ErrorBox msg={error} />;
  if (loading || !ds) return <Loading label="Loading stock position data…" />;

  const monthwise = ds.monthwise_stocks_norm?.data || ds.monthwise_stocks_norm?.rows || [];
  const regionStock = ds.central_pool_stocks?.data || ds.central_pool_stocks?.rows || [];
  const paddy = ds.stock_paddy_coarsegrain?.data || ds.stock_paddy_coarsegrain?.rows || [];

  const nBack = yearsBack === "all" ? monthwise.length : Number(yearsBack);
  const rows = monthwise.slice(-nBack);

  const fieldMap = {
    total: { actual: "total_actual_lmt", norm: "total_norm_lmt", label: "Total Foodgrains", regionKey: "total_stock_lmt" },
    wheat: { actual: "wheat_actual_lmt", norm: "wheat_norm_lmt", label: "Wheat", regionKey: "total_wheat_lmt" },
    rice: { actual: "rice_actual_lmt", norm: "rice_norm_lmt", label: "Rice", regionKey: "total_rice_lmt" },
    coarse: { actual: "coarse_actual_lmt", norm: "total_norm_lmt", label: "Coarse Grains", regionKey: null },
  };
  const f = fieldMap[commodity];

  const trendData = {
    labels: rows.map((r) => r.as_on_date),
    datasets: [
      { label: f.label + " — Actual Stock", data: rows.map((r) => r[f.actual]), borderColor: GOV_PALETTE[0], backgroundColor: GOV_PALETTE[0] + "22", fill: true, tension: 0.3, pointRadius: 0 },
      { label: f.label + " — Buffer Norm", data: rows.map((r) => r[f.norm]), borderColor: GOV_PALETTE[4], borderDash: [5, 4], fill: false, tension: 0.1, pointRadius: 0 },
    ],
  };

  const validActual = rows.map((r) => r[f.actual]).filter((v) => v !== null && v !== undefined && v > 0);
  const periodMax = validActual.length ? Math.max(...validActual) : null;
  const periodMin = validActual.length ? Math.min(...validActual) : null;

  const latest = monthwise[monthwise.length - 1] || {};
  const latestNormRow = [...monthwise].reverse().find((r) => r.total_norm_lmt > 0) || {};

  const kpiItems = [
    { label: `${f.label} — Latest`, value: fmt.num(latest[f.actual], 1), unit: "Lakh MT", icon: "fa-cubes", accent: "navy", foot: "As on " + (latest.as_on_date || "30.06.2026") },
    { label: `${f.label} — Peak (selected period)`, value: fmt.num(periodMax, 1), unit: "Lakh MT", icon: "fa-arrow-up", accent: "green", foot: `Over last ${yearsBack === "all" ? "all available" : yearsBack + " months"}` },
    { label: `${f.label} — Low (selected period)`, value: fmt.num(periodMin, 1), unit: "Lakh MT", icon: "fa-arrow-down", accent: "warn", foot: `Over last ${yearsBack === "all" ? "all available" : yearsBack + " months"}` },
    {
      label: "vs Buffer Norm",
      value: latestNormRow.total_norm_lmt ? fmt.pct((latest.total_actual_lmt / latestNormRow.total_norm_lmt) * 100, 0) : "—",
      icon: "fa-shield",
      accent: "warn",
      foot: latestNormRow.total_norm_lmt ? `Norm: ${fmt.num(latestNormRow.total_norm_lmt, 1)} Lakh MT` : "",
    },
  ];

  const regionSorted = [...regionStock].sort((a, b) => (b.total_stock_lmt || 0) - (a.total_stock_lmt || 0)).slice(0, 12);
  const regionData =
    f.regionKey === "total_stock_lmt"
      ? {
          labels: regionSorted.map((r) => r.state),
          datasets: [
            { label: "Rice", data: regionSorted.map((r) => r.total_rice_lmt), backgroundColor: GOV_PALETTE[2] },
            { label: "Wheat", data: regionSorted.map((r) => r.total_wheat_lmt), backgroundColor: GOV_PALETTE[1] },
          ],
        }
      : f.regionKey
      ? {
          labels: regionSorted.map((r) => r.state),
          datasets: [{ label: f.label, data: regionSorted.map((r) => r[f.regionKey]), backgroundColor: GOV_PALETTE[0] }],
        }
      : {
          labels: [...paddy].sort((a, b) => (b.coarse_total_lmt || 0) - (a.coarse_total_lmt || 0)).slice(0, 12).map((r) => r.state),
          datasets: [{ label: "Coarse Grain Stock", data: [...paddy].sort((a, b) => (b.coarse_total_lmt || 0) - (a.coarse_total_lmt || 0)).slice(0, 12).map((r) => r.coarse_total_lmt), backgroundColor: GOV_PALETTE[3] }],
        };

  const fciTotal = regionStock.reduce((s, r) => s + (r.fci_total_lmt || 0), 0);
  const stateTotal = regionStock.reduce((s, r) => s + (r.state_total_lmt || 0), 0);
  const splitData = {
    labels: ["Stock with FCI", "Stock with State Agencies"],
    datasets: [{ data: [fciTotal.toFixed(1), stateTotal.toFixed(1)], backgroundColor: [GOV_PALETTE[0], GOV_PALETTE[3]] }]
  };

  const paddyCols = [
    { key: "state", label: "State / Region" },
    { key: "paddy_fci_lmt", label: "Paddy (FCI LMT)", numeric: true, render: (r) => fmt.num(r.paddy_fci_lmt) },
    { key: "paddy_state_lmt", label: "Paddy (State Agencies LMT)", numeric: true, render: (r) => fmt.num(r.paddy_state_lmt) },
    { key: "paddy_total_lmt", label: "Paddy Total (LMT)", numeric: true, render: (r) => fmt.num(r.paddy_total_lmt) },
    { key: "coarse_total_lmt", label: "Coarse Grain Total (LMT)", numeric: true, render: (r) => fmt.num(r.coarse_total_lmt) },
  ];

  const monthCols = [
    { key: "as_on_date", label: "Month" },
    { key: "wheat_actual_lmt", label: "Wheat Actual", numeric: true, render: (r) => fmt.num(r.wheat_actual_lmt) },
    { key: "wheat_norm_lmt", label: "Wheat Norm", numeric: true, render: (r) => fmt.num(r.wheat_norm_lmt) },
    { key: "rice_actual_lmt", label: "Rice Actual", numeric: true, render: (r) => fmt.num(r.rice_actual_lmt) },
    { key: "rice_norm_lmt", label: "Rice Norm", numeric: true, render: (r) => fmt.num(r.rice_norm_lmt) },
    { key: "total_actual_lmt", label: "Total Actual", numeric: true, render: (r) => fmt.num(r.total_actual_lmt) },
    { key: "total_norm_lmt", label: "Total Norm", numeric: true, render: (r) => fmt.num(r.total_norm_lmt) },
  ];

  return (
    <div>
      <PageHeader title="Central Pool Stock Position" subtitle="Actual stock of wheat, rice and coarse grains vis-à-vis buffer stocking norms, and region/state-wise holdings with FCI and State Agencies." />

      <SectionTitle>Key Indicators</SectionTitle>
      <KpiGrid items={kpiItems} colMd={3} colSm={6} />

      <FilterBar
        onReset={() => {
          setCommodity("total");
          setYearsBack("24");
        }}
      >
        <FilterSelect
          label="Commodity"
          value={commodity}
          onChange={setCommodity}
          options={[
            { value: "total", label: "Total Foodgrains" },
            { value: "wheat", label: "Wheat" },
            { value: "rice", label: "Rice" },
            { value: "coarse", label: "Coarse Grains" },
          ]}
        />
        <FilterSelect
          label="Time Horizon"
          value={yearsBack}
          onChange={setYearsBack}
          options={[
            { value: "12", label: "Last 12 Months" },
            { value: "24", label: "Last 24 Months" },
            { value: "36", label: "Last 36 Months" },
            { value: "all", label: "All Available Series" },
          ]}
        />
      </FilterBar>

      <SectionTitle>Stock Trends &amp; Norms</SectionTitle>
      <div className="row-eq">
        <div className="col-md-8 col-xs-12">
          <Panel title={`${f.label} — Actual Stock vs Buffer Norm`} sub="Month-wise position in Central Pool" badge="Lakh MT">
            <LineChart data={trendData} height={240} />
          </Panel>
        </div>
        <div className="col-md-4 col-xs-12">
          <Panel title="Stock Custody Split" sub="Total Central Pool holding by agency type" badge="Lakh MT">
            <DoughnutChart data={splitData} height={200} />
            <div className="small-note" style={{ textAlign: "center", marginTop: 10 }}>
              FCI: {fciTotal.toFixed(1)} LMT ({fmt.pct((fciTotal / (fciTotal + stateTotal)) * 100)}) | State Agencies: {stateTotal.toFixed(1)} LMT
            </div>
          </Panel>
        </div>
      </div>

      <SectionTitle>State &amp; Region Breakdown</SectionTitle>
      <div className="row-eq">
        <div className="col-md-12 col-xs-12">
          <Panel title={`Top States — ${f.label} Stock`} sub="State/UT wise stock position in Central Pool" badge="Lakh MT">
            <HBarChart data={regionData} height={260} />
          </Panel>
        </div>
      </div>

      <SectionTitle>Detailed Data Tables</SectionTitle>
      <div className="row-eq">
        <div className="col-md-6 col-xs-12">
          <Panel title="Paddy &amp; Coarse Grain Stock Position" sub="State-wise stock with FCI and State Agencies" badge="Lakh MT">
            <DataTable columns={paddyCols} data={paddy} searchPlaceholder="Filter state..." filename="paddy-coarsegrain-stock" />
          </Panel>
        </div>
        <div className="col-md-6 col-xs-12">
          <Panel title="Monthly Stock &amp; Norm History" sub="Historical Central Pool actual stock and stocking norms" badge="Lakh MT">
            <DataTable columns={monthCols} data={monthwise} searchPlaceholder="Filter month..." filename="monthly-stock-history" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
