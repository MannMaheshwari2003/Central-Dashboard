import React, { createContext, useContext, useState, useEffect } from "react";

const MonthContext = createContext();

export function MonthProvider({ children }) {
  const [availableMonths, setAvailableMonths] = useState(["June", "July"]);
  const [selectedMonth, setSelectedMonth] = useState("July");
  const [baseMonth, setBaseMonth] = useState("June");
  const [targetMonth, setTargetMonth] = useState("July");
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [isReingesting, setIsReingesting] = useState(false);

  const fetchMonths = async () => {
    try {
      setLoadingMonths(true);
      const res = await fetch("/api/analytics/months");
      if (res.ok) {
        const data = await res.json();
        if (data.months && data.months.length) {
          setAvailableMonths(data.months);
          if (!data.months.includes(selectedMonth)) {
            setSelectedMonth(data.latest || data.months[data.months.length - 1]);
          }
          if (data.months.length >= 2) {
            setBaseMonth(data.months[0]);
            setTargetMonth(data.months[data.months.length - 1]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load available months:", e);
    } finally {
      setLoadingMonths(false);
    }
  };

  useEffect(() => {
    fetchMonths();
  }, []);

  const triggerReingestion = async () => {
    try {
      setIsReingesting(true);
      const res = await fetch("/api/admin/reingest", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.months) {
          setAvailableMonths(data.months);
        }
        alert("Backend data successfully re-ingested from source-data folder!");
        await fetchMonths();
      } else {
        alert("Re-ingestion failed. Please check server logs.");
      }
    } catch (e) {
      alert("Error triggering re-ingestion: " + e.message);
    } finally {
      setIsReingesting(false);
    }
  };

  return (
    <MonthContext.Provider
      value={{
        availableMonths,
        selectedMonth,
        setSelectedMonth,
        baseMonth,
        setBaseMonth,
        targetMonth,
        setTargetMonth,
        loadingMonths,
        fetchMonths,
        triggerReingestion,
        isReingesting,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
