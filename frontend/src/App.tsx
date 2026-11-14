import { useCallback, useEffect, useRef, useState } from "react";
import { getCompare, getEphemeris, getSites, USING_MOCKS } from "./api";
import CompareTable from "./components/CompareTable";
import Controls, { type Query } from "./components/Controls";
import SiteCard from "./components/SiteCard";
import type { CompareResponse, EphemerisResponse, Horizon, Site } from "./types";

const DEFAULT_QUERY: Query = {
  sites: ["haworth", "malapert", "nobile_rim_1"],
  start: "2026-12-01",
  stop: "2026-12-31",
  landAt: "2026-12-05T12:00",
  horizon: "terrain",
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
  const reqId = useRef(0);

  useEffect(() => {
    getSites()
      .then((list) => {
        setSites(list);
        // keep only default sites that actually exist (IDs may change after the 12:00 sync)
        const ids = new Set(list.map((s) => s.id));
        const picked = DEFAULT_QUERY.sites.filter((id) => ids.has(id));
        const q = { ...DEFAULT_QUERY, sites: picked.length ? picked : list.slice(0, 3).map((s) => s.id) };
        setDraft(q);
        setQuery(q);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const run = useCallback(async (q: Query) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    const range = { start: q.start, stop: q.stop, step_h: 1, horizon: q.horizon };
    try {
      const [c, ...es] = await Promise.all([
        getCompare(q.sites, range, toIso(q.landAt)),
        ...q.sites.map((s) => getEphemeris(s, range)),
      ]);
      if (id !== reqId.current) return; // a newer request finished first
      setCmp(c);
      setEphs(Object.fromEntries(es.map((e) => [e.site, e])));
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

  const dirty = JSON.stringify(draft) !== JSON.stringify(query);
  const landAtIso = cmp?.land_at ?? toIso(query?.landAt ?? "") ?? null;

  return (
    <>
      <header className="top">
        <div>
          <h1>Lunar Landing Site Navigator</h1>
          <p className="muted">When does a south-pole site have sunlight for power and Earth in view for radio?</p>
        </div>
        {USING_MOCKS && <span className="tag warn">Mock data: numbers are not real</span>}
      </header>

      <main>
        <Controls
          sites={sites}
          draft={draft}
          onDraft={setDraft}
          onSubmit={() => setQuery(draft)}
          onHorizon={onHorizon}
          loading={loading}
          dirty={dirty}
        />

        {error && <p className="error panel">{error}</p>}

        {cmp && (
          <>
            <section>
              <h2>Comparison</h2>
              <CompareTable cmp={cmp} requested={query?.horizon ?? "terrain"} />
            </section>

            <section>
              <div className="section-head">
                <h2>Sky and timeline</h2>
                <label className="toggle">
                  <input type="checkbox" checked={zoom} onChange={(e) => setZoom(e.target.checked)} />
                  Zoom on the horizon
                </label>
              </div>
              <p className="muted small">
                Sky dome: north at top, east to the right, centre = straight overhead. Shaded band = terrain blocking the
                sky. Markers show the Sun (●) and Earth (◆) at the landing time (dotted line on the timeline).
              </p>
              <div className={`cards ${loading ? "stale" : ""}`}>
                {cmp.results.map((m) => (
                  <SiteCard
                    key={m.site}
                    metrics={m}
                    eph={ephs[m.site]}
                    requested={query?.horizon ?? "terrain"}
                    landAt={landAtIso}
                    zoom={zoom}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer>
        Ephemerides: NASA/JPL Horizons. Terrain: LRO LOLA elevation models via NASA PGDA. Built for NASA Space Apps
        Challenge 2026.
      </footer>
    </>
  );
}
