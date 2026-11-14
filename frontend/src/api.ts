// The only file that talks to the backend.
//
// Where data comes from, in order:
//  1. VITE_API_URL set  -> the live API. If it can't be reached (network error, 5xx, or no answer
//                          within LIVE_TIMEOUT_MS, e.g. a free server waking up) and the dates are
//                          inside the offline snapshot, answer from the snapshot instead.
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

/** How long to wait for the live API before answering from the snapshot (if it can). */
const LIVE_TIMEOUT_MS = 6000;

/** Thrown for answers the server gave on purpose (4xx): never hidden by the snapshot. */
class ApiError extends Error {}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  // Only time out when the snapshot can step in; otherwise wait as long as the server needs.
  const res = await fetch(url, HAS_SNAPSHOT ? { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) } : undefined);
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
  // The server already failed and is still waking up: don't make the user wait again.
  if (liveDown && HAS_SNAPSHOT && (!q || (await covers(q)))) {
    wakeUp();
    lastSource = "snapshot";
    return snap();
  }
  try {
    const out = await live();
    lastSource = "live";
    return out;
  } catch (e) {
    if (e instanceof ApiError || !HAS_SNAPSHOT || (q && !(await covers(q)))) throw e;
    console.warn("Live API unavailable or slow, using the offline snapshot:", e);
    liveDown = true;
    wakeUp();
    const out = await snap();
    lastSource = "snapshot";
    return out;
  }
}

/** Keep poking a sleeping server in the background, so the next request is live again. */
let liveDown = false;
let waking = false;
function wakeUp() {
  if (waking || !BASE) return;
  waking = true;
  fetch(`${BASE}/sites`) // no timeout: give a sleeping free server time to start
    .then((r) => {
      if (r.ok) liveDown = false; // back up: the next Compare uses live data again
    })
    .catch(() => undefined)
    .finally(() => (waking = false));
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
      () =>
        get<EphemerisResponse>("/ephemeris", {
          site,
          start: q.start,
          stop: q.stop,
          step_h: qq.step_h,
          horizon,
          mast_m: q.mast_m || undefined,
        }),
      () => snapEphemeris(site, qq),
      qq,
    );
  if (HAS_SNAPSHOT) return snapEphemeris(site, qq);
  return mock<EphemerisResponse>(`ephemeris_${site}_${horizon}`); // mocks ignore mast_m
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
          mast_m: q.mast_m || undefined,
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
