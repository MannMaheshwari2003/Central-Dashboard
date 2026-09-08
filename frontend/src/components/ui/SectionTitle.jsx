import React from "react";

export default function SectionTitle({ children }) {
  return (
    <div className="section-title">
      <span className="bar"></span>
      {children}
    </div>
  );
}
