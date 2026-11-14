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
  const [open, setOpen] = useState(() => new Set()); // series numbers that are expanded

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

  const toggleSeason = (season) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(season)) next.delete(season);
      else next.add(season);
      return next;
    });
  const expandAll = () => setOpen(new Set(blocks.map((b) => b.season)));
  const collapseAll = () => setOpen(new Set());

  return (
    <>
      <h1 className="page-title">Watched</h1>
      <p className="page-sub">
        {totalWatched} of {episodes.length} episodes watched ({percent}%)
      </p>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div style={{ width: `${percent}%` }} />
      </div>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter episodes">
          {FILTERS.map((f) => (
            <button key={f.value} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="toolbar-links">
          <button className="link-btn" onClick={expandAll}>Expand all</button>
          <button className="link-btn" onClick={collapseAll}>Collapse all</button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="empty" style={{ marginTop: "1.5rem" }}>
          {filter === "watched" ? "Nothing marked as watched yet." : "You've watched everything. Legend."}
        </p>
      ) : (
        blocks.map((b) => {
          const isOpen = open.has(b.season);
          const panelId = `series-${b.season}-panel`;
          const done = b.watched === b.total;
          return (
            <section key={b.season} className="season-block">
              <h2 className="season-head">
                <button
                  className="season-toggle"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleSeason(b.season)}
                >
                  <span className={`chevron${isOpen ? " open" : ""}`} aria-hidden="true">▸</span>
                  <span className="season-name">Series {b.season}</span>
                  <small className={done ? "season-count done" : "season-count"}>
                    {b.watched}/{b.total} watched
                  </small>
                </button>
              </h2>
              {isOpen && (
                <ul id={panelId} className="episode-list">
                  {b.rows.map((e) => (
                    <EpisodeRow key={e.id} episode={e} watched={watchedIds.has(e.id)} onToggle={toggleWatched} />
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
