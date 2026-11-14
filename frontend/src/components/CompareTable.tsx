import { bestValues, METRIC_COLUMNS, untilSet } from "../format";
import type { CompareResponse, Horizon } from "../types";

export default function CompareTable({ cmp, requested }: { cmp: CompareResponse; requested: Horizon }) {
  const best = bestValues(cmp.results);
  return (
    <div className="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th>Site</th>
            {METRIC_COLUMNS.map((c) => (
              <th key={c.key}>
                {c.label}
                <span className="better">{c.better === "high" ? "higher is better" : "lower is better"}</span>
              </th>
            ))}
            <th>Sunset after landing</th>
            <th>Earthset after landing</th>
          </tr>
        </thead>
        <tbody>
          {cmp.results.map((r) => (
            <tr key={r.site}>
              <td>
                {r.name}
                {requested === "terrain" && r.horizon === "flat" && (
                  <span className="tag warn" title="Terrain not available for this site">
                    flat
                  </span>
                )}
              </td>
              {METRIC_COLUMNS.map((c) => (
                <td key={c.key} className={best[c.key] === r[c.key] ? "best" : ""}>
                  {c.fmt(r[c.key])}
                </td>
              ))}
              <td>{untilSet(r.next_sunset_h)}</td>
              <td>{untilSet(r.next_earthset_h)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
