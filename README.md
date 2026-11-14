# Lunar Landing Site Navigator — One-Day Build Plan

_Build plan, Nov 14, 2026_

## The challenge

Build one screen that answers a planner's question in seconds: *at this south-pole site, on these dates, when do we have sunlight for power and Earth in view for radio?* Today that means juggling Quickmap, Moon Trek and JPL Horizons. The challenge says those tools are built for detailed analysis and are hard for non-specialists to use for quick comparisons ([challenge details](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=details)).

**Why it matters:** launch delays and hardware problems often force teams to switch landing dates or sites. Engineers then need to compare alternatives quickly. At the south pole, a small move in place or date can change power and communication windows a lot.

**Users the statement names:** mission planners, educators and the public. Build for the planner and add one plain-language "why" panel for everyone else.

**What the statement suggests (all optional):**

- Curated sites (Apollo, CLPS targets, other countries' sites) **plus** custom coordinates
- Side-by-side comparison of sites and dates
- Sun and Earth position against the horizon, with **time left until sunset or Earthset**
- Solar elevation angle shown prominently, sunlight duration, Earth visibility windows
- Timeline or animation across a lunar day; 2D or 3D views
- Use real LOLA topography for the horizon; there is no atmospheric refraction on the Moon
- Optional extra accuracy: libration and orbital variation

**Difficulty:** Intermediate / Advanced. **Subjects:** Human Exploration, Moon, Software, Space Exploration.

## Core concepts (the 5 ideas the whole app rests on)

1. **Azimuth and elevation.** From a point on the surface, any body in the sky has an azimuth (compass direction, 0–360°) and an elevation (angle above the flat local horizontal). Horizons gives you both for the Sun and Earth.
2. **Horizon mask.** The real horizon isn't flat: crater rims and massifs block the sky. For each azimuth you compute the highest terrain angle seen from the site, giving a curve `mask(az)`. A body counts as **visible** when `elevation > mask(azimuth)`. With no atmosphere there's no refraction to correct for, so the comparison is purely geometric.
3. **The Sun barely rises at the pole.** At the south pole the Sun sits only a few degrees above the horizon and circles all the way around it. A rim or peak can block it for hours or days, which is why location matters so much.
4. **Earth hardly moves.** From the Moon, Earth stays in nearly the same patch of sky, wobbling a few degrees because of libration. At the pole that patch sits right on the horizon, so some sites see Earth for half the month and others almost never. That difference is the core of the comms story.
5. **Metrics planners want:**
   - % of time sunlit, and the longest dark gap (sets battery size)
   - Solar elevation over time (sets panel tilt; low sun means vertical arrays)
   - % of time Earth is visible, and the longest comms blackout
   - Time until the next sunset or Earthset from a chosen landing time
   - Overlap windows: Sun **and** Earth both visible (the best time to land)

A single number per site, like "62% sunlit, longest night 4.1 days, Earth visible 48%", is what makes comparisons quick.

## Data sources

You need only two datasets, plus a short site list you put together by hand.

| Source | What you get | How to use it | Watch out for |
| --- | --- | --- | --- |
| [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Sun (`COMMAND='10'`) and Earth (`COMMAND='399'`) azimuth/elevation from a surface site, at any time step | `EPHEM_TYPE='OBSERVER'`, `CENTER='coord@301'` (301 = Moon), `COORD_TYPE='GEODETIC'`, `SITE_COORD='E-lon,lat,alt_km'`, `STEP_SIZE='1 h'`, `CSV_FORMAT='YES'`, `format=json` | Commas in `SITE_COORD` must be URL-encoded as `%2C`. Up to 10,000 times per request via `TLIST`, and the API states no rate limits. Check the az/el quantity code in the Horizons manual (usually `QUANTITIES='4'`) |
| [LOLA south-pole DEMs (NASA PGDA)](https://pgda.gsfc.nasa.gov/products/90) | Elevation GeoTIFFs covering 80–90°S at 20, 40, 80 m/px and coarser, in polar stereographic | Read a window around each site with `rasterio` and ray-cast the horizon mask | The 20 m/px file is 2.6 GB. Start with 80 m/px or coarser and crop to \~100–150 km around your sites |
| [LOLA 5 m/px site DEMs](https://pgda.gsfc.nasa.gov/products/78) | High-accuracy tiles around priority sites, including Site 01 "Connecting ridge" | Stretch goal: a zoomed "high-res" mode | Small coverage areas |
| [Quickmap](https://quickmap.lroc.asu.edu) / [Moon Trek](https://trek.nasa.gov/moon) | Visual check and site coordinates | Pull lat/lon for each site; take screenshots for the README | For manual use, not an API |

**Curated site list (fill in coordinates from Quickmap):** the nine NASA candidate south-pole regions (Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain), Shackleton rim / connecting ridge, plus 1–2 Apollo sites as near-equator controls. The controls make the polar weirdness obvious.

**Horizon math (curved Moon, R = 1,737.4 km).** For terrain at distance d and height h\_t, seen from a site at height h\_s:

```math
\theta = \arctan\left( \frac{h_t - h_s - d^2/(2R)}{d} \right)
```

The mask at each azimuth is the largest θ along that ray. Use 360 or 720 rays, with samples every 1–2 pixels out to \~100–150 km.

## Architecture

```text
  JPL Horizons API                      LOLA south-pole DEM
  (Sun + Earth positions in the sky)    (GeoTIFF terrain elevation)
          |                                      |
          v                                      v
  1. horizons.py                        2. horizon_mask.py
     fetch az/el per site,                 ray-cast the terrain horizon
     cache to cache/*.json                 once per site, save masks/*.json
          |                                      |
          +------------------+-------------------+
                             |
                             v
                  3. metrics.py
                     visible = elevation > mask(azimuth)
                     % sunlit, longest night, % Earth visible, overlaps
                             |
                             v
                  FastAPI  (GET /sites, /ephemeris, /compare)
                             |
                             v
                  React + Plotly UI
                  (sky plot, timeline strip, metric cards, compare mode)
```

Two data feeds go in: JPL Horizons gives where the Sun and Earth are in the sky, and the LOLA elevation map gives the shape of the terrain around each site. Three processing steps turn those into answers: fetch and cache the sky positions, compute each site's horizon mask once, then compare the two to produce visibility and metrics. One UI shows the results.

Terrain masks are computed once per site and saved, so the live app only does cheap work: look up cached ephemerides, compare elevation with the mask, and return metrics. Solo with little time? Merge FastAPI and React into one Streamlit app; the boxes stay the same.

## Features: MVP first, then stretch

Ship the MVP by mid-afternoon. Each stretch feature is independent, so stop whenever time runs out.

| Tier | Feature | Why judges/recruiters care | Effort |
| --- | --- | --- | --- |
| MVP | Site picker (curated list + custom lat/lon) and date range | Directly answers the brief | 1 h |
| MVP | Sky-dome / polar plot: Sun and Earth tracks over the horizon mask | The signature visual | 2 h |
| MVP | Timeline strip: sunlit / Earth-visible / both, hour by hour | Shows the windows at a glance | 1 h |
| MVP | Metric cards: % sunlit, longest night, % Earth-visible, longest blackout, time to next sunset/Earthset | Rapid comparison, the core ask | 1 h |
| MVP | Compare mode: 2–4 sites side by side | Shows the "small move, big change" effect | 1 h |
| Stretch | Real terrain horizon from LOLA (if MVP used a flat horizon) | Accuracy; the strongest technical talking point | 2–3 h |
| Stretch | Map view: south-pole hillshade with clickable sites (Leaflet or deck.gl) | Spatial intuition | 1–2 h |
| Stretch | "Best landing window" finder: first N hours with both Sun and Earth up for at least X days | Turns the data into a decision | 1 h |
| Stretch | Animation scrubber across a lunar day | Engaging demo | 1 h |
| Stretch | Mast-height slider (panel at 0 m vs 10 m) | Shows why towers matter at the pole | 1 h |
| Stretch | "Explain it" panel for students | Covers the educator/public audience | 30 min |

Cut order if behind: map view → animation → mast slider. Never cut compare mode; it is the brief.

## Schedule and checklist (about 12 working hours)

Order matters: get real numbers flowing end-to-end before polishing anything. A working ugly app at hour 5 beats a pretty half-app at hour 11.

**Hour 0–1: setup**

- [ ] Create repo, `backend/` (FastAPI) and `frontend/` (Vite + React + TypeScript), or one Streamlit app if solo
- [ ] Write `sites.json` with name, lat, E-lon, short note for 8–12 sites (coordinates from Quickmap)
- [ ] Register the Space Apps team and project page

**Hour 1–3: ephemeris pipeline**

- [ ] `horizons.py`: fetch Sun + Earth az/el for one site, 1 h step, 30 days; parse the CSV block out of `result`
- [ ] Cache responses to disk (`cache/{site}_{body}_{start}_{stop}.json`) so the demo never depends on the network
- [ ] Sanity check: at a near-equator Apollo site the Sun should rise to high elevation; at the pole it should stay low

**Hour 3–5: visibility + metrics**

- [ ] Flat-horizon version first: `visible = elevation > 0`
- [ ] `metrics.py`: % sunlit, longest dark gap, % Earth-visible, longest blackout, next sunset/Earthset from time t, overlap windows
- [ ] API: `GET /sites`, `GET /ephemeris?site=&start=&stop=`, `GET /compare?sites=a,b,c&start=&stop=`

**Hour 5–8: frontend MVP**

- [ ] Site multi-select + date range picker
- [ ] Polar sky plot (Plotly `scatterpolar`: radius = 90 − elevation, angle = azimuth), with the horizon mask as a filled band
- [ ] Timeline strip (three rows: Sun, Earth, both)
- [ ] Metric cards + comparison table, best value per column highlighted

**Hour 8–10: terrain horizon (the differentiator)**

- [ ] Download a coarse south-pole LDEM, crop with `rasterio`, convert site lat/lon to polar-stereo x/y
- [ ] Ray-cast 360 azimuths, with curvature correction; save `masks/{site}.json`
- [ ] Swap `elevation > 0` for `elevation > mask(azimuth)`; show both numbers to show how much terrain matters

**Hour 10–12: ship it**

- [ ] Deploy (frontend on Vercel/Netlify, backend on Render/Railway, or Streamlit Community Cloud)
- [ ] README with screenshot/GIF, architecture, data sources, limitations
- [ ] 30–60 s demo video; submit on the Space Apps project page

## Code starter

Three small modules cover the whole backend. This is untested starter code, so run the sanity checks in the schedule before you build on it.

**1. Fetch Sun/Earth az/el from Horizons**

```python
# horizons.py
import json, pathlib, requests

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
CACHE = pathlib.Path("cache"); CACHE.mkdir(exist_ok=True)
BODIES = {"sun": "10", "earth": "399"}

def azel(site, body, start, stop, step="1 h"):
    """site = {'id','lat','lon_e'}; returns [(iso_time, az_deg, el_deg), ...]"""
    key = CACHE / f"{site['id']}_{body}_{start}_{stop}_{step.replace(' ', '')}.json"
    if key.exists():
        return json.loads(key.read_text())
    params = {
        "format": "json",
        "COMMAND": f"'{BODIES[body]}'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",          # surface site on the Moon
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{site['lon_e']},{site['lat']},0'",  # requests encodes the commas
        "START_TIME": f"'{start}'",
        "STOP_TIME": f"'{stop}'",
        "STEP_SIZE": f"'{step}'",
        "QUANTITIES": "'4'",              # apparent azimuth & elevation: confirm in the manual
        "ANG_FORMAT": "'DEG'",
        "CSV_FORMAT": "'YES'",
    }
    r = requests.get(API, params=params, timeout=60)
    r.raise_for_status()
    text = r.json()["result"]
    block = text.split("$$SOE")[1].split("$$EOE")[0]
    rows = []
    for line in block.strip().splitlines():
        f = [x.strip() for x in line.split(",")]
        nums = []
        for x in f[1:]:
            try: nums.append(float(x))
            except ValueError: pass       # skip the blank/flag columns
        rows.append((f[0], nums[0], nums[1]))
    key.write_text(json.dumps(rows))
    return rows
```

**2. Terrain horizon mask from a LOLA GeoTIFF**

```python
# horizon_mask.py
import numpy as np, rasterio
from pyproj import Transformer

R = 1_737_400.0  # lunar radius, m

def horizon_mask(dem_path, lat, lon_e, n_az=360, max_km=120, step_px=1.5):
    with rasterio.open(dem_path) as ds:
        to_xy = Transformer.from_crs("+proj=longlat +R=1737400 +no_defs", ds.crs, always_xy=True)
        x0, y0 = to_xy.transform(lon_e, lat)
        z = ds.read(1).astype(np.float32)    # crop the file first; full-res is GBs
        inv = ~ds.transform
        px = abs(ds.transform.a)
        col0, row0 = inv * (x0, y0)
        h_site = z[int(row0), int(col0)]
        dists = np.arange(step_px * px, max_km * 1000, step_px * px)
        mask = np.zeros(n_az)
        for i, az in enumerate(np.linspace(0, 360, n_az, endpoint=False)):
            # NOTE: in polar stereo, grid 'north' != local north. Rotate by the
            # site's longitude so az=0 points to the local north (toward the equator at the S pole).
            a = np.radians(az)
            dx, dy = np.sin(a), np.cos(a)
            th = np.radians(lon_e)
            gx = dx * np.cos(th) + dy * np.sin(th)
            gy = -dx * np.sin(th) + dy * np.cos(th)
            cols, rows = inv * (x0 + gx * dists, y0 + gy * dists)
            ok = (rows >= 0) & (rows < z.shape[0]) & (cols >= 0) & (cols < z.shape[1])
            h = z[rows[ok].astype(int), cols[ok].astype(int)]
            d = dists[ok]
            ang = np.degrees(np.arctan((h - h_site - d**2 / (2 * R)) / d))
            mask[i] = ang.max() if ang.size else 0.0   # can be negative on peaks: they see past 0°
    return mask.tolist()   # elevation of the terrain horizon at each azimuth
```

Check the rotation sign against Quickmap. Pick a site where a big rim sits in a known direction and confirm the mask peaks there. This is the most likely bug in the project.

**3. Visibility and metrics**

```python
# metrics.py
import numpy as np

def visible(azel_rows, mask=None):
    az = np.array([r[1] for r in azel_rows]); el = np.array([r[2] for r in azel_rows])
    if mask is None:
        return el > 0
    m = np.interp(az % 360, np.linspace(0, 360, len(mask), endpoint=False), mask, period=360)
    return el > m

def longest_run(flags, value):
    best = cur = 0
    for f in flags:
        cur = cur + 1 if f == value else 0
        best = max(best, cur)
    return best

def summarize(sun_vis, earth_vis, step_h=1):
    both = sun_vis & earth_vis
    return {
        "pct_sunlit": round(100 * sun_vis.mean(), 1),
        "longest_dark_h": longest_run(sun_vis, False) * step_h,
        "pct_earth": round(100 * earth_vis.mean(), 1),
        "longest_blackout_h": longest_run(earth_vis, False) * step_h,
        "pct_both": round(100 * both.mean(), 1),
    }
```

## Risks and fallbacks

| Risk | Sign you're hitting it | Fallback |
| --- | --- | --- |
| Horizons syntax for a lunar surface site is off | Error text in `result`, or the output header doesn't show a Moon-centered site | Try in the [Horizons web app](https://ssd.jpl.nasa.gov/horizons/app.html) first, then copy the exact settings. As a last resort, use Moon-center geometry and convert to local az/el yourself |
| DEM too big to handle | Out-of-memory error, or downloads that take forever | Use the coarsest south-pole LDEM, crop with a `rasterio` window, precompute masks offline and commit them as JSON |
| Wrong azimuth rotation in polar stereo | Mask peaks don't match the rims you see in Quickmap | Test one site against Quickmap; flip the rotation sign |
| Running out of time | It's hour 8 and terrain isn't done | Ship the flat horizon, label it clearly, and list terrain as "next step" in the README |
| Network flaky during judging | Demo hangs on an API call | Cache everything; ship a `demo_cache/` so the deployed app never calls Horizons live |
| Overclaiming accuracy | Judges ask "how accurate is this?" | Have a limitations line ready: hourly sampling, DEM resolution, single surface point (no mast height), no libration modelling beyond Horizons |

## Demo, submission and resume

**60-second demo script**

1. (0–10 s) The problem: "A launch slips two weeks. Is our landing site still viable?"
2. (10–30 s) Pick Haworth vs Malapert vs Nobile Rim 1 and a date range. The sky plots and timelines appear.
3. (30–45 s) Toggle flat vs terrain horizon and watch the % sunlit change. This shows why topography matters.
4. (45–60 s) Shift the dates by two weeks and the comparison table re-ranks. End on the metrics cards.

**Submission checklist**

- [ ] Live URL + GitHub repo (public, MIT licence)
- [ ] README: problem, screenshot/GIF, how it works (data flow), data sources with links, limitations, how to run locally
- [ ] Demo video (under 2 minutes) linked on the project page
- [ ] Credit NASA/JPL Horizons and LOLA/PGDA data in the app footer

**Resume bullets (edit numbers to match what you actually build)**

- Built a full-stack mission-planning web app (FastAPI, React, Plotly) for NASA Space Apps 2026. It compares lunar south-pole landing sites by solar power and direct-to-Earth comms windows.
- Integrated JPL Horizons ephemerides with LOLA laser-altimetry elevation models. Computed terrain-aware horizon masks by ray-casting with lunar-curvature correction, across N sites and M-day windows.
- Designed caching and precomputation that cut response time to under X ms and made the deployed demo independent of upstream APIs.

**Interview talking points:** why the polar Sun is so low; how you validated the horizon mask; the accuracy and speed trade-off of DEM resolution.

## Sources

- [Lunar Landing Site Navigator: challenge details](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=details) and [resources](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=resources)
- [Space Apps 2026 participant FAQ (dates)](https://www.spaceappschallenge.org/resources/participant-faqs/)
- [JPL Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [NASA PGDA: A New View of the Lunar South Pole from LOLA (south-pole DEMs)](https://pgda.gsfc.nasa.gov/products/90)
- [NASA PGDA: High-Resolution LOLA Topography for South Pole Sites (5 m/px)](https://pgda.gsfc.nasa.gov/products/78)
- [NASA PGDA: South Pole LOLA 5 m/px DEM Mosaic](https://pgda.gsfc.nasa.gov/products/81)
- [NASA: Update on candidate south-pole landing regions](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/)
