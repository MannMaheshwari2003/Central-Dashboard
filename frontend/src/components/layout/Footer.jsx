import React from "react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation.js";
import { appConfig } from "../../config/app.config.js";

export default function Footer() {
  return (
    <footer className="gov-footer">
      <div className="container-fluid">
        <div className="footer-cols">
          <div className="footer-brand">
            <div className="footer-brand__mark">GOI<br /><span>MIS</span></div>
            <div>
              <h5>{appConfig.department}</h5>
              <p>{appConfig.ministry}</p>
              <p className="footer-muted">National analytical MIS interface</p>
            </div>
          </div>

          <div>
            <h5>Operational views</h5>
            <ul>
              {NAV_ITEMS.slice(0, 5).map((item) => (
                <li key={item.path}><NavLink to={item.path}>{item.label}</NavLink></li>
              ))}
            </ul>
          </div>

          <div>
            <h5>Analysis &amp; data</h5>
            <ul>
              {NAV_ITEMS.slice(5).map((item) => (
                <li key={item.path}><NavLink to={item.path}>{item.label}</NavLink></li>
              ))}
            </ul>
          </div>

          <div className="footer-note">
            <h5>Data &amp; disclaimer</h5>
            <p>{appConfig.dataSources} consolidated MIS statements are exposed through the application API layer.</p>
            <p>{appConfig.disclaimer}</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {appConfig.government}</span>
          <span>National Food &amp; Public Distribution Dashboard</span>
          <span>For official statistics, refer to the source publications.</span>
        </div>
      </div>
    </footer>
  );
}
