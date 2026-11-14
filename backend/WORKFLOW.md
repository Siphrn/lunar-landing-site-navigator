# Lane A workflow (data and backend)

How Lane A works today. This file applies the README's "Workflow (Saturday, Nov 14)" section to the backend. If the two disagree, the README wins and this file gets fixed.

## Ground rules

- **Stay in my lane.** Edit only `backend/` (never `backend/data/masks/`, which belongs to C). The one exception is my own row, my own section and Log lines in `STATUS.md`.
- **The contracts are the spec.** Endpoints and `sites.json` match README "Shared contracts" 1, 3, 4 and 5 field for field. If one has to change: say so in team chat first, then change the README and the code in the same PR.
- **Real numbers before polish.** By 4:00 ET a flat-horizon backend works end to end. Nothing optional gets built before that.
- **Offline by default.** Every Horizons response is cached in `backend/data/cache/` and committed, so the demo never calls Horizons live.

## Branches and PRs

One branch per task, cut from fresh `main`, and kept small:

| Branch | Contents |
| --- | --- |
| `backend/lane-a-workflow` | This file |
| `backend/sites` | `backend/data/sites.json`, `requirements.txt` |
| `backend/horizons` | `horizons.py`, cache for the demo dates |
| `backend/metrics` | `metrics.py` + tests |
| `backend/api` | `app.py` with `/sites`, `/ephemeris`, `/compare` (flat) |
| `backend/terrain` | Load C's masks, `horizon=terrain`, flat fallback |
| `backend/deploy` | Render/Railway config, deployed URL in README |

For each task:

1. `git checkout main && git pull`, then `git checkout -b backend/<task>`.
2. Update `STATUS.md` (see below): status `working`, current task, branch.
3. Build it, then run its check from the "Gates" table. Do not open the PR until the gate passes.
4. Commit and push the branch, then open a PR into `main` that says what changed and how it was checked.
5. Ask a teammate to glance at it. Merge, then update `STATUS.md`.

Pull `main` at least once an hour, and always before starting a task.

## STATUS.md updates

Commit straight to `main`, with no PR, when I start a task, finish one, get blocked, and at every sync (12:00, 4:00, 6:00 ET):

1. `git checkout main && git pull`
2. Edit only: my row in "At a glance", the "A: data and backend" section, and one new line at the **top** of the Log (`- Sat HH:MM · A · what changed`).
3. `git commit -m "status: A <short note>" && git push`, then go back to my task branch.

Read `STATUS.md` before starting any task or asking anyone for anything.

## Schedule (ET)

| Time | Task | Done when |
| --- | --- | --- |
| 11:15–11:45 | `sites.json`: nine NASA candidate regions, Shackleton connecting ridge, Apollo 11 (+ one more Apollo) as controls | Merged into `main`; C told the file is ready |
| 11:45–12:00 | One Horizons query by hand in the web app (observer on the Moon at a site, Sun target, az/el in degrees); note the exact settings | Settings that work are written in the `horizons.py` docstring |
| **12:00 sync** | Share the final site IDs | IDs posted in chat and in `STATUS.md` |
| 12:00–12:45 | `horizons.py`: fetch, parse `$$SOE`/`$$EOE`, ISO UTC times, cache | Apollo and pole sanity checks pass |
| 12:45–1:15 | Fill the cache for the demo window (all sites, Sun + Earth, Dec 2026 plus two weeks either side) | Cache committed; no network needed |
| 1:15–2:00 | `metrics.py` + tests | `pytest` green |
| 2:00–3:15 | `app.py`: three endpoints, CORS, HTTP 400s | `/docs` works; responses match B's mocks |
| 3:15–4:00 | Merge the flat backend; help B switch from mocks to the real API | B's app runs against my local API |
| **4:00 sync** | First end-to-end app | It runs, ugly but real |
| 4:00–5:30 | Terrain: read `masks/{site_id}.json`, `elevation > mask(azimuth)`, flat fallback | terrain <= flat sunlight at most sites |
| 5:30–6:00 | Buffer: fixes from B and C, run the demo queries offline | Demo queries pass offline |
| **6:00 sync** | Feature freeze: fixes only from now on | |
| 6:00–7:30 | Deploy the backend with cache and masks; share the URL with B; write it in the README | Deployed `/compare` answers from a phone |
| 7:30–8:00 | Support B and C for the demo and submission | |
| **8:00** | **Submit** | |

If I am more than 30 minutes behind at any sync, I say so in `STATUS.md` and team chat, and cut: the second Apollo site, then tidy error messages, then anything outside the contracts. The flat-horizon API is never cut.

## Gates (each task checked before its PR)

| Task | Check |
| --- | --- |
| `sites.json` | Valid JSON; every entry has `id`, `name`, `lat`, `lon_e`, `group`, `note`; `id` lowercase with underscores; `lon_e` in 0–360; south-pole `lat` below -80 |
| `horizons.py` | Apollo 11: Sun reaches 60°+ elevation over a month. Pole site: Sun stays within a few degrees of 0°, and Earth hovers near the horizon. A bad query raises a clear error, not an `IndexError` |
| Cache | Rerun with the network off: same results |
| `metrics.py` | Hand-made arrays, e.g. `[T, T, F, F, F, T]` gives longest dark = 3; `next_set_h` gives `null` when not visible and `-1` when it never sets; `both_windows` start, stop and hours |
| API | Every field and type matches contracts 3–5 and B's `frontend/src/mock/` files; unknown site or bad date gives HTTP 400; CORS lets B's dev server call it |
| Terrain | `horizon=terrain` reads C's file; a missing file falls back and returns `"horizon": "flat"`; terrain sunlight <= flat except at peaks (check any big increase) |
| Deploy | The demo queries (Haworth vs Malapert vs Nobile Rim 1, and the same dates shifted two weeks) work on the public URL |

## Conventions I hold the code to

- Times: UTC ISO-8601 strings with `Z`. Angles in degrees. Azimuth clockwise from local north.
- Longitude: east-positive 0–360 (`lon_e`) everywhere, including Horizons `SITE_COORD` (east longitude first).
- Horizons calls use `params=` (never a hand-built URL), and the code checks for `$$SOE` because Horizons reports errors inside `result` with HTTP 200.
- `next_sunset_h` / `next_earthset_h`: measured from `land_at`, or from `start` without it; `null` if not visible then, `-1` if it never sets in the range.

## Hand-offs

| When | To | What |
| --- | --- | --- |
| ~11:45 | C | `sites.json` merged into `main` |
| 12:00 | All | Final site IDs |
| ~3:15 | B | Local API URL, and the run command (`uvicorn app:app --reload` in `backend/`) |
| 4:00–5:30 | C | Confirmation that `horizon=terrain` reads their files |
| ~7:00 | B | Deployed backend URL |

## Deploy

**Deployed:** <https://lunar-site-navigator-api.onrender.com> (Render, free plan, auto-deploys from `main` on every push, settings as below).

The backend serves only from the committed cache when `HORIZONS_OFFLINE=1`, so the deployed app never calls Horizons. Dates outside Nov 17 2026 to Jan 14 2027 return HTTP 502 with a clear message.

**Render** (New > Web Service > this repo):

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Runtime | Python (version from `backend/.python-version`) |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Environment variable | `HORIZONS_OFFLINE=1` |
| Health check path | `/sites` |

**Railway**: new project from this repo, set the root directory to `backend`. It picks up `Procfile` (which already sets `HORIZONS_OFFLINE=1`).

After it is up, check from a phone: `<url>/compare?sites=haworth,malapert_massif,nobile_rim_1&start=2026-12-01&stop=2026-12-31&horizon=terrain`. Then give B the URL for `VITE_API_URL` and write it in the README.

Local dev: `pip install -r requirements-dev.txt`, then `pytest` and `uvicorn app:app --reload`.
