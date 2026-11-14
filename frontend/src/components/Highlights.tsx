import { fmtUtc, hours, type Category } from "../format";
import type { CompareResponse, SiteMetrics } from "../types";

interface Tile {
  cat: Category;
  title: string;
  value: (m: SiteMetrics) => number;
  fmt: (m: SiteMetrics) => string;
  note: (m: SiteMetrics) => string;
}

const TILES: Tile[] = [
  {
    cat: "sun",
    title: "Most sunlight",
    value: (m) => m.pct_sunlit,
    fmt: (m) => `${m.pct_sunlit}%`,
    note: (m) => `longest night ${hours(m.longest_dark_h)}`,
  },
  {
    cat: "earth",
    title: "Most Earth contact",
    value: (m) => m.pct_earth,
    fmt: (m) => `${m.pct_earth}%`,
    note: (m) => `longest blackout ${hours(m.longest_blackout_h)}`,
  },
  {
    cat: "both",
    title: "Most Sun + Earth",
    value: (m) => m.pct_both,
    fmt: (m) => `${m.pct_both}%`,
    note: (m) => {
      const w = m.both_windows.reduce<SiteMetrics["both_windows"][number] | null>(
        (a, x) => (!a || x.hours > a.hours ? x : a),
        null,
      );
      return w ? `longest window ${hours(w.hours)} from ${fmtUtc(w.start)}` : "no overlap in range";
    },
  },
];

/** The answer at a glance: which selected site leads on power, on radio, and on both. */
export default function Highlights({ cmp }: { cmp: CompareResponse }) {
  if (!cmp.results.length) return null;
  return (
    <div className="highlights" aria-label="Leaders among the selected sites">
      {TILES.map((t) => {
        const top = cmp.results.reduce((a, m) => (t.value(m) > t.value(a) ? m : a));
        const tie = cmp.results.filter((m) => t.value(m) === t.value(top)).length > 1;
        return (
          <div key={t.cat} className={`hl hl-${t.cat}`}>
            <div className="hl-title">{t.title}</div>
            <div className="hl-site">{tie ? "Tie" : top.name}</div>
            <div className="hl-value">{t.fmt(top)}</div>
            <div className="hl-note">{t.note(top)}</div>
          </div>
        );
      })}
    </div>
  );
}
