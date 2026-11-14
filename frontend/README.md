# Frontend (lane B)

Vite + React + TypeScript + Plotly. See the root README for the plan and the shared contracts.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Mock vs real API

- **No `VITE_API_URL`** → `src/api.ts` serves the files in `src/mock/` (fake numbers, dates ignored).
- **Real backend:** copy `.env.example` to `.env.local` and set `VITE_API_URL=http://localhost:8000` (or A's deployed URL).

## Files

| File | What it is |
| --- | --- |
| `src/types.ts` | TypeScript mirror of contracts 1, 3, 4, 5. Change only with the README contract. |
| `src/api.ts` | `getSites()`, `getEphemeris()`, `getCompare()`; the only file that talks to the backend. |
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
