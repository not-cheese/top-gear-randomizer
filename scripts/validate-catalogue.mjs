// Checks src/data/episodes.json and src/data/presets.json.
// CLI:  node scripts/validate-catalogue.mjs   (exits 1 if anything is wrong)
// Also imported by tests/catalogue-data.test.js so `npm test` runs it too.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const CATEGORIES = ["Standard", "Special", "Race", "Challenge", "CheapCar", "RoadTrip"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (s) => ISO_DATE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function validateCatalogue(episodes, presets) {
  const errors = [];
  const err = (msg) => errors.push(msg);

  if (!Array.isArray(episodes)) return ["episodes.json must be an array"];

  const ids = new Set();
  let previousDate = "";
  episodes.forEach((e, i) => {
    const where = `episodes[${i}]${e && e.id ? ` (${e.id})` : ""}`;
    if (!e || typeof e !== "object") return err(`${where}: not an object`);
    if (typeof e.id !== "string" || !e.id) return err(`${where}: missing id`);
    if (ids.has(e.id)) err(`${where}: duplicate id`);
    ids.add(e.id);

    if (!Number.isInteger(e.season) || e.season < 1) err(`${where}: season must be a positive integer`);
    if (e.episode !== null && (!Number.isInteger(e.episode) || e.episode < 1)) {
      err(`${where}: episode must be a positive integer or null`);
    }
    if (e.episode === null) {
      if (!/^SP-[a-z0-9-]+$/.test(e.id)) err(`${where}: unnumbered specials need an id like "SP-polar-2007"`);
    } else if (Number.isInteger(e.season)) {
      const expected = `S${String(e.season).padStart(2, "0")}E${String(e.episode).padStart(2, "0")}`;
      if (e.id !== expected) err(`${where}: id should be ${expected} to match season/episode`);
    }

    if (typeof e.title !== "string" || !e.title.trim()) err(`${where}: missing title`);
    if (!isRealDate(e.airDate)) err(`${where}: airDate must be a real YYYY-MM-DD date`);
    else {
      if (e.airDate < previousDate) err(`${where}: airDate is earlier than the episode before it`);
      previousDate = e.airDate;
    }
    if (!Array.isArray(e.categories) || e.categories.length === 0) err(`${where}: needs at least one category`);
    else {
      for (const c of e.categories) if (!CATEGORIES.includes(c)) err(`${where}: unknown category "${c}"`);
      if (new Set(e.categories).size !== e.categories.length) err(`${where}: repeated category`);
    }
    if (typeof e.description !== "string") err(`${where}: description must be a string (use "")`);
  });

  if (!presets || typeof presets !== "object" || !Array.isArray(presets.collections)) {
    err("presets.json must look like { version, collections: [...] }");
    return errors;
  }
  const presetIds = new Set();
  const presetNames = new Set();
  presets.collections.forEach((c, i) => {
    const where = `presets[${i}]${c && c.id ? ` (${c.id})` : ""}`;
    if (!c || typeof c !== "object") return err(`${where}: not an object`);
    if (typeof c.id !== "string" || !c.id.startsWith("preset-")) err(`${where}: id must start with "preset-"`);
    if (presetIds.has(c.id)) err(`${where}: duplicate id`);
    presetIds.add(c.id);
    if (typeof c.name !== "string" || !c.name.trim()) err(`${where}: missing name`);
    else if (presetNames.has(c.name.trim().toLowerCase())) err(`${where}: duplicate name "${c.name}"`);
    else presetNames.add(c.name.trim().toLowerCase());
    if (!Array.isArray(c.episodeIds)) return err(`${where}: episodeIds must be an array`);
    const seen = new Set();
    for (const id of c.episodeIds) {
      if (typeof id !== "string") err(`${where}: episodeIds must all be strings`);
      else if (!ids.has(id)) err(`${where}: unknown episode id "${id}"`);
      else if (seen.has(id)) err(`${where}: "${id}" is listed twice`);
      seen.add(id);
    }
  });
  return errors;
}

// Run as a script.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
  let episodes, presets;
  try {
    episodes = read("../src/data/episodes.json");
    presets = read("../src/data/presets.json");
  } catch (e) {
    console.error(`Could not read the data files: ${e.message}`);
    process.exit(1);
  }
  const errors = validateCatalogue(episodes, presets);
  if (errors.length) {
    console.error(`Found ${errors.length} problem${errors.length === 1 ? "" : "s"}:\n` + errors.map((m) => `  - ${m}`).join("\n"));
    process.exit(1);
  }
  const counts = presets.collections.map((c) => `${c.name}: ${c.episodeIds.length}`).join(" | ");
  console.log(`Catalogue OK: ${episodes.length} episodes. ${counts}`);
}
