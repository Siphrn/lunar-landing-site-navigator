// 30-second demo for the Space Apps submission (the form allows a video of 30 s or less).
// A shorter cut of frontend/scripts/record_demo.cjs: same story, captions read the real numbers off the page.
//   node docs/record_demo_30s.cjs [app URL] [output dir]
// e.g. cd frontend && npm run build && npx vite preview --port 4173   (then, in another shell)
//      node docs/record_demo_30s.cjs http://localhost:4173/ demo
// Needs Playwright (with Chromium) and ffmpeg. Writes demo.webm (raw) and demo_30s.mp4 (page-load trimmed, <= 29.5 s).
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const URL_ = process.argv[2] || "http://localhost:4173/";
const OUT = path.resolve(process.argv[3] || "demo");
const W = 1280, H = 720;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** "the Sun sets in 32 h" / "the Sun never sets" / "the Sun is not up" from a table cell. */
const phrase = (body, cell) =>
  cell === "never sets" ? `${body} never sets` : cell === "not up" ? `${body} is not up` : `${body} sets in ${cell}`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } } });
  const page = await ctx.newPage(); const T0 = Date.now();

  const caption = (text) =>
    page.evaluate((t) => {
      let el = document.getElementById("demo-caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "demo-caption";
        el.style.cssText =
          "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;max-width:80%;" +
          "background:rgba(15,23,42,.88);color:#fff;font:600 20px/1.35 system-ui,sans-serif;padding:12px 20px;" +
          "border-radius:12px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.25);transition:opacity .3s";
        document.body.appendChild(el);
      }
      el.style.opacity = t ? "1" : "0";
      if (t) el.textContent = t;
    }, text);
  const scrollTo = (sel, offset = 80) =>
    page.evaluate(
      ([s, o]) => {
        const el = document.querySelector(s);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - o, behavior: "smooth" });
      },
      [sel, offset],
    );
  /** {site name: cell text} for the comparison-table column whose header starts with `header`. */
  const column = (header) =>
    page.evaluate((h) => {
      const heads = [...document.querySelectorAll("table thead th")].map((th) => th.textContent.trim());
      const i = heads.findIndex((t) => t.startsWith(h));
      const out = {};
      for (const tr of document.querySelectorAll("table tbody tr")) {
        const td = tr.querySelectorAll("td");
        out[td[0].textContent.replace(/flat|ground/g, "").trim()] = td[i].textContent.trim();
      }
      return out;
    }, header);
  const settle = () => page.waitForSelector(".cards:not(.stale)").then(() => wait(600));

  await page.goto(URL_);
  await page.waitForSelector(".card .js-plotly-plot");
  await page.evaluate(() => document.querySelector("#demo-caption")?.remove());
  await settle();

  const START = (Date.now() - T0) / 1000; // seconds of page load to trim off
  await caption("A launch slips two weeks. Is our lunar south-pole landing site still viable?");
  await wait(3000);
  await scrollTo("h2", 10);
  await caption("Compare sites: hours of sunlight for power, Earth in view for radio, longest night");
  await wait(3000);
  await scrollTo(".cards", 120);
  await wait(700); // let the smooth scroll finish, or the click below scrolls the play button to the bottom edge
  await page.click(".play");
  await caption("The Sun (orange) and Earth (blue) against the real crater-rim horizon (brown)");
  await wait(3300);
  await page.click(".play");

  // flat vs terrain: caption quotes the biggest change, read off the page
  const terrainBoth = await column("% Sun + Earth");
  await caption("Flat horizon: pretend the Moon is a smooth ball...");
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.getByRole("button", { name: "Flat horizon" }).click();
  await settle();
  await scrollTo("h2", 10);
  const flatBoth = await column("% Sun + Earth");
  await wait(1200);
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.getByRole("button", { name: "Terrain horizon" }).click();
  await settle();
  await scrollTo("h2", 10);
  const pct = (t) => parseFloat(t);
  const site = Object.keys(terrainBoth).sort(
    (a, b) => Math.abs(pct(flatBoth[b]) - pct(terrainBoth[b])) - Math.abs(pct(flatBoth[a]) - pct(terrainBoth[a])),
  )[0];
  await caption(`...vs real LOLA terrain: at ${site}, time with both Sun and Earth up goes from ${flatBoth[site]} to ${terrainBoth[site]}`);
  await wait(3800);

  // shift the dates by two weeks; captions read the real numbers off the page
  const firstRow = () =>
    page.evaluate(() => {
      const cells = [...document.querySelectorAll("table tbody tr:first-child td")].map((td) => td.textContent.trim());
      return { name: cells[0], sunset: cells[cells.length - 2], earthset: cells[cells.length - 1] };
    });
  const before = await firstRow();
  await caption(`Landing at ${before.name} on Dec 15: ${phrase("the Sun", before.sunset)} and ${phrase("Earth", before.earthset)}`);
  await wait(3000);
  await caption("Now slip the launch two weeks...");
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.fill("input[type=date] >> nth=0", "2026-12-15");
  await page.fill("input[type=date] >> nth=1", "2027-01-13");
  await page.fill("input[type=datetime-local]", "2026-12-29T12:00");
  await wait(400);
  await page.click("button[type=submit]");
  await settle();
  await scrollTo("h2", 10);
  const after = await firstRow();
  await caption(`Land on Dec 29 instead: ${phrase("the Sun", after.sunset)} and ${phrase("Earth", after.earthset)}`);
  await wait(3500);
  await caption("Data: NASA/JPL Horizons + LRO LOLA terrain. Lunar Landing Site Navigator, Space Apps 2026");
  await wait(2200);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const webm = path.join(OUT, "demo.webm");
  fs.renameSync(await video.path(), webm);
  console.log("wrote", webm);
  const mp4 = path.join(OUT, "demo_30s.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(START), "-t", "29.5", "-i", webm,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", mp4]);
  console.log("wrote", mp4);
})();
