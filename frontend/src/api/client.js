import { env } from "../config/env.js";

const BASE = env.apiBase;
const cache = new Map();
let activeUnit = "lakh_mt";

export function setApiUnit(unit) {
  activeUnit = unit || "lakh_mt";
  cache.clear();
}

async function get(path, { useCache = true } = {}) {
  const separator = path.includes("?") ? "&" : "?";
  const unitPath = `${path}${separator}unit=${encodeURIComponent(activeUnit)}`;
  const url = BASE + unitPath;
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
  getKpis: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/api/kpis${q ? '?' + q : ''}`, { useCache: false });
  },
  getGeoIndia: () => get("/api/geo/india-states"),
  getAnalyticsOverview: (params = {}) => get(`/api/analytics/overview?${new URLSearchParams(params).toString()}`, { useCache: false }),
  getAnalyticsStates: (params = {}) => get(`/api/analytics/states?${new URLSearchParams(params).toString()}`, { useCache: false }),
  getAnalyticsState: (name, params = {}) => get(`/api/analytics/state/${encodeURIComponent(name)}?${new URLSearchParams(params).toString()}`, { useCache: false }),
  getAvailableMonths: () => get("/api/analytics/months", { useCache: false }),
  getMomAnalytics: (baseMonth = "June", targetMonth = "July") => get(`/api/analytics/mom?baseMonth=${encodeURIComponent(baseMonth)}&targetMonth=${encodeURIComponent(targetMonth)}`, { useCache: false }),
  getPermutations: (params = {}) => get(`/api/analytics/permutations?${new URLSearchParams(params).toString()}`, { useCache: false }),
  getUnitaryAspect: (params = {}) => get(`/api/analytics/unitary-aspect?${new URLSearchParams(params).toString()}`, { useCache: false }),
};
