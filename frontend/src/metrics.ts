// TypeScript port of backend/metrics.py, used only by the offline snapshot.
// Keep in step with metrics.py: the snapshot test (scripts/check_snapshot.mjs) compares both.
import type { IsoTime, SiteMetrics, Window } from "./types";

/**
 * Python's round(x, n): rounds the exact binary value, and breaks exact ties to even.
 * toFixed also rounds the exact value but breaks ties away from zero, so only ties need fixing.
 */
export function pyRound(x: number, n: number): number {
  const ax = Math.abs(x);
  const exact = ax.toFixed(Math.min(100, n + 60)); // doubles of this size expand exactly within 60 places
  const dot = exact.indexOf(".");
  const tail = exact.slice(dot + 1 + n);
  let out = Number(ax.toFixed(n));
  if (/^50*$/.test(tail)) {
    const truncated = Number(exact.slice(0, n ? dot + 1 + n : dot));
    const lastDigit = Number(exact[n ? dot + n : dot - 1]);
    if (lastDigit % 2 === 0) out = truncated;
  }
  return x < 0 ? -out : out;
}

export function longestRun(flags: boolean[], value: boolean): number {
  let best = 0;
  let cur = 0;
  for (const f of flags) {
    cur = f === value ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
}

export function nextSetH(vis: boolean[], start: number, stepH: number): number | null {
  if (start < 0 || start >= vis.length || !vis[start]) return null;
  for (let i = start; i < vis.length; i++) if (!vis[i]) return (i - start) * stepH;
  return -1;
}

export function bothWindows(times: IsoTime[], sun: boolean[], earth: boolean[], stepH: number): Window[] {
  const out: Window[] = [];
  let i = 0;
  while (i < times.length) {
    if (sun[i] && earth[i]) {
      let j = i;
      while (j + 1 < times.length && sun[j + 1] && earth[j + 1]) j++;
      out.push({ start: times[i], stop: times[j], hours: (j - i + 1) * stepH });
      i = j + 1;
    } else i++;
  }
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const frac = (xs: boolean[]) => xs.filter(Boolean).length / xs.length;

export function summarize(
  times: IsoTime[],
  sunEl: number[],
  sunVis: boolean[],
  earthVis: boolean[],
  stepH: number,
  startIndex: number,
): Omit<SiteMetrics, "site" | "name" | "horizon"> {
  const both = sunVis.map((v, i) => v && earthVis[i]);
  const lit = sunEl.filter((_, i) => sunVis[i]);
  return {
    pct_sunlit: pyRound(100 * frac(sunVis), 1),
    longest_dark_h: longestRun(sunVis, false) * stepH,
    pct_earth: pyRound(100 * frac(earthVis), 1),
    longest_blackout_h: longestRun(earthVis, false) * stepH,
    pct_both: pyRound(100 * frac(both), 1),
    max_sun_el_deg: pyRound(Math.max(...sunEl), 2),
    mean_sun_el_deg: lit.length ? pyRound(mean(lit), 2) : null,
    next_sunset_h: nextSetH(sunVis, startIndex, stepH),
    next_earthset_h: nextSetH(earthVis, startIndex, stepH),
    both_windows: bothWindows(times, sunVis, earthVis, stepH),
  };
}
