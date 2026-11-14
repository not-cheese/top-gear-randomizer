import { useState } from "react";
import { useApp } from "../state/hooks.js";
import {
  buildCollectionsExport, buildWatchedExport, exportFileName, parseImport,
} from "../domain/backup.js";
import "../styles/data.css";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function DataPage() {
  const {
    episodeIndex, watchedIds, collections,
    getWatchedRecords, importWatched, importCollections, resetAll,
  } = useApp();

  const [notice, setNotice] = useState(null); // { type: "ok" | "error", text }
  const [preview, setPreview] = useState(null); // { fileName, result }
  const [busy, setBusy] = useState(false);

  const custom = collections.filter((c) => !c.isPreset);
  const say = (type, text) => setNotice({ type, text });

  async function exportWatched() {
    try {
      const records = await getWatchedRecords();
      downloadJson(exportFileName("watched"), buildWatchedExport(records));
      say("ok", `Exported ${plural(records.length, "watched episode", "watched episodes")}.`);
    } catch {
      say("error", "Could not export your watched episodes.");
    }
  }

  function exportCollections() {
    downloadJson(exportFileName("collections"), buildCollectionsExport(custom));
    say("ok", `Exported ${plural(custom.length, "collection", "collections")}.`);
  }

  async function handleFile(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ""; // lets the same file be chosen again later
    setNotice(null);
    setPreview(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      say("error", "That file is too large to be a Top Gear Randomizer export.");
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      say("error", "Could not read that file.");
      return;
    }
    const result = parseImport(text, { episodeIndex });
    if (!result.ok) {
      say("error", result.error);
      return;
    }
    setPreview({ fileName: file.name, result });
  }

  async function applyImport(replace) {
    const { result } = preview;
    const what = result.kind === "watched" ? "watched episodes" : "collections";
    if (replace && !window.confirm(`Replace all your current ${what} with this file? This can't be undone.`)) return;
    setBusy(true);
    try {
      if (result.kind === "watched") await importWatched(result.items, { replace });
      else await importCollections(result.items, { replace });
      say("ok", `Imported ${plural(result.items.length, what.slice(0, -1), what)} (${replace ? "replaced" : "merged"}).`);
      setPreview(null);
    } catch {
      say("error", "The import failed and nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("Delete ALL your watched episodes, collections, history and settings from this browser? This can't be undone.")) return;
    setBusy(true);
    try {
      await resetAll();
      setPreview(null);
      say("ok", "All local data was cleared.");
    } catch {
      say("error", "Could not clear your data.");
    } finally {
      setBusy(false);
    }
  }

  const result = preview?.result;

  return (
    <>
      <h1 className="page-title">Data</h1>
      <p className="page-sub">
        Everything is stored in this browser only. Export a file to back it up or move it to another device.
      </p>

      {notice && (
        <p className={`notice notice-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.text}
        </p>
      )}

      <section className="data-section">
        <h2>Export</h2>
        <p>Download your data as JSON files.</p>
        <div className="data-buttons">
          <button className="btn" onClick={exportWatched} disabled={busy || watchedIds.size === 0}>
            Export watched ({watchedIds.size})
          </button>
          <button className="btn" onClick={exportCollections} disabled={busy || custom.length === 0}>
            Export collections ({custom.length})
          </button>
        </div>
      </section>

      <section className="data-section">
        <h2>Import</h2>
        <p>Choose a watched or collections file exported from this app. You'll see a summary before anything changes.</p>
        <input className="file-input" type="file" accept=".json,application/json" onChange={handleFile} disabled={busy} />

        {result && (
          <div className="preview">
            <h3>{preview.fileName}</h3>
            {result.kind === "watched" ? (
              <p>{plural(result.summary.imported, "watched episode", "watched episodes")} ready to import.</p>
            ) : (
              <p>
                {plural(result.summary.imported, "collection", "collections")} with {plural(result.summary.episodes, "episode", "episodes")} ready to import.
              </p>
            )}
            {result.warnings.length > 0 && (
              <ul>
                {result.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
            {result.items.length === 0 ? (
              <p className="more-note">Nothing in this file can be imported.</p>
            ) : (
              <div className="data-buttons">
                <button className="btn btn-primary" onClick={() => applyImport(false)} disabled={busy}>
                  Merge with existing
                </button>
                <button className="btn" onClick={() => applyImport(true)} disabled={busy}>
                  Replace existing
                </button>
              </div>
            )}
            <div className="data-buttons" style={{ marginTop: ".6rem" }}>
              <button className="link-btn" onClick={() => setPreview(null)} disabled={busy}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="data-section danger">
        <h2>Reset</h2>
        <p>Clears watched episodes, your collections, spin history and settings from this browser.</p>
        <button className="btn btn-danger" onClick={handleReset} disabled={busy}>Delete all my data</button>
      </section>
    </>
  );
}
