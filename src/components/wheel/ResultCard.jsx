import { episodeLabel, formatAirDate } from "../../domain/catalogue.js";

export default function ResultCard({ episode, watched, onToggleWatched }) {
  return (
    <section className="result-card" aria-live="polite">
      <div className="result-label">
        {episodeLabel(episode)} · {formatAirDate(episode.airDate)}
      </div>
      <h2 className="result-title">{episode.title}</h2>
      <div className="chips">
        {episode.categories.map((c) => (
          <span key={c} className="chip">{c}</span>
        ))}
      </div>
      {episode.description && <p className="result-desc">{episode.description}</p>}
      <div className="result-actions">
        <button className="btn" onClick={onToggleWatched}>
          {watched ? "Mark as unwatched" : "Mark as watched"}
        </button>
        {watched && <span className="chip chip-accent">Watched</span>}
      </div>
    </section>
  );
}
