// Pure helpers for working with the master episode list.
// Nothing here touches React, IndexedDB or the DOM.

/** Map of episode id -> episode. */
export function indexById(episodes) {
  return new Map(episodes.map((e) => [e.id, e]));
}

/** Resolve a list of ids to episodes, skipping unknown ids. */
export function episodesFromIds(index, ids) {
  return ids.map((id) => index.get(id)).filter(Boolean);
}

/** Optional filters by season number and/or category name. */
export function filterEpisodes(episodes, { season = null, category = null } = {}) {
  return episodes.filter(
    (e) =>
      (season == null || e.season === season) &&
      (category == null || e.categories.includes(category))
  );
}

/** Sort by air date (then id) without mutating the input. */
export function sortByAirDate(episodes) {
  return [...episodes].sort(
    (a, b) => a.airDate.localeCompare(b.airDate) || a.id.localeCompare(b.id)
  );
}

/** Short display label: "S05E06" for series episodes, "Special" for unnumbered specials. */
export function episodeLabel(episode) {
  if (episode.episode == null) return "Special";
  const pad = (n) => String(n).padStart(2, "0");
  return `S${pad(episode.season)}E${pad(episode.episode)}`;
}

/** Group episodes by season number, seasons ascending, each group sorted by air date. */
export function groupBySeason(episodes) {
  const groups = new Map();
  for (const e of sortByAirDate(episodes)) {
    if (!groups.has(e.season)) groups.set(e.season, []);
    groups.get(e.season).push(e);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2002-10-20" -> "20 Oct 2002". Manual so the output never varies by browser locale. */
export function formatAirDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * Case-insensitive search. Every word in the query must appear somewhere in the
 * episode's label, id, title or categories. An empty query matches everything.
 */
export function searchEpisodes(episodes, query) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return episodes;
  return episodes.filter((e) => {
    const haystack = `${episodeLabel(e)} ${e.id} ${e.title} ${e.categories.join(" ")}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
