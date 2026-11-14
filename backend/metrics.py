"""Visibility and site metrics (README contract 5).

Times are UTC ISO-8601 strings with Z; angles in degrees; azimuth clockwise from north.
"""
import numpy as np


def visible(az, el, mask=None):
    """True where the body is above the horizon. mask = terrain mask_deg (n_az values) or None for flat."""
    az = np.asarray(az, dtype=float)
    el = np.asarray(el, dtype=float)
    if mask is None:
        return el > 0
    grid = np.linspace(0, 360, len(mask), endpoint=False)
    m = np.interp(az % 360, grid, mask, period=360)
    return el > m


def longest_run(flags, value):
    best = cur = 0
    for f in flags:
        cur = cur + 1 if bool(f) == value else 0
        best = max(best, cur)
    return best


def next_set_h(vis, start_index, step_h=1):
    """Hours from start_index until the body sets. None if not visible then, -1 if it never sets in range."""
    vis = np.asarray(vis, dtype=bool)
    if start_index < 0 or start_index >= len(vis) or not vis[start_index]:
        return None
    rest = np.flatnonzero(~vis[start_index:])
    if rest.size == 0:
        return -1
    return int(rest[0]) * step_h


def both_windows(times, sun_vis, earth_vis, step_h=1):
    """Every stretch where Sun and Earth are both visible: [{start, stop, hours}]. stop is the last visible sample."""
    both = np.asarray(sun_vis, dtype=bool) & np.asarray(earth_vis, dtype=bool)
    out, i, n = [], 0, len(both)
    while i < n:
        if both[i]:
            j = i
            while j + 1 < n and both[j + 1]:
                j += 1
            out.append({"start": times[i], "stop": times[j], "hours": (j - i + 1) * step_h})
            i = j + 1
        else:
            i += 1
    return out


def summarize(times, sun_el, sun_vis, earth_vis, step_h=1, start_index=0):
    sun_vis = np.asarray(sun_vis, dtype=bool)
    earth_vis = np.asarray(earth_vis, dtype=bool)
    sun_el = np.asarray(sun_el, dtype=float)
    both = sun_vis & earth_vis
    lit = sun_el[sun_vis]
    return {
        "pct_sunlit": round(100 * float(sun_vis.mean()), 1),
        "longest_dark_h": longest_run(sun_vis, False) * step_h,
        "pct_earth": round(100 * float(earth_vis.mean()), 1),
        "longest_blackout_h": longest_run(earth_vis, False) * step_h,
        "pct_both": round(100 * float(both.mean()), 1),
        "max_sun_el_deg": round(float(sun_el.max()), 2) if sun_el.size else None,
        "mean_sun_el_deg": round(float(lit.mean()), 2) if lit.size else None,
        "next_sunset_h": next_set_h(sun_vis, start_index, step_h),
        "next_earthset_h": next_set_h(earth_vis, start_index, step_h),
        "both_windows": both_windows(times, sun_vis, earth_vis, step_h),
    }
