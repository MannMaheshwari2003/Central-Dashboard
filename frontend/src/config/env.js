/**
 * config/env.js — reads Vite environment variables (import.meta.env) in
 * one place so nothing else in the app touches import.meta.env directly.
 * Add new VITE_* variables here as the app grows.
 */
export const env = {
  apiBase: import.meta.env.VITE_API_BASE || "",
};
