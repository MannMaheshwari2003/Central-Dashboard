import React, { useEffect, useState } from "react";
import { PageHeader, Panel, Loading, ErrorBox, FilterBar, FilterSelect, SearchBox, DataTable } from "../components/ui/index.js";
import { useDatasetsRegistry, useDataset } from "../hooks/useDataset.js";
import { useMonth } from "../context/MonthContext.jsx";

function buildQuickColumns(rows) {
  if (!rows || !rows.length) return [];
  const sample = rows.slice(0, 20);
  const keySet = [];
  sample.forEach((r) => Object.keys(r).forEach((k) => { if (!keySet.includes(k)) keySet.push(k); }));
  return keySet.map((k) => ({
    key: k,
    label: k.replace(/_/g, " ").toUpperCase(),
    numeric: typeof sample.find((r) => r[k] !== undefined)?.[k] === "number",
  }));
}

export default function DataExplorerPage() {
  const { selectedMonth } = useMonth();
  const { data: registry, error: regErr, loading: regLoading } = useDatasetsRegistry();
  const [activeId, setActiveId] = useState(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const datasets = registry?.datasets || [];

  useEffect(() => {
    if (datasets.length && !activeId) setActiveId(datasets[0].id);
  }, [datasets, activeId]);

  const { data: activeRes, loading: dataLoading, error: dataErr } = useDataset(activeId);

  if (regErr) return <ErrorBox msg={regErr} />;
  if (regLoading || !registry) return <Loading label="Loading dataset registry…" />;

  const categories = [...new Set(datasets.map((d) => d.category))];
  const filteredDatasets = category === "all" ? datasets : datasets.filter((d) => d.category === category);
  const activeMeta = datasets.find((d) => d.id === activeId);

  const rawRows = activeRes?.data || activeRes?.rows || [];
  const quickCols = buildQuickColumns(rawRows);

  const filteredRows = search
    ? rawRows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    : rawRows;

  return (
    <div>
      <PageHeader
        title="Dataset Registry &amp; Multi-Table Explorer"
        subtitle={`Browse, search, and export relational tables powering the DFPD MIS Dashboard. Active Period: ${selectedMonth} 2026.`}
      />

      <FilterBar onReset={() => { setCategory("all"); setSearch(""); }}>
        <FilterSelect
          label="Category Filter"
          value={category}
          onChange={setCategory}
          options={[{ value: "all", label: `All Categories (${datasets.length})` }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <SearchBox value={search} onChange={setSearch} placeholder="Search records in table..." />
      </FilterBar>

      <div className="row-eq">
        <div className="col-md-3 col-xs-12">
          <Panel title="Relational Tables" sub={`${filteredDatasets.length} tables available`}>
            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {filteredDatasets.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setActiveId(d.id)}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 6,
                    marginBottom: 5,
                    cursor: "pointer",
                    background: activeId === d.id ? "#0b2e59" : "#f5f8fc",
                    color: activeId === d.id ? "#fff" : "#1a1f27",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  <div>{d.label}</div>
                  <div style={{ fontSize: 10.5, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>{d.category} · {d.record_count || 0} rows</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="col-md-9 col-xs-12">
          <Panel
            title={activeMeta ? activeMeta.label : ""}
            sub={activeMeta ? `Table: ${activeMeta.id} · Source: ${activeMeta.source_file}` : ""}
            badge={activeMeta ? activeMeta.category : ""}
          >
            {dataLoading && <Loading label="Querying table…" />}
            {dataErr && <ErrorBox msg={dataErr} />}
            {activeRes && quickCols.length > 0 && (
              <DataTable columns={quickCols} data={filteredRows} pageSize={12} defaultSortKey={quickCols[0]?.key} exportFilename={activeId} />
            )}
            {activeRes && quickCols.length === 0 && (
              <div className="small-note">No records found in this table.</div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
