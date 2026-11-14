import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import episodes from "../data/episodes.json";
import presets from "../data/presets.json";
import { indexById } from "../domain/catalogue.js";
import { mergeCollections } from "../domain/collections.js";
import { openDb } from "../storage/db.js";
import { createWatchedRepo } from "../storage/watchedRepo.js";
import { createCollectionsRepo } from "../storage/collectionsRepo.js";
import { createHistoryRepo } from "../storage/historyRepo.js";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from "../storage/preferences.js";
import { AppContext } from "./AppContext.js";

const episodeIndex = indexById(episodes);

export default function AppProvider({ children }) {
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [error, setError] = useState(null);
  const [watchedIds, setWatchedIds] = useState(() => new Set());
  const [customCollections, setCustomCollections] = useState([]);
  const [history, setHistory] = useState([]);
  const [prefs, setPrefs] = useState(() => loadPreferences());
  const repos = useRef(null);

  // Open the database once and load everything into memory.
  useEffect(() => {
    let cancelled = false;
    let openedDb = null;
    (async () => {
      try {
        const db = await openDb();
        openedDb = db;
        const loaded = {
          watched: createWatchedRepo(db),
          collections: createCollectionsRepo(db),
          history: createHistoryRepo(db),
        };
        const [ids, collections, spins] = await Promise.all([
          loaded.watched.getIdSet(),
          loaded.collections.list(),
          loaded.history.list(),
        ]);
        if (cancelled) return;
        repos.current = loaded;
        setWatchedIds(ids);
        setCustomCollections(collections);
        setHistory(spins);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      openedDb?.close();
    };
  }, []);

  // Every action writes to storage first, then updates state, so the screen
  // never shows something that was not actually saved.
  const actions = useMemo(() => {
    const r = () => {
      if (!repos.current) throw new Error("Storage is not ready yet");
      return repos.current;
    };
    const replaceCollection = (next) =>
      setCustomCollections((list) => list.map((c) => (c.id === next.id ? next : c)));

    return {
      async markWatched(episodeId) {
        await r().watched.mark(episodeId);
        setWatchedIds((s) => new Set(s).add(episodeId));
      },
      async unmarkWatched(episodeId) {
        await r().watched.unmark(episodeId);
        setWatchedIds((s) => {
          const next = new Set(s);
          next.delete(episodeId);
          return next;
        });
      },
      async createCollection(name, episodeIds = []) {
        const created = await r().collections.create(name, episodeIds);
        setCustomCollections((list) => [...list, created]);
        return created;
      },
      async renameCollection(id, name) {
        replaceCollection(await r().collections.rename(id, name));
      },
      async deleteCollection(id) {
        await r().collections.remove(id);
        setCustomCollections((list) => list.filter((c) => c.id !== id));
      },
      async addToCollection(id, episodeId) {
        replaceCollection(await r().collections.addEpisode(id, episodeId));
      },
      async removeFromCollection(id, episodeId) {
        replaceCollection(await r().collections.removeEpisode(id, episodeId));
      },
      async recordSpin(episodeId, collectionId = null) {
        await r().history.add({ episodeId, collectionId });
        setHistory(await r().history.list());
      },
      async clearHistory() {
        await r().history.clear();
        setHistory([]);
      },
      getWatchedRecords() {
        return r().watched.getAll();
      },
      // Import writes in a single transaction, then reloads state from storage.
      async importWatched(records, { replace = false } = {}) {
        await r().watched.putMany(records, { replace });
        setWatchedIds(await r().watched.getIdSet());
      },
      async importCollections(collections, { replace = false } = {}) {
        await r().collections.putMany(collections, { replace });
        setCustomCollections(await r().collections.list());
      },
      async resetAll() {
        await r().watched.clear();
        await r().collections.putMany([], { replace: true });
        await r().history.clear();
        setWatchedIds(new Set());
        setCustomCollections([]);
        setHistory([]);
        setPrefs(savePreferences({ ...DEFAULT_PREFERENCES }));
      },
      updatePrefs(partial) {
        setPrefs(savePreferences(partial));
      },
    };
  }, []);

  const toggleWatched = useCallback(
    (episodeId) =>
      watchedIds.has(episodeId) ? actions.unmarkWatched(episodeId) : actions.markWatched(episodeId),
    [watchedIds, actions]
  );

  const collections = useMemo(
    () => mergeCollections(presets.collections, customCollections),
    [customCollections]
  );

  const value = useMemo(
    () => ({
      status, error,
      episodes, episodeIndex,
      watchedIds, collections, history, prefs,
      toggleWatched, ...actions,
    }),
    [status, error, watchedIds, collections, history, prefs, toggleWatched, actions]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
