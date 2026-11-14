import { fmtUtc, hours, untilSet } from "../format";
import type { EphemerisResponse, Horizon, SiteMetrics } from "../types";
import SkyPlot from "./SkyPlot";
import Timeline from "./Timeline";

interface Props {
  metrics: SiteMetrics;
  eph: EphemerisResponse | undefined;
  requested: Horizon;
  requestedMast: number;
  landAt: string | null;
  /** Scrubber time (ISO) shared by all cards. */
  cursor: string | null;
  onPick: (iso: string) => void;
  zoom: boolean;
}

function Now({ label, el, az, up }: { label: string; el: number; az: number; up: boolean }) {
  return (
    <span className={`now-item ${up ? "up" : "down"}`}>
      {label} <b>{up ? "visible" : "hidden"}</b>{" "}
      <span className="muted">
        {el.toFixed(1)}° up, az {az.toFixed(0)}°
      </span>
    </span>
  );
}

export default function SiteCard({ metrics: m, eph, requested, requestedMast, landAt, cursor, onPick, zoom }: Props) {
  const landIndex = eph && landAt ? eph.times.indexOf(landAt) : -1;
  const markIndex = eph && cursor ? eph.times.indexOf(cursor) : landIndex;
  const fellBack = requested === "terrain" && m.horizon === "flat";
  const mastFellBack = !fellBack && requested === "terrain" && requestedMast > 0 && m.mast_m !== requestedMast;
  const label = fellBack
    ? "flat horizon (terrain not available)"
    : mastFellBack
      ? `terrain horizon · ground level (no ${requestedMast} m mast data)`
      : m.horizon === "terrain" && m.mast_m > 0
        ? `terrain horizon · ${m.mast_m} m mast`
        : `${m.horizon} horizon`;
  const best = m.both_windows.reduce<(typeof m.both_windows)[number] | null>(
    (a, w) => (!a || w.hours > a.hours ? w : a),
    null,
  );
  return (
    <article className="card panel">
      <header>
        <h3>{m.name}</h3>
        <span className={`tag ${fellBack || mastFellBack ? "warn" : ""}`}>{label}</span>
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
          {markIndex >= 0 && (
            <div className="now">
              <Now label="Sun" el={eph.sun.el[markIndex]} az={eph.sun.az[markIndex]} up={eph.sun.visible[markIndex]} />
              <Now
                label="Earth"
                el={eph.earth.el[markIndex]}
                az={eph.earth.az[markIndex]}
                up={eph.earth.visible[markIndex]}
              />
            </div>
          )}
          <SkyPlot eph={eph} markIndex={markIndex} zoom={zoom} />
          <Timeline eph={eph} landAt={landIndex >= 0 ? landAt : null} cursor={cursor} onPick={onPick} />
        </>
      ) : (
        <p className="muted">Loading sky data…</p>
      )}
    </article>
  );
}
