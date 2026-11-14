# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | done | Backend deployed: https://lunar-site-navigator-api.onrender.com. Waiting on C to rebuild 2 masks, then final check | `main` | Waiting on C (2 masks) | Sat 12:03 |
| B | Frontend | in review | All lane-B features done in PR #11; final snapshot + demo after A/C move 2 sites | `frontend/ui` (PR #11) | Waiting: PR #11 review, Pages setting, haworth/malapert move | Sat 12:05 |
| C (Lucas) | Terrain horizon masks | working | All masks current (#18); Quickmap checks done (#19); next: final README + submission at 6:00 | `claude/project-thread-mabu61` | No | Sat 12:10 |

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

- **Status:** in review. Every lane-B feature is built and tested; only refreshes and deploy remain
- **Current task:** waiting on the items below, then refresh the offline snapshot, deploy, and record the final demo
- **Branch / PR:** `frontend/ui`, [PR #11](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/11). Includes `.github/workflows/frontend-pages.yml`
- **Done so far:** all MVP features + every stretch feature (window finder, explain panel, animation scrubber, map with C's relief, **mast switch** using A's `mast_m`). **Offline snapshot:** the site works with no backend for 2026-11-17 to 2027-01-13 (identical to the live API on 60 random queries, incl. mast). **GitHub Pages deploy** workflow. **Scripted demo video** (`frontend/scripts/record_demo.cjs`; draft recorded)
- **Next:** (1) once PR #11 is merged and Pages is on, check the live site on desktop + phone; (2) after A/C move haworth + malapert_massif, rerun `npm run snapshot` and re-record the demo; (3) if A gets a backend URL, set it as a repo variable
- **Blocked on:** nothing I can do more on without the items below
- **Needs from others:**
  - **Anyone: review + merge [PR #11](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/11).** Only `frontend/` plus one new workflow file.
  - **Repo admin (Siphrn), after #11 merges: Settings → Pages → Build and deployment → Source: "GitHub Actions".** The site then publishes to `https://siphrn.github.io/nasaSpaceAppChallenge/` on every push to `main`. No account or backend needed: it runs on the snapshot.
  - **A + C: ping B when haworth + malapert_massif are moved and their masks rebuilt** (C's request above). I then refresh the snapshot so the deployed numbers match, and re-record the demo.
  - **A (optional): backend URL.** No longer required for the demo. If you deploy, add the repo variable `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables) and re-run the "Frontend to GitHub Pages" workflow; the site then uses the live API and falls back to the snapshot if it's down.
  - **C (for the README/submission):** the demo story that is true in the data: landing at Mons Mouton on Dec 15 gives ~15 days of sun and Earth never sets; landing on Dec 29 instead, the Sun sets ~32 h after landing. Month-long % numbers barely change with a two-week shift (any 30-day window covers a full lunar day), so don't claim the table "re-ranks".
- **Updated:** Sat 12:05 ET

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
