import type { SiteMetrics, Window } from "./types";

export const COLORS = {
  sun: "#f59e0b",
  earth: "#2563eb",
  both: "#10b981",
  terrain: "#a07d5a",
  off: "#eef0f5",
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
  { key: "longest_dark_h", label: "Longest night", better: "low", fmt: hours },
  { key: "pct_earth", label: "% Earth", better: "high", fmt: (v) => `${v}%` },
  { key: "longest_blackout_h", label: "Longest blackout", better: "low", fmt: hours },
  { key: "pct_both", label: "% Sun + Earth", better: "high", fmt: (v) => `${v}%` },
  { key: "max_sun_el_deg", label: "Peak Sun", better: "high", fmt: (v) => `${v}°` },
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-12-15T05:00:00Z" -> "Dec 15, 05:00 UTC", or "Dec 15, 2026 · 05:00 UTC" with the year. */
export function fmtUtc(iso: string, withYear = false): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return withYear ? `${day}, ${d.getUTCFullYear()} · ${hh}:${mm} UTC` : `${day}, ${hh}:${mm} UTC`;
}

/** First window (in time order) where Sun AND Earth stay up for at least `min` hours. */
export function firstWindow(windows: Window[], min: number): Window | null {
  return windows.find((w) => w.hours >= min) ?? null;
}
