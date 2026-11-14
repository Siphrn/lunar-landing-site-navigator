import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dataSource, getCompare, getEphemeris, getSites, type DataSource } from "./api";
import { HAS_SNAPSHOT, snapshotIndex } from "./snapshot";
import CompareTable from "./components/CompareTable";
import Controls, { MAX_SITES, type Query } from "./components/Controls";
import Explain from "./components/Explain";
import MapView from "./components/MapView";
import Scrubber from "./components/Scrubber";
import SiteCard from "./components/SiteCard";
import WindowFinder from "./components/WindowFinder";
import type { CompareResponse, EphemerisResponse, Horizon, Site } from "./types";

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
      <header className="top">
        <div className="hero">
          <p className="eyebrow">NASA Space Apps 2026 · Lunar south pole</p>
          <h1>Lunar Landing Site Navigator</h1>
          <p className="lede">
            Compare landing sites in seconds: when is there <span className="sun-t">sunlight for power</span> and{" "}
            <span className="earth-t">Earth in view for radio</span>?
          </p>
          <div className="hero-meta">
            <button type="button" className="ghost" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
              {showHelp ? "Hide the guide" : "New here? How to read this"}
            </button>
            {source === "mock" && <span className="tag warn">Mock data: numbers are not real</span>}
            {source === "snapshot" && (
              <span
                className="tag info"
                title="Saved answers from the real API, computed in your browser. No backend needed."
              >
                Offline snapshot · {snapRange ? `${snapRange.min} to ${snapRange.max}` : "real data"}
              </span>
            )}
            {source === "live" && <span className="tag live">Live data</span>}
          </div>
        </div>
      </header>

      <main>
        {showHelp && <Explain onClose={() => setShowHelp(false)} />}

        <div className="top-grid">
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
          <MapView sites={sites} selected={draft.sites} onToggle={toggleSite} full={draft.sites.length >= MAX_SITES} />
        </div>

        {error && <p className="error panel">{error}</p>}

        {cmp && (
          <>
            <section>
              <div className="section-head">
                <h2>Comparison</h2>
                <span className="section-sub">Best in each column highlighted</span>
              </div>
              <CompareTable cmp={cmp} requested={query?.horizon ?? "terrain"} requestedMast={query?.mastM ?? 0} />
            </section>

            <section>
              <div className="section-head">
                <h2>Best landing window</h2>
                <span className="section-sub">Sun and Earth both up, for at least…</span>
              </div>
              <WindowFinder cmp={cmp} minHours={minHours} onMinHours={setMinHours} onLand={landAt} />
            </section>

            <section>
              <div className="section-head">
                <h2>Sky and timeline</h2>
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
              <div className={`cards ${loading ? "stale" : ""}`}>
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

      <footer>
        <span>Sun and Earth positions: NASA/JPL Horizons</span>
        <span>Terrain: LRO LOLA elevation models, NASA PGDA</span>
        <span>Built for the NASA Space Apps Challenge 2026</span>
      </footer>
    </>
  );
}
