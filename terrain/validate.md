# Validating the horizon masks

The most likely bug in this project is a compass direction that is rotated or
mirrored (the README warns about the polar-stereographic rotation sign). We
checked it four ways. Status as of Sat 11:40 ET, using A's site list from PR #6.

## 1. Fake Moon with known mountains: passed

`python terrain/tests/test_synthetic.py` builds a flat fake Moon in the same
projection, puts one 3 km Gaussian mountain at a known spot, and checks the
mask. Six sites at very different longitudes (0°, 90°, 180°, 222.7°, 270°, 355°)
all peak at the right azimuth to within 1°, with the expected angle to within
0.03°. Four "hand" cases place the mountain using plain lat/lon intuition: further
from the pole is north (az 0), closer to the pole is south (180), larger east
longitude is east (about 105 at 88°S, bent toward the pole by the shortest path),
smaller is west (about 255). All pass. A perfectly flat Moon seen from a 10 m mast
gives −0.19° in every direction, which is the curvature dip we expect.

## 2. Two independent methods agree on the real map: passed

`python terrain/tests/test_crosscheck.py` recomputes every site's mask a second
way, by hand in map x/y: at longitude λ, local north is (sin λ, cos λ) and local
east is (cos λ, −sin λ) on the map. This uses the README's flat formula and no
`pyproj.Geod`. Results on the real 80 m DEM:

| Site (A's coords, PR #6) | median difference | correlation | mirrored (wrong sign) correlation |
| --- | --- | --- | --- |
| peak_near_cabeus_b | 0.003° | 1.000 | 0.902 |
| haworth | 0.004° | 1.000 | 0.546 |
| malapert_massif | 0.009° | 1.000 | −0.901 |
| mons_mouton_plateau | 0.008° | 1.000 | −0.647 |
| mons_mouton | 0.005° | 1.000 | 0.053 |
| nobile_rim_1 | 0.009° | 1.000 | −0.913 |
| nobile_rim_2 | 0.003° | 1.000 | −0.119 |
| de_gerlache_rim_2 | 0.004° | 1.000 | −0.772 |
| slater_plain | 0.001° | 1.000 | −0.120 |
| shackleton_connecting_ridge | 0.001° | 1.000 | 0.480 |

The mirrored version disagrees badly, so the test can tell right from wrong.
This hand rotation is the same as the README code starter's, so that starter's
sign was right.

## 3. Pictures against the real terrain: looks right

`python terrain/plot_mask.py <site>` draws the shaded terrain map next to the
mask, with arrows for local north, east, and the highest horizon.

**Haworth** (−87.45, 355.0): this point is the middle of Haworth crater's floor
(ground −3.3 km). The mask is high in every direction (3.4–10.3°), highest toward
the crater wall in the north-west, exactly the "bowl" the map shows. Important for
the app: the Sun at the pole never climbs above about 1.5°, so this point is
permanently dark. The NASA *region* is named after Haworth, but a landing point
should sit on the rim or plateau beside it, not on the crater floor.

![Haworth](img/haworth.png)

**Shackleton connecting ridge** (−89.45, 222.69): Shackleton crater
(the round crater right of the site) and de Gerlache (upper left) are where the
map says they should be for their published centres. A high ridge site sees
past the flat horizon in most directions (mask −2.4° to +0.6°), which matches
why it is famous for long sunlight.

![Shackleton connecting ridge](img/shackleton_connecting_ridge.png)

## 4. Still to do

- [ ] Quickmap screenshot: open https://quickmap.lroc.asu.edu at one site and
      confirm the crater or massif our mask points at (needs a human, 5 min).
- [ ] Once A's `/ephemeris` works: the connecting ridge should be sunlit most of
      the month, and Malapert should see Earth most of the time. If either comes
      out mostly dark, suspect the masks.
- [x] Rerun with A's coordinates (PR #6). Several points still sit on steep
      slopes or in craters, and the mask there is dominated by ground within 1 km:
      haworth (crater floor, permanently dark), mons_mouton_plateau (23° at 200 m),
      nobile_rim_1 (26° at 1 km), de_gerlache_rim_2 (24° at 200 m). Those points
      should be nudged onto the nearby rim or plateau top.
