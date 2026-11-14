# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | working | `app.py` endpoints; `sites.json` in PR #6 | `backend/lane-a-workflow` | No | Sat 11:32 |
| B | Frontend | working | Site/date picker + sky plot on mock data | `frontend/scaffold` (PR #5), `frontend/ui` | No | Sat 11:25 |
| C (Lucas) | Terrain horizon masks | in review | First masks for all sites (placeholder coords), PR #4 open | `claude/project-thread-mabu61` | Waiting on A's `sites.json` | Sat 11:26 |

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
- **Current task:** first masks for all 10 polar sites, PR #4 open; waiting on real site coordinates
- **Branch / PR:** `claude/project-thread-mabu61` ([PR #4](https://github.com/Siphrn/nasaSpaceAppChallenge/pull/4))
- **Done so far:** 80 m/px LOLA DEM read and checked (metres, polar stereo, NaN nodata); ray-caster with curvature; masks for 10 sites in `backend/data/masks/`; direction checks pass (fake-Moon tests + two independent methods agree, see `terrain/validate.md`)
- **Next:** rerun with A's `sites.json` (takes ~10 s), Quickmap screenshot check, optional 10 m mast masks
- **Blocked on:** final masks wait on A's `backend/data/sites.json` (real coordinates + IDs)
- **Needs from others:** A: commit `backend/data/sites.json`. Current masks use placeholder IDs/coords from `terrain/sites_fallback.json`
- **Updated:** Sat 11:26 ET

---

## Log

Newest first. One line per event: time, person, what changed. Add to the top.

- Sat 11:32 · A · horizons.py + offline cache done (Dec 2026 ± 2 weeks, all sites). Starting app.py.
- Sat 11:30 · A · Unblocked: Horizons is reachable. sites.json PR #6 open, IDs final.
- Sat 11:27 · A · sites.json (12 sites) and metrics.py + tests done on `backend/lane-a-workflow`; blocked on Horizons network access.
- Sat 11:26 · C · First masks for all polar sites (placeholder coords) and direction checks done; PR #4 open. Waiting on A's `sites.json` for final masks.
- Sat 11:25 · B · Frontend scaffold, contract types, mocks and `api.ts` done; PR #5 open. Starting picker + sky plot.
- Sat 11:04 · All · Status file created. A working on backend, C starting terrain, B starting soon.
