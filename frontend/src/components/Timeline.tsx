import Plot from "../Plot";
import { COLORS } from "../format";
import type { EphemerisResponse } from "../types";

interface Props {
  eph: EphemerisResponse;
  landAt: string | null;
  /** Scrubber time (ISO), drawn as a solid line. */
  cursor: string | null;
  /** Clicking a cell moves the scrubber there. */
  onPick?: (iso: string) => void;
}

/** Three rows (Sun, Earth, both), one cell per time step, coloured when visible. */
export default function Timeline({ eph, landAt, cursor, onPick }: Props) {
  const both = eph.sun.visible.map((v, i) => v && eph.earth.visible[i]);
  // z codes: 0 off, 1 sun, 2 earth, 3 both. Rows are drawn bottom-up, so list "Both" first.
  const z = [
    both.map((v) => (v ? 3 : 0)),
    eph.earth.visible.map((v) => (v ? 2 : 0)),
    eph.sun.visible.map((v) => (v ? 1 : 0)),
  ];
  const step = (c: string, a: number, b: number): [number, string][] => [
    [a, c],
    [b, c],
  ];
  const colorscale: [number, string][] = [
    ...step(COLORS.off, 0, 0.25),
    ...step(COLORS.sun, 0.25, 0.5),
    ...step(COLORS.earth, 0.5, 0.75),
    ...step(COLORS.both, 0.75, 1),
  ];
  return (
    <Plot
      data={[
        {
          type: "heatmap",
          x: eph.times,
          y: ["Both", "Earth", "Sun"],
          z,
          zmin: 0,
          zmax: 3,
          colorscale,
          showscale: false,
          xgap: 0,
          ygap: 3,
          hovertemplate: "%{x}<br>%{y}: %{customdata}<extra></extra>",
          customdata: z.map((row) => row.map((v) => (v ? "visible" : "not visible"))),
        },
      ]}
      layout={{
        height: 140,
        margin: { t: 6, l: 46, r: 8, b: 40 },
        xaxis: { type: "date", tickfont: { size: 10 }, fixedrange: true },
        yaxis: { tickfont: { size: 11 }, fixedrange: true },
        shapes: [
          ...(landAt
            ? [
                {
                  type: "line" as const,
                  x0: landAt,
                  x1: landAt,
                  yref: "paper" as const,
                  y0: 0,
                  y1: 1,
                  line: { color: "#111827", width: 2, dash: "dot" as const },
                },
              ]
            : []),
          ...(cursor
            ? [
                {
                  type: "line" as const,
                  x0: cursor,
                  x1: cursor,
                  yref: "paper" as const,
                  y0: -0.05,
                  y1: 1.05,
                  line: { color: "#dc2626", width: 2 },
                },
              ]
            : []),
        ],
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
      }}
      onClick={(e) => {
        const x = e.points[0]?.x;
        if (onPick && typeof x === "string")
          onPick(new Date(x.replace(" ", "T") + (x.endsWith("Z") ? "" : "Z")).toISOString().replace(".000Z", "Z"));
      }}
      useResizeHandler
      style={{ width: "100%", cursor: onPick ? "pointer" : undefined }}
      config={{ displayModeBar: false, responsive: true }}
    />
  );
}
