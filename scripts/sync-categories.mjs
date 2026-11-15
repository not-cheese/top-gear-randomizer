// Rewrites the "categories" of every episode in episodes.json from presets.json.
//   node scripts/sync-categories.mjs            rewrite episodes.json
//   node scripts/sync-categories.mjs --check    change nothing; exit 1 if it is out of date
//   node scripts/sync-categories.mjs --dir path use another data folder (default src/data)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CATEGORY_ORDER, deriveCategories, untaggedPresets } from "./categories.mjs";

const args = process.argv.slice(2);
const check = args.includes("--check");
const dirFlag = args.indexOf("--dir");
const dir = dirFlag >= 0
  ? path.resolve(args[dirFlag + 1] ?? "")
  : fileURLToPath(new URL("../src/data/", import.meta.url));

const episodesFile = path.join(dir, "episodes.json");
const presetsFile = path.join(dir, "presets.json");

let before, episodes, presets;
try {
  before = readFileSync(episodesFile, "utf8");
  episodes = JSON.parse(before);
  presets = JSON.parse(readFileSync(presetsFile, "utf8"));
} catch (e) {
  console.error(`Could not read the data files in ${dir}: ${e.message}`);
  process.exit(1);
}

// Refuse to continue if a preset points at an episode that does not exist.
const known = new Set(episodes.map((e) => e.id));
const unknown = presets.collections.flatMap((c) =>
  c.episodeIds.filter((id) => !known.has(id)).map((id) => `${c.id}: ${id}`));
if (unknown.length) {
  console.error(`Nothing was changed. Presets refer to episode ids that don't exist:\n` +
    unknown.map((m) => `  - ${m}`).join("\n"));
  process.exit(1);
}

const derived = deriveCategories(episodes, presets);
const updated = episodes.map((e) => ({ ...e, categories: derived.get(e.id) }));

// Same layout as the current file: one episode per line, ", " between items.
const fmt = (v) =>
  Array.isArray(v) ? `[${v.map(fmt).join(", ")}]`
  : v && typeof v === "object" ? `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${fmt(x)}`).join(", ")}}`
  : JSON.stringify(v);
const after = `[\n${updated.map((e) => "  " + fmt(e)).join(",\n")}\n]\n`;

const changed = episodes.filter((e) => JSON.stringify(e.categories) !== JSON.stringify(derived.get(e.id))).length;
const counts = CATEGORY_ORDER.map((c) => `${c}: ${updated.filter((e) => e.categories.includes(c)).length}`).join(" | ");
const untagged = untaggedPresets(presets);
const note = untagged.length ? `\nNote: these presets don't tag episodes (not listed in scripts/categories.mjs): ${untagged.join(", ")}` : "";

if (check) {
  if (changed) {
    console.error(`${changed} episode(s) have categories that don't match the presets. Run "npm run categories".`);
    process.exit(1);
  }
  console.log(`Categories are up to date. ${counts}${note}`);
} else {
  if (after !== before) writeFileSync(episodesFile, after);
  console.log(`${changed} episode(s) updated. ${counts}${note}`);
}
