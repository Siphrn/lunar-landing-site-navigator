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

  // 30–45 s: flat vs terrain
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(800);
  await page.getByRole("button", { name: "Flat horizon" }).click();
  await settle();
  await scrollTo("h2", 10);
  await caption("Flat horizon: pretend the Moon is a smooth ball...");
  await wait(4000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(600);
  await page.getByRole("button", { name: "Terrain horizon" }).click();
  await settle();
  await scrollTo("h2", 10);
  await caption("...vs real LOLA terrain. Sunlight drops, and a peak can even see Earth more");
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
