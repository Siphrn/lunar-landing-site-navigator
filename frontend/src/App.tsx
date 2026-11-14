import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dataSource, getCompare, getEphemeris, getSites, type DataSource } from "./api";
import { HAS_SNAPSHOT, snapshotIndex } from "./snapshot";
import CompareTable from "./components/CompareTable";
import Controls, { MAX_SITES, type Query } from "./components/Controls";
import Explain from "./components/Explain";
import Highlights from "./components/Highlights";
import MapView from "./components/MapView";
import Scrubber from "./components/Scrubber";
import SiteCard from "./components/SiteCard";
import WindowFinder from "./components/WindowFinder";
import type { CompareResponse, EphemerisResponse, Horizon, Site } from "./types";
import { fmtUtc } from "./format";

/** "Dec 1 – Dec 31, 2026" for the compared period (stop is exclusive). */
function fmtRange(start: string, stop: string) {
  const a = fmtUtc(start).split(",")[0];
  const lastDay = new Date(Date.parse(stop) - 1);
  return `${a} – ${fmtUtc(lastDay.toISOString()).split(",")[0]}, ${lastDay.getUTCFullYear()}`;
}

const DEFAULT_QUERY: Query = {
  // Picked from real data: a peak with great Earth view, a massif, and a rim that never sees Earth.
  sites: ["mons_mouton", "malapert_massif", "nobile_rim_1"],
  start: "2026-12-01",
  stop: "2026-12-31",
  landAt: "2026-12-15T12:00",
  horizon: "terrain",
  mastM: 0,
};

const toIso = (local: string) => (local ? `${local.length === 16 ? local + ":00" : local}Z` : undefined);

export default function App() {
  const [sites, setSites] = useState<Site[]>([]);
  const [draft, setDraft] = useState<Query>(DEFAULT_QUERY);
  const [query, setQuery] = useState<Query | null>(null);
  const [cmp, setCmp] = useState<CompareResponse | null>(null);
  const [ephs, setEphs] = useState<Record<string, EphemerisResponse>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [minHours, setMinHours] = useState(72);
  const [cursor, setCursor] = useState(-1); // index into the shared time axis
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const reqId = useRef(0);
  const [source, setSource] = useState<DataSource>(dataSource());
  const [snapRange, setSnapRange] = useState<{ min: string; max: string } | null>(null);

  useEffect(() => {
    if (!HAS_SNAPSHOT) return;
    snapshotIndex()
      .then((i) => {
        // stop is exclusive, so the last pickable day is the one before it
        const last = new Date(Date.parse(i.stop) - 86_400_000).toISOString().slice(0, 10);
        setSnapRange({ min: i.start.slice(0, 10), max: last });
      })
      .catch(() => setSnapRange(null));
  }, []);

  useEffect(() => {
    getSites()
      .then((list) => {
        setSites(list);
        setSource(dataSource());
        // keep only default sites that actually exist (IDs may change after the 12:00 sync)
        const ids = new Set(list.map((s) => s.id));
        const picked = DEFAULT_QUERY.sites.filter((id) => ids.has(id));
        const q = {
          ...DEFAULT_QUERY,
          sites: picked.length ? picked : list.slice(0, 3).map((s) => s.id),
        };
        setDraft(q);
        setQuery(q);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const run = useCallback(async (q: Query) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    const range = {
      start: q.start,
      stop: q.stop,
      step_h: 1,
      horizon: q.horizon,
      mast_m: q.mastM,
    };
    try {
      const [c, ...es] = await Promise.all([
        getCompare(q.sites, range, toIso(q.landAt)),
        ...q.sites.map((s) => getEphemeris(s, range)),
      ]);
      if (id !== reqId.current) return; // a newer request finished first
      setSource(dataSource());
      setCmp(c);
      setEphs(Object.fromEntries(es.map((e) => [e.site, e])));
      // Start the scrubber at the landing time (or the start of the range).
      const land = c.land_at ? (es[0]?.times.indexOf(c.land_at) ?? -1) : -1;
      setCursor(land >= 0 ? land : 0);
      setPlaying(false);
    } catch (e) {
      if (id === reqId.current) setError((e as Error).message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) void run(query);
  }, [query, run]);

  const onHorizon = (h: Horizon) => {
    // Horizon toggles apply immediately: it's the key demo moment.
    const next = { ...draft, horizon: h };
    setDraft(next);
    setQuery(next);
  };

  const onMast = (m: number) => {
    const next = { ...draft, mastM: m };
    setDraft(next);
    setQuery(next);
  };

  const toggleSite = (id: string) => {
    const on = draft.sites.includes(id);
    if (!on && draft.sites.length >= MAX_SITES) return;
    setDraft({
      ...draft,
      sites: on ? draft.sites.filter((x) => x !== id) : [...draft.sites, id],
    });
  };

  /** Land at a chosen time: re-run with the same sites, dates and horizon. */
  const landAt = (iso: string) => {
    const next = { ...(query ?? draft), landAt: iso.slice(0, 16) };
    setDraft(next);
    setQuery(next);
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(query);

  // All sites share one time axis (same start, stop and step), so use the first one's.
  const times = useMemo(() => Object.values(ephs)[0]?.times ?? [], [ephs]);
  const cursorIso = cursor >= 0 && cursor < times.length ? times[cursor] : null;
  const pickTime = useCallback(
    (iso: string) => {
      const i = times.indexOf(iso);
      if (i >= 0) {
        setPlaying(false);
        setCursor(i);
      }
    },
    [times],
  );
  const landAtIso = cmp?.land_at ?? toIso(query?.landAt ?? "") ?? null;

  return (
    <>
      <a className="skip" href="#compare">
        Skip to results
      </a>
      <header className="appbar">
        <div className="appbar-inner">
          <div className="brand">
            <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="13" />
              <circle cx="12" cy="13" r="2.6" />
              <circle cx="20" cy="20" r="3.4" />
              <circle cx="20.5" cy="11" r="1.6" />
            </svg>
            <div>
              <h1>Lunar Landing Site Navigator</h1>
              <p className="tagline">
                <span className="t-sun">Sunlight</span> and <span className="t-earth">Earth visibility</span> at the
                lunar south pole
              </p>
            </div>
          </div>
          <div className="appbar-meta">
            {source === "mock" && <span className="tag warn">Mock data: numbers are not real</span>}
            {source === "snapshot" && (
              <span
                className="tag info"
                title={`Saved answers from the real API, computed in your browser${snapRange ? ` (${snapRange.min} to ${snapRange.max})` : ""}.`}
              >
                Offline snapshot
              </span>
            )}
            {source === "live" && <span className="tag live">Live data</span>}
            <button type="button" className="ghost" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
              {showHelp ? "Hide guide" : "How to read this"}
            </button>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <Controls
            sites={sites}
            draft={draft}
            onDraft={setDraft}
            onSubmit={() => setQuery(draft)}
            onHorizon={onHorizon}
            onMast={onMast}
            loading={loading}
            dirty={dirty}
            dateLimits={source === "snapshot" ? snapRange : null}
          />
        </aside>

        <main id="main">
          {showHelp && <Explain onClose={() => setShowHelp(false)} />}
          {error && (
            <p className="error panel" role="alert">
              {error}
            </p>
          )}

          <section className="overview" aria-label="Map and leaders">
            <MapView
              sites={sites}
              selected={draft.sites}
              onToggle={toggleSite}
              full={draft.sites.length >= MAX_SITES}
            />
            {cmp && (
              <div className="panel leaders">
                <div className="panel-head">
                  <h3>At a glance</h3>
                  <span className="sub">
                    {cmp.results.length} sites · {fmtRange(cmp.start, cmp.stop)}
                  </span>
                </div>
                <Highlights cmp={cmp} />
                <div className="picked">
                  <h4>Selected sites</h4>
                  <ul>
                    {cmp.results.map((r) => {
                      const site = sites.find((x) => x.id === r.site);
                      return (
                        <li key={r.site}>
                          <span>{r.name}</span>
                          {site && (
                            <span className="coords">
                              {Math.abs(site.lat).toFixed(2)}°{site.lat < 0 ? "S" : "N"}, {site.lon_e.toFixed(2)}°E
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {cmp && (
            <>
              <section id="compare" aria-labelledby="compare-title">
                <div className="section-head">
                  <h2 id="compare-title" className="flow-title">
                    <span className="step-n" aria-hidden="true">
                      2
                    </span>
                    Compare
                  </h2>
                  <ul className="key" aria-label="Column colours">
                    <li>
                      <i className="dot sun" /> Sunlight (power)
                    </li>
                    <li>
                      <i className="dot earth" /> Earth in view (radio)
                    </li>
                    <li>
                      <i className="dot both" /> Both at once
                    </li>
                    <li>↑ higher is better · ↓ lower is better</li>
                  </ul>
                </div>
                <CompareTable cmp={cmp} requested={query?.horizon ?? "terrain"} requestedMast={query?.mastM ?? 0} />

                <div className="subsection">
                  <h3>Best landing window</h3>
                  <p className="sub">First stretch with the Sun and Earth both up, for at least…</p>
                  <WindowFinder cmp={cmp} minHours={minHours} onMinHours={setMinHours} onLand={landAt} />
                </div>
              </section>

              <section id="explore" aria-labelledby="explore-title">
                <div className="section-head">
                  <h2 id="explore-title" className="flow-title">
                    <span className="step-n" aria-hidden="true">
                      3
                    </span>
                    Explore timelines
                  </h2>
                  <label className="toggle">
                    <input type="checkbox" checked={zoom} onChange={(e) => setZoom(e.target.checked)} />
                    Zoom to horizon
                  </label>
                </div>
                <ul className="legend" aria-label="Chart legend">
                  <li>
                    <i className="sw sun" /> Sun
                  </li>
                  <li>
                    <i className="sw earth" /> Earth
                  </li>
                  <li>
                    <i className="sw both" /> Both up
                  </li>
                  <li>
                    <i className="sw terrain" /> Terrain
                  </li>
                  <li>
                    <i className="sw dotted" /> Hidden
                  </li>
                  <li>
                    <i className="sw now" /> Slider time
                  </li>
                </ul>
                {times.length > 0 && cursor >= 0 && (
                  <Scrubber
                    times={times}
                    index={Math.min(cursor, times.length - 1)}
                    onIndex={setCursor}
                    playing={playing}
                    onPlaying={setPlaying}
                    speed={speed}
                    onSpeed={setSpeed}
                    landIndex={cmp.land_at ? times.indexOf(cmp.land_at) : -1}
                    stepH={cmp.step_h}
                  />
                )}
                <div className={`cards ${loading ? "stale" : ""}`} aria-busy={loading}>
                  {cmp.results.map((m) => (
                    <SiteCard
                      key={m.site}
                      metrics={m}
                      eph={ephs[m.site]}
                      requested={query?.horizon ?? "terrain"}
                      requestedMast={query?.mastM ?? 0}
                      landAt={landAtIso}
                      cursor={cursorIso}
                      onPick={pickTime}
                      zoom={zoom}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <footer>
        <span>Sun and Earth positions: NASA/JPL Horizons</span>
        <span>Terrain: LRO LOLA elevation models, NASA PGDA</span>
        <span>NASA Space Apps Challenge 2026</span>
      </footer>
    </>
  );
}
