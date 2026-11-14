const KEY = "tgr:prefs";
const VERSION = 1;

export const DEFAULT_PREFERENCES = {
  excludeWatched: true,
  excludePrevious: true,
  lastCollectionId: null,
};

// `storage` is injectable so this works in tests and when localStorage is
// blocked (private mode, disabled cookies). Failures fall back to defaults.
export function loadPreferences(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.version !== VERSION) {
      return { ...DEFAULT_PREFERENCES };
    }
    const { version, ...values } = parsed;
    // Only keep known keys so stale or hand-edited data can't leak in.
    const known = Object.fromEntries(
      Object.keys(DEFAULT_PREFERENCES).filter((k) => k in values).map((k) => [k, values[k]])
    );
    return { ...DEFAULT_PREFERENCES, ...known };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs, storage = globalThis.localStorage) {
  const merged = { ...loadPreferences(storage), ...prefs };
  try {
    storage?.setItem(KEY, JSON.stringify({ version: VERSION, ...merged }));
  } catch {
    // Storage full or blocked: keep running with in-memory values.
  }
  return merged;
}
