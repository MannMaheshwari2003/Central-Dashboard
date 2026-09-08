import React from "react";
import { downloadCsv, slugify } from "../../utils/csv.js";

/**
 * Standalone, reusable "Export CSV" button. Works with any
 * columns/rows shape — pass a `csvValue(row)` on a column when the
 * displayed cell isn't the raw exportable value (e.g. a badge or a
 * formatted string).
 */
export default function ExportCsvButton({ columns, rows, filename = "export", label = "Export CSV", className = "" }) {
  function handleClick() {
    downloadCsv(slugify(filename), columns, rows);
  }
  return (
    <button type="button" className={"btn btn-default btn-export " + className} onClick={handleClick} disabled={!rows || rows.length === 0} title="Download this table as a CSV file">
      <i className="fa fa-download"></i> {label}
    </button>
  );
}
