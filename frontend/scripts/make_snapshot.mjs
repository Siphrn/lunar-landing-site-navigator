// Saves the real API's answers into src/snapshot/ so the deployed frontend works with no backend.
// 1. Start the backend:  cd backend && HORIZONS_OFFLINE=1 uvicorn app:app --port 8000
// 2. From frontend/:     node scripts/make_snapshot.mjs [http://localhost:8000] [2026-11-17] [2027-01-14]
// Rerun whenever sites.json, the cache or the masks change.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const [API = "http://localhost:8000", START = "2026-11-17", STOP = "2027-01-14"] = process.argv.slice(2);
const OUT = new URL("../src/snapshot/", import.meta.url);

async function get(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".json")) rmSync(new URL(f, OUT));
const write = (name, obj) => writeFileSync(new URL(`${name}.json`, OUT), JSON.stringify(obj) + "\n");

const sites = await get("/sites");
write("sites", sites);
let bytes = 0;
for (const s of sites) {
  const q = (h, mast = 0) => `/ephemeris?site=${s.id}&start=${START}&stop=${STOP}&step_h=1&horizon=${h}&mast_m=${mast}`;
  const [flat, terr, mast] = await Promise.all([get(q("flat")), get(q("terrain")), get(q("terrain", 10))]);
  if (flat.times.join() !== terr.times.join() || flat.times.join() !== mast.times.join())
    throw new Error(`${s.id}: flat/terrain/mast times differ`);
  const t0 = Date.parse(flat.times[0]);
  flat.times.forEach((t, i) => {
    if (Date.parse(t) !== t0 + i * 3600_000) throw new Error(`${s.id}: gap at ${t}`);
  });
  const bits = (v) => v.map((x) => (x ? "1" : "0")).join("");
  const hasMast = mast.mast_m === 10;
  const body = (k) => ({
    az: flat[k].az,
    el: flat[k].el,
    vis_flat: bits(flat[k].visible),
    vis_terrain: bits(terr[k].visible),
    ...(hasMast ? { vis_terrain_h10: bits(mast[k].visible) } : {}),
  });
  const snap = {
    site: s.id,
    start: flat.times[0],
    n: flat.times.length,
    terrain_horizon: terr.horizon,
    mask_deg: terr.mask_deg,
    mask_deg_h10: hasMast ? mast.mask_deg : null,
    sun: body("sun"),
    earth: body("earth"),
  };
  write(`site_${s.id}`, snap);
  bytes += JSON.stringify(snap).length;
  console.log(`${s.id}: ${snap.n} h, terrain=${terr.horizon}, mast=${hasMast ? "10 m" : "none"}`);
}
write("index", { start: `${START}T00:00:00Z`, stop: `${STOP}T00:00:00Z`, generated_at: new Date().toISOString(), source: API });
console.log(`wrote ${sites.length} sites, ${(bytes / 1e6).toFixed(1)} MB`);
