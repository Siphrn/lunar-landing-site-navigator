import { bestValues, METRIC_COLUMNS, untilSet } from "../format";
import type { CompareResponse, Horizon } from "../types";

interface Props {
  cmp: CompareResponse;
  requested: Horizon;
  requestedMast: number;
}

/** All metrics per site. Columns are colour-coded (sunlight / Earth / both) and each value has a small bar. */
export default function CompareTable({ cmp, requested, requestedMast }: Props) {
  const best = bestValues(cmp.results);
  const periodH = (Date.parse(cmp.stop) - Date.parse(cmp.start)) / 3_600_000;
  const colMax = Object.fromEntries(
    METRIC_COLUMNS.map((c) => [c.key, Math.max(0, ...cmp.results.map((r) => r[c.key]))]),
  ) as Record<string, number>;

  return (
    <div className="table-wrap panel">
      <table>
        <caption className="sr-only">
          Sunlight and Earth-visibility metrics for each selected site. The best value in each column is marked.
        </caption>
        <thead>
          <tr>
            <th scope="col">Site</th>
            {METRIC_COLUMNS.map((c) => (
              <th scope="col" key={c.key} className={`cat-${c.cat}`}>
                {c.label}
                <span className="better" title={c.better === "high" ? "Higher is better" : "Lower is better"}>
                  <span aria-hidden="true">{c.better === "high" ? " ↑" : " ↓"}</span>
                  <span className="sr-only">{c.better === "high" ? ", higher is better" : ", lower is better"}</span>
                </span>
              </th>
            ))}
            <th scope="col" className="cat-sun">
              Sunset in<span className="sr-only"> after landing</span>
            </th>
            <th scope="col" className="cat-earth">
              Earthset in<span className="sr-only"> after landing</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cmp.results.map((r) => (
            <tr key={r.site}>
              <th scope="row">
                {r.name}
                {requested === "terrain" && r.horizon === "flat" && (
                  <span className="tag warn" title="Terrain not available for this site">
                    flat
                  </span>
                )}
                {requested === "terrain" &&
                  r.horizon === "terrain" &&
                  requestedMast > 0 &&
                  r.mast_m !== requestedMast && (
                    <span className="tag warn" title={`No ${requestedMast} m mast mask for this site`}>
                      ground
                    </span>
                  )}
              </th>
              {METRIC_COLUMNS.map((c) => {
                const isBest = best[c.key] === r[c.key];
                const fill = Math.min(1, Math.max(0, c.bar(r[c.key], periodH, colMax[c.key])));
                return (
                  <td key={c.key} data-label={c.label} className={`cat-${c.cat}${isBest ? " best" : ""}`}>
                    <span className="val">
                      {c.fmt(r[c.key])}
                      {isBest && <span className="sr-only"> (best)</span>}
                    </span>
                    <span className="bar" aria-hidden="true">
                      <i style={{ width: `${(fill * 100).toFixed(1)}%` }} />
                    </span>
                  </td>
                );
              })}
              <td data-label="Sunset in">{untilSet(r.next_sunset_h)}</td>
              <td data-label="Earthset in">{untilSet(r.next_earthset_h)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
