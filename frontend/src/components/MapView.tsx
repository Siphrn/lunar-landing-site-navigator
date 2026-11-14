import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Annotation, Data } from "plotly.js";
import Plot from "../Plot";
import { THEME } from "../theme";
import { polarXY, type Basemap } from "../geo";
import type { Site } from "../types";

interface Props {
  sites: Site[];
  selected: string[];
  onToggle: (id: string) => void;
  full: boolean; // already at the max number of sites
}

const HALF_KM = 240; // map half-width around the pole
const H = HALF_KM * 1000;
const MIN_SPAN = 30_000; // deepest zoom: 30 km across

/** What the map shows: a square window, centre (cx, cy) and width `span`, all in metres. */
interface View {
  cx: number;
  cy: number;
  span: number;
}
const FULL: View = { cx: 0, cy: 0, span: 2 * H };

/** Keep the window inside the map: never wider than the map, never past an edge. */
function clampView(v: View): View {
  const span = Math.min(2 * H, Math.max(MIN_SPAN, v.span));
  const lim = H - span / 2;
  return { span, cx: Math.min(lim, Math.max(-lim, v.cx)), cy: Math.min(lim, Math.max(-lim, v.cy)) };
}

/** Plot-area geometry from Plotly, to turn pixels into metres. */
function plotArea(gd: HTMLElement | null) {
  const fl = (
    gd as unknown as {
      _fullLayout?: { xaxis: { _offset: number; _length: number }; yaxis: { _offset: number; _length: number } };
    }
  )?._fullLayout;
  if (!fl) return null;
  return { x0: fl.xaxis._offset, w: fl.xaxis._length, y0: fl.yaxis._offset, h: fl.yaxis._length };
}
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
  const line = { color: "rgba(15,23,42,0.18)", width: 1 };
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
      font: { size: 10, color: THEME.muted },
      bgcolor: "rgba(255,255,255,0.8)",
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
      font: { size: 10, color: THEME.muted },
      bgcolor: "rgba(255,255,255,0.8)",
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
  const [view, setView] = useState<View>(FULL);
  const viewRef = useRef(view);
  viewRef.current = view;
  const wrap = useRef<HTMLDivElement>(null);
  const justPanned = useRef(0);
  const zoomed = view.span < 2 * H - 1;

  /** Zoom by `factor` (<1 = in) keeping the map point under (px, py) still; no point = zoom about the centre. */
  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const v = viewRef.current;
    const span = Math.min(2 * H, Math.max(MIN_SPAN, v.span * factor));
    let { cx, cy } = v;
    const gd = wrap.current?.querySelector<HTMLElement>(".js-plotly-plot") ?? null;
    const a = plotArea(gd);
    if (a && px !== undefined && py !== undefined) {
      const box = gd!.getBoundingClientRect();
      const fx = (px - box.left - a.x0) / a.w - 0.5; // -0.5 .. 0.5 across the plot
      const fy = 0.5 - (py - box.top - a.y0) / a.h;
      const ax = v.cx + fx * v.span;
      const ay = v.cy + fy * v.span;
      cx = ax - fx * span;
      cy = ay - fy * span;
    }
    setView(clampView({ cx, cy, span }));
  }, []);

  // Wheel / trackpad-pinch zoom and drag / touch pan, all clamped to the map.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; v: View; dist: number } | null = null;
    let panning = false;
    let lastTap = { t: 0, x: 0, y: 0 };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // zoom the map, not the page
      zoomAt(Math.exp(e.deltaY * (e.ctrlKey ? 0.012 : 0.0015)), e.clientX, e.clientY);
    };
    const begin = () => {
      const pts = [...pointers.values()];
      const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
      start = { x: mx, y: my, v: viewRef.current, dist };
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if ((e.target as HTMLElement).closest(".map-zoom")) return; // the zoom buttons are plain buttons
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      panning = pointers.size > 1;
      begin();
      // Follow the gesture on the window: Plotly puts its own overlay over the page while a button is held.
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId) || !start) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.values()];
      const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      if (!panning && Math.hypot(mx - start.x, my - start.y) < 4) return; // still a click
      panning = true;
      const a = plotArea(el.querySelector<HTMLElement>(".js-plotly-plot"));
      if (!a) return;
      let span = start.v.span;
      if (pts.length > 1 && start.dist > 0) {
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        span = start.v.span * (start.dist / Math.max(1, dist));
      }
      const mpp = start.v.span / a.w; // metres per pixel at the start of the gesture
      setView(clampView({ cx: start.v.cx - (mx - start.x) * mpp, cy: start.v.cy + (my - start.y) * mpp, span }));
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (panning) justPanned.current = Date.now();
      else if (!pointers.size) {
        // Plotly swallows the browser's dblclick, so spot a double-click / double-tap ourselves.
        const now = Date.now();
        if (now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 20) {
          setView(FULL);
          lastTap = { t: 0, x: 0, y: 0 };
        } else lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      if (pointers.size) begin();
      else {
        start = null;
        panning = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [zoomAt]);
  const grid = useMemo(graticule, []);
  const polar = sites.filter((s) => s.group !== "control");

  const marker = (on: boolean) => ({
    size: on ? 15 : 11,
    color: on ? THEME.accent : "#ffffff",
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
        textfont: { size: 10.5, color: on ? "#1e3a8a" : "#0f172a", family: THEME.font },
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

  const half = view.span / 2;
  return (
    <div className="panel map">
      <div className="panel-head">
        <h3>South-pole map</h3>
        <span className="sub">Tap a site to add or remove it · Earth-facing side at top</span>
      </div>
      <div
        ref={wrap}
        className={`map-stage${zoomed ? " zoomed" : ""}`}
        aria-label="South-pole map. Use the zoom buttons, or scroll and drag."
      >
        <div className="map-zoom" role="group" aria-label="Map zoom">
          <button type="button" onClick={() => zoomAt(0.6)} disabled={view.span <= MIN_SPAN} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoomAt(1 / 0.6)} disabled={!zoomed} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={() => setView(FULL)} disabled={!zoomed} aria-label="Show the whole map">
            ⤢
          </button>
        </div>
        <Plot
          data={data}
          layout={{
            // The window comes from `view` (clamped above); Plotly's own zoom/pan is off so it can't leave the map.
            xaxis: {
              range: [view.cx - half, view.cx + half],
              visible: false,
              fixedrange: true,
              constrain: "domain",
            },
            yaxis: {
              range: [view.cy - half, view.cy + half],
              visible: false,
              fixedrange: true,
              scaleanchor: "x",
              scaleratio: 1,
              constrain: "domain",
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
                font: { size: 10, color: THEME.muted },
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
                    opacity: 0.6, // soften the relief so site labels stay readable
                  },
                ]
              : [],
            plot_bgcolor: "#eef1f6",
            paper_bgcolor: "rgba(0,0,0,0)",
            margin: { t: 4, l: 4, r: 4, b: 4 },
            dragmode: false,
            hovermode: "closest",
            autosize: true,
          }}
          onClick={(e) => {
            if (Date.now() - justPanned.current < 250) return; // the end of a drag is not a click
            const id = e.points[0]?.customdata;
            if (typeof id === "string") onToggle(id);
          }}
          useResizeHandler
          style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: 560 }}
          config={{ displayModeBar: false, scrollZoom: false, doubleClick: false, responsive: true }}
        />
      </div>
      <p className="muted small map-foot">
        {basemap ? "Relief: LOLA, NASA PGDA · " : ""}Scroll or pinch to zoom · drag to pan · double-click to reset
      </p>
    </div>
  );
}
