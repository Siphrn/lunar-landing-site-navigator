"""Draw a picture to check a mask by eye: the terrain map around the site with
north marked, next to the mask as a polar plot (north up, clockwise, like a compass).

Usage: python terrain/plot_mask.py shackleton_ridge [--out terrain/img/shackleton_ridge.png]
"""
import argparse, json, pathlib, sys
import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from horizon_mask import DemWindow, GEOD_MOON  # noqa: E402
from build_masks import load_sites, DEFAULT_DEM, OUT_DIR  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("site")
    ap.add_argument("--dem", default=str(DEFAULT_DEM))
    ap.add_argument("--radius-km", type=float, default=60)
    ap.add_argument("--out")
    a = ap.parse_args()
    site = next(s for s in load_sites()[0] if s["id"] == a.site)
    mask = json.loads((OUT_DIR / f"{a.site}.json").read_text())["mask_deg"]
    w = DemWindow(a.dem, site["lat"], site["lon_e"], a.radius_km * 1000)
    x0, y0 = w.site_xy
    H, W = w.z.shape
    left, top = w.transform * (0, 0)
    right, bottom = w.transform * (W, H)

    fig = plt.figure(figsize=(13, 6))
    ax = fig.add_subplot(1, 2, 1)
    gy, gx = np.gradient(w.z, w.res_m)
    shade = np.clip(0.5 + (gx - gy) * 2, 0, 1)  # cheap hillshade so craters pop out
    ax.imshow(shade, cmap="gray", extent=[left / 1e3, right / 1e3, bottom / 1e3, top / 1e3])
    ax.imshow(w.z, cmap="terrain", alpha=0.35, extent=[left / 1e3, right / 1e3, bottom / 1e3, top / 1e3])
    ax.plot(x0 / 1e3, y0 / 1e3, "r*", ms=14)
    # Arrows for local north (az 0) and for the direction of the highest horizon.
    peak = int(np.argmax(mask)) * 360 / len(mask)
    for az, col, lab in [(0, "cyan", "local north (az 0)"), (90, "yellow", "east (az 90)"),
                         (peak, "red", f"highest horizon (az {peak:.0f})")]:
        lon, lat, _ = GEOD_MOON.fwd(site["lon_e"], site["lat"], az, a.radius_km * 600)
        x, y = w.to_xy.transform(lon, lat)
        ax.annotate("", (x / 1e3, y / 1e3), (x0 / 1e3, y0 / 1e3), arrowprops=dict(color=col, width=2))
        ax.text(x / 1e3, y / 1e3, lab, color=col, fontsize=9, weight="bold")
    ax.set_title(f"{site['name']} ({site['lat']}, {site['lon_e']}E): map x/y in km, pole = (0,0)")
    ax.set_xlabel("x (km)"); ax.set_ylabel("y (km)")

    pa = fig.add_subplot(1, 2, 2, projection="polar")
    th = np.radians(np.arange(len(mask)) * 360 / len(mask))
    pa.set_theta_zero_location("N"); pa.set_theta_direction(-1)
    pa.plot(np.append(th, th[0]), np.append(mask, mask[0]), "r-")
    pa.fill_between(np.append(th, th[0]), min(-1, min(mask)), np.append(mask, mask[0]), color="r", alpha=0.2)
    pa.set_title("Horizon mask (deg above level), north up, clockwise")
    out = pathlib.Path(a.out or HERE / "img" / f"{a.site}.png")
    out.parent.mkdir(exist_ok=True)
    fig.tight_layout(); fig.savefig(out, dpi=90)
    print("wrote", out)


if __name__ == "__main__":
    main()
