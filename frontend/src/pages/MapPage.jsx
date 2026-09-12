import React, { useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { PageHeader, Panel, Loading, ErrorBox, FilterBar, FilterSelect, DetailRow, Pill } from "../components/ui/index.js";
import { api } from "../api/client.js";
import { useAsync } from "../hooks/useAsync.js";
import { fmt } from "../utils/format.js";
import { useMonth } from "../context/MonthContext.jsx";

export default function MapPage() {
  const { selectedMonth } = useMonth();
  const { data: geo, error: geoErr, loading: geoLoading } = useAsync(() => api.getGeoIndia(), []);
  const { data: statesRes, error: sErr, loading: sLoading } = useAsync(() => api.getAnalyticsStates({ month: selectedMonth }), [selectedMonth]);
  
  const [metric, setMetric] = useState("nfsa_coverage");
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const wrapRef = useRef(null);

  const { data: selectedInfo, loading: selLoading, error: selError } = useAsync(
    () => (selected ? api.getAnalyticsState(selected, { month: selectedMonth }) : Promise.resolve(null)),
    [selected, selectedMonth]
  );

  const err = geoErr || sErr;
  if (err) return <ErrorBox msg={err} />;
  if (geoLoading || sLoading || !geo || !statesRes) {
    return <Loading label={`Loading India map & state statistics for ${selectedMonth} 2026…`} />;
  }

  const states = statesRes.data || [];

  function norm(s) {
    if (!s) return "";
    let n = String(s).toLowerCase().trim();
    const map = {
      "andaman and nicobar island": "andaman and nicobar islands",
      "andaman & nicobar islands": "andaman and nicobar islands",
      "dadra and nagar haveli and daman and diu": "dadra & nagar haveli and daman & diu",
      "dadra & nagar haveli": "dadra & nagar haveli and daman & diu",
      "daman and diu": "dadra & nagar haveli and daman & diu",
      "jammu and kashmir": "jammu & kashmir",
      "uttrakhand": "uttarakhand",
      "orissa": "odisha",
      "telengana": "telangana",
      "keralam": "kerala",
      "tamilnadu": "tamil nadu"
    };
    return map[n] || n;
  }

  const stateMap = new Map();
  states.forEach(s => {
    stateMap.set(norm(s.state), s);
  });

  const getMetricVal = (sObj) => {
    if (!sObj) return null;
    if (metric === "nfsa_coverage") return sObj.nfsa_coverage_pct;
    if (metric === "central_stock") return sObj.central_stock_lmt;
    if (metric === "procurement") return sObj.procurement_total_lakh;
    if (metric === "offtake_rate") return sObj.offtake_rate_pct;
    if (metric === "fps_count") return sObj.total_fps_count;
    if (metric === "portability") return sObj.portability_txns;
    if (metric === "paddy_coarse") return (sObj.paddy_stock_lmt || 0) + (sObj.coarse_stock_lmt || 0);
    return null;
  };

  const maxVal = Math.max(...states.map(s => getMetricVal(s) || 0), 1);

  const metricConfigs = {
    nfsa_coverage: { label: "NFSA Population Coverage %", unit: "%", max: 100 },
    central_stock: { label: "Central Pool Stock", unit: "Lakh MT", max: maxVal },
    procurement: { label: "Procurement Total", unit: "Lakh T", max: maxVal },
    offtake_rate: { label: "Offtake Utilization Rate", unit: "%", max: 100 },
    fps_count: { label: "Fair Price Shops (FPS) Count", unit: "Shops", max: maxVal },
    portability: { label: "Portability Transactions", unit: "Txns", max: maxVal },
    paddy_coarse: { label: "Paddy + Coarse Grain Stock", unit: "Lakh MT", max: maxVal },
  };

  const mc = metricConfigs[metric];

  function colorFor(name) {
    const sObj = stateMap.get(norm(name));
    const v = getMetricVal(sObj);
    if (v === undefined || v === null || v === 0) return "#e2e8f0";
    const t = Math.min(1, Math.max(0.1, v / (mc.max || 1)));
    const c1 = [191, 219, 254];
    const c2 = [29, 78, 216];
    const rgb = c1.map((c, i) => Math.round(c + (c2[i] - c) * t));
    return `rgb(${rgb.join(",")})`;
  }

  const width = 600, height = 620;
  const projection = geoMercator().fitSize([width - 20, height - 20], geo);
  const path = geoPath().projection(projection);

  function handleEnter(e, name) {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setHovered({ name, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleMove(e, name) {
    if (!wrapRef.current) return;
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
      <PageHeader
        title={`Interactive State Intelligence Map — ${selectedMonth} 2026`}
        subtitle={`Choropleth mapping across NFSA, Central Pool stock, procurement, offtake, FPS, and portability metrics for ${selectedMonth} 2026.`}
      />

      <FilterBar>
        <FilterSelect
          label="Map Choropleth Indicator"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "nfsa_coverage", label: "NFSA Population Coverage %" },
            { value: "central_stock", label: "Central Pool Stock (Lakh MT)" },
            { value: "procurement", label: "Procurement Total (Lakh T)" },
            { value: "offtake_rate", label: "Offtake Utilization Rate (%)" },
            { value: "fps_count", label: "Fair Price Shops Count" },
            { value: "portability", label: "Portability Transactions" },
            { value: "paddy_coarse", label: "Paddy + Coarse Stock (Lakh MT)" },
          ]}
        />
      </FilterBar>

      <div className="row-eq">
        {/* SVG Map Container */}
        <div className="col-md-8 col-xs-12">
          <div className="map-wrap panel panel-default" ref={wrapRef} style={{ position: "relative", padding: "15px", background: "#ffffff", borderRadius: "8px" }}>
            <div style={{ textAlign: "center", marginBottom: "10px", fontWeight: "700", color: "#1e293b" }}>
              India State &amp; District Map Choropleth ({mc.label} - {selectedMonth} 2026)
            </div>

            <div className="india-svg-wrap" style={{ display: "flex", justifyContent: "center" }}>
              <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxHeight: "560px" }}>
                <g transform="translate(10,10)">
                  {geo.features?.map((f, i) => {
                    const stName = f.properties.st_nm || f.properties.st_name || f.properties.ST_NM || f.properties.state_name;
                    return (
                      <path
                        key={i}
                        d={path(f)}
                        className={"state-path" + (hovered && norm(hovered.name) === norm(stName) ? " hovered" : "")}
                        style={{
                          fill: colorFor(stName),
                          stroke: "#ffffff",
                          strokeWidth: 0.6,
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={(e) => handleEnter(e, stName)}
                        onMouseMove={(e) => handleMove(e, stName)}
                        onMouseLeave={handleLeave}
                        onClick={() => setSelected(stName)}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>

            {/* Hover Tooltip */}
            {hovered && (
              <div
                className="map-tooltip"
                style={{
                  position: "absolute",
                  left: Math.min(hovered.x + 14, 380),
                  top: Math.max(hovered.y - 10, 10),
                  background: "#0f172a",
                  color: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
                  pointerEvents: "none",
                  zIndex: 100,
                  fontSize: "0.85rem",
                  minWidth: "220px"
                }}
              >
                <h4 style={{ margin: "0 0 6px 0", color: "#60a5fa", fontSize: "1rem", fontWeight: "700" }}>{hovered.name}</h4>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>{mc.label}:</span>
                  <strong style={{ color: "#facc15" }}>
                    {hoveredVal !== undefined && hoveredVal !== null ? fmt.num(hoveredVal, 1) + (mc.unit === "%" ? "%" : " " + mc.unit) : "No data"}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>NFSA Coverage:</span>
                  <span>{hoveredObj?.nfsa_coverage_pct ? fmt.pct(hoveredObj.nfsa_coverage_pct) : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Central Stock:</span>
                  <span>{hoveredObj?.central_stock_lmt ? fmt.num(hoveredObj.central_stock_lmt, 1) + " LMT" : "—"}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "6px", fontStyle: "italic" }}>
                  Click state for complete cross-dataset profile
                </div>
              </div>
            )}

            {/* Map Legend */}
            <div className="map-legend" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "15px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Low</span>
              <div style={{ flex: 1, height: 10, borderRadius: 5, background: "linear-gradient(90deg, rgb(191,219,254), rgb(29,78,216))", maxWidth: 220 }}></div>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>High</span>
              <span style={{ marginLeft: 16, fontSize: "0.8rem", color: "#64748b" }}>
                <span style={{ background: "#e2e8f0", display: "inline-block", width: 12, height: 12, borderRadius: 3, marginRight: 5 }}></span>
                No data
              </span>
            </div>
          </div>
        </div>

        {/* State Information Sidebar */}
        <div className="col-md-4 col-xs-12">
          <Panel
            title={selected || "Select a State on Map"}
            sub={selected ? `Consolidated Profile for ${selectedMonth} 2026` : "Click any state on the map to inspect full metrics"}
            badge={selected ? selectedMonth : ""}
          >
            {!selected && <NationalRankingsPanel states={states} metricLabel={mc.label} selectedMonth={selectedMonth} />}
            {selected && selLoading && <Loading label={`Fetching ${selected} profile…`} />}
            {selected && selError && <ErrorBox msg="No consolidated data available for this state." />}
            {selected && selectedInfo && !selError && <StateDetailCard info={selectedInfo} selectedMonth={selectedMonth} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function NationalRankingsPanel({ states, metricLabel, selectedMonth }) {
  const topCoverage = [...states].sort((a, b) => b.nfsa_coverage_pct - a.nfsa_coverage_pct).slice(0, 5);
  const topStock = [...states].sort((a, b) => b.central_stock_lmt - a.central_stock_lmt).slice(0, 5);

  return (
    <div>
      <div className="pill-tag pill-navy" style={{ marginBottom: "6px" }}>Top 5 · NFSA Coverage %</div>
      {topCoverage.map((r, i) => (
        <DetailRow key={r.state} label={`${i + 1}. ${r.state}`} value={fmt.pct(r.nfsa_coverage_pct)} />
      ))}
      <div className="pill-tag pill-green" style={{ marginTop: 12, marginBottom: "6px" }}>
        Top 5 · Central Pool Stock ({selectedMonth})
      </div>
      {topStock.map((r, i) => (
        <DetailRow key={r.state} label={`${i + 1}. ${r.state}`} value={fmt.num(r.central_stock_lmt, 1) + " LMT"} />
      ))}
      <div className="small-note" style={{ marginTop: 12 }}>
        Currently displaying <strong>{metricLabel}</strong> choropleth. Click any state on the map for full profile.
      </div>
    </div>
  );
}

function StateDetailCard({ info, selectedMonth }) {
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
        <Pill tone="green">Central Pool Stock ({selectedMonth})</Pill>
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
        <DetailRow label="Offtake Rate" value={fmt.pct(info.offtake_rate_pct)} />
        <DetailRow label="Portability Txns" value={fmt.num(info.portability_txns)} />
      </div>
    </div>
  );
}
