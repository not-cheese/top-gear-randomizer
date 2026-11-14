import { toPromise, transactionDone } from "./db.js";

export function createHistoryRepo(db) {
  return {
    async add({ episodeId, collectionId = null }, selectedAt = new Date().toISOString()) {
      const tx = db.transaction("history", "readwrite");
      const key = await toPromise(tx.objectStore("history").add({ episodeId, collectionId, selectedAt }));
      await transactionDone(tx);
      return key;
    },

    // Newest first.
    async list() {
      const all = await toPromise(db.transaction("history").objectStore("history").getAll());
      return all.sort((a, b) => b.selectedAt.localeCompare(a.selectedAt) || b.id - a.id);
    },

    async clear() {
      const tx = db.transaction("history", "readwrite");
      tx.objectStore("history").clear();
      await transactionDone(tx);
    },
  };
}
