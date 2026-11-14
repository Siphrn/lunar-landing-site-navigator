// The only file that talks to the backend.
// No VITE_API_URL  -> serve the mock files in src/mock/ (dates are ignored).
// VITE_API_URL set -> call A's FastAPI, e.g. VITE_API_URL=http://localhost:8000
import type { CompareResponse, EphemerisResponse, Horizon, RangeQuery, Site } from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const USING_MOCKS = !BASE;

// Lazy: mock files are only downloaded in mock mode, so they don't bloat the real build.
const mockFiles = import.meta.glob<unknown>("./mock/*.json", { import: "default" });

async function mock<T>(name: string): Promise<T> {
  const load = mockFiles[`./mock/${name}.json`];
  if (!load) throw new Error(`No mock file src/mock/${name}.json`);
  // small delay so loading states are visible during development
  await new Promise((r) => setTimeout(r, 150));
  return structuredClone((await load()) as T);
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = ((await res.json()) as { detail?: string }).detail ?? detail;
    } catch {
      /* not JSON */
    }
    throw new Error(`${path} failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as T;
}

/** Contract 3 */
export function getSites(): Promise<Site[]> {
  return USING_MOCKS ? mock<Site[]>("sites") : get<Site[]>("/sites");
}

/** Contract 4 */
export function getEphemeris(site: string, q: RangeQuery): Promise<EphemerisResponse> {
  const horizon: Horizon = q.horizon ?? "terrain";
  if (USING_MOCKS) return mock<EphemerisResponse>(`ephemeris_${site}_${horizon}`);
  return get<EphemerisResponse>("/ephemeris", { site, start: q.start, stop: q.stop, step_h: q.step_h ?? 1, horizon });
}

/** Contract 5. landAt is optional ISO UTC. */
export async function getCompare(sites: string[], q: RangeQuery, landAt?: string): Promise<CompareResponse> {
  const horizon: Horizon = q.horizon ?? "terrain";
  if (USING_MOCKS) {
    const all = await mock<CompareResponse>(`compare_${horizon}`);
    const results = sites.map((id) => all.results.find((r) => r.site === id)).filter((r) => r !== undefined);
    return { ...all, results };
  }
  return get<CompareResponse>("/compare", {
    sites: sites.join(","),
    start: q.start,
    stop: q.stop,
    step_h: q.step_h ?? 1,
    horizon,
    land_at: landAt,
  });
}
