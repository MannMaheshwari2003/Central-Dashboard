import { useEffect, useState } from "react";
import { appConfig } from "../../config/app.config.js";
import { useMonth } from "../../context/MonthContext.jsx";
import logoImage from "../assets/logo.png";

export default function Masthead() {
  const [now, setNow] = useState(new Date());
  const { availableMonths, selectedMonth, setSelectedMonth } = useMonth();

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
  // const timeLabel = now.toLocaleTimeString("en-IN", {
  //   hour: "2-digit",
  //   minute: "2-digit",
  // });

  return (
    <>
      <div className="gov-strip">
        <div className="container-fluid">
          {/* <div className="gov-strip__identity">
            <span className="gov-mark" aria-hidden="true">भारत</span>
            <span>{appConfig.government}</span>
            <span className="gov-strip__separator">|</span>
            <span>National Food &amp; Public Distribution</span>
          </div> */}
          <div className="gov-strip__time">
            <span>{dateLabel}</span>
            {/* <span>|</span><strong>{timeLabel} IST</strong> */}
          </div>
        </div>
      </div>

      <header className="masthead">
        <div className="container-fluid masthead__inner">
          <div className="brand-mark" aria-hidden="true">

            <img src={logoImage} class="img-rounded logo" alt="Gov of India"/>
            
          </div>
          <div className="titles">
            
            <h1>{appConfig.title}</h1>
            <div className="titles__sub">{appConfig.ministry}</div>
            <div className="titles__sub">{appConfig.department}</div>
          </div>
          
          <div className="masthead__meta" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="global-month-select" style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: "600", margin: 0 }}>
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
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} style={{ color: "#0f172a" }}>
                    {m} 2026
                  </option>
                ))}
                
              </select>

            </div>

            
          </div>
        </div>
      </header>
    </>
  );
}
