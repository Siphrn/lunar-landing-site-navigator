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
