// Temporary smoke-test page: proves types, api.ts, mocks and Plotly all work.
// Replace with the real layout (picker, sky plot, timeline, cards) next.
import { useEffect, useState } from "react";
import { getCompare, getEphemeris, getSites, USING_MOCKS } from "./api";
import type { CompareResponse, EphemerisResponse, Horizon, Site } from "./types";
import Plot from "./Plot";

const RANGE = { start: "2026-12-01", stop: "2026-12-31", step_h: 1 };
const LAND_AT = "2026-12-05T12:00:00Z";

/** Insert nulls where azimuth wraps 360 -> 0 so Plotly doesn't draw across the dome. */
function breakAtWrap(az: number[], el: number[]) {
  const theta: (number | null)[] = [];
  const r: (number | null)[] = [];
  az.forEach((a, i) => {
    if (i > 0 && Math.abs(a - az[i - 1]) > 180) {
      theta.push(null);
      r.push(null);
    }
    theta.push(a);
    r.push(90 - el[i]);
  });
  return { theta, r };
}

export default function App() {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("haworth");
  const [horizon, setHorizon] = useState<Horizon>("terrain");
  const [eph, setEph] = useState<EphemerisResponse | null>(null);
  const [cmp, setCmp] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSites().then(setSites).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!sites.length) return;
    const q = { ...RANGE, horizon };
    Promise.all([getEphemeris(siteId, q), getCompare(sites.map((s) => s.id), q, LAND_AT)])
      .then(([e, c]) => {
        setEph(e);
        setCmp(c);
      })
      .catch((e: Error) => setError(e.message));
  }, [sites, siteId, horizon]);

  const sun = eph && breakAtWrap(eph.sun.az, eph.sun.el);
  const earth = eph && breakAtWrap(eph.earth.az, eph.earth.el);

  return (
    <main>
      <h1>Lunar Landing Site Navigator</h1>
      <p className="muted">
        Smoke test · data source: <strong>{USING_MOCKS ? "mock files (fake numbers)" : import.meta.env.VITE_API_URL}</strong>
      </p>
      {error && <p className="error">{error}</p>}

      <div className="controls">
        <label>
          Site{" "}
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Horizon{" "}
          <select value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon)}>
            <option value="terrain">terrain</option>
            <option value="flat">flat</option>
          </select>
        </label>
        {eph && horizon === "terrain" && eph.horizon === "flat" && (
          <span className="badge">flat horizon (terrain not available)</span>
        )}
      </div>

      {eph && sun && earth && (
        <Plot
          data={[
            ...(eph.mask_deg
              ? [
                  {
                    type: "scatterpolar" as const,
                    theta: [...eph.mask_deg.map((_, i) => i * (360 / eph.mask_deg!.length)), 0],
                    r: [...eph.mask_deg.map((m) => 90 - m), 90 - eph.mask_deg[0]],
                    mode: "lines" as const,
                    name: "terrain horizon",
                    line: { color: "#8a6d4b" },
                  },
                ]
              : []),
            { type: "scatterpolar", theta: sun.theta, r: sun.r, mode: "lines", name: "Sun", line: { color: "#f5a623" } },
            { type: "scatterpolar", theta: earth.theta, r: earth.r, mode: "lines", name: "Earth", line: { color: "#3b82f6" } },
          ]}
          layout={{
            title: { text: `Sky dome: ${eph.site} (${eph.horizon})` },
            polar: {
              angularaxis: { rotation: 90, direction: "clockwise" },
              radialaxis: { range: [0, 90], tickvals: [0, 30, 60, 80, 90], ticktext: ["90°", "60°", "30°", "10°", "0°"] },
            },
            autosize: true,
            margin: { t: 50, l: 30, r: 30, b: 30 },
          }}
          useResizeHandler
          style={{ width: "100%", maxWidth: 520, height: 480 }}
          config={{ displayModeBar: false }}
        />
      )}

      {cmp && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Horizon</th>
                <th>% sunlit</th>
                <th>Longest dark (h)</th>
                <th>% Earth</th>
                <th>Longest blackout (h)</th>
                <th>% both</th>
                <th>Next sunset (h)</th>
                <th>Next Earthset (h)</th>
              </tr>
            </thead>
            <tbody>
              {cmp.results.map((r) => (
                <tr key={r.site}>
                  <td>{r.name}</td>
                  <td>{r.horizon}</td>
                  <td>{r.pct_sunlit}</td>
                  <td>{r.longest_dark_h}</td>
                  <td>{r.pct_earth}</td>
                  <td>{r.longest_blackout_h}</td>
                  <td>{r.pct_both}</td>
                  <td>{r.next_sunset_h ?? "not up"}</td>
                  <td>{r.next_earthset_h ?? "not up"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
