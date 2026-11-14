"""Check horizon_mask on a fake Moon where we know the answer.

We make a small south-polar-stereographic GeoTIFF that is flat except for one
tall Gaussian mountain at a known lat/lon. From several test sites (at very
different longitudes, which is where a rotation bug would show) the mask must
peak in exactly the compass direction of the mountain, with the expected angle.

Run:  python terrain/tests/test_synthetic.py
"""
import sys, pathlib, tempfile
import numpy as np, rasterio
from rasterio.transform import from_origin

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from horizon_mask import horizon_mask, GEOD_MOON, LONLAT_MOON, elevation_angle_deg, R_MOON
from pyproj import CRS, Transformer

CRS_SP = CRS.from_proj4(f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={R_MOON} +units=m +no_defs")
PX = 200.0
HALF = 260_000.0


def make_dem(path, peaks):
    n = int(2 * HALF / PX)
    xs = -HALF + PX * (np.arange(n) + 0.5)
    ys = HALF - PX * (np.arange(n) + 0.5)
    X, Y = np.meshgrid(xs, ys)
    to_xy = Transformer.from_crs(LONLAT_MOON, CRS_SP, always_xy=True)
    z = np.zeros_like(X)
    for lon, lat, height, sigma in peaks:
        px, py = to_xy.transform(lon, lat)
        z += height * np.exp(-((X - px) ** 2 + (Y - py) ** 2) / (2 * sigma ** 2))
    with rasterio.open(path, "w", driver="GTiff", width=n, height=n, count=1, dtype="float32",
                       crs=CRS_SP, transform=from_origin(-HALF, HALF, PX, PX), nodata=-32768) as ds:
        ds.write(z.astype("float32"), 1)


def main():
    failures = 0
    # (site lon_e, site lat, mountain bearing from site, mountain distance km)
    cases = [(0.0, -88.0, 30.0, 40.0), (90.0, -88.5, 200.0, 25.0), (222.7, -89.45, 135.0, 30.0),
             (355.0, -87.45, 300.0, 50.0), (180.0, -86.0, 0.0, 35.0), (270.0, -89.9, 90.0, 20.0)]
    with tempfile.TemporaryDirectory() as td:
        for lon_e, lat, bearing, dkm in cases:
            mlon, mlat, _ = GEOD_MOON.fwd(lon_e, lat, bearing, dkm * 1000)
            dem = pathlib.Path(td) / "fake.tif"
            make_dem(dem, [(mlon, mlat, 3000.0, 1500.0)])
            m = np.array(horizon_mask(dem, lat, lon_e, n_az=360, max_km=120))
            peak_az = int(np.argmax(m))
            expected = elevation_angle_deg(dkm * 1000, 3000.0, 0.0)
            err_az = (peak_az - bearing + 180) % 360 - 180
            ok = abs(err_az) <= 1 and abs(m.max() - expected) < 0.3
            failures += not ok
            print(f"{'OK  ' if ok else 'FAIL'} site lon {lon_e:6.1f} lat {lat:6.2f}: mountain at az {bearing:5.1f}, "
                  f"mask peaks at az {peak_az:3d} ({m.max():.2f} deg, expected ~{expected:.2f}); "
                  f"far side min {m.min():.2f}")
        # Hand-placed checks that don't use Geod at all (pure lat/lon intuition):
        # from (lat -88, lon 0): a peak further from the pole on the same meridian is due north (0);
        # one closer to the pole is due south (180). A peak at the same latitude but 30 deg further
        # east (~30 km away) is east, bent ~15 deg toward the pole because the shortest path
        # curves poleward: az ~ 90 + 30/2 = 105. West is the mirror: ~ 270 - 15 = 255.
        for (mlon, mlat, want, label) in [(0.0, -87.6, 0, "north (toward equator)"),
                                         (0.0, -88.4, 180, "south (toward pole)"),
                                         (30.0, -88.0, 105, "east (larger east longitude)"),
                                         (330.0, -88.0, 255, "west (smaller east longitude)")]:
            make_dem(dem, [(mlon, mlat, 3000.0, 1500.0)])
            m = np.array(horizon_mask(dem, -88.0, 0.0, max_km=120))
            peak_az = int(np.argmax(m))
            ok = abs((peak_az - want + 180) % 360 - 180) <= 3
            failures += not ok
            print(f"{'OK  ' if ok else 'FAIL'} hand check, peak to the {label}: mask peaks at az {peak_az}")
        # Curvature: a flat Moon seen from a 10 m mast should dip just below 0 deg everywhere.
        make_dem(dem, [])
        m = np.array(horizon_mask(dem, -88.0, 10.0, max_km=120, site_height_m=10.0))
        ok = (m < 0).all() and (m > -0.5).all()
        failures += not ok
        print(f"{'OK  ' if ok else 'FAIL'} flat Moon from a 10 m mast: mask between {m.min():.3f} and {m.max():.3f} deg (should be slightly negative)")
    print("ALL PASSED" if not failures else f"{failures} FAILED")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
