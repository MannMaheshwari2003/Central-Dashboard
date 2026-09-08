import { useMemo } from "react";
import { api } from "../api/client.js";
import { useAsync } from "./useAsync.js";

export function useDataset(id) {
  return useAsync(() => (id ? api.getDataset(id) : Promise.resolve(null)), [id]);
}

/** Fetch several datasets at once; returns {data: {id: dataset}, loading, error} */
export function useDatasets(ids) {
  const key = ids.join(",");
  const { data, error, loading, reload } = useAsync(
    () => Promise.all(ids.map((id) => api.getDataset(id))).then((arr) => Object.fromEntries(ids.map((id, i) => [id, arr[i]]))),
    [key]
  );
  return { data, error, loading, reload };
}

export function useKpis() {
  return useAsync(() => api.getKpis(), []);
}

export function useGeoIndia() {
  return useAsync(() => api.getGeoIndia(), []);
}

export function useDatasetsRegistry() {
  return useAsync(() => api.getDatasetsRegistry(), []);
}

export function useStateInfo(name) {
  return useAsync(() => (name ? api.getStateInfo(name) : Promise.resolve(null)), [name]);
}
