# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | done | Backend live and current (masks #18). Available for fixes | `main` | No | Sat 12:17 |
| B | Frontend | done | Frontend merged (#11). Waiting on Pages to go live, then a live check | `main`; PR #20 (1 file) | Waiting: Pages setting + workflow re-run | Sat 12:14 |
| C (Lucas) | Terrain horizon masks | working | All masks current (#18); Quickmap checks done (#19); next: final README + submission at 6:00 | `claude/project-thread-mabu61` | No | Sat 12:10 |

---

## A: data and backend

- **Status:** done
- **Current task:** none; available for fixes until 8:00
- **Branch / PR:** #6, #7, #8, #9, #10, #13, #16, #17, #21 all merged
- **Done so far:** **Backend live: <https://lunar-site-navigator-api.onrender.com>**, now serving latest main `39db743` (#17 sites + #18 masks). **Terrain gate rerun on the live URL (12:20), passes:** Malapert 100% sunlit with terrain (C's check agrees), Haworth 60.7% sun / 21.1% both; the 10 m mast never lowers any number. Everything else as before: `sites.json`, `horizons.py` + offline cache, `metrics.py`, `app.py` (terrain + `mast_m`), 31 tests, URL in README
- **Important:** the Render service does **not** redeploy on push (not connected to GitHub). After anything in `backend/` merges (sites, cache, **masks**), it needs a manual deploy: tell A, or Render dashboard > Manual Deploy. Steps in `backend/WORKFLOW.md`
- **Next:** redeploy if anything in `backend/` changes; help with the demo
- **Blocked on:** nothing
- **Needs from others:** C: if a mask or site changes again, tell A so the live backend gets redeployed. B: cold start is about 1 min on the free plan (your fallback covers it)
- **Updated:** Sat 12:17 ET

---

## B: frontend

- **Status:** done (merged in #11). Waiting on the Pages deploy, then a live check
- **Current task:** waiting for Pages to be switched on and the "Frontend to GitHub Pages" workflow re-run
- **Branch / PR:** #11 merged. [PR #20](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/20): one-file fix to the demo recorder's flat-vs-terrain caption (needs a quick look + merge; merging it also re-runs the Pages workflow)
- **Done so far:** every MVP + stretch feature, mast switch, offline snapshot (refreshed after #17/#18; 60/60 random queries match the API), Pages workflow pointed at A's backend (`https://lunar-site-navigator-api.onrender.com`), **6 s cold-start fallback** (if Render is asleep, the page answers from the snapshot instead of hanging, and switches back to live when it wakes), final demo video recorded with the final data
- **Pages run #1 (17:12 UTC):** build + tests passed; only the deploy step failed with "Ensure GitHub Pages has been enabled". It ran before the setting was on, so nothing needs fixing in code.
- **Next:** once the site is live, check it on desktop + phone; re-record the demo against the live URL if wanted
- **Blocked on:** the Pages setting (Lucas) + a re-run (C, or merge PR #20)
- **Needs from others:**
  - **Lucas: Settings → Pages → Build and deployment → Source: "GitHub Actions"**, then **Actions → "Frontend to GitHub Pages" → Re-run all jobs** (or merge PR #20, which triggers it). Site: `https://siphrn.github.io/nasaSpaceAppChallenge/`
  - **Everyone:** my environment can't reach onrender.com or github.io, so please open the live site once on a phone and tell B if anything looks wrong
  - **C (README/submission):** demo facts that are true in the final data: landing at Mons Mouton on Dec 15 gives ~15 days of sun and Earth never sets; landing on Dec 29 instead, the Sun sets ~32 h after landing. Flat → terrain: at Nobile Rim 1 the time with both Sun and Earth up goes from 57.5% to 9.2%, while high ground like Malapert Massif gets *more* sun (62% → 100%). Month-long % barely change with a two-week shift (any 30-day window covers a full lunar day)
- **Updated:** Sat 12:14 ET

## C: terrain horizon masks (Lucas)

- **Status:** working
- **Current task:** nothing blocking anyone. Next: final README + submission prep (6:00)
- **Branch / PR:** `claude/project-thread-mabu61`. #12, #14, #15, #18, #19 merged
- **Done so far:** all 10 polar masks + `_h10` mast masks on `main` match `sites.json` (haworth and malapert_massif rebuilt for A's #17 in **#18**). Map backdrop for B. Sun/Earth check (`terrain/validate.md` §4: ridge 100% sunlit; Malapert now 100% Sun / 50% Earth with terrain). Quickmap checks (§5): Haworth now inside its official region; Nobile Rim 1 inside its region. README "Limitations" section
- **Next:** final README (screenshot/GIF, how it works, data sources, limitations, how to run) and submission checklist at 6:00; rebuild masks if any coordinate changes
- **Blocked on:** nothing
- **Needs from others:** A: rerun the terrain gate on the 2 rebuilt masks (#18). Anyone: tell C if a site moves (C rebuilds in ~10 s). B: live app URL when the frontend is deployed (for the README)
- **Updated:** Sat 12:10 ET

---

## Log

Newest first. One line per event: time, person, what changed. Add to the top.

- Sat 12:17 · A · Redeployed backend with #17/#18 (Render doesn't redeploy on push; docs fixed in #21). Terrain gate passes on the live URL. Lane A done.
- Sat 12:14 · B · Frontend merged (#11). Pages run #1: build OK, deploy failed only because Pages wasn't on yet; needs a re-run. Snapshot refreshed for #17/#18; cold-start fallback added; PR #20 (demo caption).
- Sat 12:13 · C · Merged B's PR #11 at Lucas's request. Lucas is turning on Settings → Pages → Source: GitHub Actions; C re-runs the Pages workflow after. Haworth + malapert_massif masks are rebuilt (#18), so B can refresh the snapshot.
- Sat 12:10 · C · #18: masks rebuilt for A's moved haworth + malapert_massif. #19: Nobile Rim 1 checked inside its official Quickmap region. Nobody waiting on C.
- Sat 12:05 · B · PR #11 has every frontend feature + mast switch, offline snapshot, Pages deploy, demo recorder. Waiting on: PR #11 review, Pages setting, haworth/malapert move.
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
