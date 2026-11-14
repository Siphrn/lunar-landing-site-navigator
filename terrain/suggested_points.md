# Suggested better points for four sites (for Person A)

Made with `python terrain/suggest_sites.py <site>` on Sat 11:45 ET. For each site it
tries a grid of nearby points, drops any on slopes over 8°, and ranks the rest by
average horizon height (lower = more open sky for the low polar Sun).
"Mean / max horizon" is over all 360 directions. These are suggestions from an
80 m/px map: check each in Quickmap before changing `sites.json`.

| Site | Current point | Problem | Suggested point (lat, lon_e) | Moved | Mean / max horizon | Slope |
| --- | --- | --- | --- | --- | --- | --- |
| haworth | −87.45, 355.0 | Crater floor: mean horizon 7.0°, never sunlit | −87.9994, 337.4768 | 26.7 km (onto the rim) | 0.89° / 3.61° | 0.7° |
| mons_mouton_plateau | −85.67, 24.45 | 24° slope, mean horizon 6.4° | −85.6981, 25.1040 | 1.7 km | 0.69° / 8.99° | 4.9° |
| nobile_rim_1 | −85.40, 40.0 | 25° slope, mean horizon 8.8° | −85.2521, 36.7588 | 9.2 km | −1.23° / 1.57° | 1.6° |
| de_gerlache_rim_2 | −88.60, 290.0 | 25° slope, mean horizon 7.5° | −88.7072, 291.4250 | 3.4 km | −0.89° / 1.92° | 4.1° |

Runners-up, if a pick turns out to be outside the named region:

- haworth: −86.8778, 340.0959 (28.2 km, mean 1.01°); −88.2787, 9.1041 (29.6 km, mean 1.04°)
- mons_mouton_plateau: −85.7100, 25.1788 (2.1 km, mean 1.37°)
- nobile_rim_1: −85.6169, 37.9129 (8.2 km, mean −0.56°, slope 7.8°). The top pick moved 9 km
  and may have left the Nobile rim (it heads toward Mons Mouton); check in Quickmap.
- de_gerlache_rim_2: −88.6484, 291.6490 (1.9 km, mean −0.84°)

Commands used:

```bash
python terrain/suggest_sites.py mons_mouton_plateau
python terrain/suggest_sites.py de_gerlache_rim_2
python terrain/suggest_sites.py nobile_rim_1 --radius-km 10 --step-km 0.5
python terrain/suggest_sites.py haworth --radius-km 30 --step-km 1.5
```

## Second round (Sat 12:00 ET): Malapert

| Site | Current point | Problem | Suggested point (lat, lon_e) | Moved | Mean / max horizon | Slope |
| --- | --- | --- | --- | --- | --- | --- |
| malapert_massif | −86.00, 2.90 | In a ~300 m summit crater: mean horizon 5.0°, Sun 26%, Earth 43% | −86.0187, 2.2013 | 1.6 km | −0.79° / 3.67° | 2.3° |

Smaller optional nudges (near-field bumps only, less impact):
mons_mouton → −85.2826, 32.0576 (1.4 km, mean 1.61° → −0.62°);
peak_near_cabeus_b → −83.5753, 291.5338 (1.5 km, mean 0.60° → −1.55°).

## Third round (Sat 12:05 ET): Haworth must sit inside the official region

Lucas pulled the official **Haworth** candidate-region outline from Quickmap
(layer "A3: Candidate landing regions 2022", screenshot
`img/quickmap_haworth_region.png`, vertices in `regions.json`). The region is a
~887 km² strip on the plateau west of Haworth crater, roughly 86.1–87.4°S,
325–348°E. **The current point (−87.9994, 337.4768) is outside it**, about 60 km
south of the region's edge.

`python terrain/best_in_region.py haworth` tried 313 points 1 km apart inside the
outline (slope under 8°) and ranked them by average horizon:

| Rank | Point (lat, lon_e) | Mean / max horizon | Slope |
| --- | --- | --- | --- |
| 1 | **−86.9737, 335.6129** | −0.02° / 2.95° | 4.5° |
| 2 | −87.0473, 335.6672 | 0.00° / 3.68° | 4.5° |
| 3 | −86.3815, 336.4244 | 0.29° / 6.54° | 7.9° |

Suggested: move `haworth` to −86.9737, 335.6129. Its Horizons cache needs a
refetch (the site moves ~115 km, so Sun/Earth angles change by up to ~1°).
