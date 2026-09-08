import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation.js";

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <nav className="top-nav" aria-label="Primary navigation">
      <div className="container-fluid">
        <div className="navbar-header">
          <span className="nav-brand-mobile"><i className="fa fa-bars" aria-hidden="true" /> Dashboard sections</span>
          <button
            type="button"
            className="navbar-toggle"
            aria-expanded={open}
            aria-controls="primary-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="icon-bar" />
            <span className="icon-bar" />
            <span className="icon-bar" />
          </button>
        </div>

        <div id="primary-navigation" className={`nav-collapse${open ? " in" : ""}`}>
          <div className="nav-scroll">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <i className={`fa ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
