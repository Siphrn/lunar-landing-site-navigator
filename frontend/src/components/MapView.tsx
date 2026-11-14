import { useEffect, useMemo, useState } from "react";
import type { Annotation, Data } from "plotly.js";
import Plot from "../Plot";
import { polarXY, type Basemap } from "../geo";
import type { Site } from "../types";

interface Props {
  sites: Site[];
  selected: string[];
  onToggle: (id: string) => void;
  full: boolean; // already at the max number of sites
}

const HALF_KM = 240; // map half-width around the pole
const BASE = import.meta.env.BASE_URL;

/** Optional shaded-relief backdrop made by scripts/make_basemap.py. Missing file = drawn map only. */
function useBasemap(): Basemap | null {
  const [bm, setBm] = useState<Basemap | null>(null);
  useEffect(() => {
    fetch(`${BASE}basemap/south_pole.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Basemap | null) => setBm(j && typeof j.x_min_m === "number" ? j : null))
      .catch(() => setBm(null)); // dev server may answer with index.html: not JSON
  }, []);
  return bm;
}

function graticule(): { data: Data[]; notes: Partial<Annotation>[] } {
  const data: Data[] = [];
  const notes: Partial<Annotation>[] = [];
  const line = { color: "rgba(30,41,59,0.35)", width: 1 };
  for (const lat of [-82, -84, -86, -88]) {
    const pts = Array.from({ length: 181 }, (_, i) => polarXY(lat, i * 2));
    data.push({
      type: "scatter",
      mode: "lines",
      x: pts.map((p) => p.x),
      y: pts.map((p) => p.y),
      line,
      hoverinfo: "skip",
      showlegend: false,
    });
    const lab = polarXY(lat, 165); // a side of the map with no sites
    notes.push({
      x: lab.x,
      y: lab.y,
      text: `${-lat}°S`,
      showarrow: false,
      font: { size: 10, color: "#334155" },
      bgcolor: "rgba(255,255,255,0.7)",
    });
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const a = polarXY(-89.6, lon),
      b = polarXY(-80.5, lon);
    data.push({
      type: "scatter",
      mode: "lines",
      x: [a.x, b.x],
      y: [a.y, b.y],
      line,
      hoverinfo: "skip",
      showlegend: false,
    });
    const lab = polarXY(-82.55, lon);
    notes.push({
      x: lab.x,
      y: lab.y,
      text: `${lon}°E`,
      showarrow: false,
      font: { size: 10, color: "#334155" },
      bgcolor: "rgba(255,255,255,0.7)",
    });
  }
  return { data, notes };
}

type Pos = "top center" | "bottom center" | "middle left" | "middle right";

/** Put each label on the side away from its nearest neighbour, so clustered sites stay readable. */
function placeLabels<T extends { x: number; y: number }>(pts: T[]): (T & { pos: Pos; crowded: boolean })[] {
  return pts.map((p) => {
    let best: T | null = null;
    let bestD = 40_000; // only care about neighbours closer than 40 km
    for (const q of pts) {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (q !== p && d < bestD) [best, bestD] = [q, d];
    }
    if (!best) return { ...p, pos: "top center" as Pos, crowded: false };
    const dx = p.x - best.x;
    const dy = p.y - best.y;
    const pos: Pos =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "middle right" : "middle left") : dy > 0 ? "top center" : "bottom center";
    // Two or more neighbours this close: too crowded to label everything.
    const crowded = pts.filter((q) => q !== p && Math.hypot(p.x - q.x, p.y - q.y) < 40_000).length >= 2;
    return { ...p, pos, crowded };
  });
}

export default function MapView({ sites, selected, onToggle, full }: Props) {
  const basemap = useBasemap();
  const grid = useMemo(graticule, []);
  const polar = sites.filter((s) => s.group !== "control");

  const marker = (on: boolean) => ({
    size: on ? 15 : 11,
    color: on ? "#1d4ed8" : "#ffffff",
    line: { color: on ? "#ffffff" : "#1e293b", width: 2 },
  });
  const pts = placeLabels(polar.map((s) => ({ s, ...polarXY(s.lat, s.lon_e) }))).map((p) => ({
    ...p,
    on: selected.includes(p.s.id),
  }));

  const data: Data[] = [
    ...grid.data,
    ...[false, true].map(
      (on): Data => ({
        type: "scatter",
        mode: "text+markers",
        x: pts.filter((p) => p.on === on).map((p) => p.x),
        y: pts.filter((p) => p.on === on).map((p) => p.y),
        // In a crowded cluster only selected sites get a label; the rest show it on hover (or zoom in).
        text: pts.filter((p) => p.on === on).map((p) => (p.crowded && !on ? "" : p.s.name)),
        customdata: pts.filter((p) => p.on === on).map((p) => p.s.id),
        textposition: pts.filter((p) => p.on === on).map((p) => p.pos),
        textfont: { size: 10.5, color: on ? "#1e3a8a" : "#0f172a" },
        marker: { ...marker(on), symbol: "circle" },
        hovertext: pts
          .filter((p) => p.on === on)
          .map(
            (p) =>
              `<b>${p.s.name}</b><br>${p.s.lat.toFixed(2)}°, ${p.s.lon_e.toFixed(2)}°E<br>${on ? "click to remove" : full ? "4 sites already picked" : "click to compare"}`,
          ),
        hovertemplate: "%{hovertext}<extra></extra>",
        showlegend: false,
        cliponaxis: false,
      }),
    ),
  ];

  const h = HALF_KM * 1000;
  return (
    <div className="panel map">
      <div className="map-head">
        <b>Map of the south pole</b>
        <span className="muted small">
          Click a site to add or remove it. 0°E (the Earth-facing side) is at the top.
        </span>
      </div>
      <Plot
        data={data}
        layout={{
          xaxis: { range: [-h, h], visible: false, fixedrange: false },
          yaxis: {
            range: [-h, h],
            visible: false,
            scaleanchor: "x",
            scaleratio: 1,
          },
          annotations: [
            ...grid.notes,
            {
              x: 0,
              y: 0,
              text: "Pole",
              showarrow: true,
              arrowhead: 0,
              ax: 22,
              ay: 18,
              font: { size: 10 },
            },
          ],
          images: basemap
            ? [
                {
                  source: `${BASE}basemap/${basemap.image}`,
                  xref: "x",
                  yref: "y",
                  x: basemap.x_min_m,
                  y: basemap.y_max_m,
                  sizex: basemap.x_max_m - basemap.x_min_m,
                  sizey: basemap.y_max_m - basemap.y_min_m,
                  sizing: "stretch",
                  layer: "below",
                },
              ]
            : [],
          plot_bgcolor: basemap ? "#ffffff" : "#eef1f5",
          paper_bgcolor: "rgba(0,0,0,0)",
          margin: { t: 4, l: 4, r: 4, b: 4 },
          dragmode: "pan",
          hovermode: "closest",
          autosize: true,
        }}
        onClick={(e) => {
          const id = e.points[0]?.customdata;
          if (typeof id === "string") onToggle(id);
        }}
        useResizeHandler
        style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: 560 }}
        config={{ displayModeBar: false, scrollZoom: true, responsive: true }}
      />
      <p className="muted small map-foot">
        {basemap
          ? `Shaded relief: ${basemap.credit ?? "LOLA south-pole DEM, NASA PGDA"}. `
          : "Shaded relief not built yet (see frontend/README). "}
        Scroll to zoom, drag to pan. Control sites near the equator are not shown.
      </p>
    </div>
  );
}
