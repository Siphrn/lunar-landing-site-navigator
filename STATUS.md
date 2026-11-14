# Team status

Where everyone is right now. **Update your own section** when you start a task, finish a task, get blocked, and at every sync (12:00, 4:00, 6:00 ET). Edit only your own section, so updates never conflict.

Status values: `not started` · `working` · `blocked` · `in review` · `done`

## At a glance

| Person | Lane | Status | Current task | Branch | Blocked? | Updated (ET) |
| --- | --- | --- | --- | --- | --- | --- |
| A | Data and backend | working | `sites.json` + Horizons fetch | `backend/...` | No | Sat 11:04 |
| B | Frontend | not started | Vite scaffold + mock JSON (first task) | — | No | Sat 11:04 |
| C (Lucas) | Terrain horizon masks | in review | First masks for all sites (placeholder coords), PR open | `claude/project-thread-mabu61` | No | Sat 11:32 |

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

- **Status:** not started
- **Current task:** (on arrival) Vite scaffold + mock JSON copied from the README samples
- **Branch / PR:** —
- **Done so far:** —
- **Next:** site and date picker, sky plot on mock data
- **Blocked on:** nothing
- **Needs from others:** nothing until the 2:00–4:00 switch to the real API
- **Updated:** Sat 11:04 ET

## C: terrain horizon masks (Lucas)

- **Status:** in review
- **Current task:** first masks for all 10 polar sites, PR open; waiting on real site coordinates
- **Branch / PR:** `claude/project-thread-mabu61` (PR linked in team chat)
- **Done so far:** 80 m/px LOLA DEM read and checked (metres, polar stereo, NaN nodata); ray-caster with curvature; masks for 10 sites in `backend/data/masks/`; direction checks pass (fake-Moon tests + two independent methods agree, see `terrain/validate.md`)
- **Next:** rerun with A's `sites.json` (takes ~10 s), Quickmap screenshot check, optional 10 m mast masks
- **Blocked on:** nothing
- **Needs from others:** A: `backend/data/sites.json` with real coordinates and final IDs. Current masks use placeholder IDs/coords from `terrain/sites_fallback.json`
- **Updated:** Sat 11:32 ET

---

## Log

Newest first. One line per event: time, person, what changed. Add to the top.

- Sat 11:32 · C · First masks for all polar sites (placeholder coords) and direction checks done; PR open.
- Sat 11:04 · All · Status file created. A working on backend, C starting terrain, B starting soon.
