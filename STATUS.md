# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | working | `app.py` endpoints; `sites.json` in PR #6 | `backend/lane-a-workflow` | No | Sat 11:32 |
| B | Frontend | working | Site/date picker + sky plot on mock data | `frontend/scaffold` (PR #5), `frontend/ui` | No | Sat 11:25 |
| C (Lucas) | Terrain horizon masks | in review | Masks rebuilt with A's site list, PR #4 | `claude/project-thread-mabu61` | No | Sat 11:41 |

---

## A: data and backend

- **Status:** working
- **Current task:** `app.py`: `/sites`, `/ephemeris`, `/compare` (flat horizon)
- **Branch / PR:** `backend/sites` (PR #6, sites.json, ready for review); `backend/lane-a-workflow` (metrics.py, horizons.py, cache)
- **Done so far:** `sites.json` (12 sites, IDs final), `metrics.py` + tests, `horizons.py` + cache for all sites, Sun + Earth, Nov 17 2026 to Jan 14 2027 hourly. All sanity checks pass offline (20 tests)
- **Next:** `app.py`, then help B switch from mocks to the real API
- **Blocked on:** nothing
- **Needs from others:** a quick review of PR #6
- **Updated:** Sat 11:32 ET

---

## B: frontend

- **Status:** working
- **Current task:** site multi-select, date range picker and sky plot on mock data
- **Branch / PR:** `frontend/scaffold` ([PR #5](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/5), needs a review); next work on `frontend/ui`
- **Done so far:** Vite + React + TS scaffold, contract types, `api.ts` (mocks unless `VITE_API_URL` is set), mock JSON for haworth / malapert / nobile_rim_1 / apollo11
- **Next:** timeline strip, metric cards, compare table; switch to the real API at 2:00
- **Blocked on:** nothing
- **Needs from others:** A: final site IDs at 12:00, and a look at `frontend/src/mock/` to confirm it matches what the API will return. Someone: review PR #5
- **Updated:** Sat 11:25 ET

## C: terrain horizon masks (Lucas)

- **Status:** in review
- **Current task:** masks for all 10 polar sites, rebuilt from A's `sites.json` (PR #6); PR #4 needs a review
- **Branch / PR:** `claude/project-thread-mabu61` ([PR #4](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/4))
- **Done so far:** ray-caster with curvature on the 80 m/px LOLA DEM; masks keyed by A's IDs in `backend/data/masks/`; direction checks pass (see `terrain/validate.md`)
- **Next:** Quickmap screenshot check; optional 10 m mast masks; rerun if A changes coordinates
- **Blocked on:** nothing
- **Needs from others:** A: some points sit in craters or on steep slopes (haworth is on Haworth's crater floor, permanently dark; mons_mouton_plateau, nobile_rim_1, de_gerlache_rim_2 sit on 23-26° slopes). Consider nudging them onto the rim/plateau top. Someone: review PR #4
- **Updated:** Sat 11:41 ET

---

## Log

Newest first. One line per event: time, person, what changed. Add to the top.

- Sat 11:41 · C · Masks rebuilt with A's site IDs/coords from PR #6 (PR #4). Flagged 4 points that sit in craters or on steep slopes.
- Sat 11:32 · A · horizons.py + offline cache done (Dec 2026 ± 2 weeks, all sites). Starting app.py.
- Sat 11:30 · A · Unblocked: Horizons is reachable. sites.json PR #6 open, IDs final.
- Sat 11:27 · A · sites.json (12 sites) and metrics.py + tests done on `backend/lane-a-workflow`; blocked on Horizons network access.
- Sat 11:26 · C · First masks for all polar sites (placeholder coords) and direction checks done; PR #4 open. Waiting on A's `sites.json` for final masks.
- Sat 11:25 · B · Frontend scaffold, contract types, mocks and `api.ts` done; PR #5 open. Starting picker + sky plot.
- Sat 11:04 · All · Status file created. A working on backend, C starting terrain, B starting soon.
