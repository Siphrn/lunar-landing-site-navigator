# Terrain horizon masks (Lane C)

For each south-pole site, `build_masks.py` writes `backend/data/masks/{site_id}.json`
(contract 2 in the main README): 360 numbers, the height in degrees of the real
terrain horizon in each compass direction (0 = north, 90 = east, clockwise).
The Sun or Earth is visible when `elevation > mask_deg[azimuth]`.

## Run it

```bash
pip install -r terrain/requirements.txt
# one-time: download the 80 m/px south-pole elevation map (181 MB) into terrain/dem/
#   https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF
python terrain/build_masks.py            # all non-control sites, ~1 s per site
python terrain/build_masks.py --mast 10  # also writes {site}_h10.json (10 m mast)
python terrain/plot_mask.py haworth      # picture: map + mask, to eyeball a site
python terrain/tests/test_synthetic.py   # fake-Moon tests (no download needed)
python terrain/tests/test_crosscheck.py  # real DEM, two independent methods agree
```

Sites come from `backend/data/sites.json` (Person A). If that file is missing,
the script uses `terrain/sites_fallback.json`, a copy of A's list from PR #6.
Whenever A changes coordinates, rerun the script and commit the new masks.

## The data

`LDEM_80S_80MPP_ADJ.TIF` from [NASA PGDA product 90](https://pgda.gsfc.nasa.gov/products/90)
(Barker et al. 2021, LOLA). What `rasterio` reports about it:

- 7600 × 7600 pixels, 80 m each, covering the Moon south of about 80°S
- Projection: south polar stereographic on a 1737.4 km sphere
  (`+proj=stere +lat_0=-90 +lon_0=0 +R=1737400`), x/y in metres, pole at (0, 0)
- Heights in **metres** above the 1737.4 km sphere (the file history shows km × 1000),
  float32, range about −7.3 km to +7.0 km, no-data stored as NaN

A polar stereographic map is the view of the pole from straight above: x and y
are flat-map metres from the pole. "Up" on this map is not north. At the south
pole, every direction away from the pole is north.

## How the mask is computed (`horizon_mask.py`)

1. Cut out a ±152 km square of the map around the site (never load the whole file).
2. For each of 360 azimuths, walk outward along the surface every 80 m from 160 m
   to 150 km. The sample points are computed in lat/lon with `pyproj.Geod` (a
   great-circle "go N metres in direction az"), then turned into map x/y with
   `pyproj`. Because the library does the direction maths, there is no hand-written
   rotation whose sign could be wrong.
3. Read the terrain height at each point, blending the 4 nearest pixels.
4. Turn each point into an angle above the site's level, allowing for the Moon's
   curvature (R = 1,737,400 m). Far terrain sinks below you because the surface
   curves away: at 100 km that drop is about 2.9 km. We use the exact formula;
   for short distances it equals the README's `atan((h_t − h_s − d²/2R)/d)`.
5. The mask for that azimuth is the largest angle along the ray. On a peak it can
   be negative: you see past the flat horizon.

Choices worth knowing for questions:

- **150 km range.** The curvature drop at 150 km is about 6.5 km, as tall as the
  biggest polar mountains, so terrain further out almost never matters.
- **Skipping the first 160 m.** At 80 m per pixel, the pixel you stand on and its
  neighbour mostly describe the local slope, not the horizon. A lander sits on
  levelled ground, so the ray starts 2 pixels out.
- **80 m/px.** Good for horizons tens of km away (most of what blocks the Sun at
  the pole). Small nearby hills and boulders are smoothed out. The 20 m/px file
  (2.6 GB) would sharpen the near field; the code takes it unchanged via `--dem`.

See `validate.md` for how we checked the directions.
