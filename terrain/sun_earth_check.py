"""Sanity-check the masks against real Sun/Earth positions (A's Horizons cache).

For each polar site, over the cached ~2 months at 1 h steps, print % of hours
the Sun and Earth are above a flat horizon vs above the terrain mask, for
ground level and for a 10 m mast. Expectations from the literature:
the Shackleton connecting ridge is one of the best-lit places at the pole;
Malapert and other near-side massifs see Earth most of the time.

Run from the repo root:  python terrain/sun_earth_check.py
"""
import json, pathlib
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / "backend" / "data" / "cache"
MASKS = ROOT / "backend" / "data" / "masks"


def load(site, body):
    f = sorted(CACHE.glob(f"{site}_{body}_*.json"))
    rows = json.loads(f[-1].read_text())
    return np.array([r[1] for r in rows]), np.array([r[2] for r in rows])


def above(az, el, mask):
    m = np.array(mask)
    grid = np.arange(len(m)) * 360 / len(m)
    return el > np.interp(az % 360, grid, m, period=360)


def main():
    sites = json.loads((ROOT / "backend" / "data" / "sites.json").read_text())
    print(f"{'site':28s} {'sun flat':>8s} {'terrain':>8s} {'10m':>6s} | {'earth flat':>10s} {'terrain':>8s} {'10m':>6s} | sun max el")
    for s in sites:
        if s["group"] == "control":
            continue
        saz, sel = load(s["id"], "sun")
        eaz, eel = load(s["id"], "earth")
        m0 = json.loads((MASKS / f"{s['id']}.json").read_text())["mask_deg"]
        m10 = json.loads((MASKS / f"{s['id']}_h10.json").read_text())["mask_deg"]
        pct = lambda v: f"{100 * v.mean():5.1f}%"
        print(f"{s['id']:28s} {pct(sel > 0):>8s} {pct(above(saz, sel, m0)):>8s} {pct(above(saz, sel, m10)):>6s} | "
              f"{pct(eel > 0):>10s} {pct(above(eaz, eel, m0)):>8s} {pct(above(eaz, eel, m10)):>6s} | {sel.max():.2f}")


if __name__ == "__main__":
    main()
