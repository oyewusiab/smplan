/**
 * API Configuration
 * 
 * All API calls route through Google Apps Script Web App.
 * The deployed web app is used by default. Override it with VITE_APPS_SCRIPT_URL when needed:
 *   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 * 
 * NEVER put passwords, private keys, or secrets here.
 * Only the Apps Script Web App URL is needed on the frontend.
 */

export const API_BASE_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzrQbpU_67jedBO5Fz51SHwv9g3ouEQFltK7y1bRXIJfa0q_ft6mKMXo4DoPCGYE-lw/exec';

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'SM Planner';
export const APP_FULL_NAME = 'Sacrament Meeting Planner';

/**
 * Build a URL for a GET request to the Apps Script Web App.
 * Apps Script doGet(e) reads e.parameter.*
 */
export function buildGetUrl(params: Record<string, string>): string {
  const url = new URL(API_BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

/**
 * Standard POST to Apps Script.
 * Apps Script doPost(e) reads JSON.parse(e.postData.contents)
 */
export async function apiPost<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain for CORS
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Unknown backend error');
  return json as T;
}

/**
 * Standard GET from Apps Script.
 * Uses JSONP-style via fetch with no-cors isn't ideal;
 * Apps Script Web App deployed as "Anyone" supports regular CORS fetch.
 */
export async function apiGet<T = unknown>(params: Record<string, string>): Promise<T> {
  const url = buildGetUrl(params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Unknown backend error');
  return json as T;
}
