import { episodeLabel } from "../../domain/catalogue.js";

function formatAirDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

// One episode with a watched checkbox. Used by the Watched page and, later,
// the catalogue and collection editor.
export default function EpisodeRow({ episode, watched, onToggle }) {
  return (
    <li className={`episode-row${watched ? " is-watched" : ""}`}>
      <label>
        <input type="checkbox" checked={watched} onChange={() => onToggle(episode.id)} />
        <span className="episode-body">
          <span className="episode-title">{episode.title}</span>
          <span className="episode-meta">
            {" "}
            {episodeLabel(episode)} · {formatAirDate(episode.airDate)}
          </span>
          <span className="chips">
            {episode.categories.map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </span>
        </span>
      </label>
    </li>
  );
}
