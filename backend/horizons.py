"""Sun and Earth azimuth/elevation at a lunar surface site, from JPL Horizons.

Settings that work (checked by hand against the API, Sat Nov 14):
    COMMAND     '10' (Sun) or '399' (Earth)
    CENTER      'coord@301'           observer on the Moon's surface
    COORD_TYPE  'GEODETIC'
    SITE_COORD  'lon_e,lat,0'         east longitude first, degrees, altitude km
    EPHEM_TYPE  'OBSERVER'
    QUANTITIES  '4'                   apparent azimuth and elevation
    ANG_FORMAT  'DEG'                 decimal degrees
    CSV_FORMAT  'YES'
The header then reads "Center geodetic : <lon_e>, <lat>, 0 {E-lon(deg),Lat(deg),Alt(km)}"
and "Center pole/equ : MEAN_ME". Azimuth is clockwise from local north.
Each CSV row looks like: " 2026-Dec-01 00:00, ,i, 268.648674,   -13.422195,"

Horizons reports errors inside `result` with HTTP 200, so the code checks for $$SOE.

Every response is cached in data/cache/ (committed), and any cached window that
covers a request is sliced, so the demo never calls Horizons live.
"""
import json
import pathlib
from datetime import datetime, timedelta, timezone

import requests

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
CACHE = pathlib.Path(__file__).resolve().parent / "data" / "cache"
BODIES = {"sun": "10", "earth": "399"}
ISO = "%Y-%m-%dT%H:%M:%SZ"


class HorizonsError(RuntimeError):
    pass


def parse_day(s):
    """'2026-12-01' or '2026-12-01T12:00:00Z' -> aware UTC datetime. Raises ValueError."""
    s = s.strip().replace("Z", "")
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    raise ValueError(f"bad date {s!r}: use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ")


def _hz_time(t):
    """Horizons row time ('2026-Dec-01 00:00' with optional seconds) -> ISO UTC string."""
    t = t.strip()
    for fmt in ("%Y-%b-%d %H:%M", "%Y-%b-%d %H:%M:%S", "%Y-%b-%d %H:%M:%S.%f"):
        try:
            return datetime.strptime(t, fmt).strftime(ISO)
        except ValueError:
            pass
    raise HorizonsError(f"unexpected Horizons time {t!r}")


def parse_result(text):
    """Horizons `result` text -> [(iso_time, az_deg, el_deg), ...]."""
    if "$$SOE" not in text or "$$EOE" not in text:
        raise HorizonsError("Horizons returned no ephemeris: " + text.strip()[-400:])
    block = text.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    rows = []
    for line in block.strip().splitlines():
        f = [x.strip() for x in line.split(",")]
        nums = []
        for x in f[1:]:
            try:
                nums.append(float(x))
            except ValueError:
                pass  # blank or flag columns
        if len(nums) < 2:
            raise HorizonsError(f"could not parse Horizons row {line!r}")
        rows.append((_hz_time(f[0]), nums[-2], nums[-1]))
    return rows


def fetch(site, body, start, stop, step_h=1):
    """Call Horizons (no cache). start/stop are datetimes."""
    params = {
        "format": "json",
        "COMMAND": f"'{BODIES[body]}'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{site['lon_e']},{site['lat']},0'",
        "START_TIME": f"'{start:%Y-%m-%d %H:%M}'",
        "STOP_TIME": f"'{stop:%Y-%m-%d %H:%M}'",
        "STEP_SIZE": f"'{step_h} h'",
        "QUANTITIES": "'4'",
        "ANG_FORMAT": "'DEG'",
        "CSV_FORMAT": "'YES'",
    }
    try:
        r = requests.get(API, params=params, timeout=60)
        r.raise_for_status()
        data = r.json()
    except (requests.RequestException, ValueError) as e:
        raise HorizonsError(f"Horizons request failed for {site['id']}/{body}: {e}") from e
    if "result" not in data:
        raise HorizonsError(f"Horizons error: {data.get('error', data)}")
    return parse_result(data["result"])


def _cache_path(site_id, body, start, stop, step_h):
    return CACHE / f"{site_id}_{body}_{start:%Y%m%dT%H}_{stop:%Y%m%dT%H}_{step_h}h.json"


def _from_cache(site_id, body, start, stop, step_h):
    for p in sorted(CACHE.glob(f"{site_id}_{body}_*_{step_h}h.json")):
        a, b = p.stem[len(site_id) + len(body) + 2:].split("_")[:2]
        lo = datetime.strptime(a, "%Y%m%dT%H").replace(tzinfo=timezone.utc)
        hi = datetime.strptime(b, "%Y%m%dT%H").replace(tzinfo=timezone.utc)
        if lo <= start and stop <= hi:
            s, e = start.strftime(ISO), stop.strftime(ISO)
            return [tuple(r) for r in json.loads(p.read_text()) if s <= r[0] <= e]
    return None


def azel(site, body, start, stop, step_h=1, offline=False):
    """site = {'id','lat','lon_e'}; body 'sun'|'earth'; start/stop datetimes or date strings.
    Returns [(iso_time, az_deg, el_deg), ...] from start to stop inclusive."""
    if body not in BODIES:
        raise ValueError(f"unknown body {body!r}")
    if isinstance(start, str):
        start = parse_day(start)
    if isinstance(stop, str):
        stop = parse_day(stop)
    if stop <= start:
        raise ValueError("stop must be after start")
    hit = _from_cache(site["id"], body, start, stop, step_h)
    if hit is not None:
        return hit
    if offline:
        raise HorizonsError(f"no cached ephemeris for {site['id']}/{body} {start:%Y-%m-%d}..{stop:%Y-%m-%d}")
    rows = fetch(site, body, start, stop, step_h)
    CACHE.mkdir(parents=True, exist_ok=True)
    _cache_path(site["id"], body, start, stop, step_h).write_text(json.dumps(rows))
    return rows


# Demo window: Dec 2026 plus two weeks either side.
DEMO_START = datetime(2026, 11, 17, tzinfo=timezone.utc)
DEMO_STOP = datetime(2027, 1, 14, tzinfo=timezone.utc)


def fill_cache(sites, start=DEMO_START, stop=DEMO_STOP, step_h=1):
    for site in sites:
        for body in BODIES:
            rows = azel(site, body, start, stop, step_h)
            print(f"{site['id']:30s} {body:5s} {len(rows)} rows")


if __name__ == "__main__":
    sites = json.loads((pathlib.Path(__file__).resolve().parent / "data" / "sites.json").read_text())
    fill_cache(sites)
