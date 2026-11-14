# Frontend (lane B)

Vite + React + TypeScript + Plotly. See the root README for the plan and the shared contracts.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Where the data comes from

1. **`VITE_API_URL` set** → the live API (`.env.local`: `VITE_API_URL=http://localhost:8000`). If it can't be
   reached (network error or 5xx) and the dates are inside the snapshot, the app quietly uses the snapshot.
2. **No `VITE_API_URL`** → the **offline snapshot** in `src/snapshot/`: real API answers for every site and both
   horizons, Nov 17 2026 – Jan 13 2027, with `/compare` metrics computed in the browser (`src/metrics.ts`, a port
   of `backend/metrics.py`). A blue badge says so.
3. **Neither** → fake files in `src/mock/` (development only; an orange badge says so).

**Refresh the snapshot** whenever `sites.json`, the cache or the masks change:

```bash
cd backend && HORIZONS_OFFLINE=1 uvicorn app:app --port 8000
```
```bash
cd frontend && npm run snapshot && API_URL=http://localhost:8000 npm test
```

The test fires 40 random queries at both the live API and the snapshot and checks the answers are identical.

## Deploy (GitHub Pages)

`.github/workflows/frontend-pages.yml` builds and publishes on every push to `main` that touches `frontend/`.
One-time setup by a repo admin: **Settings → Pages → Source: GitHub Actions**. The site is then at
`https://<owner>.github.io/nasaSpaceAppChallenge/`. When the backend is live, add the repository variable
**`VITE_API_URL`** (Settings → Secrets and variables → Actions → Variables) and re-run the workflow.

## Files

| File | What it is |
| --- | --- |
| `src/types.ts` | TypeScript mirror of contracts 1, 3, 4, 5. Change only with the README contract. |
| `src/api.ts` | `getSites()`, `getEphemeris()`, `getCompare()`; the only file that talks to the backend (live → snapshot → mock). |
| `src/snapshot.ts`, `src/metrics.ts` | Offline snapshot: answers contracts 4–5 in the browser. |
| `src/snapshot/*.json` | Snapshot data, made by `scripts/make_snapshot.mjs` (`npm run snapshot`). |
| `src/Plot.tsx` | Plotly component (uses `plotly.js-dist-min`). |
| `src/mock/*.json` | Fake responses: `sites`, `ephemeris_{site}_{flat|terrain}`, `compare_{flat|terrain}`. |
| `src/geo.ts` | South polar stereographic projection used by the map. |
| `scripts/make_basemap.py` | Builds the map's shaded-relief image from the LOLA DEM (see below). |
| `scripts/make_mocks.mjs` | Regenerates the mocks: `node scripts/make_mocks.mjs`. Reads site IDs from `backend/data/sites.json`. |

Mocks cover all 12 sites in `backend/data/sites.json`; controls fall back to a flat horizon.
Mock `land_at` is `2026-12-05T12:00:00Z`; the mocks include a number, `null` and `-1` for `next_sunset_h` / `next_earthset_h`.

## Map backdrop (shaded relief)

The map draws latitude rings, longitude lines and the polar sites on its own. To add a shaded-relief backdrop,
run this once with the DEM lane C downloaded (needs `pip install rasterio numpy pillow`), then commit the two files:

```bash
python frontend/scripts/make_basemap.py terrain/dem/LDEM_80S_80MPP_ADJ.TIF
```

It writes `frontend/public/basemap/south_pole.png` (about 300 KB) and `south_pole.json` (its extent). The map
uses them automatically if they exist. Sites are placed with the DEM's own projection
(`+proj=stere +lat_0=-90 +lon_0=0 +R=1737400`, see `src/geo.ts`), so the image and markers line up.

## Demo video

`scripts/record_demo.cjs` records the ~65 s demo from the root README (sites → sky domes playing → flat vs terrain →
two-week slip → best landing window) with on-screen captions. Captions that quote numbers read them off the page,
so they stay true when the data changes. Needs Playwright with Chromium, plus ffmpeg for the .mp4.

```bash
node scripts/record_demo.cjs https://<owner>.github.io/nasaSpaceAppChallenge/ demo
```
