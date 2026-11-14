# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | blocked | Waiting on C: 4 masks to rebuild for moved sites. Backend done; deploy ready | `main` | Yes: waiting on C's mask rebuild, and a hosting account for deploy | Sat 11:47 |
| B | Frontend | in review | Full UI on the real API in PR #11; waiting on deploy URL + stale masks | `frontend/ui` (PR #11) | Partly: see B section | Sat 11:55 |
| C (Lucas) | Terrain horizon masks | working | Masks rebuilt for moved sites + 10 m mast masks + map backdrop merged (#12); next: Sun/Earth check, README limitations, Explain-it text | `claude/project-thread-mabu61` | No | Sat 11:53 |

---

## A: data and backend

- **Status:** waiting (on C for masks; deploy needs a Render/Railway account)
- **Current task:** none until C's masks are rebuilt
- **Branch / PR:** #6, #7, #8, #9, #10 all merged
- **Done so far:** Backend complete on main: `sites.json`, `horizons.py` + offline cache, `metrics.py`, `app.py` (`/sites`, `/ephemeris`, `/compare`, terrain with flat fallback), 30 tests. PR #9 moved haworth, mons_mouton_plateau, nobile_rim_1 and de_gerlache_rim_2 to C's suggested points (nobile_rim_1 uses the runner-up that stays on the rim). Terrain gate checked against C's masks: terrain sunlight <= flat at every site; the Earth increases at mons_mouton and peak_near_cabeus_b are real (mask 2 to 4 deg below 0 toward Earth). Deploy config and steps in `backend/WORKFLOW.md` (Procfile, pinned requirements, `HORIZONS_OFFLINE=1`). **End-to-end check at 11:45:** B's `frontend/ui` against my local API in a headless browser: every call 200, no console errors, table, windows, sky plots and timelines all render with real numbers
- **Next:** once C rebuilds the masks: rerun the terrain gate and confirm the demo trio. Then deploy at 6:00 and give B the URL
- **Blocked on:** **C**: the masks on main for `haworth`, `mons_mouton_plateau`, `nobile_rim_1` and `de_gerlache_rim_2` were built at 16:31Z for the old points (Haworth is still on the crater floor: mean horizon 7.0 deg, never sunlit). Please rerun `python terrain/build_masks.py` (it reads the new `sites.json`) and merge. **Deploy**: needs someone with a Render or Railway account (steps in `backend/WORKFLOW.md`)
- **Needs from others:** B: nothing; your app works against the real API (run: `cd backend && pip install -r requirements-dev.txt && uvicorn app:app --reload`, then `VITE_API_URL=http://localhost:8000 npm run dev`)
- **Updated:** Sat 11:47 ET

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
- **Current task:** Sun/Earth sanity check of the masks with A's cache; then README limitations section and "Explain it" text
- **Branch / PR:** `claude/project-thread-mabu61`. [#12](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/12) merged
- **Done so far:** all 10 polar masks on `main` match the current `sites.json` (4 moved sites rebuilt in #12). `{site}_h10.json` (10 m mast) for every polar site. Map backdrop `frontend/public/basemap/` made from the DEM (for B; I block-averaged the full-res DEM because `Resampling.average` on the COG drew a tile grid. B: consider the same change in `make_basemap.py`)
- **Next:** Sun/Earth check; README limitations; "Explain it" text (will put it in `docs/explain_it.md` for B to drop into the panel); final README + submission prep at 6:00
- **Blocked on:** nothing
- **Needs from others:** A: rerun the terrain gate on the new masks. A + B: mast slider is a yes from C: the `_h10` files are on `main`, same format as contract 2 with `site_height_m: 10`. Tell C if any site's coordinates change again (C reruns masks in ~10 s)
- **Updated:** Sat 11:53 ET

---

## Log

Newest first. One line per event: time, person, what changed. Add to the top.

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
