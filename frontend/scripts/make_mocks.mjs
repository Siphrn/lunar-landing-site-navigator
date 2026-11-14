// Generates fake API responses in src/mock/ that match README contracts 3–5.
// The Sun/Earth tracks are synthetic (rough polar geometry), NOT real ephemerides.
// Run: node scripts/make_mocks.mjs
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const OUT = new URL("../src/mock/", import.meta.url);
const START = Date.parse("2026-12-01T00:00:00Z");
const HOURS = 30 * 24; // 2026-12-01 .. 2026-12-31, 1 h step
const STEP_H = 1;
const LAND_AT_INDEX = 4 * 24 + 12; // 2026-12-05T12:00:00Z
const SYNODIC_H = 29.53 * 24;
const LIBRATION_H = 27.2 * 24;

// Real site list from A (backend/data/sites.json); the tracks for each are synthetic.
const sites = JSON.parse(readFileSync(new URL("../../backend/data/sites.json", import.meta.url), "utf8"));

// Fake terrain per site: base height + three bumps, seeded from the site id so it's stable.
// Malapert Massif is a peak, so its base is negative (it sees past the flat horizon).
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32);
}
function shapeFor(id) {
  const rnd = seeded(id);
  const base = id.startsWith("malapert") ? -0.8 : 0.4 + rnd() * 1.4;
  const bumps = [0, 1, 2].map(() => [Math.floor(rnd() * 360), 0.6 + rnd() * 2.6, 15 + rnd() * 25]);
  return { base, bumps };
}

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const iso = (i) => new Date(START + i * 3600e3).toISOString().replace(".000Z", "Z");
const times = Array.from({ length: HOURS }, (_, i) => iso(i));

function makeMask(id) {
  const s = shapeFor(id);
  return Array.from({ length: 360 }, (_, az) => {
    let m = s.base;
    for (const [c, h, w] of s.bumps) {
      const d = Math.min(Math.abs(az - c), 360 - Math.abs(az - c));
      m += h * Math.exp(-((d / w) ** 2));
    }
    return r2(m);
  });
}

function maskAt(mask, az) {
  // linear interpolation with wrap, same as metrics.py np.interp(period=360)
  const a = ((az % 360) + 360) % 360;
  const i = Math.floor(a), f = a - i;
  return mask[i] * (1 - f) + mask[(i + 1) % 360] * f;
}

function tracks(site) {
  const sun = { az: [], el: [] }, earth = { az: [], el: [] };
  const latR = rad(site.lat);
  for (let i = 0; i < HOURS; i++) {
    // Sun hour angle: phased so the Sun is up at LAND_AT_INDEX, offset a little per site
    const lonW = site.lon_e > 180 ? site.lon_e - 360 : site.lon_e;
    const H = rad((360 * (i - LAND_AT_INDEX)) / SYNODIC_H - 45 + lonW);
    const subSolarLat = rad(1.5 * Math.sin((2 * Math.PI * i) / (HOURS * 12)));
    const libLat = rad(6.7 * Math.sin((2 * Math.PI * i) / LIBRATION_H));
    const libLon = 7.9 * Math.sin((2 * Math.PI * i) / LIBRATION_H + 1.3);
    // Sun: proper alt/az for a body at (declination, hour angle)
    const [sAz, sEl] = altaz(latR, subSolarLat, H);
    // Earth: sits near sub-Earth point (lat 0, lon 0), wobbling with libration
    const [eAz, eEl] = altaz(latR, libLat, rad(site.lon_e - libLon));
    sun.az.push(r2(sAz)); sun.el.push(r2(sEl));
    earth.az.push(r2(eAz)); earth.el.push(r2(eEl));
  }
  return { sun, earth };
}

// Azimuth clockwise from local north; elevation above flat horizon.
function altaz(lat, dec, H) {
  const sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  const el = Math.asin(sinEl);
  const y = -Math.sin(H) * Math.cos(dec);
  const x = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(H);
  const az = (deg(Math.atan2(y, x)) + 360) % 360;
  return [az, deg(el)];
}

const longestRun = (flags, v) => { let b = 0, c = 0; for (const f of flags) { c = f === v ? c + 1 : 0; b = Math.max(b, c); } return b; };
const pct = (flags) => r1((100 * flags.filter(Boolean).length) / flags.length);
function nextSetH(flags, i0) {
  if (!flags[i0]) return null;
  for (let i = i0; i < flags.length; i++) if (!flags[i]) return (i - i0) * STEP_H;
  return -1;
}
function bothWindows(both) {
  const out = []; let s = -1;
  for (let i = 0; i <= both.length; i++) {
    if (i < both.length && both[i]) { if (s < 0) s = i; }
    else if (s >= 0) { out.push({ start: times[s], stop: times[i - 1], hours: (i - s) * STEP_H }); s = -1; }
  }
  return out;
}

function ephemeris(site, horizon) {
  const t = tracks(site);
  const useTerrain = horizon === "terrain" && site.group !== "control";
  const mask = useTerrain ? makeMask(site.id) : null;
  const vis = (b) => b.el.map((el, i) => el > (mask ? maskAt(mask, b.az[i]) : 0));
  return {
    site: site.id,
    start: times[0],
    stop: "2026-12-31T00:00:00Z",
    step_h: STEP_H,
    horizon: useTerrain ? "terrain" : "flat",
    times,
    sun: { ...t.sun, visible: vis(t.sun) },
    earth: { ...t.earth, visible: vis(t.earth) },
    mask_deg: mask,
  };
}

function summary(site, e) {
  const sv = e.sun.visible, ev = e.earth.visible, both = sv.map((v, i) => v && ev[i]);
  const lit = e.sun.el.filter((_, i) => sv[i]);
  return {
    site: site.id,
    name: site.name,
    horizon: e.horizon,
    pct_sunlit: pct(sv),
    longest_dark_h: longestRun(sv, false) * STEP_H,
    pct_earth: pct(ev),
    longest_blackout_h: longestRun(ev, false) * STEP_H,
    pct_both: pct(both),
    max_sun_el_deg: r1(Math.max(...e.sun.el)),
    mean_sun_el_deg: lit.length ? r1(lit.reduce((a, b) => a + b, 0) / lit.length) : null,
    next_sunset_h: nextSetH(sv, LAND_AT_INDEX),
    next_earthset_h: nextSetH(ev, LAND_AT_INDEX),
    both_windows: bothWindows(both),
  };
}

for (const f of readdirSync(OUT)) if (f.endsWith(".json")) rmSync(new URL(f, OUT));
const write = (name, obj) => writeFileSync(new URL(name, OUT), JSON.stringify(obj) + "\n");
write("sites.json", sites);
for (const horizon of ["flat", "terrain"]) {
  const results = [];
  for (const s of sites) {
    const e = ephemeris(s, horizon);
    write(`ephemeris_${s.id}_${horizon}.json`, e);
    results.push(summary(s, e));
  }
  write(`compare_${horizon}.json`, {
    start: times[0], stop: "2026-12-31T00:00:00Z", step_h: STEP_H, land_at: times[LAND_AT_INDEX], results,
  });
}
