import { api } from "../api/client.js";
import { useAsync } from "./useAsync.js";
import { useMonth } from "../context/MonthContext.jsx";

export function useDataset(id, options = {}) {
  const { selectedMonth } = useMonth();
  const month = options.month !== undefined ? options.month : selectedMonth;
  return useAsync(() => (id ? api.getDataset(id, { month }) : Promise.resolve(null)), [id, month]);
}

/** Fetch several datasets at once; returns {data: {id: dataset}, loading, error} */
export function useDatasets(ids, options = {}) {
  const { selectedMonth } = useMonth();
  const month = options.month !== undefined ? options.month : selectedMonth;
  const key = ids.join(",") + ":" + month;
  const { data, error, loading, reload } = useAsync(
    () => Promise.all(ids.map((id) => api.getDataset(id, { month }))).then((arr) => Object.fromEntries(ids.map((id, i) => [id, arr[i]]))),
    [key]
  );
  return { data, error, loading, reload };
}

export function useKpis(options = {}) {
  const { selectedMonth } = useMonth();
  const month = options.month !== undefined ? options.month : selectedMonth;
  return useAsync(() => api.getKpis({ month }), [month]);
}

export function useDatasetsRegistry() {
  return useAsync(() => api.getDatasetsRegistry(), []);
}
