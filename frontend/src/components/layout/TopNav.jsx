import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation.js";
import { useUnit } from "../../context/UnitContext.jsx";

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { unit, setUnit, unitOptions } = useUnit();
  const toggleBtnRef = useRef(null);

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  // Close on Escape, and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const closeAndReturnFocus = () => {
    setOpen(false);
    toggleBtnRef.current?.focus();
  };

  const isItemActive = (item) =>
    item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);

  return (
    <nav className="navbar navbar-default top-nav" role="navigation" aria-label="Primary navigation">
      <div className="container-fluid">
        <div className="navbar-header">
          {/* Standard Bootstrap 3 hamburger button markup (navbar-toggle + icon-bar x3) */}
          <button
            ref={toggleBtnRef}
            type="button"
            className="navbar-toggle"
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar" />
            <span className="icon-bar" />
            <span className="icon-bar" />
          </button>
          {/* <span className="navbar-brand nav-brand-mobile">
            <i className="fa fa-bars" aria-hidden="true" /> Dashboard sections
          </span> */}
        </div>
        <div className="navbar-right global-unit-control" data-unit-label-static="true">
          <label htmlFor="global-unit-select"><i className="fa fa-balance-scale" aria-hidden="true" /> Unit</label>
          <select id="global-unit-select" className="form-control input-sm" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {unitOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </div>

      {/* Backdrop overlay - click to close (Bootstrap 3 has no built-in off-canvas, so this bit is custom) */}
      <div
        className={`nav-drawer-backdrop${open ? " in" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Off-canvas panel: Bootstrap navbar-default skin + nav-pills/nav-stacked for the vertical menu */}
      <div
        id="primary-navigation"
        className={`nav-drawer navbar-default${open ? " in" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard sections"
        aria-hidden={!open}
      >
        <div className="navbar-header nav-drawer-header">
          <span className="navbar-brand">
            <i className="fa fa-bars" aria-hidden="true" /> Dashboard sections
          </span>
          <button type="button" className="close nav-drawer-close" aria-label="Close" onClick={closeAndReturnFocus}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <ul className="nav nav-pills nav-stacked nav-drawer-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.path} className={isItemActive(item) ? "active" : ""}>
              <NavLink to={item.path} end={item.path === "/"}>
                <i className={`fa ${item.icon}`} aria-hidden="true" /> {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
