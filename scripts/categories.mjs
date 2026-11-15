// Single source of truth for how presets turn into episode categories.
// Used by sync-categories.mjs (writes them) and validate-catalogue.mjs (checks them).

// Which preset id gives which category. Add a line here when you add a new preset
// that should also tag its episodes (and add the category to CATEGORY_ORDER).
export const PRESET_CATEGORIES = {
  "preset-specials": "Special",
  "preset-races": "Race",
  "preset-cheap-car-challenges": "CheapCar",
  "preset-creation-challenges": "Creation",
};

// Display order, and the full list of allowed categories.
export const CATEGORY_ORDER = ["Standard", "Special", "Race", "CheapCar", "Creation"];

/** Preset ids that are not in PRESET_CATEGORIES (they still work as collections, they just don't tag episodes). */
export function untaggedPresets(presets) {
  return presets.collections.map((c) => c.id).filter((id) => !(id in PRESET_CATEGORIES));
}

/**
 * Categories for every episode, as a Map of id -> array.
 * - Episodes in the specials preset get "Special"; every other episode gets "Standard".
 * - Each other tagging preset adds its category.
 */
export function deriveCategories(episodes, presets) {
  const members = new Map(); // category -> Set of episode ids
  for (const c of presets.collections) {
    const category = PRESET_CATEGORIES[c.id];
    if (category) members.set(category, new Set(c.episodeIds));
  }
  const result = new Map();
  for (const e of episodes) {
    const cats = [members.get("Special")?.has(e.id) ? "Special" : "Standard"];
    for (const category of CATEGORY_ORDER.slice(2)) {
      if (members.get(category)?.has(e.id)) cats.push(category);
    }
    result.set(e.id, cats);
  }
  return result;
}
