// Import/export for watched records and custom collections.
// Pure functions: nothing here touches the DOM, IndexedDB or the network.
//
// File shape:
//   { app, formatVersion, exportedAt, kind: "watched" | "collections", data }

export const APP_ID = "topgear-randomizer";
export const FORMAT_VERSION = 1;
export const MAX_NAME_LENGTH = 80;

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isDateString = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- export ----------

export function buildExport(kind, data, now = new Date()) {
  return { app: APP_ID, formatVersion: FORMAT_VERSION, exportedAt: now.toISOString(), kind, data };
}

export function buildWatchedExport(records, now = new Date()) {
  const watched = records
    .map(({ episodeId, watchedAt }) => ({ episodeId, watchedAt }))
    .sort((a, b) => a.episodeId.localeCompare(b.episodeId));
  return buildExport("watched", { watched }, now);
}

export function buildCollectionsExport(collections, now = new Date()) {
  const list = collections.map(({ id, name, episodeIds, createdAt, updatedAt }) => ({
    id, name, episodeIds: [...episodeIds], createdAt, updatedAt,
  }));
  return buildExport("collections", { collections: list }, now);
}

export function exportFileName(kind, now = new Date()) {
  return `topgear-${kind}-${now.toISOString().slice(0, 10)}.json`;
}

// ---------- import ----------

const fail = (error) => ({ ok: false, error });

/**
 * Validate and clean an import file. Never throws, never touches storage.
 * On success returns { ok: true, kind, items, summary, warnings }; on failure
 * { ok: false, error } with a message fit to show the user.
 */
export function parseImport(text, { episodeIndex, makeId = () => crypto.randomUUID(), now = new Date() }) {
  let parsed;
  try {
    parsed = JSON.parse(String(text).replace(/^﻿/, ""));
  } catch {
    return fail("This file isn't valid JSON.");
  }
  if (!isObject(parsed)) return fail("This doesn't look like a Top Gear Randomizer export.");
  if (parsed.app !== APP_ID) return fail("This file wasn't exported from Top Gear Randomizer.");
  if (!Number.isInteger(parsed.formatVersion) || parsed.formatVersion < 1) {
    return fail("This file has no valid format version.");
  }
  if (parsed.formatVersion > FORMAT_VERSION) {
    return fail("This file was made by a newer version of the app. Update the app and try again.");
  }
  if (!isObject(parsed.data)) return fail("This file has no data section.");

  const ctx = { episodeIndex, makeId, nowIso: now.toISOString() };
  if (parsed.kind === "watched") return parseWatched(parsed.data, ctx);
  if (parsed.kind === "collections") return parseCollections(parsed.data, ctx);
  return fail(`Unsupported file type: ${JSON.stringify(parsed.kind ?? null)}.`);
}

function parseWatched(data, { episodeIndex, nowIso }) {
  if (!Array.isArray(data.watched)) return fail("This file has no watched list.");

  const items = [];
  const seen = new Set();
  let unknown = 0, invalid = 0, duplicates = 0;

  for (const entry of data.watched) {
    if (!isObject(entry) || typeof entry.episodeId !== "string") { invalid++; continue; }
    if (!episodeIndex.has(entry.episodeId)) { unknown++; continue; }
    if (seen.has(entry.episodeId)) { duplicates++; continue; }
    seen.add(entry.episodeId);
    items.push({
      episodeId: entry.episodeId,
      watchedAt: isDateString(entry.watchedAt) ? entry.watchedAt : nowIso,
    });
  }

  const warnings = [];
  if (unknown) warnings.push(`${plural(unknown, "entry refers", "entries refer")} to episodes not in the catalogue and will be skipped.`);
  if (invalid) warnings.push(`${plural(invalid, "entry is", "entries are")} malformed and will be skipped.`);
  if (duplicates) warnings.push(`${plural(duplicates, "duplicate")} will be ignored.`);

  return { ok: true, kind: "watched", items, summary: { imported: items.length, unknown, invalid, duplicates }, warnings };
}

function parseCollections(data, { episodeIndex, makeId, nowIso }) {
  if (!Array.isArray(data.collections)) return fail("This file has no collections list.");

  const items = [];
  const seenIds = new Set();
  let unknownEpisodes = 0, invalid = 0, duplicates = 0, renamed = 0;

  for (const entry of data.collections) {
    const name = isObject(entry) && typeof entry.name === "string" ? entry.name.trim() : "";
    const rawId = isObject(entry) && typeof entry.id === "string" ? entry.id.trim() : "";
    if (!name || !rawId || !Array.isArray(entry.episodeIds)) { invalid++; continue; }
    if (seenIds.has(rawId)) { duplicates++; continue; }
    seenIds.add(rawId);

    // "preset-" ids are reserved for the collections that ship with the app.
    let id = rawId;
    if (rawId.startsWith("preset-")) { id = makeId(); renamed++; }

    const episodeIds = [];
    const inside = new Set();
    for (const eid of entry.episodeIds) {
      if (typeof eid !== "string" || !episodeIndex.has(eid)) { unknownEpisodes++; continue; }
      if (!inside.has(eid)) { inside.add(eid); episodeIds.push(eid); }
    }

    items.push({
      id,
      name: name.slice(0, MAX_NAME_LENGTH),
      episodeIds,
      createdAt: isDateString(entry.createdAt) ? entry.createdAt : nowIso,
      updatedAt: isDateString(entry.updatedAt) ? entry.updatedAt : nowIso,
    });
  }

  const warnings = [];
  if (invalid) warnings.push(`${plural(invalid, "collection is", "collections are")} malformed and will be skipped.`);
  if (duplicates) warnings.push(`${plural(duplicates, "duplicate collection")} will be ignored.`);
  if (unknownEpisodes) warnings.push(`${plural(unknownEpisodes, "episode reference")} not in the catalogue will be removed.`);
  if (renamed) warnings.push(`${plural(renamed, "collection")} had a reserved ID and will be saved with a new one.`);

  return {
    ok: true, kind: "collections", items,
    summary: {
      imported: items.length,
      episodes: items.reduce((n, c) => n + c.episodeIds.length, 0),
      unknownEpisodes, invalid, duplicates, renamed,
    },
    warnings,
  };
}
