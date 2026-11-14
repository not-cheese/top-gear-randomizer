import { describe, it, expect } from "vitest";
import { mergeCollections, validEpisodeIds } from "../src/domain/collections.js";

describe("mergeCollections", () => {
  it("lists presets first and tags each collection", () => {
    const merged = mergeCollections(
      [{ id: "preset-a", name: "A", episodeIds: [] }],
      [{ id: "u1", name: "Mine", episodeIds: [] }]
    );
    expect(merged.map((c) => [c.id, c.isPreset])).toEqual([["preset-a", true], ["u1", false]]);
  });
  it("does not mutate its inputs", () => {
    const presets = [{ id: "preset-a", name: "A", episodeIds: [] }];
    mergeCollections(presets, []);
    expect(presets[0].isPreset).toBeUndefined();
  });
});

describe("validEpisodeIds", () => {
  it("drops ids that are not in the catalogue", () => {
    const index = new Map([["S01E01", {}], ["S01E02", {}]]);
    expect(validEpisodeIds({ episodeIds: ["S01E01", "GONE", "S01E02"] }, index)).toEqual(["S01E01", "S01E02"]);
  });
});
