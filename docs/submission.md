# Space Apps 2026 submission (copy-paste, matches the form)

Each heading below is one field on the Space Apps project form, in order.

## Project Name

Lunar Landing Site Navigator

## Summary  (field limit 1,500 characters; this is about 950, 167 words)

At the Moon's south pole the Sun never rises more than a few degrees. It circles the horizon, so a crater rim can hide it for days, and Earth sits right on the horizon too. Moving a lander a kilometre, or slipping a launch two weeks, can turn steady solar power into a two-week night or cut radio contact. Our web app lets a mission planner, a teacher or a curious student pick 2–4 candidate south-pole sites and a date range, and see in seconds when each site has sunlight for power and Earth in view for radio. It uses real Sun and Earth positions from JPL Horizons and real terrain from NASA's LOLA laser altimeter: we compute each site's true horizon in every direction, including the Moon's curvature, so the answers reflect the actual landscape rather than a flat Moon. Side-by-side metrics (% sunlit, longest night, % Earth in view, longest blackout, best landing window, time to sunset after landing) make site and date trade-offs obvious.

## Project Demonstration

**Rule: a video of 30 seconds or less, or at most 7 slides, at a public link with no login.**
A 29.5-second video recorded from the real app, with captions (numbers are read off the page, so they match the data):

https://github.com/Siphrn/nasaSpaceAppChallenge/blob/main/docs/demo.mp4

It is regenerated with `node docs/record_demo_30s.cjs` (see the file header). B's longer ~69 s walkthrough can go in Project Details as an extra if wanted.

## Project

https://siphrn.github.io/nasaSpaceAppChallenge/

(Code: https://github.com/Siphrn/nasaSpaceAppChallenge. The live app links to the repo, and the repo README links to the app.)

## Project Details

**What it does.** One screen answers: "At this site, on these dates, when do we have sunlight and Earth in view?" Pick sites from NASA's Artemis III candidate regions (plus the Shackleton connecting ridge and two Apollo sites as near-equator controls), choose dates and a landing time, and compare:

- % of time sunlit and the longest night (battery sizing)
- % of time Earth is in view and the longest radio blackout
- hours with both Sun and Earth up, and the best landing window
- time until sunset and Earthset after the chosen landing time
- maximum Sun elevation (solar-panel tilt)

Each site gets a sky dome (the real terrain horizon with the Sun's and Earth's paths) and an hour-by-hour timeline. Switches show the effect of terrain versus a flat horizon, and of a 10 m mast. A map of the south pole, an animation scrubber and a plain-language "How to read this" panel make it usable by non-specialists.

**How it works.**

1. *Sky positions.* We query the JPL Horizons API for the Sun's and Earth's azimuth and elevation from each lunar surface site, hourly, and cache the results so the app works offline.
2. *Terrain horizon.* For each site we ray-cast NASA's LOLA south-pole elevation model (80 m per pixel): 360 compass directions, out to 150 km, keeping the steepest angle along each ray. We correct for the Moon's curvature (radius 1,737.4 km), which hides about 2.9 km of terrain at 100 km. Ray directions come from great-circle geometry and the map's own projection, which avoids the classic polar-stereographic rotation bug.
3. *Visibility.* A body is visible when its elevation is above the horizon in its direction. There is no atmosphere, so no refraction correction is needed.
4. *App.* A FastAPI backend serves the sites, ephemerides and comparisons; a React + TypeScript + Plotly frontend on GitHub Pages shows them, with a built-in data snapshot so the demo never breaks.

**How we checked it.** Fake-Moon tests with mountains at known positions; a second, independent horizon method that agrees on every site to within 0.04°; Sun and Earth results that match what is known (the Shackleton connecting ridge comes out sunlit 100% of these southern-summer weeks); and every key site checked against NASA's official candidate-region outlines in LROC Quickmap. That check caught one site point lying outside its region, which we then moved.

**Benefits.** Planners can compare alternatives in seconds when a launch slips or a site changes, instead of combining three specialist tools. The flat-versus-terrain switch shows why topography dominates at the pole: over December 2026 at Nobile Rim 1, time with both Sun and Earth up drops from 57.5% to 9.2% once real terrain is included, while Malapert Massif, a high point that sees past the flat horizon, goes from 62% to 100% sunlit.

**Tools.** Python (NumPy, rasterio, pyproj, FastAPI), TypeScript, React, Vite, Plotly, GitHub Pages, Render.

**Limitations.** Hourly sampling; 80 m terrain resolution (small nearby hills are smoothed); one exact point per candidate region; the Sun's centre is tested, not its disc; cached dates cover 17 Nov 2026 to 14 Jan 2027 (polar summer).

**Use of Super Intelligence tools.** Code and documentation in this project were written with help from Anthropic's Claude (Claude Code), as stated in the repository README. The screenshots are of our own running app; no images, audio or video in the project are AI-generated.

## Use of Super Intelligence (SI)  (checkboxes, not seen by judges)

Tick:
- Coding, Debugging, or Troubleshooting
- Ideation or Brainstorming
- Research or Information Gathering
- Data Analysis and Interpretation

(Do not tick image, video or audio generation: none of those are AI-generated.)

## NASA Data  (one row per link: Link Text | Link URL)

| Link Text | Link URL |
| --- | --- |
| JPL Horizons System API (Sun and Earth positions from lunar surface sites) | https://ssd-api.jpl.nasa.gov/doc/horizons.html |
| LRO LOLA south-pole elevation models, NASA PGDA product 90 (Barker et al. 2021) | https://pgda.gsfc.nasa.gov/products/90 |
| NASA Artemis III candidate landing regions | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ |

## Space Agency Partner & Other Data  (Link Text | Link URL)

| Link Text | Link URL |
| --- | --- |
| LROC Quickmap (ASU / NASA LRO), candidate-region outlines used to check site positions | https://quickmap.lroc.asu.edu |
| Plotly (charts) | https://plotly.com/javascript/ |
| React | https://react.dev |
| FastAPI | https://fastapi.tiangolo.com |
| rasterio (reading the elevation map) | https://rasterio.readthedocs.io |
| pyproj (map projections) | https://pyproj4.github.io/pyproj/ |
| Claude Code (AI coding assistant, Anthropic) | https://www.anthropic.com/claude-code |
