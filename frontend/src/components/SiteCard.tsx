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

function Now({ label, el, up }: { label: string; el: number; up: boolean }) {
  return (
    <span className={`now-item ${up ? "up" : "down"}`}>
      {label}{" "}
      <span className="muted">
        {up ? "up" : "hidden"} · {el.toFixed(1)}°
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
    ? "flat · no terrain data"
    : mastFellBack
      ? "ground · no mast data"
      : m.horizon === "terrain" && m.mast_m > 0
        ? `terrain · ${m.mast_m} m mast`
        : m.horizon;
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
        </div>
        <div className="stat earth">
          <b>{m.pct_earth}%</b>
          <span>Earth in view</span>
        </div>
        <div className="stat both">
          <b>{m.pct_both}%</b>
          <span>both</span>
        </div>
      </div>

      {eph ? (
        <>
          {markIndex >= 0 && (
            <div className="now">
              <Now label="Sun" el={eph.sun.el[markIndex]} up={eph.sun.visible[markIndex]} />
              <Now label="Earth" el={eph.earth.el[markIndex]} up={eph.earth.visible[markIndex]} />
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
