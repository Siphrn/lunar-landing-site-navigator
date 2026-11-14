# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | blocked | Backend done incl. `mast_m` (#13). Only deploy left | `main` | Yes: needs a Render/Railway account to deploy | Sat 11:54 |
| B | Frontend | in review | Full UI on the real API in PR #11; waiting on deploy URL + stale masks | `frontend/ui` (PR #11) | Partly: see B section | Sat 11:55 |
| C (Lucas) | Terrain horizon masks | working | Sun/Earth check + README limitations merged (#14); waiting on A for Malapert point; final README at 6:00 | `claude/project-thread-mabu61` | No | Sat 12:03 |

---

## A: data and backend

- **Status:** waiting (deploy needs a hosting account; everything else done)
- **Current task:** deploy the backend (waiting for a Render or Railway account)
- **Branch / PR:** #6, #7, #8, #9, #10, #13 all merged
- **Done so far:** Backend complete on main: `sites.json`, `horizons.py` + offline cache, `metrics.py`, `app.py` (`/sites`, `/ephemeris`, `/compare`, terrain with flat fallback), 31 tests. **Terrain gate rerun on C's rebuilt masks (11:58): passes.** Terrain sunlight <= flat everywhere except nobile_rim_1, mons_mouton_plateau and de_gerlache_rim_2. There the extra hours are the Sun 0 to 3.4 deg below the flat horizon toward the pole (az 100 to 256), where those masks dip to -1.3 to -5.9 deg (high points on the Mons Mouton massif and the de Gerlache rim). Looks physical. **Mast slider (#13):** `mast_m=10` on `/ephemeris` and `/compare` reads `{site}_h10.json`, falls back to the 0 m mask, and returns `mast_m` (the height used). README contracts 4 and 5 updated. Deploy config + steps in `backend/WORKFLOW.md`
- **Next:** deploy as soon as there is an account; give B the URL; write it in the README
- **Blocked on:** a Render or Railway account to deploy with (asked our human lead)
- **Needs from others:** B: `mast_m` is live on main; send `mast_m=10` with `horizon=terrain`, and read `mast_m` back per result for the label. C: in your Sun/Earth check, please eyeball the negative masks at nobile_rim_1 and mons_mouton_plateau (down to -5.9 deg toward az 100 to 256); they add up to 15 points of sunlight
- **Updated:** Sat 11:54 ET

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
- **Current task:** waiting on A's decision on the Malapert point; then final README + submission prep (6:00)
- **Branch / PR:** `claude/project-thread-mabu61`. #12 and [#14](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/14) merged
- **Done so far:** all polar masks + `_h10` mast masks on `main`, matching `sites.json`; map backdrop for B; **Sun/Earth check** (`terrain/sun_earth_check.py`, results in `terrain/validate.md` §4): connecting ridge 100% sunlit, terrain <= flat except on high points; **README "Limitations" section** added
- **Answer for A:** the negative masks at nobile_rim_1 (−5.9° at az 107) and mons_mouton_plateau (−4.4° at az 205) are real: the ground drops ~4 km within 10 km into a basin toward the pole, and stays 4–7° below level out to 150 km with curvature. Profiles in `terrain/validate.md` §4. Caveat: nobile_rim_1's ground is 5,846 m, the Mons Mouton massif's height, so that point may sit on the massif rather than Nobile's rim (Quickmap check)
- **"Explain it" text:** B already wrote it (`Explain.tsx` in PR #11) and it reads well; C won't duplicate it
- **Next:** rebuild masks if A moves Malapert; Quickmap screenshot (needs Lucas); final README + submission at 6:00
- **Blocked on:** nothing
- **Needs from others:** **A: move `malapert_massif` to −86.0187, 2.2013.** The current point sits in a ~300 m crater on the summit (Sun 26%, Earth 43% with terrain); 1.6 km away it is 100% Sun / 50% Earth. Optional smaller nudges for mons_mouton and peak_near_cabeus_b in `terrain/suggested_points.md`. Ping C after and C rebuilds the masks (~10 s)
- **Updated:** Sat 12:03 ET

---

## Log

Newest first. One line per event: time, person, what changed. Add to the top.

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
