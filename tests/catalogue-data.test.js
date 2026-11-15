import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validateCatalogue } from "../scripts/validate-catalogue.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const episodes = read("../src/data/episodes.json");
const presets = read("../src/data/presets.json");

describe("shipped data files", () => {
  it("pass validation (fix any listed problem in src/data/; for category mismatches run npm run categories)", () => {
    expect(validateCatalogue(episodes, presets)).toEqual([]);
  });
});

describe("validateCatalogue catches mistakes", () => {
  const ep = (over = {}) => ({
    id: "S01E01", season: 1, episode: 1, title: "T", airDate: "2002-10-20",
    categories: ["Standard"], description: "", ...over,
  });
  const preset = (over = {}) => ({ version: 1, collections: [{ id: "preset-a", name: "A", episodeIds: ["S01E01"], ...over }] });
  const problems = (eps, p) => validateCatalogue(eps, p).join("\n");

  it("accepts a minimal valid set", () => {
    expect(validateCatalogue([ep()], preset())).toEqual([]);
  });
  it("flags a typo'd episode id in a preset", () => {
    expect(problems([ep()], preset({ episodeIds: ["S1E01"] }))).toMatch(/unknown episode id "S1E01"/);
  });
  it("flags duplicate ids inside a preset and across the catalogue", () => {
    expect(problems([ep()], preset({ episodeIds: ["S01E01", "S01E01"] }))).toMatch(/listed twice/);
    expect(problems([ep(), ep()], preset())).toMatch(/duplicate id/);
  });
  it("flags preset id and name problems", () => {
    expect(problems([ep()], preset({ id: "mine" }))).toMatch(/must start with "preset-"/);
    const dup = { version: 1, collections: [
      { id: "preset-a", name: "Same", episodeIds: [] }, { id: "preset-b", name: "same", episodeIds: [] }] };
    expect(problems([ep()], dup)).toMatch(/duplicate name/);
  });
  it("flags id that does not match season/episode", () => {
    expect(problems([ep({ id: "S01E02" })], preset({ episodeIds: [] }))).toMatch(/id should be S01E01/);
  });
  it("flags bad dates, order, categories and missing fields", () => {
    expect(problems([ep({ airDate: "2002-02-30" })], preset())).toMatch(/real YYYY-MM-DD/);
    expect(problems([ep(), ep({ id: "S01E02", episode: 2, airDate: "2002-01-01" })], preset())).toMatch(/earlier than/);
    expect(problems([ep({ categories: ["Races"] })], preset())).toMatch(/unknown category "Races"/);
    expect(problems([ep({ categories: [] })], preset())).toMatch(/at least one category/);
    expect(problems([ep({ title: " " })], preset())).toMatch(/missing title/);
    expect(problems([ep({ description: undefined })], preset())).toMatch(/description/);
  });
  it("flags categories that disagree with the presets", () => {
    const inSpecials = preset({ id: "preset-specials", name: "Specials", episodeIds: ["S01E01"] });
    expect(problems([ep()], inSpecials)).toMatch(/don't match the presets.*npm run categories/);
    expect(validateCatalogue([ep({ categories: ["Special"] })], inSpecials)).toEqual([]);
  });
  it("accepts unnumbered specials with an SP- id and rejects others", () => {
    expect(validateCatalogue([ep({ id: "SP-polar-2007", episode: null })], preset({ episodeIds: [] }))).toEqual([]);
    expect(validateCatalogue([ep({ id: "SP-india-2011-(S18E00)", episode: null })], preset({ episodeIds: [] }))).toEqual([]);
    expect(problems([ep({ id: "Polar", episode: null })], preset({ episodeIds: [] }))).toMatch(/SP-/);
  });
});
