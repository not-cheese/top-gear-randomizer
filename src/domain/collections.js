// Pure helpers for combining shipped (preset) and user (custom) collections.

/** Preset collections first, then the user's, each tagged with isPreset. */
export function mergeCollections(presets, custom) {
  return [
    ...presets.map((c) => ({ ...c, isPreset: true })),
    ...custom.map((c) => ({ ...c, isPreset: false })),
  ];
}

/** Episode ids in a collection that still exist in the catalogue index. */
export function validEpisodeIds(collection, episodeIndex) {
  return collection.episodeIds.filter((id) => episodeIndex.has(id));
}
