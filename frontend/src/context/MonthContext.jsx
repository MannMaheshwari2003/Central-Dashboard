import React, { createContext, useContext, useState, useEffect } from "react";

const MonthContext = createContext();

export function MonthProvider({ children }) {
  const [availableMonths, setAvailableMonths] = useState(["June", "July"]);
  const [selectedMonth, setSelectedMonthState] = useState(() => {
    try {
      return localStorage.getItem("food_pds_selected_month") || "July";
    } catch (_) {
      return "July";
    }
  });
  const [baseMonth, setBaseMonth] = useState("June");
  const [targetMonth, setTargetMonth] = useState(() => {
    try {
      const saved = localStorage.getItem("food_pds_selected_month");
      return (saved && saved !== "all") ? saved : "July";
    } catch (_) {
      return "July";
    }
  });
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [isReingesting, setIsReingesting] = useState(false);

  const setSelectedMonth = (m) => {
    setSelectedMonthState(m);
    try {
      localStorage.setItem("food_pds_selected_month", m);
    } catch (_) {}
    if (m && m !== "all") {
      setTargetMonth(m);
    }
  };

  const fetchMonths = async () => {
    try {
      setLoadingMonths(true);
      const res = await fetch("/api/analytics/months");
      if (res.ok) {
        const data = await res.json();
        if (data.months && data.months.length) {
          setAvailableMonths(data.months);
          const saved = localStorage.getItem("food_pds_selected_month");
          if (saved && (data.months.includes(saved) || saved === "all")) {
            setSelectedMonthState(saved);
          } else if (!data.months.includes(selectedMonth)) {
            const fallback = data.latest || data.months[data.months.length - 1];
            setSelectedMonthState(fallback);
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
