import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { markGuideSeen } from "../guideState";

interface Card {
  kicker: string;
  title: string;
  art: ReactNode;
  body: ReactNode;
}

/* Small illustrations, drawn with the page's category colours. */
const Sun = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    <rect x="0" y="58" width="120" height="22" rx="4" className="art-ground" />
    <path d="M0 58 Q20 44 36 52 T70 46 T120 54 V58 Z" className="art-terrain" />
    <circle cx="86" cy="44" r="9" className="art-sun" />
    <path d="M10 60 Q60 30 112 60" className="art-path-sun" />
  </svg>
);
const Earth = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    <rect x="0" y="58" width="120" height="22" rx="4" className="art-ground" />
    <path d="M0 58 Q30 50 50 56 T120 52 V58 Z" className="art-terrain" />
    <circle cx="60" cy="40" r="11" className="art-earth" />
    <path d="M30 70 L48 50" className="art-radio" />
    <path d="M22 70 h16 l-8 -14 z" className="art-lander" />
  </svg>
);
const Dome = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    <circle cx="60" cy="40" r="34" className="art-dome" />
    <path
      d="M60 6 a34 34 0 0 1 30 18 q-10 8 -14 4 q-8 -6 -16 0 q-10 6 -18 -2 q-8 -6 -16 2 a34 34 0 0 1 34 -22z"
      className="art-terrain"
    />
    <circle cx="60" cy="40" r="22" className="art-path-sun" />
    <ellipse cx="54" cy="18" rx="4" ry="9" className="art-path-earth" />
    <circle cx="82" cy="40" r="4" className="art-sun" />
  </svg>
);
const Steps = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(${8 + i * 38} 18)`}>
        <rect width="30" height="44" rx="6" className="art-card" />
        <circle cx="15" cy="14" r="7" className="art-step" />
        <text x="15" y="17.5" textAnchor="middle" className="art-step-n">
          {i + 1}
        </text>
        <rect x="7" y="27" width="16" height="3" rx="1.5" className="art-line" />
        <rect x="7" y="33" width="11" height="3" rx="1.5" className="art-line" />
      </g>
    ))}
  </svg>
);
const Terrain = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    <rect x="0" y="58" width="120" height="22" rx="4" className="art-ground" />
    <path d="M0 58 L18 36 L32 50 L46 30 L62 58 Z" className="art-terrain" />
    <path d="M70 58 L70 26" className="art-mast" />
    <path d="M62 26 h16 v-6 h-16 z" className="art-panel" />
    <path d="M4 58 H116" className="art-flat" />
    <circle cx="104" cy="30" r="6" className="art-sun" />
  </svg>
);
const Bars = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    {[
      ["art-bar-sun", 74],
      ["art-bar-earth", 52],
      ["art-bar-both", 38],
    ].map(([c, w], i) => (
      <g key={i} transform={`translate(14 ${16 + i * 18})`}>
        <rect width="92" height="8" rx="4" className="art-track" />
        <rect width={w as number} height="8" rx="4" className={c as string} />
      </g>
    ))}
  </svg>
);
const Go = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    <circle cx="60" cy="40" r="26" className="art-moon" />
    <circle cx="51" cy="34" r="5" className="art-crater" />
    <circle cx="68" cy="48" r="7" className="art-crater" />
    <path d="M60 14 l0 -8 M60 14 l-4 -4 M60 14 l4 -4" className="art-flag" />
  </svg>
);

const Welcome = () => (
  <svg viewBox="0 0 120 80" aria-hidden="true">
    <path d="M6 66 A54 30 0 0 1 114 66 Z" className="art-moon" />
    <circle cx="40" cy="58" r="4" className="art-crater" />
    <circle cx="74" cy="52" r="5" className="art-crater" />
    <circle cx="18" cy="30" r="8" className="art-sun" />
    <circle cx="100" cy="24" r="7" className="art-earth" />
    <path d="M58 40 l0 -10 l9 3 l-9 3" className="art-flag-solid" />
  </svg>
);

const CARDS: Card[] = [
  {
    kicker: "Welcome",
    title: "Where should we land at the Moon's south pole?",
    art: <Welcome />,
    body: (
      <p>
        This tool compares landing sites by two things a mission needs: <b className="t-sun">sunlight for power</b> and{" "}
        <b className="t-earth">Earth in view for radio</b>. Click through these cards (about a minute), or skip and
        explore.
      </p>
    ),
  },
  {
    kicker: "The challenge",
    title: "The Sun barely rises at the pole",
    art: <Sun />,
    body: (
      <p>
        Near the south pole the Sun never climbs high. It circles the horizon only a few degrees up, so a crater rim or
        a mountain can hide it for days. Moving a few kilometres can mean steady solar power or a long, cold night.
      </p>
    ),
  },
  {
    kicker: "The challenge",
    title: "Earth sits right on the horizon",
    art: <Earth />,
    body: (
      <p>
        Radio to Earth needs a straight line of sight. From the Moon, Earth barely moves; it just wobbles a little. At
        the pole it hugs the horizon, so some sites see Earth half the month and others never do.
      </p>
    ),
  },
  {
    kicker: "How to use it",
    title: "Configure, compare, explore",
    art: <Steps />,
    body: (
      <ol className="guide-steps">
        <li>
          <b>Configure:</b> pick 2–4 sites (on the list or the map), the dates, and a landing time.
        </li>
        <li>
          <b>Compare:</b> the table and "At a glance" show which site wins. The best value in each column is
          highlighted.
        </li>
        <li>
          <b>Explore:</b> press play to watch the month go by on each site's sky and timeline.
        </li>
      </ol>
    ),
  },
  {
    kicker: "Reading the charts",
    title: "The sky dome",
    art: <Dome />,
    body: (
      <>
        <p>
          Imagine lying on your back looking up: the centre is overhead, the edge is the horizon, north is at the top.
        </p>
        <ul className="guide-key">
          <li>
            <i className="sw sun" /> Sun's path
          </li>
          <li>
            <i className="sw earth" /> Earth's path
          </li>
          <li>
            <i className="sw terrain" /> Real terrain (NASA LRO laser data)
          </li>
          <li>
            <i className="sw dotted" /> Hidden behind terrain
          </li>
        </ul>
      </>
    ),
  },
  {
    kicker: "Assumptions",
    title: "Terrain, flat horizon and masts",
    art: <Terrain />,
    body: (
      <p>
        <b>Flat horizon</b> pretends the Moon is a smooth ball; <b>terrain</b> uses real hills and craters. Flip between
        them to see how much the landscape matters. A <b>10 m mast</b> lifts panels and antennas over nearby rocks. On a
        peak, terrain can even <i>add</i> time, because you see past the flat horizon.
      </p>
    ),
  },
  {
    kicker: "The numbers",
    title: "Three colours, three questions",
    art: <Bars />,
    body: (
      <ul className="guide-key big">
        <li>
          <i className="dot sun" /> <b>% sunlit, longest night:</b> power, and how big the batteries must be
        </li>
        <li>
          <i className="dot earth" /> <b>% Earth, longest blackout:</b> radio contact with Earth
        </li>
        <li>
          <i className="dot both" /> <b>% Sun + Earth:</b> the best time to land has both
        </li>
      </ul>
    ),
  },
  {
    kicker: "Ready",
    title: "Go find a landing site",
    art: <Go />,
    body: (
      <p>
        Start with the three sites already picked, then try your own. You can reopen this guide any time with{" "}
        <b>How to read this</b> at the top.
      </p>
    ),
  },
];

interface Props {
  onClose: () => void;
}

/** First-visit guide as flash cards: one idea per card, Next / Back, dots, Skip. */
export default function Guide({ onClose }: Props) {
  const [i, setI] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const last = CARDS.length - 1;
  const card = CARDS[i];

  const close = useCallback(() => {
    markGuideSeen();
    onClose();
  }, [onClose]);

  // Focus the main button when the guide opens, and give focus back to the page when it closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    nextBtn.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      before?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setI((x) => Math.min(last, x + 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      else if (e.key === "Tab" && dialog.current) {
        // keep keyboard focus inside the guide
        const f = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
        if (!f.length) return;
        const first = f[0];
        const end = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          end.focus();
        } else if (!e.shiftKey && document.activeElement === end) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, last]);

  return (
    <div className="guide-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={dialog}
        className="guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        aria-describedby="guide-body"
      >
        <div className="guide-top">
          <p className="guide-kicker">
            {card.kicker} · {i + 1} of {CARDS.length}
          </p>
          <button type="button" className="guide-skip" onClick={close}>
            Skip guide
          </button>
        </div>

        <div className="guide-card" key={i}>
          <div className="guide-art">{card.art}</div>
          <h2 id="guide-title">{card.title}</h2>
          <div id="guide-body" className="guide-body">
            {card.body}
          </div>
        </div>

        <div className="guide-nav">
          <button type="button" className="ghost" onClick={() => setI(i - 1)} disabled={i === 0}>
            Back
          </button>
          <div className="guide-dots" role="group" aria-label="Guide cards">
            {CARDS.map((c, k) => (
              <button
                type="button"
                key={k}
                className={k === i ? "on" : ""}
                aria-label={`Card ${k + 1}: ${c.title}`}
                aria-current={k === i ? "step" : undefined}
                onClick={() => setI(k)}
              />
            ))}
          </div>
          <button
            type="button"
            ref={nextBtn}
            className="primary guide-next"
            onClick={() => (i === last ? close() : setI(i + 1))}
          >
            {i === last ? "Start exploring" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
