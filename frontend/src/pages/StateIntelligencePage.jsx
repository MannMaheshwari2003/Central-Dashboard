import React, { useMemo, useState } from "react";
import { PageHeader, SectionTitle, KpiGrid, Panel, Loading, ErrorBox, FilterBar, FilterSelect, DataTable, DetailRow, Pill } from "../components/ui/index.js";
import { LineChart, HBarChart, DoughnutChart, GOV_PALETTE } from "../components/charts/index.js";
import { api } from "../api/client.js";
import { useAsync } from "../hooks/useAsync.js";
import { fmt } from "../utils/format.js";

export default function StateIntelligencePage() {
  const { data: statesData, loading: statesLoading, error: statesError } = useAsync(() => api.getAnalyticsStates(), []);
  const [state, setState] = useState("");
  const { data: detail, loading: detailLoading, error: detailError } = useAsync(() => state ? api.getAnalyticsState(state) : Promise.resolve(null), [state]);
  const states = statesData?.data || [];

  const kpis = useMemo(() => {
    if (!detail) return [];
    return [
      { label: "Central Pool Stock", value: fmt.num(detail.central_stock_lmt, 2), unit: "Lakh MT", icon: "fa-cubes", accent: "navy", foot: `FCI share ${fmt.pct(detail.fci_share_pct)}` },
      { label: "NFSA Coverage", value: fmt.pct(detail.nfsa_coverage_pct), icon: "fa-users", accent: "saffron", foot: `Rural ${fmt.pct(detail.rural_coverage_pct)} · Urban ${fmt.pct(detail.urban_coverage_pct)}` },
      { label: `Procurement ${detail.procurement_year || ""}`, value: fmt.num(detail.procurement_total_lakh, 2), unit: "Lakh T", icon: "fa-shopping-basket", accent: "green", foot: `Rice ${fmt.num(detail.procurement_rice_lakh,1)} · Wheat ${fmt.num(detail.procurement_wheat_lakh,1)}` },
      { label: "Upto June Offtake", value: fmt.num(detail.upto_june_offtake_kt, 2), unit: "Thousand T", icon: "fa-truck", accent: "warn", foot: `${fmt.pct(detail.offtake_rate_pct)} of allocation` },
      { label: "Annual NFSA Allocation", value: fmt.num(detail.annual_nfsa_allocation_kt, 2), unit: "Thousand T", icon: "fa-calendar", accent: "navy", foot: `AAY ${fmt.num(detail.aay_kt,1)} · PHH ${fmt.num(detail.phh_kt,1)}` },
      { label: "Welfare Utilization", value: detail.welfare_utilization_pct == null ? "—" : fmt.pct(detail.welfare_utilization_pct), icon: "fa-institution", accent: "green", foot: `${fmt.num(detail.welfare_offtake_kt,2)} / ${fmt.num(detail.welfare_allocation_kt,2)} Th. T` },
      { label: "Paddy Stock", value: fmt.num(detail.paddy_stock_lmt, 2), unit: "Lakh MT", icon: "fa-leaf", accent: "saffron", foot: `Coarse ${fmt.num(detail.coarse_stock_lmt,2)} Lakh MT` },
      { label: "Rural–Urban Gap", value: fmt.num(detail.rural_urban_gap_pct, 2), unit: "pp", icon: "fa-arrows-h", accent: detail.rural_urban_gap_pct > 10 ? "warn" : "green", foot: "Rural coverage minus urban coverage" },
    ];
  }, [detail]);

  if (statesLoading) return <Loading label="Loading state intelligence index…" />;
  if (statesError) return <ErrorBox msg={statesError} />;

  const procHistory = detail?.procurement_history || [];
  const procTrend = {
    labels: procHistory.map(r => r.year),
    datasets: [
      { label: "Rice", data: procHistory.map(r => r.rice || 0), backgroundColor: GOV_PALETTE[2], borderColor: GOV_PALETTE[2], tension: .25 },
      { label: "Wheat", data: procHistory.map(r => r.wheat || 0), backgroundColor: GOV_PALETTE[1], borderColor: GOV_PALETTE[1], tension: .25 },
      { label: "Coarse", data: procHistory.map(r => r.coarse || 0), backgroundColor: GOV_PALETTE[3], borderColor: GOV_PALETTE[3], tension: .25 },
    ]
  };
  const allocationMix = { labels: ["AAY", "PHH", "Tide Over"], datasets: [{ data: [detail?.aay_kt || 0, detail?.phh_kt || 0, detail?.tide_over_kt || 0], backgroundColor: [GOV_PALETTE[0], GOV_PALETTE[2], GOV_PALETTE[3]] }] };
  const stockMix = { labels: ["Rice", "Wheat"], datasets: [{ data: [detail?.rice_stock_lmt || 0, detail?.wheat_stock_lmt || 0], backgroundColor: [GOV_PALETTE[2], GOV_PALETTE[1]] }] };
  const comparisonRows = detail ? [
    { metric: "NFSA Coverage", value: fmt.pct(detail.nfsa_coverage_pct) },
    { metric: "Rural Coverage", value: fmt.pct(detail.rural_coverage_pct) },
    { metric: "Urban Coverage", value: fmt.pct(detail.urban_coverage_pct) },
    { metric: "Central Pool Stock", value: fmt.num(detail.central_stock_lmt,2) + " Lakh MT" },
    { metric: "FCI Stock Share", value: fmt.pct(detail.fci_share_pct) },
    { metric: "Offtake Rate", value: fmt.pct(detail.offtake_rate_pct) },
    { metric: "Welfare Utilization", value: detail.welfare_utilization_pct == null ? "—" : fmt.pct(detail.welfare_utilization_pct) },
  ] : [];

  return <div>
    <PageHeader title="State Intelligence" subtitle="A consolidated state profile assembled through analytics APIs from NFSA, stock, procurement, allocation, offtake, welfare and paddy/coarse-grain datasets." />
    <FilterBar onReset={() => setState("")}>
      <FilterSelect label="State / UT" value={state} onChange={setState} options={[{ value: "", label: "— Select a State / UT —" }, ...states.map(s => ({ value: s.state, label: s.state }))]} />
    </FilterBar>

    {!state && <Panel title="Choose a State / UT" sub="The page combines multiple datasets into one decision-support profile."><div className="state-intro-grid">
      <div><Pill tone="navy">Stock</Pill><p>Rice, wheat, total Central Pool stock, FCI share and paddy/coarse stock.</p></div>
      <div><Pill tone="saffron">NFSA</Pill><p>Coverage, rural/urban split, population and coverage gap.</p></div>
      <div><Pill tone="green">Procurement</Pill><p>Multi-year commodity procurement and latest available year.</p></div>
      <div><Pill tone="navy">Distribution</Pill><p>Upto-June allocation, offtake, rate and remaining gap.</p></div>
    </div></Panel>}

    {state && detailLoading && <Loading label={`Building ${state} profile…`} />}
    {state && detailError && <ErrorBox msg={detailError} />}
    {state && detail && <>
      <SectionTitle>{detail.state} — Key Indicators</SectionTitle>
      <KpiGrid items={kpis} colMd={3} colSm={6} />

      <SectionTitle>Commodity &amp; Procurement Profile</SectionTitle>
      <div className="row-eq">
        <div className="col-md-7 col-xs-12"><Panel title="Procurement History" sub={`Latest available procurement year: ${detail.procurement_year || "—"}`} badge="Lakh Tons"><LineChart data={procTrend} height={250} /></Panel></div>
        <div className="col-md-5 col-xs-12"><Panel title="Central Pool Commodity Mix" sub="Rice vs Wheat stock"><DoughnutChart data={stockMix} height={210} /><div className="small-note text-center">Rice {fmt.num(detail.rice_stock_lmt,2)} · Wheat {fmt.num(detail.wheat_stock_lmt,2)} Lakh MT</div></Panel></div>
      </div>

      <SectionTitle>NFSA, Allocation &amp; Offtake</SectionTitle>
      <div className="row-eq">
        <div className="col-md-5 col-xs-12"><Panel title="Annual NFSA Allocation Mix" sub="2026-27 state-wise allocation"><DoughnutChart data={allocationMix} height={210} /></Panel></div>
        <div className="col-md-7 col-xs-12"><Panel title="State Indicator Summary" sub="Derived from the supplied datasets"><div className="state-summary-list">{comparisonRows.map(r => <DetailRow key={r.metric} label={r.metric} value={r.value} />)}</div></Panel></div>
      </div>

      <SectionTitle>Procurement Detail</SectionTitle>
      <DataTable columns={[
        { key:"year", label:"Year" }, { key:"rice", label:"Rice", numeric:true, render:r=>fmt.num(r.rice) }, { key:"wheat", label:"Wheat", numeric:true, render:r=>fmt.num(r.wheat) }, { key:"coarse", label:"Coarse", numeric:true, render:r=>fmt.num(r.coarse) }, { key:"total", label:"Total", numeric:true, render:r=>fmt.num(r.total), csvValue:r=>r.total }
      ]} rows={procHistory} defaultSortKey="year" defaultSortDir="desc" pageSize={10} exportFilename={`${detail.state.replace(/\s+/g,"-")}-procurement-history`} />

      <div className="small-note"><strong>Reporting context:</strong> Stock {detail.reporting.stock_as_on || "source-defined"}; distribution {detail.reporting.offtake_period || "source-defined"}; welfare {detail.reporting.welfare_period || "source-defined"}. Metrics are calculated from the supplied records; they are not invented or independently estimated.</div>
    </>}
  </div>;
}
