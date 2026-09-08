import React, { useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { PageHeader, Panel, Loading, ErrorBox, FilterBar, FilterSelect, DetailRow, Pill } from "../components/ui/index.js";
import { useGeoIndia, useStateInfo } from "../hooks/useDataset.js";
import { api } from "../api/client.js";
import { useAsync } from "../hooks/useAsync.js";
import { fmt } from "../utils/format.js";

export default function MapPage() {
  const { data: geo, error: geoErr, loading: geoLoading } = useGeoIndia();
  const { data: statesRes, error: sErr, loading: sLoading } = useAsync(() => api.getAnalyticsStates(), []);
  const [metric, setMetric] = useState("nfsa_coverage");
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const wrapRef = useRef(null);

  const { data: selectedInfo, loading: selLoading, error: selError } = useStateInfo(selected);

  const err = geoErr || sErr;
  if (err) return <ErrorBox msg={err} />;
  if (geoLoading || sLoading || !geo || !statesRes) return <Loading label="Loading India map &amp; state statistics…" />;

  const states = statesRes.data || [];

  function norm(s) {
    return (s || "").toLowerCase().trim();
  }

  const stateMap = new Map(states.map(s => [norm(s.state), s]));

  const getMetricVal = (sObj) => {
    if (!sObj) return null;
    if (metric === "nfsa_coverage") return sObj.nfsa_coverage_pct;
    if (metric === "central_stock") return sObj.central_stock_lmt;
    if (metric === "procurement") return sObj.procurement_total_lakh;
    if (metric === "offtake_rate") return sObj.offtake_rate_pct;
    if (metric === "welfare_utilization") return sObj.welfare_utilization_pct;
    if (metric === "fci_share") return sObj.fci_share_pct;
    if (metric === "paddy_coarse") return sObj.paddy_stock_lmt + sObj.coarse_stock_lmt;
    return null;
  };

  const metricConfigs = {
    nfsa_coverage: { label: "NFSA Population Coverage %", unit: "%", max: 100 },
    central_stock: { label: "Central Pool Stock", unit: "Lakh MT", max: Math.max(...states.map(s => s.central_stock_lmt || 0), 1) },
    procurement: { label: "Procurement Total", unit: "Lakh T", max: Math.max(...states.map(s => s.procurement_total_lakh || 0), 1) },
    offtake_rate: { label: "Upto-June Offtake Rate", unit: "%", max: 100 },
    welfare_utilization: { label: "Welfare Utilization", unit: "%", max: 100 },
    fci_share: { label: "FCI Share of Central Pool Stock", unit: "%", max: 100 },
    paddy_coarse: { label: "Paddy + Coarse Grain Stock", unit: "Lakh MT", max: Math.max(...states.map(s => (s.paddy_stock_lmt || 0) + (s.coarse_stock_lmt || 0)), 1) },
  };

  const mc = metricConfigs[metric];

  function colorFor(name) {
    const sObj = stateMap.get(norm(name));
    const v = getMetricVal(sObj);
    if (v === undefined || v === null) return "#e4e8ee";
    const t = Math.min(1, Math.max(0, v / mc.max));
    const c1 = [201, 217, 238];
    const c2 = [11, 46, 89];
    const rgb = c1.map((c, i) => Math.round(c + (c2[i] - c) * t));
    return `rgb(${rgb.join(",")})`;
  }

  const width = 560, height = 580;
  const projection = geoMercator().fitSize([width - 16, height - 16], geo);
  const path = geoPath().projection(projection);

  function handleEnter(e, name) {
    const rect = wrapRef.current.getBoundingClientRect();
    setHovered({ name, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleMove(e, name) {
    const rect = wrapRef.current.getBoundingClientRect();
    setHovered({ name, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleLeave() {
    setHovered(null);
  }

  const hoveredObj = hovered ? stateMap.get(norm(hovered.name)) : null;
  const hoveredVal = getMetricVal(hoveredObj);

  return (
    <div>
      <PageHeader title="State Intelligence Map" subtitle="Interactive choropleth map across NFSA, stock, procurement, offtake, and infrastructure indicators." />

      <FilterBar>
        <FilterSelect
          label="Map Indicator (Choropleth)"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "nfsa_coverage", label: "NFSA Population Coverage %" },
            { value: "central_stock", label: "Central Pool Stock (Lakh MT)" },
            { value: "procurement", label: "Procurement Total (Lakh T)" },
            { value: "offtake_rate", label: "Upto-June Offtake Rate (%)" },
            { value: "welfare_utilization", label: "Welfare Utilization (%)" },
            { value: "fci_share", label: "FCI Share of Central Pool (%)" },
            { value: "paddy_coarse", label: "Paddy + Coarse Stock (Lakh MT)" },
          ]}
        />
      </FilterBar>

      <div className="row-eq">
        <div className="col-md-8 col-xs-12">
          <div className="map-wrap" ref={wrapRef} style={{ position: "relative" }}>
            <div className="india-svg-wrap">
              <svg viewBox={`0 0 ${width} ${height}`}>
                <g transform="translate(8,8)">
                  {geo.features.map((f, i) => {
                    const name = f.properties.st_name || f.properties.ST_NM;
                    return (
                      <path
                        key={i}
                        d={path(f)}
                        className={"state-path" + (hovered && hovered.name === name ? " hovered" : "")}
                        style={{ fill: colorFor(name) }}
                        onMouseEnter={(e) => handleEnter(e, name)}
                        onMouseMove={(e) => handleMove(e, name)}
                        onMouseLeave={handleLeave}
                        onClick={() => setSelected(name)}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>

            {hovered && (
              <div
                className="map-tooltip"
                style={{
                  left: Math.min(hovered.x + 14, (wrapRef.current ? wrapRef.current.clientWidth : 600) - 285),
                  top: Math.max(hovered.y - 10, 6),
                }}
              >
                <h4>{hovered.name}</h4>
                <div className="mt-row">
                  <span>{mc.label}</span>
                  <span>{hoveredVal !== undefined && hoveredVal !== null ? fmt.num(hoveredVal, 1) + (mc.unit === "%" ? "%" : "") : "No data"}</span>
                </div>
                <div className="mt-row">
                  <span>NFSA Coverage</span>
                  <span>{hoveredObj?.nfsa_coverage_pct ? fmt.pct(hoveredObj.nfsa_coverage_pct) : "—"}</span>
                </div>
                <div className="mt-row">
                  <span>Central Pool Stock</span>
                  <span>{hoveredObj?.central_stock_lmt ? fmt.num(hoveredObj.central_stock_lmt, 1) + " LMT" : "—"}</span>
                </div>
                <div className="mt-row">
                  <span>Procurement</span>
                  <span>{hoveredObj?.procurement_total_lakh ? fmt.num(hoveredObj.procurement_total_lakh, 1) + " Lakh T" : "—"}</span>
                </div>
                <div className="small-note" style={{ marginTop: 6 }}>
                  Click state for full cross-dataset card
                </div>
              </div>
            )}

            <div className="map-legend">
              <span>Low</span>
              <div style={{ flex: 1, height: 10, borderRadius: 5, background: "linear-gradient(90deg, rgb(201,217,238), rgb(11,46,89))", maxWidth: 220 }}></div>
              <span>High</span>
              <span style={{ marginLeft: 16 }}>
                <span style={{ background: "#e4e8ee", display: "inline-block", width: 12, height: 12, borderRadius: 3, marginRight: 5 }}></span>
                No data
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xs-12">
          <Panel title={selected || "Select a State"} sub={selected ? "Consolidated snapshot across all tables" : "Click any state on the map for a complete cross-table profile"} badge={selected ? "Live" : ""}>
            {!selected && <NationalRankingsPanel states={states} metricLabel={mc.label} />}
            {selected && selLoading && <Loading label="Fetching state intelligence profile…" />}
            {selected && selError && <ErrorBox msg="No consolidated data available for this state." />}
            {selected && selectedInfo && !selError && <StateDetailCard info={selectedInfo} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function NationalRankingsPanel({ states, metricLabel }) {
  const topCoverage = [...states].sort((a, b) => b.nfsa_coverage_pct - a.nfsa_coverage_pct).slice(0, 5);
  const topStock = [...states].sort((a, b) => b.central_stock_lmt - a.central_stock_lmt).slice(0, 5);

  return (
    <div>
      <div className="pill-tag pill-navy">Top 5 · NFSA Coverage %</div>
      {topCoverage.map((r, i) => (
        <DetailRow key={r.state} label={`${i + 1}. ${r.state}`} value={fmt.pct(r.nfsa_coverage_pct)} />
      ))}
      <div className="pill-tag pill-green" style={{ marginTop: 10 }}>
        Top 5 · Central Pool Stock
      </div>
      {topStock.map((r, i) => (
        <DetailRow key={r.state} label={`${i + 1}. ${r.state}`} value={fmt.num(r.central_stock_lmt, 1) + " LMT"} />
      ))}
      <div className="small-note" style={{ marginTop: 10 }}>
        Currently viewing <strong>{metricLabel}</strong> on the map. Click any state for its complete cross-dataset profile.
      </div>
    </div>
  );
}

function StateDetailCard({ info }) {
  return (
    <div>
      <Pill tone="navy">NFSA Coverage</Pill>
      <DetailRow label="Population (Lakh)" value={fmt.num(info.population_lakh)} />
      <DetailRow label="Coverage %" value={fmt.pct(info.nfsa_coverage_pct)} />
      <DetailRow label="Persons Covered (Lakh)" value={fmt.num(info.present_coverage_lakh)} strong />

      <div style={{ marginTop: 10 }}>
        <Pill tone="saffron">Annual NFSA Allocation</Pill>
        <DetailRow label="AAY (Th. T)" value={fmt.num(info.aay_kt)} />
        <DetailRow label="PHH (Th. T)" value={fmt.num(info.phh_kt)} />
        <DetailRow label="Total (Th. T)" value={fmt.num(info.annual_nfsa_allocation_kt)} strong />
      </div>

      <div style={{ marginTop: 10 }}>
        <Pill tone="green">Central Pool Stock</Pill>
        <DetailRow label="Rice Stock (Lakh MT)" value={fmt.num(info.rice_stock_lmt)} />
        <DetailRow label="Wheat Stock (Lakh MT)" value={fmt.num(info.wheat_stock_lmt)} />
        <DetailRow label="Total Stock (Lakh MT)" value={fmt.num(info.central_stock_lmt)} strong />
      </div>

      <div style={{ marginTop: 10 }}>
        <Pill tone="navy">Procurement ({info.procurement_year})</Pill>
        <DetailRow label="Rice Procurement" value={fmt.num(info.procurement_rice_lakh) + " Lakh T"} />
        <DetailRow label="Wheat Procurement" value={fmt.num(info.procurement_wheat_lakh) + " Lakh T"} />
        <DetailRow label="Total Procurement" value={fmt.num(info.procurement_total_lakh) + " Lakh T"} strong />
      </div>

      <div style={{ marginTop: 10 }}>
        <Pill tone="saffron">Infrastructure &amp; Distribution</Pill>
        <DetailRow label="Fair Price Shops (FPS)" value={fmt.num(info.total_fps_count)} />
        <DetailRow label="Upto-June Offtake Rate" value={fmt.pct(info.offtake_rate_pct)} />
        <DetailRow label="Welfare Utilization" value={fmt.pct(info.welfare_utilization_pct)} />
      </div>
    </div>
  );
}
