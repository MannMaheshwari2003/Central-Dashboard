import { useState } from "react";
import UnitaryComparisonPage from "./UnitaryComparisonPage.jsx";
import MoMComparisonPage from "./MoMComparisonPage.jsx";

const TABS = [
  { id: "unitary", label: "Unitary Comparison Engine", icon: "fa-sliders" },
  { id: "mom", label: "Month-over-Month Comparison", icon: "fa-exchange" },
  { id: "state-cross", label: "State vs State Cross-Comparator", icon: "fa-columns" },
];

export default function ComparisonEnginePage() {
  const [activeTab, setActiveTab] = useState("unitary");

  return (
    <div className="comparison-engine-page" style={{ padding: "10px 0" }}>
      <div className="panel panel-default" style={{ borderLeft: "5px solid #0284c7", background: "#f8fafc", marginBottom: "16px" }}>
        <div className="panel-body">
          <h2 style={{ margin: "0 0 5px", fontSize: "1.45rem", fontWeight: 700, color: "#0f172a" }}>
            <i className="fa fa-calculator" style={{ color: "#0284c7", marginRight: 8 }} />
            Comparison Engine
          </h2>
          <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "0.88rem" }}>
            Compare a metric across reporting months, review the national month-over-month matrix, or compare two states side by side.
          </p>
          <div className="btn-group" role="tablist" aria-label="Comparison Engine modes">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`btn btn-sm ${activeTab === tab.id ? "btn-primary" : "btn-default"}`}
                style={{ fontWeight: 600 }}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`fa ${tab.icon}`} style={{ marginRight: 6 }} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "unitary" && <UnitaryComparisonPage mode="aspect_mom" embedded />}
      {activeTab === "mom" && <MoMComparisonPage />}
      {activeTab === "state-cross" && <UnitaryComparisonPage mode="state_cross" embedded />}
    </div>
  );
}
