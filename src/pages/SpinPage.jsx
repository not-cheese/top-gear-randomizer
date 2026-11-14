import { useMemo, useState } from "react";
import { useApp } from "../state/hooks.js";
import { buildPool, pickRandom, sampleWheelCandidates } from "../domain/randomizer.js";
import { validEpisodeIds } from "../domain/collections.js";
import SpinWheel from "../components/wheel/SpinWheel.jsx";
import ResultCard from "../components/wheel/ResultCard.jsx";

const WHEEL_SIZE = 10;
const ALL = "all";

// Evenly spaced sample so the idle wheel shows variety instead of one series.
function previewSample(pool, count) {
  const n = Math.min(count, pool.length);
  return Array.from({ length: n }, (_, i) => pool[Math.floor((i * pool.length) / n)]);
}

export default function SpinPage() {
  const {
    episodes, episodeIndex, watchedIds, collections, history, prefs,
    toggleWatched, recordSpin, updatePrefs,
  } = useApp();

  const [wheel, setWheel] = useState({ candidates: [], winnerIndex: 0, spinKey: 0 });
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState("");

  const selectedId = collections.some((c) => c.id === prefs.lastCollectionId)
    ? prefs.lastCollectionId
    : ALL;
  const collection = collections.find((c) => c.id === selectedId) ?? null;
  const lastPickId = history[0]?.episodeId ?? null;

  const pool = useMemo(
    () =>
      buildPool(episodes, {
        episodeIds: collection ? validEpisodeIds(collection, episodeIndex) : null,
        excludeWatched: prefs.excludeWatched,
        watchedSet: watchedIds,
        excludeId: prefs.excludePrevious ? lastPickId : null,
      }),
    [episodes, episodeIndex, collection, prefs.excludeWatched, prefs.excludePrevious, watchedIds, lastPickId]
  );

  const idleCandidates = useMemo(() => previewSample(pool, WHEEL_SIZE), [pool]);
  const shownCandidates = wheel.spinKey === 0 ? idleCandidates : wheel.candidates;

  function handleSpin() {
    if (spinning || pool.length === 0) return;
    const winner = pickRandom(pool);
    const candidates = sampleWheelCandidates(pool, winner, WHEEL_SIZE);
    setNotice("");
    setResult(null);
    setSpinning(true);
    setWheel((w) => ({
      candidates,
      winnerIndex: candidates.indexOf(winner),
      spinKey: w.spinKey + 1,
    }));
  }

  async function handleFinish() {
    const winner = wheel.candidates[wheel.winnerIndex];
    setResult(winner);
    setSpinning(false);
    try {
      await recordSpin(winner.id, collection?.id ?? null);
    } catch {
      setNotice("This spin could not be saved to your history.");
    }
  }

  async function handleToggleWatched() {
    try {
      await toggleWatched(result.id);
    } catch {
      setNotice("Could not save the watched status.");
    }
  }

  const collectionCount = (c) => validEpisodeIds(c, episodeIndex).length;
  const presets = collections.filter((c) => c.isPreset);
  const custom = collections.filter((c) => !c.isPreset);

  let emptyMessage = "";
  if (pool.length === 0) {
    emptyMessage =
      collection && collectionCount(collection) === 0
        ? "This collection has no episodes yet."
        : "Nothing left to pick. Try turning off “Exclude watched” or choosing another collection.";
  }

  return (
    <>
      <h1 className="page-title">Spin</h1>
      <p className="page-sub">Can’t decide what to watch? Let the wheel choose.</p>

      <div className="spin-controls">
        <label className="field">
          <span>Collection</span>
          <select
            value={selectedId}
            disabled={spinning}
            onChange={(e) => updatePrefs({ lastCollectionId: e.target.value === ALL ? null : e.target.value })}
          >
            <option value={ALL}>All episodes ({episodes.length})</option>
            {presets.length > 0 && (
              <optgroup label="Preset">
                {presets.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({collectionCount(c)})</option>
                ))}
              </optgroup>
            )}
            {custom.length > 0 && (
              <optgroup label="Your collections">
                {custom.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({collectionCount(c)})</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={prefs.excludeWatched}
            disabled={spinning}
            onChange={(e) => updatePrefs({ excludeWatched: e.target.checked })}
          />
          Exclude watched
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={prefs.excludePrevious}
            disabled={spinning}
            onChange={(e) => updatePrefs({ excludePrevious: e.target.checked })}
          />
          Exclude previous pick
        </label>
      </div>

      <SpinWheel
        candidates={shownCandidates}
        spinKey={wheel.spinKey}
        winnerIndex={wheel.winnerIndex}
        onFinish={handleFinish}
      />

      <div className="spin-action">
        <button className="btn btn-primary btn-big" onClick={handleSpin} disabled={spinning || pool.length === 0}>
          {spinning ? "Spinning…" : result ? "Spin again" : "Spin"}
        </button>
        <p className="pool-count">
          {pool.length} {pool.length === 1 ? "episode" : "episodes"} in the pool
        </p>
      </div>

      {emptyMessage && <p className="empty">{emptyMessage}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {result && (
        <ResultCard
          episode={result}
          watched={watchedIds.has(result.id)}
          onToggleWatched={handleToggleWatched}
        />
      )}
    </>
  );
}
