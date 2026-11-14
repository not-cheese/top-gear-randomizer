import { describe, it, expect } from "vitest";
import {
  buildWatchedExport, buildCollectionsExport, exportFileName, parseImport, APP_ID,
} from "../src/domain/backup.js";

const index = new Map(["S01E01", "S01E02", "S02E01"].map((id) => [id, { id }]));
const NOW = new Date("2026-11-14T12:00:00Z");
const opts = { episodeIndex: index, now: NOW, makeId: () => "new-id" };
const file = (kind, data, extra = {}) =>
  JSON.stringify({ app: APP_ID, formatVersion: 1, exportedAt: NOW.toISOString(), kind, data, ...extra });

describe("export", () => {
  it("builds a watched export sorted by id, with only the known fields", () => {
    const out = buildWatchedExport(
      [{ episodeId: "S02E01", watchedAt: "b", junk: 1 }, { episodeId: "S01E01", watchedAt: "a" }], NOW);
    expect(out).toMatchObject({ app: APP_ID, formatVersion: 1, kind: "watched", exportedAt: NOW.toISOString() });
    expect(out.data.watched).toEqual([
      { episodeId: "S01E01", watchedAt: "a" }, { episodeId: "S02E01", watchedAt: "b" }]);
  });
  it("copies collections so later edits don't change the export", () => {
    const source = [{ id: "x", name: "N", episodeIds: ["S01E01"], createdAt: "c", updatedAt: "u" }];
    const out = buildCollectionsExport(source, NOW);
    source[0].episodeIds.push("S01E02");
    expect(out.data.collections[0].episodeIds).toEqual(["S01E01"]);
  });
  it("names files by kind and date", () => {
    expect(exportFileName("watched", NOW)).toBe("topgear-watched-2026-11-14.json");
  });
});

describe("parseImport: rejecting bad files", () => {
  const err = (text) => {
    const r = parseImport(text, opts);
    expect(r.ok).toBe(false);
    return r.error;
  };
  it("rejects invalid JSON, empty input and non-objects", () => {
    expect(err("{nope")).toMatch(/valid JSON/);
    expect(err("")).toMatch(/valid JSON/);
    expect(err("[1,2]")).toMatch(/doesn't look like/);
    expect(err("null")).toMatch(/doesn't look like/);
  });
  it("rejects files from another app", () => {
    expect(err(JSON.stringify({ app: "other", formatVersion: 1, kind: "watched", data: {} }))).toMatch(/wasn't exported/);
  });
  it("rejects bad or newer format versions", () => {
    expect(err(file("watched", {}, { formatVersion: "1" }))).toMatch(/format version/);
    expect(err(file("watched", {}, { formatVersion: 0 }))).toMatch(/format version/);
    expect(err(file("watched", {}, { formatVersion: 2 }))).toMatch(/newer version/);
  });
  it("rejects unknown kinds and missing sections", () => {
    expect(err(file("backup", {}))).toMatch(/Unsupported/);
    expect(err(JSON.stringify({ app: APP_ID, formatVersion: 1, kind: "watched" }))).toMatch(/no data/);
    expect(err(file("watched", {}))).toMatch(/no watched list/);
    expect(err(file("collections", { collections: "x" }))).toMatch(/no collections list/);
  });
});

describe("parseImport: watched", () => {
  it("imports valid records and keeps their dates", () => {
    const r = parseImport(file("watched", { watched: [{ episodeId: "S01E01", watchedAt: "2026-01-01T00:00:00Z" }] }), opts);
    expect(r).toMatchObject({ ok: true, kind: "watched" });
    expect(r.items).toEqual([{ episodeId: "S01E01", watchedAt: "2026-01-01T00:00:00Z" }]);
    expect(r.warnings).toEqual([]);
  });
  it("skips unknown, malformed and duplicate entries and says so", () => {
    const r = parseImport(file("watched", { watched: [
      { episodeId: "S01E01", watchedAt: "2026-01-01T00:00:00Z" },
      { episodeId: "S01E01", watchedAt: "2026-02-01T00:00:00Z" },
      { episodeId: "S99E99", watchedAt: "2026-01-01T00:00:00Z" },
      { episodeId: 5 }, "junk", null,
    ] }), opts);
    expect(r.items.map((i) => i.episodeId)).toEqual(["S01E01"]);
    expect(r.summary).toEqual({ imported: 1, unknown: 1, invalid: 3, duplicates: 1 });
    expect(r.warnings).toHaveLength(3);
  });
  it("replaces a missing or bad date with the import time", () => {
    const r = parseImport(file("watched", { watched: [{ episodeId: "S01E02" }, { episodeId: "S02E01", watchedAt: "nope" }] }), opts);
    expect(r.items.map((i) => i.watchedAt)).toEqual([NOW.toISOString(), NOW.toISOString()]);
  });
  it("accepts an empty list", () => {
    const r = parseImport(file("watched", { watched: [] }), opts);
    expect(r).toMatchObject({ ok: true, items: [] });
  });
  it("tolerates a byte-order mark", () => {
    expect(parseImport("﻿" + file("watched", { watched: [] }), opts).ok).toBe(true);
  });
  it("round-trips its own export", () => {
    const exported = buildWatchedExport([{ episodeId: "S01E02", watchedAt: "2026-03-03T00:00:00Z" }], NOW);
    const r = parseImport(JSON.stringify(exported), opts);
    expect(r.items).toEqual([{ episodeId: "S01E02", watchedAt: "2026-03-03T00:00:00Z" }]);
  });
});

describe("parseImport: collections", () => {
  const good = { id: "c1", name: "  Road trips ", episodeIds: ["S01E01", "S01E01", "S02E01"], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" };
  it("cleans names and de-duplicates episode ids", () => {
    const r = parseImport(file("collections", { collections: [good] }), opts);
    expect(r.items).toEqual([{ ...good, name: "Road trips", episodeIds: ["S01E01", "S02E01"] }]);
    expect(r.summary).toMatchObject({ imported: 1, episodes: 2 });
  });
  it("drops unknown episode ids but keeps the collection", () => {
    const r = parseImport(file("collections", { collections: [{ ...good, episodeIds: ["S01E01", "S99E99", 7] }] }), opts);
    expect(r.items[0].episodeIds).toEqual(["S01E01"]);
    expect(r.summary.unknownEpisodes).toBe(2);
    expect(r.warnings.join(" ")).toMatch(/removed/);
  });
  it("skips malformed and duplicate-id collections", () => {
    const r = parseImport(file("collections", { collections: [
      good, { ...good, name: "Second with same id" },
      { id: "c2", name: "   ", episodeIds: [] }, { id: "c3", name: "No list" }, { name: "No id", episodeIds: [] }, 5,
    ] }), opts);
    expect(r.items.map((c) => c.id)).toEqual(["c1"]);
    expect(r.summary).toMatchObject({ invalid: 4, duplicates: 1 });
  });
  it("gives reserved preset ids a fresh id", () => {
    const r = parseImport(file("collections", { collections: [{ ...good, id: "preset-specials" }] }), opts);
    expect(r.items[0].id).toBe("new-id");
    expect(r.summary.renamed).toBe(1);
  });
  it("truncates very long names", () => {
    const r = parseImport(file("collections", { collections: [{ ...good, name: "x".repeat(500) }] }), opts);
    expect(r.items[0].name).toHaveLength(80);
  });
  it("fills in missing dates", () => {
    const r = parseImport(file("collections", { collections: [{ id: "c1", name: "N", episodeIds: [] }] }), opts);
    expect(r.items[0].createdAt).toBe(NOW.toISOString());
  });
  it("does not let prototype keys through", () => {
    const text = '{"app":"topgear-randomizer","formatVersion":1,"kind":"collections","data":{"collections":[{"id":"c1","name":"N","episodeIds":[],"__proto__":{"polluted":true}}]}}';
    const r = parseImport(text, opts);
    expect(r.items[0].polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
  });
  it("round-trips its own export", () => {
    const exported = buildCollectionsExport([good].map((c) => ({ ...c, name: "Road trips", episodeIds: ["S01E01"] })), NOW);
    const r = parseImport(JSON.stringify(exported), opts);
    expect(r.items[0]).toMatchObject({ id: "c1", name: "Road trips", episodeIds: ["S01E01"] });
  });
});
