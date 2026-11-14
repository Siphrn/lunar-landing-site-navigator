// Offline snapshot of the real API: answers /ephemeris and /compare in the browser
// for any dates inside the snapshot period, with no backend. Built by scripts/make_snapshot.mjs.
import { summarize } from "./metrics";
import type { CompareResponse, EphemerisResponse, Horizon, RangeQuery, Site } from "./types";

interface Body {
  az: number[];
  el: number[];
  /** "1"/"0" per hour: visible with the flat horizon / with the terrain mask */
  vis_flat: string;
  vis_terrain: string;
  /** same with the 10 m mast mask (absent if there is none) */
  vis_terrain_h10?: string;
}
export interface SnapshotSite {
  site: string;
  start: string; // first sample, hourly from here
  n: number;
  /** horizon the API actually used when asked for terrain ("flat" if no mask) */
  terrain_horizon: Horizon;
  mask_deg: number[] | null;
  /** 10 m mast mask, or null if the API fell back to the ground mask */
  mask_deg_h10: number[] | null;
  sun: Body;
  earth: Body;
}
export interface SnapshotIndex {
  start: string; // inclusive
  stop: string; // exclusive
  generated_at: string;
  source: string;
}

const files = import.meta.glob<unknown>("./snapshot/*.json", { import: "default" });
export const HAS_SNAPSHOT = "./snapshot/index.json" in files;

const cache = new Map<string, Promise<unknown>>();
function load<T>(name: string): Promise<T> {
  const f = files[`./snapshot/${name}.json`];
  if (!f) return Promise.reject(new Error(`no snapshot file ${name}`));
  if (!cache.has(name)) cache.set(name, f());
  return cache.get(name) as Promise<T>;
}

export const snapshotIndex = () => load<SnapshotIndex>("index");
export const snapshotSites = () => load<Site[]>("sites");

const HOUR = 3600_000;
const iso = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");

/** Same rules as horizons.parse_day: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM[:SS][Z]", UTC. */
function parseDay(s: string): number {
  const t = s.trim().replace("Z", "");
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  if (!m) throw new Error(`bad date '${s}': use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
}

/** True if [start, stop) lies inside the snapshot period. */
export async function covers(q: RangeQuery): Promise<boolean> {
  try {
    const idx = await snapshotIndex();
    return parseDay(q.start) >= parseDay(idx.start) && parseDay(q.stop) <= parseDay(idx.stop);
  } catch {
    return false;
  }
}

async function range(q: RangeQuery) {
  const idx = await snapshotIndex();
  const a = parseDay(q.start);
  const b = parseDay(q.stop);
  const step = q.step_h ?? 1;
  if (b <= a) throw new Error("stop must be after start");
  if (a < parseDay(idx.start) || b > parseDay(idx.stop))
    throw new Error(
      `The offline snapshot covers ${idx.start.slice(0, 10)} to ${idx.stop.slice(0, 10)}. Pick dates in that range, or connect the live backend for other dates.`,
    );
  return { a, b, step };
}

export async function snapEphemeris(siteId: string, q: RangeQuery): Promise<EphemerisResponse> {
  const { a, b, step } = await range(q);
  const s = await load<SnapshotSite>(`site_${siteId}`).catch(() => {
    throw new Error(`unknown site '${siteId}'`);
  });
  const t0 = parseDay(s.start);
  const i0 = Math.round((a - t0) / HOUR);
  const i1 = Math.round((b - t0) / HOUR); // exclusive, like the API
  const idx: number[] = [];
  for (let i = i0; i < i1 && i < s.n; i += step) idx.push(i);
  const horizon: Horizon = q.horizon === "terrain" ? s.terrain_horizon : "flat";
  // Same rules as the API: only 0 and 10 m exist; anything else, or no 10 m mask, falls back to 0.
  const mast = horizon === "terrain" && q.mast_m === 10 && s.mask_deg_h10 ? 10 : 0;
  const body = (bd: Body) => {
    const vis = horizon === "flat" ? bd.vis_flat : mast === 10 ? bd.vis_terrain_h10! : bd.vis_terrain;
    return { az: idx.map((i) => bd.az[i]), el: idx.map((i) => bd.el[i]), visible: idx.map((i) => vis[i] === "1") };
  };
  return {
    site: siteId,
    start: iso(a),
    stop: iso(b),
    step_h: step,
    horizon,
    mast_m: mast,
    times: idx.map((i) => iso(t0 + i * HOUR)),
    sun: body(s.sun),
    earth: body(s.earth),
    mask_deg: horizon === "flat" ? null : mast === 10 ? s.mask_deg_h10 : s.mask_deg,
  };
}

export async function snapCompare(siteIds: string[], q: RangeQuery, landAt?: string): Promise<CompareResponse> {
  const { a, b, step } = await range(q);
  let landIso: string | null = null;
  if (landAt) {
    const l = parseDay(landAt);
    if (!(a <= l && l < b)) throw new Error("land_at must be inside start..stop");
    landIso = iso(l);
  }
  const names = new Map((await snapshotSites()).map((s) => [s.id, s.name]));
  const results = [];
  for (const id of siteIds) {
    const e = await snapEphemeris(id, q);
    let i = 0;
    if (landIso) {
      i = e.times.findIndex((t) => t >= landIso!);
      if (i < 0) i = e.times.length - 1;
    }
    const m = summarize(e.times, e.sun.el, e.sun.visible, e.earth.visible, step, i);
    results.push({ site: id, name: names.get(id) ?? id, horizon: e.horizon, mast_m: e.mast_m, ...m });
  }
  return { start: iso(a), stop: iso(b), step_h: step, land_at: landIso, results };
}
