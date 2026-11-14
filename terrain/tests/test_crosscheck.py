"""Cross-check the real masks against a second, independent method.

Method 2 does everything by hand in map x/y (no pyproj.Geod): in south polar
stereographic, x = rho*sin(lon), y = rho*cos(lon), so at a site
  local north (away from the pole) = ( sin(lon),  cos(lon))
  local east                       = ( cos(lon), -sin(lon))
and a ray at azimuth az points along cos(az)*north + sin(az)*east.
If both methods agree, and the mirrored (wrong-sign) version does not, the
azimuth rotation is right. Needs the real DEM in terrain/dem/.

Run:  python terrain/tests/test_crosscheck.py
"""
import json, pathlib, sys
import numpy as np

HERE = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from horizon_mask import DemWindow, horizon_mask, R_MOON  # noqa: E402
from build_masks import load_sites, DEFAULT_DEM  # noqa: E402


def mask_by_hand(dem, lat, lon_e, sign=+1, max_km=150, n_az=360):
    w = DemWindow(dem, lat, lon_e, max_km * 1000 + 2000)
    x0, y0 = w.site_xy
    lam = np.radians(lon_e)
    north = np.array([np.sin(lam), np.cos(lam)])
    east = sign * np.array([np.cos(lam), -np.sin(lam)])
    d = np.arange(2 * w.res_m, max_km * 1000 + 1, w.res_m)
    hs = w.sample(np.array([x0]), np.array([y0]))[0]
    out = []
    for az in np.radians(np.arange(n_az) * 360 / n_az):
        v = np.cos(az) * north + np.sin(az) * east
        h = w.sample(x0 + v[0] * d, y0 + v[1] * d)
        ang = np.degrees(np.arctan((h - hs - d ** 2 / (2 * R_MOON)) / d))   # README formula
        out.append(np.nanmax(ang))
    return np.array(out)


def main():
    sites = [s for s in load_sites()[0] if s.get("group") != "control"]
    fails = 0
    for s in sites:
        m1 = np.array(horizon_mask(DEFAULT_DEM, s["lat"], s["lon_e"]))
        m2 = mask_by_hand(DEFAULT_DEM, s["lat"], s["lon_e"], +1)
        m3 = mask_by_hand(DEFAULT_DEM, s["lat"], s["lon_e"], -1)
        diff = np.abs(m1 - m2)
        good = np.corrcoef(m1, m2)[0, 1]
        mirrored = np.corrcoef(m1, m3)[0, 1]
        ok = np.median(diff) < 0.15 and good > 0.97 and good > mirrored
        fails += not ok
        print(f"{'OK  ' if ok else 'FAIL'} {s['id']:20s} median |diff| {np.median(diff):.3f} deg, "
              f"corr {good:.3f} (mirrored/wrong sign: {mirrored:.3f})")
    print("ALL PASSED" if not fails else f"{fails} FAILED")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
