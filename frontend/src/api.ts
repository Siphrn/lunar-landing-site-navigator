// The only file that talks to the backend.
//
// Where data comes from, in order:
//  1. VITE_API_URL set  -> the live API. If it can't be reached (network error or 5xx) and the
//                          dates are inside the offline snapshot, answer from the snapshot instead.
//  2. no VITE_API_URL   -> the offline snapshot of real API answers (src/snapshot/), if present.
//  3. neither           -> the fake files in src/mock/ (development only; dates ignored).
import { covers, HAS_SNAPSHOT, snapCompare, snapEphemeris, snapshotSites } from "./snapshot";
import type { CompareResponse, EphemerisResponse, Horizon, RangeQuery, Site } from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const USING_MOCKS = !BASE && !HAS_SNAPSHOT;

export type DataSource = "live" | "snapshot" | "mock";
let lastSource: DataSource = BASE ? "live" : HAS_SNAPSHOT ? "snapshot" : "mock";
/** Where the most recent answer came from (for the badge in the header). */
export const dataSource = () => lastSource;

// Lazy: mock files are only downloaded in mock mode, so they don't bloat the real build.
const mockFiles = import.meta.glob<unknown>("./mock/*.json", { import: "default" });

async function mock<T>(name: string): Promise<T> {
  const load = mockFiles[`./mock/${name}.json`];
  if (!load) throw new Error(`No mock file src/mock/${name}.json`);
  await new Promise((r) => setTimeout(r, 150)); // make loading states visible in development
  return structuredClone((await load()) as T);
}

/** Thrown for answers the server gave on purpose (4xx): never hidden by the snapshot. */
class ApiError extends Error {}

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
    const msg = `${path} failed (${res.status}): ${detail}`;
    throw res.status < 500 ? new ApiError(msg) : new Error(msg);
  }
  return (await res.json()) as T;
}

/** Try the live API; on a network/server failure fall back to the snapshot when it can answer. */
async function liveOrSnapshot<T>(live: () => Promise<T>, snap: () => Promise<T>, q?: RangeQuery): Promise<T> {
  try {
    const out = await live();
    lastSource = "live";
    return out;
  } catch (e) {
    if (e instanceof ApiError || !HAS_SNAPSHOT || (q && !(await covers(q)))) throw e;
    console.warn("Live API unavailable, using the offline snapshot:", e);
    const out = await snap();
    lastSource = "snapshot";
    return out;
  }
}

/** Contract 3 */
export function getSites(): Promise<Site[]> {
  if (BASE) return liveOrSnapshot(() => get<Site[]>("/sites"), snapshotSites);
  return HAS_SNAPSHOT ? snapshotSites() : mock<Site[]>("sites");
}

/** Contract 4 */
export function getEphemeris(site: string, q: RangeQuery): Promise<EphemerisResponse> {
  const horizon: Horizon = q.horizon ?? "terrain";
  const qq = { ...q, horizon, step_h: q.step_h ?? 1 };
  if (BASE)
    return liveOrSnapshot(
      () => get<EphemerisResponse>("/ephemeris", { site, start: q.start, stop: q.stop, step_h: qq.step_h, horizon }),
      () => snapEphemeris(site, qq),
      qq,
    );
  if (HAS_SNAPSHOT) return snapEphemeris(site, qq);
  return mock<EphemerisResponse>(`ephemeris_${site}_${horizon}`);
}

/** Contract 5. landAt is optional ISO UTC. */
export async function getCompare(sites: string[], q: RangeQuery, landAt?: string): Promise<CompareResponse> {
  const horizon: Horizon = q.horizon ?? "terrain";
  const qq = { ...q, horizon, step_h: q.step_h ?? 1 };
  if (BASE)
    return liveOrSnapshot(
      () =>
        get<CompareResponse>("/compare", {
          sites: sites.join(","),
          start: q.start,
          stop: q.stop,
          step_h: qq.step_h,
          horizon,
          land_at: landAt,
        }),
      () => snapCompare(sites, qq, landAt),
      qq,
    );
  if (HAS_SNAPSHOT) return snapCompare(sites, qq, landAt);
  const all = await mock<CompareResponse>(`compare_${horizon}`);
  const results = sites.map((id) => all.results.find((r) => r.site === id)).filter((r) => r !== undefined);
  return { ...all, results };
}
