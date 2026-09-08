// ===========================================================
// utils/csv.js — generic client-side CSV export. Used by
// <DataTable> and <ExportCsvButton> so any table in the app can
// be exported with zero extra wiring.
// ===========================================================

/** Escape a single CSV field per RFC 4180. */
function escapeField(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Strip any stray HTML/React artifacts (shouldn't normally happen since
  // callers pass raw values, not rendered nodes)
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Build a CSV string from column definitions + row objects.
 * columns: [{ key, label, csvValue?(row) }]
 * rows: array of plain objects
 */
export function toCsv(columns, rows) {
  const header = columns.map((c) => escapeField(c.label)).join(",");
  const lines = rows.map((r) =>
    columns
      .map((c) => {
        const raw = c.csvValue ? c.csvValue(r) : r[c.key];
        return escapeField(raw);
      })
      .join(",")
  );
  return [header, ...lines].join("\r\n");
}

/** Trigger a client-side download of a CSV file — no backend round-trip. */
export function downloadCsv(filename, columns, rows) {
  const csv = toCsv(columns, rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
