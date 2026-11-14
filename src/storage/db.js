// IndexedDB setup. Add a new function to MIGRATIONS to change the schema;
// the database version is simply the number of migrations.
export const DB_NAME = "topgear-randomizer";

const MIGRATIONS = [
  // v1
  (db) => {
    db.createObjectStore("watched", { keyPath: "episodeId" });
    db.createObjectStore("collections", { keyPath: "id" });
    const history = db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
    history.createIndex("selectedAt", "selectedAt");
  },
];

export function openDb(name = DB_NAME) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, MIGRATIONS.length);
    request.onupgradeneeded = (event) => {
      for (let v = event.oldVersion; v < MIGRATIONS.length; v++) {
        MIGRATIONS[v](request.result, request.transaction);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database upgrade blocked by another open tab"));
  });
}

export function toPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}
