import { useEffect, useRef } from "react";
import { fmtUtc } from "../format";

interface Props {
  times: string[];
  index: number;
  onIndex: (i: number) => void;
  playing: boolean;
  onPlaying: (p: boolean) => void;
  /** Hours advanced per animation frame. */
  speed: number;
  onSpeed: (h: number) => void;
  landIndex: number;
  stepH: number;
}

const SPEEDS = [
  { h: 1, label: "1 h / frame" },
  { h: 3, label: "3 h / frame" },
  { h: 6, label: "6 h / frame" },
  { h: 12, label: "12 h / frame" },
];
const FRAME_MS = 80;

/** Time slider + play/pause shared by every site card. */
export default function Scrubber({
  times,
  index,
  onIndex,
  playing,
  onPlaying,
  speed,
  onSpeed,
  landIndex,
  stepH,
}: Props) {
  const last = times.length - 1;
  // Keep the latest index in a ref so the interval doesn't restart every frame.
  const idx = useRef(index);
  idx.current = index;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = idx.current + Math.max(1, Math.round(speed / stepH));
      if (next > last) {
        onIndex(last);
        onPlaying(false);
      } else onIndex(next);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [playing, speed, stepH, last, onIndex, onPlaying]);

  const elapsedH = index * stepH;
  return (
    <div className="scrubber panel">
      <button
        type="button"
        className="play"
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => {
          if (!playing && index >= last) onIndex(0);
          onPlaying(!playing);
        }}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="scrub-main">
        <div className="scrub-label">
          <b>{fmtUtc(times[index], true)}</b>
          <span className="muted">
            day {(elapsedH / 24).toFixed(1)} of {((last * stepH) / 24).toFixed(0)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={last}
          value={index}
          aria-label="Time"
          onChange={(e) => {
            onPlaying(false);
            onIndex(Number(e.target.value));
          }}
        />
      </div>
      <div className="scrub-side">
        <select value={speed} onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Animation speed">
          {SPEEDS.map((s) => (
            <option key={s.h} value={s.h}>
              {s.label}
            </option>
          ))}
        </select>
        {landIndex >= 0 && (
          <button
            type="button"
            className="link"
            onClick={() => {
              onPlaying(false);
              onIndex(landIndex);
            }}
          >
            Jump to landing
          </button>
        )}
      </div>
    </div>
  );
}
