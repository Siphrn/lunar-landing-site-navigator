import type { SiteMetrics, Window } from "./types";

export const COLORS = {
  sun: "#e8930c",
  earth: "#2f6fdb",
  both: "#16a34a",
  terrain: "#8b6b4a",
  off: "#e6e8ec",
};

/** "41 h (1.7 d)" for longer spans, "12 h" for short ones. */
export function hours(h: number): string {
  return h >= 48 ? `${h} h (${(h / 24).toFixed(1)} d)` : `${h} h`;
}

/** Contract 5 semantics: null = not visible then, -1 = never sets in range. */
export function untilSet(h: number | null): string {
  if (h === null) return "not up";
  if (h === -1) return "never sets";
  return hours(h);
}

export type MetricKey = keyof Pick<
  SiteMetrics,
  "pct_sunlit" | "longest_dark_h" | "pct_earth" | "longest_blackout_h" | "pct_both" | "max_sun_el_deg"
>;

export const METRIC_COLUMNS: { key: MetricKey; label: string; better: "high" | "low"; fmt: (v: number) => string }[] = [
  { key: "pct_sunlit", label: "% sunlit", better: "high", fmt: (v) => `${v}%` },
  { key: "longest_dark_h", label: "Longest dark", better: "low", fmt: hours },
  { key: "pct_earth", label: "% Earth in view", better: "high", fmt: (v) => `${v}%` },
  { key: "longest_blackout_h", label: "Longest comms blackout", better: "low", fmt: hours },
  { key: "pct_both", label: "% Sun + Earth", better: "high", fmt: (v) => `${v}%` },
  { key: "max_sun_el_deg", label: "Max Sun elevation", better: "high", fmt: (v) => `${v}°` },
];

/** Best value per column across the rows (only meaningful with 2+ rows). */
export function bestValues(rows: SiteMetrics[]): Partial<Record<MetricKey, number>> {
  const out: Partial<Record<MetricKey, number>> = {};
  if (rows.length < 2) return out;
  for (const c of METRIC_COLUMNS) {
    const vals = rows.map((r) => r[c.key]);
    out[c.key] = c.better === "high" ? Math.max(...vals) : Math.min(...vals);
  }
  return out;
}

export function fmtUtc(iso: string): string {
  return iso.replace("T", " ").replace(/:00Z$/, " UTC").replace(/Z$/, " UTC");
}

/** First window (in time order) where Sun AND Earth stay up for at least `min` hours. */
export function firstWindow(windows: Window[], min: number): Window | null {
  return windows.find((w) => w.hours >= min) ?? null;
}
