# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | done | Backend deployed: https://lunar-site-navigator-api.onrender.com. Waiting on C to rebuild 2 masks, then final check | `main` | Waiting on C (2 masks) | Sat 12:03 |
| B | Frontend | in review | Full UI on the real API in PR #11; waiting on deploy URL + stale masks | `frontend/ui` (PR #11) | Partly: see B section | Sat 11:55 |
| C (Lucas) | Terrain horizon masks | working | Haworth point is outside its official region (#15); waiting on A to move haworth + malapert_massif | `claude/project-thread-mabu61` | Waiting on A (2 coordinates) | Sat 12:07 |

---

## A: data and backend

- **Status:** done; waiting on C to rebuild 2 masks, then a final check on the live URL
- **Current task:** waiting on C (masks for haworth and malapert_massif)
- **Branch / PR:** #6, #7, #8, #9, #10, #13, #16, #17 all merged
- **Done so far:** **Backend deployed: <https://lunar-site-navigator-api.onrender.com>** (Render free plan, auto-deploys from `main`, `HORIZONS_OFFLINE=1`). Checked on the public URL: demo queries, `mast_m=10`, 400/502, CORS. URL is in the README. Backend: `sites.json`, `horizons.py` + offline cache, `metrics.py`, `app.py` (terrain + `mast_m`), 31 tests. Terrain gate passes. **#17 (12:10):** moved `haworth` to -86.9737, 335.6129 (inside the official region) and `malapert_massif` to -86.0187, 2.2013 (out of the summit crater), as C asked; cache refetched
- **Next:** when C's new masks are on main, Render redeploys automatically; I rerun the terrain gate on the live URL
- **Blocked on:** **C:** please rebuild the 0 m and `_h10` masks for `haworth` and `malapert_massif` (sites moved in #17)
- **Needs from others:** **B: backend URL for `VITE_API_URL` is `https://lunar-site-navigator-api.onrender.com`** (CORS open). Free plan: the first request after 15 idle minutes takes ~1 min to wake, so open it once before the demo. C: thanks for the profiles. nobile_rim_1 stays where it is for now (the runner-up point C suggested); flag it if Quickmap shows it is off the Nobile rim
- **Updated:** Sat 12:03 ET

---

## B: frontend

- **Status:** in review
- **Current task:** MVP and most stretch features done and tested against the real backend on `main`; waiting on the items below
- **Branch / PR:** `frontend/ui`, [PR #11](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/11) (needs a review). PR #5 (scaffold) merged
- **Done so far:** site picker, dates, landing time, flat/terrain toggle; sky dome per site; timeline strip; metric cards + comparison table with best-per-column; flat-fallback label; best landing window finder; "How to read this" panel; animation scrubber; map of the south pole; credits footer. Works at phone width. Tested against `backend/` on `main` with `HORIZONS_OFFLINE=1`
- **Next:** deploy the frontend once there is a backend URL; record the demo; mast-height slider if the contract change below is agreed
- **Blocked on:** a deployed backend URL (A), and an account to deploy the frontend (see below)
- **Needs from others:**
  - **C: rebuild 4 stale masks.** Every mask on `main` was built at 16:31 UTC, but A moved 4 sites at 16:43 UTC (commit 9d30541). Stale: `haworth`, `mons_mouton_plateau`, `nobile_rim_1`, `de_gerlache_rim_2`. Haworth still shows 0% sunlit / 0% Earth with terrain on. Please rerun `python terrain/build_masks.py` and commit.
  - **C: map backdrop (5 min).** You have the DEM, so please run `python frontend/scripts/make_basemap.py terrain/dem/LDEM_80S_80MPP_ADJ.TIF` (needs `pip install rasterio numpy pillow`) and commit the 2 files it writes in `frontend/public/basemap/`. The map works without them; this adds the shaded relief. My environment can't download the DEM.
  - **A: deployed backend URL** as soon as it is up. I set it as `VITE_API_URL` when building the frontend. CORS is already open, so no change is needed.
  - **A + C: mast-height slider (optional, needs a yes from both).** Proposed contract change: `/ephemeris` and `/compare` take an optional `mast_m` (0 or 10); the API reads `masks/{id}_h10.json` when `mast_m=10` and falls back to the 0 m mask otherwise. C already has `build_masks.py --mast 10`. Reply in chat; I'll update the README contract in the same PR.
  - **Anyone: review [PR #11](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/11).**
- **Updated:** Sat 11:55 ET

## C: terrain horizon masks (Lucas)

- **Status:** working
- **Current task:** waiting on A to move haworth + malapert_massif (below); then final README + submission prep (6:00)
- **Branch / PR:** `claude/project-thread-mabu61`. #12 and [#14](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/14) merged
- **Done so far:** all polar masks + `_h10` mast masks on `main`, matching `sites.json`; map backdrop for B; **Sun/Earth check** (`terrain/sun_earth_check.py`, results in `terrain/validate.md` §4): connecting ridge 100% sunlit, terrain <= flat except on high points; **README "Limitations" section** added
- **Answer for A:** the negative masks at nobile_rim_1 (−5.9° at az 107) and mons_mouton_plateau (−4.4° at az 205) are real: the ground drops ~4 km within 10 km into a basin toward the pole, and stays 4–7° below level out to 150 km with curvature. Profiles in `terrain/validate.md` §4. Caveat: nobile_rim_1's ground is 5,846 m, the Mons Mouton massif's height, so that point may sit on the massif rather than Nobile's rim (Quickmap check)
- **"Explain it" text:** B already wrote it (`Explain.tsx` in PR #11) and it reads well; C won't duplicate it
- **Next:** rebuild masks if A moves Malapert; Quickmap screenshot (needs Lucas); final README + submission at 6:00
- **Blocked on:** nothing
- **Needs from others:** **A: please update 2 points in `sites.json`, refetch their Horizons cache, and ping C:**
  1. **`haworth` → −86.9737, 335.6129.** Quickmap's official Haworth region outline (screenshot in `terrain/validate.md` §5) shows the current point −87.9994, 337.4768 is ~60 km *outside* the region. The new point is the best one inside it (mean horizon ~0°, slope 4.5°). It moves ~115 km, so the cache must be refetched. (#15)
  2. **`malapert_massif` → −86.0187, 2.2013.** The current point sits in a ~300 m summit crater (Sun 26%, Earth 43% with terrain); 1.6 km away is 100% / 50%.
  C rebuilds the masks within minutes of the change.
- **Updated:** Sat 12:07 ET

---

## Log

Newest first. One line per event: time, person, what changed. Add to the top.

- Sat 12:03 · A · Backend deployed: https://lunar-site-navigator-api.onrender.com (B: use as VITE_API_URL). Moved haworth + malapert_massif (#17); waiting on C to rebuild those 2 masks.
- Sat 12:07 · C · Quickmap check: Haworth point is ~60 km outside the official region (#15). Asking A to move haworth and malapert_massif.
- Sat 12:03 · C · #14 merged: Sun/Earth check of masks (ridge 100% sunlit; A's negative-mask question answered: real), README Limitations. Asking A to move Malapert 1.6 km out of a summit crater.
- Sat 11:54 · A · Terrain gate passes on C's rebuilt masks. `mast_m` merged (#13), slider unblocked for B. Only deploy left; waiting on a hosting account.
- Sat 11:53 · C · #12 merged: 4 masks rebuilt for the moved sites, 10 m mast masks for all sites, map backdrop for B. A and B no longer waiting on C.
- Sat 11:55 · B · Full frontend on the real API in PR #11 (MVP + window finder, scrubber, map). Waiting on: C to rebuild 4 stale masks + make the map backdrop; A's deployed URL.
- Sat 11:47 · A · Waiting on C to rebuild 4 masks (sites moved to C's suggested points in PR #9). Backend + B's frontend verified end to end. Deploy config ready.
- Sat 11:46 · C · PR #4 (terrain masks) and PR #5 (B's frontend scaffold) merged to `main` at Lucas's request.
- Sat 11:37 · A · Backend merged to main (PR #7). The flat-horizon API is ready for B; terrain reads C's masks once they're on main.
- Sat 11:35 · A · sites.json merged to main (PR #6). Backend with flat + terrain API done on `backend/lane-a-workflow`; works offline.
- Sat 11:41 · C · Masks rebuilt with A's site IDs/coords from PR #6 (PR #4). Flagged 4 points that sit in craters or on steep slopes.
- Sat 11:32 · A · horizons.py + offline cache done (Dec 2026 ± 2 weeks, all sites). Starting app.py.
- Sat 11:30 · A · Unblocked: Horizons is reachable. sites.json PR #6 open, IDs final.
- Sat 11:27 · A · sites.json (12 sites) and metrics.py + tests done on `backend/lane-a-workflow`; blocked on Horizons network access.
- Sat 11:26 · C · First masks for all polar sites (placeholder coords) and direction checks done; PR #4 open. Waiting on A's `sites.json` for final masks.
- Sat 11:25 · B · Frontend scaffold, contract types, mocks and `api.ts` done; PR #5 open. Starting picker + sky plot.
- Sat 11:04 · All · Status file created. A working on backend, C starting terrain, B starting soon.
