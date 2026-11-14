import { describe, it, expect } from "vitest";
import { searchEpisodes } from "../src/domain/catalogue.js";

const ep = (id, season, episode, title, categories = ["Standard"]) => ({
  id, season, episode, title, airDate: "2000-01-01", categories, description: "",
});
const EPS = [
  ep("S01E01", 1, 1, "Stig Outruns a Speed Camera"),
  ep("S05E06", 5, 6, "£1500 Porsches", ["Standard", "CheapCar"]),
  ep("SP-polar-2007", 9, null, "Polar Special", ["Special"]),
];
const ids = (list) => list.map((e) => e.id);

describe("searchEpisodes", () => {
  it("returns everything for an empty or blank query", () => {
    expect(searchEpisodes(EPS, "")).toBe(EPS);
    expect(searchEpisodes(EPS, "   ")).toBe(EPS);
    expect(searchEpisodes(EPS, null)).toBe(EPS);
  });
  it("matches titles case-insensitively", () => {
    expect(ids(searchEpisodes(EPS, "SPEED camera"))).toEqual(["S01E01"]);
  });
  it("matches episode labels and ids", () => {
    expect(ids(searchEpisodes(EPS, "s05e06"))).toEqual(["S05E06"]);
    expect(ids(searchEpisodes(EPS, "polar-2007"))).toEqual(["SP-polar-2007"]);
  });
  it("matches categories", () => {
    expect(ids(searchEpisodes(EPS, "cheapcar"))).toEqual(["S05E06"]);
  });
  it("requires every word to match", () => {
    expect(ids(searchEpisodes(EPS, "stig porsches"))).toEqual([]);
    expect(ids(searchEpisodes(EPS, "stig camera"))).toEqual(["S01E01"]);
  });
  it("treats regex characters literally", () => {
    expect(searchEpisodes(EPS, "(.*")).toEqual([]);
  });
});
