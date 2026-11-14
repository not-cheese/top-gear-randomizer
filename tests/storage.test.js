import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { openDb } from "../src/storage/db.js";
import { createWatchedRepo } from "../src/storage/watchedRepo.js";
import { createCollectionsRepo } from "../src/storage/collectionsRepo.js";
import { createHistoryRepo } from "../src/storage/historyRepo.js";
import { loadPreferences, savePreferences, DEFAULT_PREFERENCES } from "../src/storage/preferences.js";

let n = 0;
let db;
beforeEach(async () => {
  db = await openDb(`test-db-${n++}`); // fresh database per test
});

describe("watchedRepo", () => {
  it("marks and unmarks episodes", async () => {
    const repo = createWatchedRepo(db);
    await repo.mark("S01E01");
    await repo.mark("S01E02");
    expect([...(await repo.getIdSet())].sort()).toEqual(["S01E01", "S01E02"]);
    await repo.unmark("S01E01");
    expect([...(await repo.getIdSet())]).toEqual(["S01E02"]);
  });
  it("never creates duplicate records", async () => {
    const repo = createWatchedRepo(db);
    await repo.mark("S01E01");
    await repo.mark("S01E01");
    expect(await repo.getAll()).toHaveLength(1);
  });
  it("putMany merges by default and replaces on request", async () => {
    const repo = createWatchedRepo(db);
    await repo.mark("A");
    await repo.putMany([{ episodeId: "B", watchedAt: "2026-01-01T00:00:00Z" }]);
    expect((await repo.getIdSet()).size).toBe(2);
    await repo.putMany([{ episodeId: "C", watchedAt: "2026-01-01T00:00:00Z" }], { replace: true });
    expect([...(await repo.getIdSet())]).toEqual(["C"]);
  });
  it("persists across reopening the database", async () => {
    const name = `persist-${n++}`;
    const first = await openDb(name);
    await createWatchedRepo(first).mark("S05E05");
    first.close();
    const second = await openDb(name);
    expect([...(await createWatchedRepo(second).getIdSet())]).toEqual(["S05E05"]);
  });
});

describe("collectionsRepo", () => {
  it("creates, renames and deletes", async () => {
    const repo = createCollectionsRepo(db);
    const c = await repo.create("  Road trips ");
    expect(c.name).toBe("Road trips");
    await repo.rename(c.id, "Best trips");
    expect((await repo.get(c.id)).name).toBe("Best trips");
    await repo.remove(c.id);
    expect(await repo.list()).toEqual([]);
  });
  it("rejects empty names", async () => {
    const repo = createCollectionsRepo(db);
    await expect(repo.create("   ")).rejects.toThrow();
    const c = await repo.create("ok");
    await expect(repo.rename(c.id, "")).rejects.toThrow();
  });
  it("adds and removes episodes without duplicates", async () => {
    const repo = createCollectionsRepo(db);
    const c = await repo.create("Mine");
    await repo.addEpisode(c.id, "S01E01");
    await repo.addEpisode(c.id, "S01E01");
    await repo.addEpisode(c.id, "S02E02");
    expect((await repo.get(c.id)).episodeIds).toEqual(["S01E01", "S02E02"]);
    await repo.removeEpisode(c.id, "S01E01");
    expect((await repo.get(c.id)).episodeIds).toEqual(["S02E02"]);
  });
  it("allows the same episode in several collections", async () => {
    const repo = createCollectionsRepo(db);
    const a = await repo.create("A", ["S01E01"]);
    const b = await repo.create("B", ["S01E01"]);
    expect((await repo.get(a.id)).episodeIds).toEqual(["S01E01"]);
    expect((await repo.get(b.id)).episodeIds).toEqual(["S01E01"]);
  });
  it("errors when updating a missing collection", async () => {
    await expect(createCollectionsRepo(db).addEpisode("nope", "S01E01")).rejects.toThrow();
  });
  it("re-importing the same collection updates instead of duplicating", async () => {
    const repo = createCollectionsRepo(db);
    const data = [{ id: "x1", name: "Imported", episodeIds: ["A", "A", "B"] }];
    await repo.putMany(data);
    await repo.putMany(data);
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].episodeIds).toEqual(["A", "B"]);
  });
});

describe("historyRepo", () => {
  it("lists newest first and clears", async () => {
    const repo = createHistoryRepo(db);
    await repo.add({ episodeId: "A" }, "2026-01-01T00:00:00Z");
    await repo.add({ episodeId: "B", collectionId: "preset-specials" }, "2026-02-01T00:00:00Z");
    expect((await repo.list()).map((h) => h.episodeId)).toEqual(["B", "A"]);
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });
});

describe("preferences", () => {
  const fakeStorage = (initial = {}) => {
    const data = { ...initial };
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, data };
  };
  it("returns defaults when nothing is stored", () => {
    expect(loadPreferences(fakeStorage())).toEqual(DEFAULT_PREFERENCES);
  });
  it("saves and merges partial updates", () => {
    const s = fakeStorage();
    savePreferences({ excludeWatched: false }, s);
    savePreferences({ lastCollectionId: "preset-specials" }, s);
    expect(loadPreferences(s)).toEqual({
      ...DEFAULT_PREFERENCES, excludeWatched: false, lastCollectionId: "preset-specials",
    });
  });
  it("falls back to defaults on corrupt or wrong-version data", () => {
    expect(loadPreferences(fakeStorage({ "tgr:prefs": "{not json" }))).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences(fakeStorage({ "tgr:prefs": JSON.stringify({ version: 99 }) }))).toEqual(DEFAULT_PREFERENCES);
  });
  it("ignores unknown keys", () => {
    const s = fakeStorage({ "tgr:prefs": JSON.stringify({ version: 1, evil: 1, excludeWatched: false }) });
    expect(loadPreferences(s)).toEqual({ ...DEFAULT_PREFERENCES, excludeWatched: false });
  });
  it("does not throw when storage is unavailable", () => {
    const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
    expect(loadPreferences(broken)).toEqual(DEFAULT_PREFERENCES);
    expect(() => savePreferences({ excludeWatched: false }, broken)).not.toThrow();
  });
});
