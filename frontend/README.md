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
| `scripts/make_mocks.mjs` | Regenerates the mocks: `node scripts/make_mocks.mjs`. Edit site IDs here after the 12:00 sync. |

Mock sites: `haworth`, `malapert` (clearly best with terrain), `nobile_rim_1`, `apollo11` (control; terrain falls back to flat).
Mock `land_at` is `2026-12-05T12:00:00Z`; the mocks include a number, `null` and `-1` for `next_sunset_h` / `next_earthset_h`.
