# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | working | `sites.json` + Horizons fetch | `backend/...` | No | Sat 11:04 |
| B | Frontend | working | Site/date picker + sky plot on mock data | `frontend/scaffold` (PR #5), `frontend/ui` | No | Sat 11:25 |
| C (Lucas) | Terrain horizon masks | working | Download coarse DEM, set up rasterio/pyproj, crop around sites | `terrain/...` | No | Sat 11:04 |

---

## A: data and backend

- **Status:** working
- **Current task:** `sites.json` with real Quickmap coordinates, then the Horizons fetch
- **Branch / PR:** `backend/...` (fill in)
- **Done so far:** started backend
- **Next:** `metrics.py` and the `/sites`, `/ephemeris`, `/compare` endpoints
- **Blocked on:** nothing
- **Needs from others:** nothing yet; shares final site IDs at the 12:00 sync
- **Updated:** Sat 11:04 ET

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

- **Status:** working
- **Current task:** download the coarse south-pole DEM, set up `rasterio` and `pyproj`, crop around the sites
- **Branch / PR:** `terrain/...` (fill in)
- **Done so far:** —
- **Next:** ray-cast a single site, check the rotation against Quickmap
- **Blocked on:** nothing
- **Needs from others:** final site IDs from A at 12:00
- **Updated:** Sat 11:04 ET

---

## Log

Newest first. One line per event: time, person, what changed. Add to the top.

- Sat 11:25 · B · Frontend scaffold, contract types, mocks and `api.ts` done; PR #5 open. Starting picker + sky plot.
- Sat 11:04 · All · Status file created. A working on backend, C starting terrain, B starting soon.
