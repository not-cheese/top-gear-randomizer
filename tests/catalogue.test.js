import { describe, it, expect } from "vitest";
import {
  indexById, episodesFromIds, filterEpisodes, sortByAirDate, episodeLabel, groupBySeason,
} from "../src/domain/catalogue.js";

const ep = (id, season, episode, airDate, categories = ["Standard"]) => ({
  id, season, episode, title: id, airDate, categories, description: "",
});
const EPS = [
  ep("S02E01", 2, 1, "2003-05-11"),
  ep("S01E02", 1, 2, "2002-10-27", ["Standard", "Race"]),
  ep("SP-x", 1, null, "2002-12-30", ["Special"]),
  ep("S01E01", 1, 1, "2002-10-20"),
];

describe("catalogue helpers", () => {
  it("indexes by id and resolves ids, skipping unknown ones", () => {
    const index = indexById(EPS);
    expect(episodesFromIds(index, ["S01E01", "NOPE", "S02E01"]).map((e) => e.id)).toEqual(["S01E01", "S02E01"]);
  });
  it("filters by season and category", () => {
    expect(filterEpisodes(EPS, { season: 1 })).toHaveLength(3);
    expect(filterEpisodes(EPS, { category: "Race" }).map((e) => e.id)).toEqual(["S01E02"]);
    expect(filterEpisodes(EPS, { season: 1, category: "Special" }).map((e) => e.id)).toEqual(["SP-x"]);
  });
  it("sorts by air date without mutating", () => {
    const before = EPS.map((e) => e.id);
    expect(sortByAirDate(EPS).map((e) => e.id)).toEqual(["S01E01", "S01E02", "SP-x", "S02E01"]);
    expect(EPS.map((e) => e.id)).toEqual(before);
  });
  it("labels series episodes and specials", () => {
    expect(episodeLabel(EPS[0])).toBe("S02E01");
    expect(episodeLabel(EPS[2])).toBe("Special");
  });
  it("groups by season, ascending, sorted by air date within each", () => {
    const groups = groupBySeason(EPS);
    expect(groups.map(([season]) => season)).toEqual([1, 2]);
    expect(groups[0][1].map((e) => e.id)).toEqual(["S01E01", "S01E02", "SP-x"]);
  });
});
