// Records the first-visit guide (flash cards) in action, with captions and a visible cursor.
//   node scripts/record_guide_demo.cjs [app URL] [output dir]
// Writes guide_demo.webm, and guide_demo.mp4 if ffmpeg is installed.
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const URL_ = process.argv[2] || "http://localhost:4173/";
const OUT = path.resolve(process.argv[3] || "demo");
const W = 1280, H = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  // A fresh browser context = a first-time visitor, so the guide opens by itself.
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } } });
  const page = await ctx.newPage();

  // Caption (top centre) and a fake cursor, re-added after every page load.
  const overlay = () =>
    page.evaluate(() => {
      if (document.getElementById("demo-cursor")) return;
      const cap = document.createElement("div");
      cap.id = "demo-caption";
      cap.style.cssText =
        "position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:10000;max-width:80%;opacity:0;" +
        "background:rgba(15,23,42,.9);color:#fff;font:600 19px/1.35 Inter,system-ui,sans-serif;padding:10px 18px;" +
        "border-radius:12px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.25);transition:opacity .25s";
      const cur = document.createElement("div");
      cur.id = "demo-cursor";
      cur.style.cssText =
        "position:fixed;left:640px;top:600px;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;z-index:10001;" +
        "background:rgba(225,29,72,.35);border:2px solid #e11d48;pointer-events:none;" +
        "transition:left .55s cubic-bezier(.4,0,.2,1),top .55s cubic-bezier(.4,0,.2,1),transform .12s";
      document.body.append(cap, cur);
    });
  const caption = (t) =>
    page.evaluate((text) => {
      const c = document.getElementById("demo-caption");
      if (!c) return;
      c.style.opacity = text ? "1" : "0";
      if (text) c.textContent = text;
    }, t);
  /** Move the visible cursor to an element, "press", then really click it. */
  const clickOn = async (locator) => {
    const box = await locator.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.evaluate(([x, y]) => {
      const c = document.getElementById("demo-cursor");
      c.style.left = x + "px";
      c.style.top = y + "px";
    }, [x, y]);
    await wait(650);
    await page.evaluate(() => (document.getElementById("demo-cursor").style.transform = "scale(.7)"));
    await locator.click();
    await wait(140);
    await page.evaluate(() => (document.getElementById("demo-cursor").style.transform = "scale(1)"));
  };
  const next = () => page.locator(".guide-next");

  await page.goto(URL_);
  await page.waitForSelector("[role=dialog]");
  await overlay();
  await wait(500);
  await caption("First visit: the guide pops up by itself");
  await wait(3200);

  const reads = [
    "One idea per card. Click Next to move on",
    "Why the pole is hard: the Sun barely rises",
    "…and Earth sits right on the horizon",
    "How to use the dashboard, in three steps",
    "How to read the sky dome",
    "What the terrain and mast options do",
    "What the three colours mean",
  ];
  for (let k = 0; k < reads.length; k++) {
    await caption(reads[k]);
    await clickOn(next());
    await wait(k === 3 ? 1800 : 2300);
    if (k === 3) {
      await caption("Back works too, like flipping flash cards");
      await clickOn(page.getByRole("button", { name: "Back", exact: true }));
      await wait(1500);
      await clickOn(next());
      await wait(1500);
    }
  }
  await caption("Last card: start exploring");
  await wait(1800);
  await clickOn(next());
  await wait(600);
  await caption("Straight into the dashboard");
  await page.waitForSelector(".card .js-plotly-plot");
  await wait(2600);

  await caption("Reopen it any time from “How to read this”");
  await clickOn(page.getByRole("button", { name: "How to read this" }));
  await wait(1800);
  await caption("The dots jump straight to any card");
  await clickOn(page.locator(".guide-dots button").nth(4));
  await wait(2200);
  await caption("…or skip it");
  await clickOn(page.getByRole("button", { name: "Skip guide" }));
  await wait(1500);

  await caption("Reload: it only pops up on the first visit");
  await wait(1200);
  await page.reload();
  await page.waitForSelector(".card .js-plotly-plot");
  await overlay();
  await caption("Reload: it only pops up on the first visit");
  await wait(3200);
  await caption("");
  await wait(400);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const webm = path.join(OUT, "guide_demo.webm");
  fs.renameSync(await video.path(), webm);
  console.log("wrote", webm);
  try {
    const mp4 = path.join(OUT, "guide_demo.mp4");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", mp4]);
    console.log("wrote", mp4);
  } catch {
    console.log("ffmpeg not found: only the .webm was written");
  }
})();
