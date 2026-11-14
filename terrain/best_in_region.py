"""Find the best landing point inside an official candidate-region outline.

Regions are polygons from Quickmap (terrain/regions.json). We put a grid of
points inside the polygon (in map x/y, so the grid is even on the ground), drop
points on slopes over --max-slope, and rank the rest by average horizon height
(lower = more open sky for the low polar Sun).

Usage: python terrain/best_in_region.py haworth [--step-km 1]
"""
import argparse, json, pathlib, sys
import numpy as np
from matplotlib.path import Path as Poly

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from horizon_mask import DemWindow, horizon_mask, LONLAT_MOON  # noqa: E402
from suggest_sites import slope_deg  # noqa: E402
from build_masks import DEFAULT_DEM, load_sites  # noqa: E402
from pyproj import Transformer  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("region")
    ap.add_argument("--dem", default=str(DEFAULT_DEM))
    ap.add_argument("--step-km", type=float, default=1.0)
    ap.add_argument("--max-slope", type=float, default=8.0)
    ap.add_argument("--top", type=int, default=3)
    a = ap.parse_args()
    verts = json.loads((HERE / "regions.json").read_text())[a.region]
    lats = [v[0] for v in verts]; lons = [v[1] for v in verts]
    clat, clon = float(np.mean(lats)), float(np.mean(lons))
    win = DemWindow(a.dem, clat, clon, 60_000)
    xy = np.array([win.to_xy.transform(lo, la) for la, lo in verts])
    poly = Poly(xy)
    to_ll = Transformer.from_crs(win.crs, LONLAT_MOON, always_xy=True)
    step = a.step_km * 1000
    xs = np.arange(xy[:, 0].min(), xy[:, 0].max(), step)
    ys = np.arange(xy[:, 1].min(), xy[:, 1].max(), step)
    cands = []
    for x in xs:
        for y in ys:
            if not poly.contains_point((x, y)):
                continue
            sl = slope_deg(win, x, y)
            if not np.isfinite(sl) or sl > a.max_slope:
                continue
            lon, lat = to_ll.transform(x, y)
            m = np.array(horizon_mask(a.dem, lat, lon % 360, n_az=72, max_km=80))
            cands.append((m.mean(), sl, lat, lon % 360))
    cands.sort()
    out = {"region": a.region, "points_tried": len(cands), "best": []}
    site = next((s for s in load_sites()[0] if s["id"] == a.region), None)
    if site:
        sx, sy = win.to_xy.transform(site["lon_e"], site["lat"])
        out["current_point_inside_region"] = bool(poly.contains_point((sx, sy)))
    for mean, sl, lat, lon in cands[: a.top]:
        full = np.array(horizon_mask(a.dem, lat, lon))
        out["best"].append({"lat": round(lat, 4), "lon_e": round(lon, 4), "mean_mask": round(full.mean(), 2),
                            "max_mask": round(full.max(), 2), "slope": round(sl, 1)})
    print(json.dumps(out))


if __name__ == "__main__":
    main()
