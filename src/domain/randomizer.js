import { filterEpisodes } from "./catalogue.js";

/** Default random source: uniform float in [0, 1) from the Web Crypto API. */
export function secureRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/**
 * Build the list of episodes eligible for a spin.
 *
 * @param {object[]} episodes      Master catalogue.
 * @param {object}   options
 * @param {string[]|null} options.episodeIds  Restrict to a collection (null = all episodes).
 * @param {boolean}  options.excludeWatched
 * @param {Set<string>} options.watchedSet    Ids the user has watched.
 * @param {string|null} options.excludeId     Previously selected id to skip.
 * @param {number|null} options.season
 * @param {string|null} options.category
 */
export function buildPool(
  episodes,
  {
    episodeIds = null,
    excludeWatched = false,
    watchedSet = new Set(),
    excludeId = null,
    season = null,
    category = null,
  } = {}
) {
  let pool = filterEpisodes(episodes, { season, category });

  if (episodeIds) {
    const allowed = new Set(episodeIds);
    pool = pool.filter((e) => allowed.has(e.id));
  }
  if (excludeWatched) {
    pool = pool.filter((e) => !watchedSet.has(e.id));
  }
  // Only skip the previous pick when something else is left to choose.
  if (excludeId && pool.length > 1) {
    pool = pool.filter((e) => e.id !== excludeId);
  }
  return pool;
}

/** Pick one episode uniformly at random. Returns null for an empty pool. */
export function pickRandom(pool, rng = secureRandom) {
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Choose the episodes shown on the wheel: `count` distinct candidates that
 * always include `winner`, in shuffled order. If the pool has fewer than
 * `count` episodes, all of them are used.
 */
export function sampleWheelCandidates(pool, winner, count = 10, rng = secureRandom) {
  const others = pool.filter((e) => e.id !== winner.id);
  // Fisher-Yates shuffle of the others, then take enough to fill the wheel.
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const picked = others.slice(0, Math.max(0, count - 1));
  const at = Math.floor(rng() * (picked.length + 1));
  picked.splice(at, 0, winner);
  return picked;
}
