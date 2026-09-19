import { useEffect, useMemo, useState } from "react";
import ExportCsvButton from "./ExportCsvButton.jsx";

/**
 * Generic sortable, paginated, CSV-exportable data table.
 *
 * columns: [{
 *   key,            // property on the row object
 *   label,          // header text
 *   numeric,        // right-align + tabular numerals
 *   render(row),    // optional custom cell renderer (JSX)
 *   csvValue(row),  // optional raw value for CSV export (defaults to render's plain value or row[key])
 * }]
 */
export default function DataTable({ columns, rows, data, pageSize = 12, defaultSortKey, defaultSortDir = "desc", exportFilename = "table-export", title, searchPlaceholder }) {
  const actualRows = useMemo(() => data || rows || [], [data, rows]);
  const [sortKey, setSortKey] = useState(defaultSortKey || (columns && columns[0] && columns[0].key));
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => setPage(0), [actualRows, search]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return actualRows;
    return actualRows.filter((row) =>
      (columns || []).some((column) => {
        const value = column.csvValue ? column.csvValue(row) : row[column.key];
        return String(value ?? "").toLowerCase().includes(query);
      })
    );
  }, [actualRows, columns, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va = a[sortKey],
        vb = b[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va === null || va === undefined) va = -Infinity;
      if (vb === null || vb === undefined) vb = -Infinity;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const exportColumns = (columns || []).map((c) => ({
    key: c.key,
    label: c.label,
    csvValue: c.csvValue || ((row) => row[c.key]),
  }));

  return (
    <div>
      <div className="table-toolbar">
        {title && <div className="table-toolbar-title">{title}</div>}
        {searchPlaceholder && (
          <div className="search-field">
            <i className="fa fa-search" aria-hidden="true"></i>
            <label className="sr-only" htmlFor={`table-search-${exportFilename}`}>Search table</label>
            <input
              id={`table-search-${exportFilename}`}
              className="form-control input-sm"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
        )}
        <ExportCsvButton columns={exportColumns} rows={sorted} filename={exportFilename} />
      </div>
      <div className="table-responsive gov-table-wrap">
        <table className="table table-condensed gov-table">
          <thead>
            <tr>
              {(columns || []).map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)} className="sortable">
                  {c.label}
                  {sortKey === c.key && <i className={"fa fa-caret-" + (sortDir === "asc" ? "up" : "down") + " sort-icon"}></i>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i}>
                {(columns || []).map((c) => (
                  <td key={c.key} className={c.numeric ? "text-num" : ""}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={(columns || []).length || 1} className="empty-cell">
                  No matching records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="table-pagination">
          <span>
            Showing {page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}
          </span>
          <div>
            <button className="btn btn-default btn-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <i className="fa fa-chevron-left"></i>
            </button>
            <span className="pagination-label">
              Page {page + 1} / {totalPages}
            </span>
            <button className="btn btn-default btn-xs" disabled={page === totalPages - 1} onClick={() => setPage(page + 1)}>
              <i className="fa fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
