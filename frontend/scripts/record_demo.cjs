// Records the ~60 s demo from the README ("Demo, submission and resume") with on-screen captions.
//   node scripts/record_demo.cjs [app URL] [output dir]
// e.g. node scripts/record_demo.cjs https://<owner>.github.io/nasaSpaceAppChallenge/ demo
// Needs Playwright (with Chromium). Writes demo.webm, and demo.mp4 if ffmpeg is installed.
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
  const page = await ctx.newPage();

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

  // 0–10 s: the problem
  await caption("A launch slips two weeks. Is our south-pole landing site still viable?");
  await wait(4500);
  await caption("Pick candidate sites on the map or the list: Mons Mouton, Malapert Massif, Nobile Rim 1");
  await wait(4500);

  // 10–30 s: the comparison
  await scrollTo("h2", 10);
  await caption("Side by side: hours of sunlight for power, Earth in view for radio, and the longest night");
  await wait(5000);
  await scrollTo(".cards", 120);
  await caption("The sky dome: the Sun (orange) circles just above the real terrain horizon (brown)");
  await wait(4000);
  await page.click(".play");
  await caption("Play the month: the Sun ducks behind crater rims; Earth (blue) hides at some sites");
  await wait(6000);
  await page.click(".play");
  await caption("");

  // 30–45 s: flat vs terrain (captions quote the biggest change, read off the page)
  const terrainBoth = await column("% Sun + Earth");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(800);
  await page.getByRole("button", { name: "Flat horizon" }).click();
  await settle();
  await scrollTo("h2", 10);
  const flatBoth = await column("% Sun + Earth");
  await caption("Flat horizon: pretend the Moon is a smooth ball...");
  await wait(4000);
  await caption("");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(600);
  await page.getByRole("button", { name: "Terrain horizon" }).click();
  await settle();
  await scrollTo("h2", 10);
  const pct = (t) => parseFloat(t);
  const site = Object.keys(terrainBoth).sort(
    (a, b) => Math.abs(pct(flatBoth[b]) - pct(terrainBoth[b])) - Math.abs(pct(flatBoth[a]) - pct(terrainBoth[a])),
  )[0];
  await caption(
    `...vs real LOLA terrain: at ${site}, time with both Sun and Earth up goes from ${flatBoth[site]} to ${terrainBoth[site]}`,
  );
  await wait(5000);

  // 45–60 s: shift the dates by two weeks. Captions read the real numbers off the page,
  // so they stay true if the data changes.
  const firstRow = () =>
    page.evaluate(() => {
      const cells = [...document.querySelectorAll("table tbody tr:first-child td")].map((td) => td.textContent.trim());
      return { name: cells[0], sunset: cells[cells.length - 2], earthset: cells[cells.length - 1] };
    });
  const before = await firstRow();
  await scrollTo("h2", 10);
  await caption(
    `Landing at ${before.name} on Dec 15: ${phrase("the Sun", before.sunset)} and ${phrase("Earth", before.earthset)}`,
  );
  await wait(5000);
  await caption("");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(600);
  await caption("Now slip the launch two weeks...");
  await page.fill("input[type=date] >> nth=0", "2026-12-15");
  await page.fill("input[type=date] >> nth=1", "2027-01-13");
  await page.fill("input[type=datetime-local]", "2026-12-29T12:00");
  await wait(1200);
  await page.click("button[type=submit]");
  await settle();
  await scrollTo("h2", 10);
  const after = await firstRow();
  await caption(
    `Land on Dec 29 instead: ${phrase("the Sun", after.sunset)} and ${phrase("Earth", after.earthset)}`,
  );
  await wait(6000);
  await scrollTo(".finder", 90);
  await caption("So when should we land? The first stretch with both sunlight and Earth contact, per site");
  await wait(5000);
  await caption("Data: NASA/JPL Horizons and LRO LOLA (NASA PGDA). Lunar Landing Site Navigator, Space Apps 2026");
  await wait(4000);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const webm = path.join(OUT, "demo.webm");
  fs.renameSync(await video.path(), webm);
  console.log("wrote", webm);
  try {
    const mp4 = path.join(OUT, "demo.mp4");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", mp4]);
    console.log("wrote", mp4);
  } catch {
    console.log("ffmpeg not found: only the .webm was written");
  }
})();
