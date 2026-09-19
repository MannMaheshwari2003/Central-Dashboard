
export function FilterBar({ children, onReset }) {
  return (
    <div className="filter-bar">
      {children}
      {onReset && (
        <div className="filter-reset" onClick={onReset}>
          <i className="fa fa-refresh"></i>&nbsp; Reset filters
        </div>
      )}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="form-group filter-group">
      <label>{label}</label>
      <select className="form-control" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="form-group filter-group search-box">
      <label>Search</label>
      <div className="search-field">
        <i className="fa fa-search"></i>
        <input type="text" className="form-control" value={value} placeholder={placeholder || "Search…"} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
