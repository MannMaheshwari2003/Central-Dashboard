import React, { useEffect, useState } from "react";
import { appConfig } from "../../config/app.config.js";
import { useMonth } from "../../context/MonthContext.jsx";

export default function Masthead() {
  const [now, setNow] = useState(new Date());
  const { availableMonths, selectedMonth, setSelectedMonth, triggerReingestion, isReingesting } = useMonth();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="gov-strip">
        <div className="container-fluid">
          <div className="gov-strip__identity">
            <span className="gov-mark" aria-hidden="true">भारत</span>
            <span>{appConfig.government}</span>
            <span className="gov-strip__separator">|</span>
            <span>National Food &amp; Public Distribution MIS</span>
          </div>
          <div className="gov-strip__time">
            <span>{dateLabel}</span><span>|</span><strong>{timeLabel} IST</strong>
          </div>
        </div>
      </div>

      <header className="masthead">
        <div className="container-fluid masthead__inner">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-mark__top">GOI</span>
            <span className="brand-mark__bottom">MIS</span>
          </div>
          <div className="titles">
            <div className="titles__eyebrow">{appConfig.hindiTitle}</div>
            <h1>{appConfig.title}</h1>
            <div className="titles__sub">{appConfig.department} · {appConfig.ministry}</div>
          </div>
          
          <div className="masthead__meta" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="global-month-select" style={{ fontSize: "0.85rem", color: "#e2e8f0", fontWeight: "600", margin: 0 }}>
                Data Period:
              </label>
              <select
                id="global-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} style={{ color: "#0f172a" }}>
                    {m} 2026 Dataset
                  </option>
                ))}
                <option value="all" style={{ color: "#0f172a" }}>
                  All Months Combined
                </option>
              </select>

              <button
                type="button"
                onClick={triggerReingestion}
                disabled={isReingesting}
                title="Scan backend source-data folder and update DB for any month"
                style={{
                  background: isReingesting ? "#64748b" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: isReingesting ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <i className={`fa fa-refresh ${isReingesting ? "fa-spin" : ""}`} />
                {isReingesting ? "Updating..." : "Reload Data"}
              </button>
            </div>

            <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
              <span className="status-chip__dot" style={{ background: "#22c55e", display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", marginRight: "4px" }} />
              Active Period: <strong>{selectedMonth} 2026</strong> ({availableMonths.length} Months in DB)
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
