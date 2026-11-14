import { useMemo } from "react";
import type { Data } from "plotly.js";
import Plot from "../Plot";
import { COLORS } from "../format";
import type { EphemerisResponse } from "../types";

/**
 * Polar track with gaps where azimuth wraps 360 -> 0 (so the line doesn't cut across the dome)
 * and, if `keep` is given, only the points where keep[i] matches `want` (plus one neighbour so segments join).
 */
function track(az: number[], el: number[], keep?: boolean[], want = true) {
  const theta: (number | null)[] = [];
  const r: (number | null)[] = [];
  const on = (i: number) => !keep || keep[i] === want || keep[i - 1] === want;
  let prev = false;
  az.forEach((a, i) => {
    const cur = on(i);
    const wrap = i > 0 && Math.abs(a - az[i - 1]) > 180;
    if ((wrap || (!cur && prev)) && theta.length) {
      theta.push(null);
      r.push(null);
    }
    if (cur) {
      theta.push(a);
      r.push(90 - el[i]);
    }
    prev = cur;
  });
  return { theta, r };
}

interface Props {
  eph: EphemerisResponse;
  /** Index into eph.times to mark with Sun/Earth markers (scrubber time), or -1. */
  markIndex: number;
  /** Zoom on the horizon band (elevation -5°..+20°) instead of the full dome. */
  zoom: boolean;
}

export default function SkyPlot({ eph, markIndex, zoom }: Props) {
  // Everything except the moving markers: rebuilt only when the data or zoom changes,
  // so scrubbing/animating stays cheap.
  const {
    data: base,
    inner,
    outer,
  } = useMemo(() => {
    const lowest = Math.min(...eph.sun.el, ...eph.earth.el, ...(eph.mask_deg ?? [0]));
    const outer = 90 + Math.max(5, Math.ceil(-lowest)); // show a little below the flat horizon
    const inner = zoom ? 70 : 0;

    const data: Data[] = [];

    // Terrain (or flat) horizon as a filled band from the horizon line out to the plot edge.
    const n = eph.mask_deg?.length ?? 360;
    const azs = Array.from({ length: n + 1 }, (_, i) => (i * 360) / n);
    const maskR = azs.map((_, i) => 90 - (eph.mask_deg ? eph.mask_deg[i % n] : 0));
    data.push({
      type: "scatterpolar",
      theta: [...azs, ...azs.slice().reverse()],
      r: [...maskR, ...azs.map(() => outer)],
      fill: "toself",
      fillcolor: "rgba(139,107,74,0.35)",
      line: { color: COLORS.terrain, width: 1.5 },
      mode: "lines",
      name: eph.mask_deg ? "Terrain horizon" : "Flat horizon",
      hoverinfo: "skip",
    });

    for (const [key, label, color] of [
      ["sun", "Sun", COLORS.sun],
      ["earth", "Earth", COLORS.earth],
    ] as const) {
      const b = eph[key];
      // Faint dotted where the body is below the horizon, solid where it is visible.
      const everVisible = b.visible.some(Boolean);
      for (const vis of [false, true]) {
        const t = track(b.az, b.el, b.visible, vis);
        data.push({
          type: "scatterpolar",
          theta: t.theta,
          r: t.r,
          mode: "lines",
          name: vis || !everVisible ? label : `${label} (hidden)`,
          legendgroup: key,
          // A body that is never visible still gets a legend entry (on its hidden trace).
          showlegend: vis ? everVisible : !everVisible,
          opacity: vis ? 1 : 0.35,
          line: { color, width: vis ? 2.5 : 1.5, dash: vis ? "solid" : "dot" },
          connectgaps: false,
          customdata: t.r.map((r) => (r === null ? null : 90 - r)),
          hovertemplate: `${label}${vis ? "" : " (hidden)"}<br>az %{theta:.1f}°<br>el %{customdata:.2f}°<extra></extra>`,
        } as Data);
      }
    }
    return { data, inner, outer };
  }, [eph, zoom]);

  const data: Data[] = [...base];
  if (markIndex >= 0) {
    for (const [key, label, color] of [
      ["sun", "Sun", COLORS.sun],
      ["earth", "Earth", COLORS.earth],
    ] as const) {
      const b = eph[key];
      const up = b.visible[markIndex];
      data.push({
        type: "scatterpolar",
        theta: [b.az[markIndex]],
        r: [90 - b.el[markIndex]],
        mode: "markers",
        marker: {
          color: up ? color : "#ffffff",
          size: 12,
          line: { color, width: 2.5 },
          symbol: key === "sun" ? "circle" : "diamond",
        },
        name: `${label} now`,
        showlegend: false,
        hovertemplate: `${label} ${up ? "visible" : "hidden"}<br>az %{theta:.1f}°<br>el ${b.el[markIndex].toFixed(2)}°<extra></extra>`,
      });
    }
  }

  const ticks = zoom ? [70, 80, 85, 90] : [0, 30, 60, 80, 90];
  return (
    <Plot
      data={data}
      layout={{
        polar: {
          angularaxis: {
            rotation: 90,
            direction: "clockwise",
            tickvals: [0, 45, 90, 135, 180, 225, 270, 315],
            ticktext: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
            gridcolor: "#e3e6eb",
          },
          radialaxis: {
            range: [inner, outer],
            tickvals: ticks,
            ticktext: ticks.map((t) => `${90 - t}°`),
            angle: 90,
            tickangle: 90,
            tickfont: { size: 9, color: "#6b7280" },
            gridcolor: "#e3e6eb",
          },
          bgcolor: "#0f172a08",
        },
        showlegend: true,
        legend: { orientation: "h", y: -0.08, x: 0.5, xanchor: "center", font: { size: 11 } },
        margin: { t: 24, l: 28, r: 28, b: 24 },
        paper_bgcolor: "rgba(0,0,0,0)",
        autosize: true,
      }}
      useResizeHandler
      style={{ width: "100%", height: 340 }}
      config={{ displayModeBar: false, responsive: true }}
    />
  );
}
