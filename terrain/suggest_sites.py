"""Suggest a better landing point near a site: the nearby spot with the lowest
horizon (most sky open to the low polar Sun), on gentle ground.

Plain version: we try a grid of points around the site, throw away any on
slopes steeper than --max-slope degrees (a lander can't sit there), compute a
quick horizon mask for each, and rank them by the average horizon height.
Lower average horizon = the Sun clears the terrain more often.

Usage: python terrain/suggest_sites.py haworth --radius-km 20 --step-km 1
"""
import argparse, json, pathlib, sys
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from horizon_mask import DemWindow, horizon_mask, GEOD_MOON, LONLAT_MOON  # noqa: E402
from build_masks import load_sites, DEFAULT_DEM  # noqa: E402
from pyproj import Transformer  # noqa: E402


def slope_deg(win, x, y):
    """Ground slope over +-1 pixel (160 m baseline) at map x/y."""
    d = win.res_m
    zx = (win.sample(np.array([x + d]), np.array([y])) - win.sample(np.array([x - d]), np.array([y]))) / (2 * d)
    zy = (win.sample(np.array([x]), np.array([y + d])) - win.sample(np.array([x]), np.array([y - d]))) / (2 * d)
    return float(np.degrees(np.arctan(np.hypot(zx, zy)))[0])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("site")
    ap.add_argument("--dem", default=str(DEFAULT_DEM))
    ap.add_argument("--radius-km", type=float, default=5)
    ap.add_argument("--step-km", type=float, default=0.4)
    ap.add_argument("--max-slope", type=float, default=8.0)
    ap.add_argument("--top", type=int, default=3)
    a = ap.parse_args()
    s = next(x for x in load_sites()[0] if x["id"] == a.site)
    win = DemWindow(a.dem, s["lat"], s["lon_e"], a.radius_km * 1000 + 500)
    to_ll = Transformer.from_crs(win.crs, LONLAT_MOON, always_xy=True)
    x0, y0 = win.site_xy
    r = a.radius_km * 1000
    offs = np.arange(-r, r + 1, a.step_km * 1000)
    cands = []
    for dx in offs:
        for dy in offs:
            if dx * dx + dy * dy > r * r:
                continue
            x, y = x0 + dx, y0 + dy
            sl = slope_deg(win, x, y)
            if not np.isfinite(sl) or sl > a.max_slope:
                continue
            lon, lat = to_ll.transform(x, y)
            m = np.array(horizon_mask(a.dem, lat, lon % 360, n_az=72, max_km=80))
            cands.append((m.mean(), m.max(), sl, lat, lon % 360))
    cands.sort()
    orig = np.array(horizon_mask(a.dem, s["lat"], s["lon_e"]))
    out = {"site": a.site, "original": {"lat": s["lat"], "lon_e": s["lon_e"], "mean_mask": round(orig.mean(), 2),
           "max_mask": round(orig.max(), 2), "slope": round(slope_deg(win, x0, y0), 1)}, "suggestions": []}
    for mean, mx, sl, lat, lon in cands[: a.top]:
        full = np.array(horizon_mask(a.dem, lat, lon))
        _, _, dist = GEOD_MOON.inv(s["lon_e"], s["lat"], lon, lat)
        out["suggestions"].append({"lat": round(lat, 4), "lon_e": round(lon, 4), "moved_km": round(dist / 1000, 1),
                                   "mean_mask": round(full.mean(), 2), "max_mask": round(full.max(), 2),
                                   "slope": round(sl, 1)})
    print(json.dumps(out))


if __name__ == "__main__":
    main()
