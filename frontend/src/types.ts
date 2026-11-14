// Mirrors README "Shared contracts" 1, 3, 4 and 5 field for field.
// Change these only after the whole team agrees AND the README is updated.

/** UTC ISO-8601, e.g. "2026-12-01T00:00:00Z" */
export type IsoTime = string;
export type Horizon = "flat" | "terrain";
export type SiteGroup = "candidate" | "other" | "control";

/** Contract 1 / 3: one entry of GET /sites */
export interface Site {
  id: string;
  name: string;
  lat: number; // degrees, negative in the south
  lon_e: number; // degrees, east-positive, 0–360
  group: SiteGroup;
  note: string;
}

/** Az/el track for one body. All arrays have the same length as `times`. */
export interface BodyTrack {
  az: number[]; // degrees clockwise from local north
  el: number[]; // degrees above the flat horizon
  visible: boolean[];
}

/** Contract 4: GET /ephemeris */
export interface EphemerisResponse {
  site: string;
  start: IsoTime;
  stop: IsoTime;
  step_h: number;
  /** "flat" if terrain was asked for but no mask exists (API fell back). */
  horizon: Horizon;
  /** Mast height actually used (0 for flat, or when no mask exists for the asked height). */
  mast_m: number;
  times: IsoTime[];
  sun: BodyTrack;
  earth: BodyTrack;
  /** n_az entries (terrain horizon elevation per azimuth), or null for flat. */
  mask_deg: number[] | null;
}

export interface Window {
  start: IsoTime;
  stop: IsoTime;
  hours: number;
}

/** One site's row in contract 5 */
export interface SiteMetrics {
  site: string;
  name: string;
  horizon: Horizon;
  mast_m: number;
  pct_sunlit: number;
  longest_dark_h: number;
  pct_earth: number;
  longest_blackout_h: number;
  pct_both: number;
  max_sun_el_deg: number;
  /** Mean over sunlit hours only; null if never sunlit. */
  mean_sun_el_deg: number | null;
  /** Hours from land_at (or start) until set. null = not visible then; -1 = never sets in range. */
  next_sunset_h: number | null;
  next_earthset_h: number | null;
  both_windows: Window[];
}

/** Contract 5: GET /compare */
export interface CompareResponse {
  start: IsoTime;
  stop: IsoTime;
  step_h: number;
  land_at: IsoTime | null;
  results: SiteMetrics[];
}

export interface RangeQuery {
  start: string; // "2026-12-01" or full ISO
  stop: string;
  step_h?: number;
  horizon?: Horizon;
  /** Optional mast height in metres (C ships 0 and 10); only used with the terrain horizon. */
  mast_m?: number;
}
