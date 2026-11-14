import { toPromise, transactionDone } from "./db.js";

const clean = (name) => String(name ?? "").trim();
const dedupe = (ids) => [...new Set(ids)];

// Custom collections only. Preset collections ship in data/presets.json.
export function createCollectionsRepo(db) {
  const read = (id) => toPromise(db.transaction("collections").objectStore("collections").get(id));

  async function update(id, change) {
    const tx = db.transaction("collections", "readwrite");
    const store = tx.objectStore("collections");
    const current = await toPromise(store.get(id));
    if (!current) {
      tx.abort();
      throw new Error(`Collection not found: ${id}`);
    }
    const next = { ...current, ...change(current), updatedAt: new Date().toISOString() };
    store.put(next);
    await transactionDone(tx);
    return next;
  }

  return {
    async list() {
      const all = await toPromise(db.transaction("collections").objectStore("collections").getAll());
      return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    get: read,

    async create(name, episodeIds = []) {
      const trimmed = clean(name);
      if (!trimmed) throw new Error("Collection name cannot be empty");
      const now = new Date().toISOString();
      const collection = {
        id: crypto.randomUUID(),
        name: trimmed,
        episodeIds: dedupe(episodeIds),
        createdAt: now,
        updatedAt: now,
      };
      const tx = db.transaction("collections", "readwrite");
      tx.objectStore("collections").put(collection);
      await transactionDone(tx);
      return collection;
    },

    rename(id, name) {
      const trimmed = clean(name);
      if (!trimmed) return Promise.reject(new Error("Collection name cannot be empty"));
      return update(id, () => ({ name: trimmed }));
    },

    addEpisode(id, episodeId) {
      return update(id, (c) => ({ episodeIds: dedupe([...c.episodeIds, episodeId]) }));
    },

    removeEpisode(id, episodeId) {
      return update(id, (c) => ({ episodeIds: c.episodeIds.filter((e) => e !== episodeId) }));
    },

    async remove(id) {
      const tx = db.transaction("collections", "readwrite");
      tx.objectStore("collections").delete(id);
      await transactionDone(tx);
    },

    // Used by import. Imported ids are kept so re-importing the same file
    // updates collections rather than duplicating them.
    async putMany(collections, { replace = false } = {}) {
      const tx = db.transaction("collections", "readwrite");
      const store = tx.objectStore("collections");
      if (replace) store.clear();
      const now = new Date().toISOString();
      for (const c of collections) {
        store.put({
          id: c.id,
          name: clean(c.name),
          episodeIds: dedupe(c.episodeIds),
          createdAt: c.createdAt ?? now,
          updatedAt: c.updatedAt ?? now,
        });
      }
      await transactionDone(tx);
    },
  };
}
