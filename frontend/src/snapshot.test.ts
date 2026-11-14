// Checks the offline snapshot gives exactly what the real API gives.
// Needs the backend running:  cd backend && HORIZONS_OFFLINE=1 uvicorn app:app --port 8000
// Then:  API_URL=http://localhost:8000 npm test      (skipped when API_URL is not set)
import { describe, expect, it } from "vitest";
import { snapCompare, snapEphemeris, snapshotSites } from "./snapshot";
import { pyRound } from "./metrics";
import type { Horizon } from "./types";

const API = process.env.API_URL;

describe("pyRound matches Python round()", () => {
  it.each([
    [12.25, 1, 12.2], // exact binary tie: half to even
    [12.75, 1, 12.8],
    [0.125, 2, 0.12],
    [2.675, 2, 2.67], // 2.675 is really 2.67499999...
    [62.1, 1, 62.1],
    [0.5, 0, 0],
    [1.5, 0, 2],
    [-2.5, 0, -2],
    [5.0, 2, 5],
  ])("round(%s, %s) = %s", (x, n, want) => expect(pyRound(x, n)).toBe(want));
});

describe.skipIf(!API)("snapshot matches the live API", () => {
  const get = async (p: string) => (await fetch(API + p)).json();
  // Deterministic pseudo-random queries across the snapshot period.
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const day = (d: number) => new Date(Date.UTC(2026, 10, 17 + d)).toISOString().slice(0, 10);

  it("ephemeris and compare agree for 40 random queries", async () => {
    const ids = (await snapshotSites()).map((s) => s.id);
    for (let k = 0; k < 40; k++) {
      const d0 = Math.floor(rnd() * 50);
      const d1 = d0 + 1 + Math.floor(rnd() * (58 - d0 - 1));
      const step = [1, 1, 2, 3, 6][Math.floor(rnd() * 5)];
      const horizon: Horizon = rnd() < 0.5 ? "flat" : "terrain";
      const pick = ids.filter(() => rnd() < 0.35).slice(0, 4);
      if (!pick.length) pick.push(ids[k % ids.length]);
      const q = { start: day(d0), stop: day(d1), step_h: step, horizon };
      const landH = Math.floor(rnd() * (d1 - d0) * 24);
      const land = new Date(Date.parse(day(d0)) + landH * 3600_000).toISOString().replace(".000Z", "Z");
      const qs = `start=${q.start}&stop=${q.stop}&step_h=${step}&horizon=${horizon}`;

      const live = await get(`/compare?sites=${pick.join(",")}&${qs}&land_at=${land}`);
      const snap = await snapCompare(pick, q, land);
      expect(snap, `compare ${pick} ${qs} land_at=${land}`).toEqual(live);

      const eLive = await get(`/ephemeris?site=${pick[0]}&${qs}`);
      expect(await snapEphemeris(pick[0], q), `ephemeris ${pick[0]} ${qs}`).toEqual(eLive);
    }
  }, 60_000);
});
