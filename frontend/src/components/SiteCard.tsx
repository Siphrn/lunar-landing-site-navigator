import { fmtUtc, hours, untilSet } from "../format";
import type { EphemerisResponse, Horizon, SiteMetrics } from "../types";
import SkyPlot from "./SkyPlot";
import Timeline from "./Timeline";

interface Props {
  metrics: SiteMetrics;
  eph: EphemerisResponse | undefined;
  requested: Horizon;
  landAt: string | null;
  zoom: boolean;
}

export default function SiteCard({ metrics: m, eph, requested, landAt, zoom }: Props) {
  const markIndex = eph && landAt ? eph.times.indexOf(landAt) : -1;
  const fellBack = requested === "terrain" && m.horizon === "flat";
  const best = m.both_windows.reduce<(typeof m.both_windows)[number] | null>(
    (a, w) => (!a || w.hours > a.hours ? w : a),
    null,
  );
  return (
    <article className="card panel">
      <header>
        <h3>{m.name}</h3>
        <span className={`tag ${fellBack ? "warn" : ""}`}>
          {fellBack ? "flat horizon (terrain not available)" : `${m.horizon} horizon`}
        </span>
      </header>

      <div className="stats">
        <div className="stat sun">
          <b>{m.pct_sunlit}%</b>
          <span>sunlit</span>
          <small>longest night {hours(m.longest_dark_h)}</small>
        </div>
        <div className="stat earth">
          <b>{m.pct_earth}%</b>
          <span>Earth in view</span>
          <small>longest blackout {hours(m.longest_blackout_h)}</small>
        </div>
        <div className="stat both">
          <b>{m.pct_both}%</b>
          <span>Sun + Earth</span>
          <small>Sun up to {m.max_sun_el_deg}°</small>
        </div>
      </div>

      <dl className="after-landing">
        <div>
          <dt>Sunset after landing</dt>
          <dd>{untilSet(m.next_sunset_h)}</dd>
        </div>
        <div>
          <dt>Earthset after landing</dt>
          <dd>{untilSet(m.next_earthset_h)}</dd>
        </div>
        <div>
          <dt>Longest Sun + Earth window</dt>
          <dd>{best ? `${hours(best.hours)} from ${fmtUtc(best.start)}` : "none in range"}</dd>
        </div>
      </dl>

      {eph ? (
        <>
          <SkyPlot eph={eph} markIndex={markIndex} zoom={zoom} />
          <Timeline eph={eph} landAt={markIndex >= 0 ? landAt : null} />
        </>
      ) : (
        <p className="muted">Loading sky data…</p>
      )}
    </article>
  );
}
