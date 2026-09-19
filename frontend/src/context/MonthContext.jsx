import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { api } from "../api/client.js";

const MonthContext = createContext();

function readStoredMonth() {
  try {
    return localStorage.getItem("food_pds_selected_month");
  } catch {
    return null;
  }
}

export function MonthProvider({ children }) {
  const [availableMonths, setAvailableMonths] = useState(["June", "July"]);
  const [selectedMonth, setSelectedMonthState] = useState(() => readStoredMonth() || "July");
  const [baseMonth, setBaseMonth] = useState("June");
  const [targetMonth, setTargetMonth] = useState(() => {
    const saved = readStoredMonth();
    return (saved && saved !== "all") ? saved : "July";
  });

  const setSelectedMonth = (m) => {
    setSelectedMonthState(m);
    try {
      localStorage.setItem("food_pds_selected_month", m);
    } catch {
      // The dashboard still works when browser storage is unavailable.
    }
    if (m && m !== "all") {
      setTargetMonth(m);
    }
  };

  const fetchMonths = useCallback(async () => {
    try {
      const data = await api.getAvailableMonths();
      if (data) {
        if (data.months && data.months.length) {
          setAvailableMonths(data.months);
          const saved = readStoredMonth();
          setSelectedMonthState((current) => {
            if (saved && (data.months.includes(saved) || saved === "all")) return saved;
            if (data.months.includes(current)) return current;
            return data.latest || data.months[data.months.length - 1];
          });
          if (data.months.length >= 2) {
            setBaseMonth(data.months[0]);
            setTargetMonth(data.months[data.months.length - 1]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load available months:", e);
    }
  }, []);

  useEffect(() => {
    fetchMonths();
  }, [fetchMonths]);

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
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
