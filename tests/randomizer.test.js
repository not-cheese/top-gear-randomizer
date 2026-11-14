import { describe, it, expect } from "vitest";
import { buildPool, pickRandom, sampleWheelCandidates } from "../src/domain/randomizer.js";

const ep = (id, season, categories = ["Standard"]) => ({
  id, season, episode: 1, title: id, airDate: "2000-01-01", categories, description: "",
});
const EPS = [
  ep("A", 1), ep("B", 1, ["Standard", "Race"]), ep("C", 2),
  ep("D", 2, ["Special"]), ep("E", 3),
];
const ids = (pool) => pool.map((e) => e.id);

describe("buildPool", () => {
  it("returns everything with no options", () => {
    expect(ids(buildPool(EPS))).toEqual(["A", "B", "C", "D", "E"]);
  });
  it("restricts to a collection", () => {
    expect(ids(buildPool(EPS, { episodeIds: ["B", "D", "ZZZ"] }))).toEqual(["B", "D"]);
  });
  it("excludes watched episodes", () => {
    const pool = buildPool(EPS, { excludeWatched: true, watchedSet: new Set(["A", "C"]) });
    expect(ids(pool)).toEqual(["B", "D", "E"]);
  });
  it("ignores the watched set when excludeWatched is off", () => {
    expect(buildPool(EPS, { watchedSet: new Set(["A"]) })).toHaveLength(5);
  });
  it("excludes the previous pick", () => {
    expect(ids(buildPool(EPS, { excludeId: "C" }))).toEqual(["A", "B", "D", "E"]);
  });
  it("keeps the previous pick if it is the only option", () => {
    expect(ids(buildPool(EPS, { episodeIds: ["C"], excludeId: "C" }))).toEqual(["C"]);
  });
  it("combines collection, watched and season filters", () => {
    const pool = buildPool(EPS, {
      episodeIds: ["A", "B", "C", "D"], excludeWatched: true,
      watchedSet: new Set(["B"]), season: 2,
    });
    expect(ids(pool)).toEqual(["C", "D"]);
  });
  it("filters by category", () => {
    expect(ids(buildPool(EPS, { category: "Race" }))).toEqual(["B"]);
  });
  it("returns an empty pool when everything is excluded", () => {
    const pool = buildPool(EPS, { excludeWatched: true, watchedSet: new Set(ids(EPS)) });
    expect(pool).toEqual([]);
  });
});

describe("pickRandom", () => {
  it("returns null for an empty pool", () => {
    expect(pickRandom([])).toBeNull();
  });
  it("maps rng values to the right index", () => {
    expect(pickRandom(EPS, () => 0).id).toBe("A");
    expect(pickRandom(EPS, () => 0.999999).id).toBe("E");
  });
  it("only ever returns pool members and reaches all of them", () => {
    const seen = new Set();
    for (let i = 0; i < 500; i++) seen.add(pickRandom(EPS).id);
    expect([...seen].sort()).toEqual(["A", "B", "C", "D", "E"]);
  });
});

describe("sampleWheelCandidates", () => {
  it("always includes the winner with distinct candidates", () => {
    for (let i = 0; i < 200; i++) {
      const winner = pickRandom(EPS);
      const wheel = sampleWheelCandidates(EPS, winner, 3);
      expect(wheel).toHaveLength(3);
      expect(ids(wheel)).toContain(winner.id);
      expect(new Set(ids(wheel)).size).toBe(3);
    }
  });
  it("uses the whole pool when it is smaller than the wheel", () => {
    const wheel = sampleWheelCandidates(EPS, EPS[0], 10);
    expect(ids(wheel).sort()).toEqual(["A", "B", "C", "D", "E"]);
  });
  it("handles a single-episode pool", () => {
    expect(ids(sampleWheelCandidates([EPS[2]], EPS[2], 10))).toEqual(["C"]);
  });
  it("does not mutate the pool", () => {
    const before = ids(EPS);
    sampleWheelCandidates(EPS, EPS[1], 3);
    expect(ids(EPS)).toEqual(before);
  });
});
