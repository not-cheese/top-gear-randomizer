import { describe, it, expect } from "vitest";
import { deriveCategories, untaggedPresets, CATEGORY_ORDER } from "../scripts/categories.mjs";

const eps = ["A", "B", "C", "D"].map((id) => ({ id }));
const presets = (collections) => ({ version: 1, collections });

describe("deriveCategories", () => {
  it("makes everything Standard when no preset tags anything", () => {
    const out = deriveCategories(eps, presets([]));
    expect([...out.values()]).toEqual([["Standard"], ["Standard"], ["Standard"], ["Standard"]]);
  });
  it("gives specials Special instead of Standard", () => {
    const out = deriveCategories(eps, presets([{ id: "preset-specials", name: "S", episodeIds: ["B"] }]));
    expect(out.get("A")).toEqual(["Standard"]);
    expect(out.get("B")).toEqual(["Special"]);
  });
  it("adds each other preset's category on top, in a fixed order", () => {
    const out = deriveCategories(eps, presets([
      { id: "preset-creation-challenges", name: "C", episodeIds: ["A", "B"] },
      { id: "preset-races", name: "R", episodeIds: ["A", "C"] },
      { id: "preset-cheap-car-challenges", name: "P", episodeIds: ["A"] },
      { id: "preset-specials", name: "S", episodeIds: ["B"] },
    ]));
    expect(out.get("A")).toEqual(["Standard", "Race", "CheapCar", "Creation"]);
    expect(out.get("B")).toEqual(["Special", "Creation"]);
    expect(out.get("C")).toEqual(["Standard", "Race"]);
    expect(out.get("D")).toEqual(["Standard"]);
  });
  it("lets a special also be a race", () => {
    const out = deriveCategories(eps, presets([
      { id: "preset-specials", name: "S", episodeIds: ["A"] },
      { id: "preset-races", name: "R", episodeIds: ["A"] },
    ]));
    expect(out.get("A")).toEqual(["Special", "Race"]);
  });
  it("ignores presets it doesn't know about", () => {
    const p = presets([{ id: "preset-my-own", name: "Mine", episodeIds: ["A"] }]);
    expect(deriveCategories(eps, p).get("A")).toEqual(["Standard"]);
    expect(untaggedPresets(p)).toEqual(["preset-my-own"]);
  });
  it("only ever produces allowed categories", () => {
    const out = deriveCategories(eps, presets([{ id: "preset-races", name: "R", episodeIds: ["A"] }]));
    for (const cats of out.values()) for (const c of cats) expect(CATEGORY_ORDER).toContain(c);
  });
});
