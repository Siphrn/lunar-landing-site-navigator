"""Lunar Landing Site Navigator API (README contracts 3, 4, 5).

Run:  uvicorn app:app --reload    (from backend/), then open http://localhost:8000/docs
"""
import json
import pathlib
from datetime import timedelta

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import horizons
import metrics

DATA = pathlib.Path(__file__).resolve().parent / "data"
SITES = json.loads((DATA / "sites.json").read_text())
SITES_BY_ID = {s["id"]: s for s in SITES}
MASKS = DATA / "masks"
MAX_DAYS = 120

app = FastAPI(title="Lunar Landing Site Navigator")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


def _site(site_id):
    s = SITES_BY_ID.get(site_id)
    if s is None:
        raise HTTPException(400, f"unknown site {site_id!r}; see GET /sites")
    return s


def _range(start, stop, step_h):
    try:
        a, b = horizons.parse_day(start), horizons.parse_day(stop)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if b <= a:
        raise HTTPException(400, "stop must be after start")
    if b - a > timedelta(days=MAX_DAYS):
        raise HTTPException(400, f"range longer than {MAX_DAYS} days")
    if step_h < 1 or step_h > 24:
        raise HTTPException(400, "step_h must be 1 to 24")
    return a, b


def _load_mask(path):
    if not path.exists():
        return None
    m = json.loads(path.read_text())
    mask = m.get("mask_deg") or []
    if not mask or len(mask) != m.get("n_az", len(mask)):
        return None
    return mask


def _mask(site_id, horizon, mast_m=0):
    """(mask_deg or None, horizon used, mast_m used).
    Terrain falls back to flat if there is no mask file; a mast mask falls back to the 0 m mask."""
    if horizon == "flat":
        return None, "flat", 0
    if mast_m:
        mask = _load_mask(MASKS / f"{site_id}_h{mast_m}.json")
        if mask is not None:
            return mask, "terrain", mast_m
    mask = _load_mask(MASKS / f"{site_id}.json")
    if mask is None:
        return None, "flat", 0
    return mask, "terrain", 0


def _track(site, a, b, step_h):
    """Hourly cache rows from a (inclusive) to b (exclusive), every step_h hours."""
    try:
        sun = horizons.azel(site, "sun", a, b)
        earth = horizons.azel(site, "earth", a, b)
    except horizons.HorizonsError as e:
        raise HTTPException(502, str(e))
    stop_iso = b.strftime(horizons.ISO)
    sun = [r for r in sun if r[0] < stop_iso][::step_h]
    earth = [r for r in earth if r[0] < stop_iso][::step_h]
    if [r[0] for r in sun] != [r[0] for r in earth]:
        raise HTTPException(502, "Sun and Earth ephemerides do not line up")
    return sun, earth


def _ephemeris(site, a, b, step_h, horizon, mast_m=0):
    mask, used, mast_used = _mask(site["id"], horizon, mast_m)
    sun, earth = _track(site, a, b, step_h)
    times = [r[0] for r in sun]

    def body(rows):
        az = [r[1] for r in rows]
        el = [r[2] for r in rows]
        return {"az": az, "el": el, "visible": metrics.visible(az, el, mask).tolist()}

    return {
        "site": site["id"],
        "start": a.strftime(horizons.ISO),
        "stop": b.strftime(horizons.ISO),
        "step_h": step_h,
        "horizon": used,
        "mast_m": mast_used,
        "times": times,
        "sun": body(sun),
        "earth": body(earth),
        "mask_deg": mask,
    }


@app.get("/sites")
def get_sites():
    return SITES


@app.get("/ephemeris")
def get_ephemeris(
    site: str,
    start: str,
    stop: str,
    step_h: int = 1,
    horizon: str = Query("flat", pattern="^(flat|terrain)$"),
    mast_m: int = Query(0, ge=0, le=100),
):
    s = _site(site)
    a, b = _range(start, stop, step_h)
    return _ephemeris(s, a, b, step_h, horizon, mast_m)


@app.get("/compare")
def get_compare(
    sites: str,
    start: str,
    stop: str,
    step_h: int = 1,
    horizon: str = Query("flat", pattern="^(flat|terrain)$"),
    land_at: str | None = None,
    mast_m: int = Query(0, ge=0, le=100),
):
    ids = [x.strip() for x in sites.split(",") if x.strip()]
    if not ids:
        raise HTTPException(400, "sites is empty")
    chosen = [_site(i) for i in ids]
    a, b = _range(start, stop, step_h)
    land_iso = None
    if land_at:
        try:
            land = horizons.parse_day(land_at)
        except ValueError as e:
            raise HTTPException(400, str(e))
        if not (a <= land < b):
            raise HTTPException(400, "land_at must be inside start..stop")
        land_iso = land.strftime(horizons.ISO)

    results = []
    for s in chosen:
        e = _ephemeris(s, a, b, step_h, horizon, mast_m)
        times = e["times"]
        idx = 0
        if land_iso:
            idx = next((i for i, t in enumerate(times) if t >= land_iso), len(times) - 1)
        m = metrics.summarize(times, e["sun"]["el"], e["sun"]["visible"], e["earth"]["visible"], step_h, idx)
        results.append({"site": s["id"], "name": s["name"], "horizon": e["horizon"], "mast_m": e["mast_m"], **m})

    return {
        "start": a.strftime(horizons.ISO),
        "stop": b.strftime(horizons.ISO),
        "step_h": step_h,
        "land_at": land_iso,
        "results": results,
    }
