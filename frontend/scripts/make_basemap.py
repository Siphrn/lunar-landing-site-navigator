"""Make the map backdrop: a shaded-relief PNG of the lunar south pole.

Reads the same DEM lane C uses and writes, for the frontend:
  frontend/public/basemap/south_pole.png   greyscale hillshade
  frontend/public/basemap/south_pole.json  its extent in polar-stereographic metres

Run from the repo root (needs: pip install rasterio numpy pillow):
  python frontend/scripts/make_basemap.py terrain/dem/LDEM_80S_80MPP_ADJ.TIF

The DEM is south polar stereographic (+proj=stere +lat_0=-90 +lon_0=0 +R=1737400),
x/y in metres with the pole at (0, 0). The frontend projects site lat/lon the same way.
"""
import argparse
import json
import pathlib
from datetime import datetime, timezone

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

OUT = pathlib.Path(__file__).resolve().parents[1] / "public" / "basemap"


def hillshade(z, px_m, azimuth_deg=315.0, altitude_deg=35.0, exaggerate=2.0):
    """Classic hillshade (0..1). Light from the map's upper-left by default."""
    z = np.where(np.isfinite(z), z, np.nanmean(z)) * exaggerate
    dy, dx = np.gradient(z, px_m)
    slope = np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(-dx, dy)
    az, alt = np.radians(azimuth_deg), np.radians(altitude_deg)
    shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    return np.clip(shade, 0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dem", help="path to the south-pole LDEM GeoTIFF")
    ap.add_argument("--half-km", type=float, default=240, help="half-width of the map around the pole (km)")
    ap.add_argument("--size", type=int, default=1400, help="output image size in pixels (square)")
    args = ap.parse_args()

    h = args.half_km * 1000
    with rasterio.open(args.dem) as ds:
        win = from_bounds(-h, -h, h, h, ds.transform)
        z = ds.read(1, window=win, out_shape=(args.size, args.size), resampling=Resampling.average,
                    boundless=True, fill_value=np.nan).astype(np.float32)
        if ds.nodata is not None:
            z[z == ds.nodata] = np.nan
    px_m = 2 * h / args.size

    shade = hillshade(z, px_m)
    # Light grey palette so coloured site markers stand out; no-data stays white.
    grey = (70 + 175 * shade).astype(np.uint8)
    grey[~np.isfinite(z)] = 255
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(grey, "L").save(OUT / "south_pole.png", optimize=True)
    meta = {
        "image": "south_pole.png",
        # Row 0 of the image is the top (largest y), as in the GeoTIFF.
        "x_min_m": -h, "x_max_m": h, "y_min_m": -h, "y_max_m": h,
        "proj": "+proj=stere +lat_0=-90 +lon_0=0 +R=1737400",
        "source": pathlib.Path(args.dem).name,
        "credit": "LOLA south-pole DEM, NASA PGDA (Barker et al. 2021)",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    (OUT / "south_pole.json").write_text(json.dumps(meta, indent=2) + "\n")
    size_kb = (OUT / "south_pole.png").stat().st_size // 1024
    print(f"wrote {OUT/'south_pole.png'} ({args.size}px, {px_m:.0f} m/px, {size_kb} KB) and south_pole.json")


if __name__ == "__main__":
    main()
