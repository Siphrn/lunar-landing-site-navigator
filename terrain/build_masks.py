"""Build one horizon-mask JSON per site (contract 2 in the README).

Usage (from the repo root):
    python terrain/build_masks.py                 # all non-control sites
    python terrain/build_masks.py --sites haworth malapert
    python terrain/build_masks.py --mast 10       # also write {site}_h10.json

Reads sites from backend/data/sites.json (Person A's file). If that file does
not exist yet, falls back to terrain/sites_fallback.json and says so.
The DEM is expected at terrain/dem/LDEM_80S_80MPP_ADJ.TIF (not committed;
download link in terrain/README.md).
"""
import argparse, datetime, json, pathlib, sys, time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from horizon_mask import horizon_mask  # noqa: E402

DEFAULT_DEM = HERE / "dem" / "LDEM_80S_80MPP_ADJ.TIF"
SITES_MAIN = ROOT / "backend" / "data" / "sites.json"
SITES_FALLBACK = HERE / "sites_fallback.json"
OUT_DIR = ROOT / "backend" / "data" / "masks"


def load_sites():
    if SITES_MAIN.exists():
        return json.loads(SITES_MAIN.read_text()), SITES_MAIN
    print(f"NOTE: {SITES_MAIN.relative_to(ROOT)} not found, using {SITES_FALLBACK.relative_to(ROOT)}")
    return json.loads(SITES_FALLBACK.read_text()), SITES_FALLBACK


def sanity(mask):
    lo, hi = min(mask), max(mask)
    problems = []
    if hi > 30:
        problems.append(f"max {hi:.1f} deg is too high (units or pixel-size bug?)")
    if lo < -8:  # a 6 km peak legitimately sees ~5-6 deg below level
        problems.append(f"min {lo:.1f} deg is too low")
    if all(abs(v) < 1e-6 for v in mask):
        problems.append("all zeros (rays left the DEM or hit nodata?)")
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dem", default=str(DEFAULT_DEM))
    ap.add_argument("--sites", nargs="*", help="only these site ids")
    ap.add_argument("--n-az", type=int, default=360)
    ap.add_argument("--max-km", type=float, default=150.0)
    ap.add_argument("--mast", type=float, nargs="*", default=[], help="extra mast heights in m, e.g. 10")
    args = ap.parse_args()

    dem = pathlib.Path(args.dem)
    if not dem.exists():
        sys.exit(f"DEM not found at {dem}. See terrain/README.md for the download link.")
    sites, src = load_sites()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    bad = 0
    for s in sites:
        if s.get("group") == "control":
            continue  # near-equator controls use a flat horizon (no polar DEM there)
        if args.sites and s["id"] not in args.sites:
            continue
        for h in [0.0] + list(args.mast):
            t = time.time()
            d = horizon_mask(dem, s["lat"], s["lon_e"], n_az=args.n_az, max_km=args.max_km,
                             site_height_m=h, return_details=True)
            mask = d["mask_deg"]
            out = {
                "site": s["id"],
                "n_az": args.n_az,
                "az_step_deg": 360.0 / args.n_az,
                "mask_deg": mask,
                "dem": dem.name,
                "dem_res_m": int(round(d["dem_res_m"])),
                "max_km": args.max_km,
                "site_height_m": h,
                "generated_at": now,
            }
            name = s["id"] + (f"_h{int(h)}" if h else "") + ".json"
            (OUT_DIR / name).write_text(json.dumps(out) + "\n")
            cov = min(d["coverage"])
            probs = sanity(mask)
            if cov < 0.99:
                probs.append(f"some rays run off the DEM edge (worst ray {cov:.0%} covered)")
            bad += bool(probs)
            peak = max(range(len(mask)), key=mask.__getitem__)
            print(f"{name:28s} ground {d['site_ground_m']:7.0f} m  mask {min(mask):5.2f}..{max(mask):5.2f} deg "
                  f"(peak az {peak * out['az_step_deg']:.0f}, {d['peak_dist_km'][peak]:.1f} km away)  "
                  f"{time.time() - t:.1f}s  {'; '.join(probs) or 'OK'}")
    print(f"sites from {src.relative_to(ROOT)}; wrote {OUT_DIR.relative_to(ROOT)}/; "
          f"{bad} file(s) with warnings")


if __name__ == "__main__":
    main()
