import { toPromise, transactionDone } from "./db.js";

// Presence of a record means "watched". Removing it means "unwatched".
export function createWatchedRepo(db) {
  return {
    async getAll() {
      return toPromise(db.transaction("watched").objectStore("watched").getAll());
    },

    async getIdSet() {
      const records = await this.getAll();
      return new Set(records.map((r) => r.episodeId));
    },

    async mark(episodeId, watchedAt = new Date().toISOString()) {
      const tx = db.transaction("watched", "readwrite");
      tx.objectStore("watched").put({ episodeId, watchedAt });
      await transactionDone(tx);
    },

    async unmark(episodeId) {
      const tx = db.transaction("watched", "readwrite");
      tx.objectStore("watched").delete(episodeId);
      await transactionDone(tx);
    },

    // Used by import. replace=true wipes existing records first. One transaction,
    // so a failure leaves the previous data untouched.
    async putMany(records, { replace = false } = {}) {
      const tx = db.transaction("watched", "readwrite");
      const store = tx.objectStore("watched");
      if (replace) store.clear();
      for (const r of records) store.put({ episodeId: r.episodeId, watchedAt: r.watchedAt });
      await transactionDone(tx);
    },

    async clear() {
      const tx = db.transaction("watched", "readwrite");
      tx.objectStore("watched").clear();
      await transactionDone(tx);
    },
  };
}
