import { firstWindow, fmtUtc, hours } from "../format";
import type { CompareResponse } from "../types";

interface Props {
  cmp: CompareResponse;
  minHours: number;
  onMinHours: (h: number) => void;
  onLand: (iso: string) => void;
}

const PRESETS = [24, 72, 168];

export default function WindowFinder({ cmp, minHours, onMinHours, onLand }: Props) {
  const rows = cmp.results.map((r) => ({ r, w: firstWindow(r.both_windows, minHours) }));
  const earliest = rows.reduce<string | null>((a, { w }) => (w && (!a || w.start < a) ? w.start : a), null);
  return (
    <div className="panel finder">
      <div className="fields">
        <div className="seg" role="group" aria-label="Minimum window">
          {PRESETS.map((h) => (
            <button type="button" key={h} className={minHours === h ? "on" : ""} onClick={() => onMinHours(h)}>
              {h < 48 ? `${h} h` : `${h / 24} days`}
            </button>
          ))}
        </div>
        <label className="inline">
          or
          <input
            type="number"
            min={1}
            max={2000}
            value={minHours}
            onChange={(e) => onMinHours(Math.max(1, Number(e.target.value) || 1))}
          />
          hours
        </label>
      </div>
      <ul className="windows">
        {rows.map(({ r, w }) => (
          <li key={r.site} className={w && w.start === earliest ? "first" : ""}>
            <span className="name">{r.name}</span>
            {w ? (
              <>
                <span>
                  {fmtUtc(w.start)} → {fmtUtc(w.stop)} <span className="muted">({hours(w.hours)})</span>
                  {w.start === earliest && <span className="tag good">earliest</span>}
                </span>
                <button type="button" className="link" onClick={() => onLand(w.start)}>
                  Land then
                </button>
              </>
            ) : (
              <span className="muted">no window that long in this date range</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
