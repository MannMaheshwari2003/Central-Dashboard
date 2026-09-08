import React, { useEffect, useState } from "react";
import { appConfig } from "../../config/app.config.js";

export default function Masthead() {
  const [now, setNow] = useState(new Date());

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
          <div className="masthead__meta">
            <span className="status-chip"><span className="status-chip__dot" /> Operational</span>
            <span className="masthead__meta-text">{appConfig.dataSources} consolidated sources</span>
          </div>
        </div>
      </header>
    </>
  );
}
