import { env } from "../config/env.js";

const BASE = env.apiBase;
const cache = new Map();

async function get(path, { useCache = true } = {}) {
  const url = BASE + path;
  if (useCache && cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${path} (${res.status})`);
  }
  const json = await res.json();
  if (useCache) cache.set(url, json);
  return json;
}

export const api = {
  getDatasetsRegistry: () => get("/api/datasets"),
  getDataset: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const path = `/api/data/${encodeURIComponent(id)}${query ? '?' + query : ''}`;
    return get(path, { useCache: !query });
  },
  queryDataset: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return get(`/api/data/${encodeURIComponent(id)}/query?${query}`, { useCache: false });
  },
  getKpis: () => get("/api/kpis", { useCache: false }),
  getGeoIndia: () => get("/api/geo/india-states"),
  getStateInfo: (name) => get(`/api/state/${encodeURIComponent(name)}`, { useCache: false }),
  getAnalyticsOverview: () => get("/api/analytics/overview", { useCache: false }),
  getAnalyticsStates: () => get("/api/analytics/states", { useCache: false }),
  getAnalyticsState: (name) => get(`/api/analytics/state/${encodeURIComponent(name)}`, { useCache: false }),
  getAnalyticsInsights: () => get("/api/analytics/insights", { useCache: false }),
  clearCache: () => cache.clear(),
};
