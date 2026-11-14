import { useMemo, useState } from "react";
import { useApp } from "../state/hooks.js";
import { groupBySeason } from "../domain/catalogue.js";
import EpisodeRow from "../components/episodes/EpisodeRow.jsx";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unwatched", label: "Unwatched" },
  { value: "watched", label: "Watched" },
];

export default function WatchedPage() {
  const { episodes, watchedIds, toggleWatched } = useApp();
  const [filter, setFilter] = useState("all");

  // Progress is always calculated on the full catalogue; the filter only
  // changes which rows are shown.
  const groups = useMemo(() => groupBySeason(episodes), [episodes]);
  const totalWatched = watchedIds.size;
  const percent = Math.round((totalWatched / episodes.length) * 100);

  const visible = (list) =>
    list.filter((e) =>
      filter === "all" ? true : filter === "watched" ? watchedIds.has(e.id) : !watchedIds.has(e.id)
    );

  const blocks = groups
    .map(([season, list]) => ({
      season,
      rows: visible(list),
      watched: list.filter((e) => watchedIds.has(e.id)).length,
      total: list.length,
    }))
    .filter((b) => b.rows.length > 0);

  return (
    <>
      <h1 className="page-title">Watched</h1>
      <p className="page-sub">
        {totalWatched} of {episodes.length} episodes watched ({percent}%)
      </p>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div style={{ width: `${percent}%` }} />
      </div>

      <div className="segmented" role="group" aria-label="Filter episodes" style={{ marginTop: "1rem" }}>
        {FILTERS.map((f) => (
          <button key={f.value} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {blocks.length === 0 ? (
        <p className="empty" style={{ marginTop: "1.5rem" }}>
          {filter === "watched" ? "Nothing marked as watched yet." : "You've watched everything. Legend."}
        </p>
      ) : (
        blocks.map((b) => (
          <section key={b.season} className="season-block">
            <div className="season-head">
              <h2>Series {b.season}</h2>
              <small>{b.watched}/{b.total} watched</small>
            </div>
            <ul className="episode-list">
              {b.rows.map((e) => (
                <EpisodeRow key={e.id} episode={e} watched={watchedIds.has(e.id)} onToggle={toggleWatched} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
