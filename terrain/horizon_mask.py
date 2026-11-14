"""Terrain horizon mask from a LOLA south-pole elevation map (GeoTIFF).

Plain-language version
----------------------
Stand at a landing site and turn slowly through 360 degrees. In each compass
direction, look along the ground out to ~150 km and find the point that sticks
up highest in your view. The angle of that point above flat level is the
"horizon mask" for that direction. The Sun or Earth is visible only when it is
higher in the sky than the mask in its direction.

How the code does it
--------------------
1. For each azimuth (0 = north, 90 = east, clockwise), walk outward along the
   Moon's surface in steps of about one pixel. We compute these sample points
   in latitude/longitude with `pyproj.Geod` (great-circle "walk N metres in
   direction az"), then convert them to the map's x/y with `pyproj`.
   Doing it this way means we never have to rotate directions by hand: the
   tricky "grid up is not north" problem in polar maps is handled by the
   projection library, not by a hand-written sign.
2. Read the terrain height at every sample point (bilinear interpolation of
   the 4 nearest pixels).
3. Turn each (distance, height) into an elevation angle seen from the site,
   including the curvature of the Moon (R = 1,737,400 m): far-away terrain
   "drops" below your level because the surface curves away.
4. The mask for that azimuth is the biggest angle along the ray.
"""
from __future__ import annotations

import numpy as np
import rasterio
from rasterio.windows import from_bounds
from pyproj import CRS, Geod, Transformer

R_MOON = 1_737_400.0  # m, the reference sphere LOLA heights are measured from
LONLAT_MOON = CRS.from_proj4(f"+proj=longlat +R={R_MOON} +no_defs")
GEOD_MOON = Geod(a=R_MOON, b=R_MOON)


def elevation_angle_deg(dist_m, h_target, h_site):
    """Exact angle above the local horizontal of a point at arc distance dist_m.

    Both heights are metres above the 1737.4 km sphere. For short distances
    this equals the README formula atan((h_t - h_s - d^2/(2R)) / d).
    """
    phi = dist_m / R_MOON                      # angle at the Moon's centre
    rt = R_MOON + h_target
    rs = R_MOON + h_site
    return np.degrees(np.arctan2(rt * np.cos(phi) - rs, rt * np.sin(phi)))


class DemWindow:
    """A cropped piece of the DEM in memory, plus helpers to sample it."""

    def __init__(self, dem_path, lat, lon_e, radius_m):
        with rasterio.open(dem_path) as ds:
            self.crs = ds.crs
            self.to_xy = Transformer.from_crs(LONLAT_MOON, ds.crs, always_xy=True)
            x0, y0 = self.to_xy.transform(lon_e, lat)
            win = from_bounds(x0 - radius_m, y0 - radius_m, x0 + radius_m, y0 + radius_m,
                              transform=ds.transform)
            # Snap to whole pixels and clip to the file, so edges are handled cleanly.
            win = win.round_offsets().round_lengths()
            win = win.intersection(rasterio.windows.Window(0, 0, ds.width, ds.height))
            z = ds.read(1, window=win, masked=True).astype(np.float64)
            self.transform = ds.window_transform(win)
            self.res_m = abs(ds.transform.a)
            self.nodata = ds.nodata
        self.z = np.ma.filled(z, np.nan)       # nodata -> NaN, ignored later
        self.inv = ~self.transform
        self.site_xy = (x0, y0)

    def sample(self, x, y):
        """Bilinear height at map coords x, y (arrays). NaN outside the window."""
        cols, rows = self.inv * (x, y)          # NOTE: (col, row) order, not (row, col)
        # Pixel centres sit at +0.5; shift so integer indices are centres.
        c = np.asarray(cols) - 0.5
        r = np.asarray(rows) - 0.5
        c0 = np.floor(c).astype(int)
        r0 = np.floor(r).astype(int)
        fc = c - c0
        fr = r - r0
        H, W = self.z.shape
        ok = (c0 >= 0) & (r0 >= 0) & (c0 + 1 < W) & (r0 + 1 < H)
        out = np.full(c.shape, np.nan)
        c0o, r0o, fco, fro = c0[ok], r0[ok], fc[ok], fr[ok]
        z = self.z
        out[ok] = (z[r0o, c0o] * (1 - fco) * (1 - fro) + z[r0o, c0o + 1] * fco * (1 - fro)
                   + z[r0o + 1, c0o] * (1 - fco) * fro + z[r0o + 1, c0o + 1] * fco * fro)
        return out


def horizon_mask(dem_path, lat, lon_e, n_az=360, max_km=150.0, step_px=1.0,
                 min_dist_px=2.0, site_height_m=0.0, return_details=False):
    """Return a list of n_az horizon elevation angles (deg), azimuth i*360/n_az.

    lat: degrees (negative in the south). lon_e: east-positive 0-360.
    site_height_m: extra height above the ground (e.g. a 10 m mast).
    min_dist_px: skip the first couple of pixels, so the local slope of the
      pixel you stand on doesn't count as "horizon" (a lander sits on levelled
      ground; at 80 m/px the nearest pixels are noise for this purpose).
    """
    max_m = max_km * 1000.0
    win = DemWindow(dem_path, lat, lon_e, radius_m=max_m + 2_000)
    step = step_px * win.res_m
    dists = np.arange(min_dist_px * win.res_m, max_m + step / 2, step)
    azs = np.arange(n_az) * (360.0 / n_az)

    # Ground height at the site itself.
    h_ground = float(win.sample(np.array([win.site_xy[0]]), np.array([win.site_xy[1]]))[0])
    if not np.isfinite(h_ground):
        raise ValueError(f"site ({lat}, {lon_e}) is outside the DEM or on nodata")
    h_site = h_ground + site_height_m

    # All sample points at once: shape (n_az, n_dist).
    AZ, D = np.meshgrid(azs, dists, indexing="ij")
    lon_s, lat_s, _ = GEOD_MOON.fwd(np.full(AZ.shape, lon_e), np.full(AZ.shape, lat), AZ, D)
    xs, ys = win.to_xy.transform(lon_s, lat_s)
    h = win.sample(xs, ys)

    ang = elevation_angle_deg(D, h, h_site)
    ang = np.where(np.isfinite(ang), ang, -np.inf)
    mask = ang.max(axis=1)
    peak_idx = ang.argmax(axis=1)
    # Fraction of each ray that had real data (1.0 = whole ray inside the DEM).
    coverage = np.isfinite(h).mean(axis=1)
    # A ray with no data at all (off the edge of the map): use a flat 0 deg horizon.
    mask = np.where(np.isfinite(mask), mask, 0.0)

    mask = np.round(mask, 3)
    if not return_details:
        return mask.tolist()
    return {
        "mask_deg": mask.tolist(),
        "site_ground_m": h_ground,
        "dem_res_m": win.res_m,
        "peak_dist_km": (dists[peak_idx] / 1000.0).round(2).tolist(),
        "coverage": coverage.round(3).tolist(),
    }
