import type { Horizon, Site, SiteGroup } from "../types";

export const MAX_SITES = 4;

export interface Query {
  sites: string[];
  start: string; // YYYY-MM-DD
  stop: string; // YYYY-MM-DD
  landAt: string; // YYYY-MM-DDTHH:mm (UTC)
  horizon: Horizon;
  /** Height of the solar panel / antenna above the ground: 0 or 10 m (masks exist for these). */
  mastM: number;
}

const GROUP_LABEL: Record<SiteGroup, string> = {
  candidate: "Artemis candidate regions",
  other: "Other sites",
  control: "Non-polar controls",
};

interface Props {
  sites: Site[];
  draft: Query;
  onDraft: (q: Query) => void;
  onSubmit: () => void;
  onHorizon: (h: Horizon) => void;
  onMast: (m: number) => void;
  loading: boolean;
  dirty: boolean;
  /** When the data only covers some dates (offline snapshot), limit the pickers to them. */
  dateLimits?: { min: string; max: string } | null;
}

export default function Controls({
  sites,
  draft,
  onDraft,
  onSubmit,
  onHorizon,
  onMast,
  loading,
  dirty,
  dateLimits,
}: Props) {
  const groups = (["candidate", "other", "control"] as SiteGroup[])
    .map((g) => ({ g, items: sites.filter((s) => s.group === g) }))
    .filter((x) => x.items.length);

  const toggle = (id: string) => {
    const on = draft.sites.includes(id);
    if (!on && draft.sites.length >= MAX_SITES) return;
    onDraft({ ...draft, sites: on ? draft.sites.filter((s) => s !== id) : [...draft.sites, id] });
  };

  const rangeBad = draft.start >= draft.stop;
  const canSubmit = draft.sites.length >= 1 && !rangeBad && !loading;

  return (
    <form
      className="controls panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <fieldset className="step sites">
        <legend>
          <span className="step-n">1</span> Choose sites
          <span className="step-hint">
            {draft.sites.length} of {MAX_SITES} picked
          </span>
        </legend>
        {groups.map(({ g, items }) => (
          <div key={g} className="site-group">
            <div className="group-label">{GROUP_LABEL[g]}</div>
            <div className="chips">
              {items.map((s) => {
                const on = draft.sites.includes(s.id);
                const full = !on && draft.sites.length >= MAX_SITES;
                return (
                  <button
                    type="button"
                    key={s.id}
                    className={`chip${on ? " on" : ""}`}
                    aria-pressed={on}
                    disabled={full}
                    title={`${s.note} · ${s.lat.toFixed(2)}°, ${s.lon_e.toFixed(2)}°E`}
                    onClick={() => toggle(s.id)}
                  >
                    {s.name.replace(" (control)", "")}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-n">2</span> Pick dates <span className="step-hint">UTC</span>
        </legend>
        <div className="fields">
          <label>
            From
            <input
              type="date"
              min={dateLimits?.min}
              max={dateLimits?.max}
              value={draft.start}
              onChange={(e) => onDraft({ ...draft, start: e.target.value })}
            />
          </label>
          <label>
            To
            <input
              type="date"
              min={dateLimits?.min}
              max={dateLimits?.max}
              value={draft.stop}
              onChange={(e) => onDraft({ ...draft, stop: e.target.value })}
            />
          </label>
          <label className="wide">
            Landing time
            <input
              type="datetime-local"
              value={draft.landAt}
              onChange={(e) => onDraft({ ...draft, landAt: e.target.value })}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-n">3</span> Assumptions <span className="step-hint">apply instantly</span>
        </legend>
        <div className="fields">
          <div className="seg" role="group" aria-label="Horizon">
            {(["terrain", "flat"] as Horizon[]).map((h) => (
              <button
                type="button"
                key={h}
                className={draft.horizon === h ? "on" : ""}
                aria-pressed={draft.horizon === h}
                onClick={() => onHorizon(h)}
              >
                {h === "terrain" ? "Terrain horizon" : "Flat horizon"}
              </button>
            ))}
          </div>
          <div
            className="seg"
            role="group"
            aria-label="Mast height"
            title={
              draft.horizon === "flat"
                ? "Mast height only matters with the terrain horizon"
                : "Panels and antenna on a mast see over nearby terrain"
            }
          >
            {[0, 10].map((m) => (
              <button
                type="button"
                key={m}
                className={draft.mastM === m ? "on" : ""}
                aria-pressed={draft.mastM === m}
                disabled={draft.horizon === "flat"}
                onClick={() => onMast(m)}
              >
                {m === 0 ? "On the ground" : "10 m mast"}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="submit-row">
        {rangeBad ? (
          <p className="error">The end date must be after the start date.</p>
        ) : (
          <p className="step-hint">{dirty ? "Press Compare to update the results." : ""}</p>
        )}
        <button type="submit" className="primary" disabled={!canSubmit}>
          {loading ? "Loading…" : "Compare"}
        </button>
      </div>
    </form>
  );
}
