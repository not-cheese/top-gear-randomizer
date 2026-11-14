import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../state/hooks.js";
import { episodeLabel, episodesFromIds, formatAirDate, searchEpisodes, sortByAirDate } from "../domain/catalogue.js";
import { validEpisodeIds } from "../domain/collections.js";
import "../styles/collections.css";

const MAX_RESULTS = 25;

export default function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    collections, episodes, episodeIndex, updatePrefs,
    renameCollection, deleteCollection, addToCollection, removeFromCollection,
  } = useApp();

  const collection = collections.find((c) => c.id === id);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const members = useMemo(
    () => (collection ? sortByAirDate(episodesFromIds(episodeIndex, validEpisodeIds(collection, episodeIndex))) : []),
    [collection, episodeIndex]
  );

  const candidates = useMemo(() => {
    if (!collection || !adding) return [];
    const inside = new Set(collection.episodeIds);
    return searchEpisodes(sortByAirDate(episodes.filter((e) => !inside.has(e.id))), query);
  }, [collection, adding, episodes, query]);

  if (!collection) {
    return (
      <>
        <Link className="back-link" to="/collections">‹ Collections</Link>
        <h1 className="page-title">Collection not found</h1>
        <p className="page-sub">It may have been deleted.</p>
      </>
    );
  }

  const editable = !collection.isPreset;

  async function run(action, failure) {
    setNotice("");
    try {
      await action();
    } catch (e) {
      setNotice(e?.message || failure);
    }
  }

  const startRename = () => {
    setDraftName(collection.name);
    setRenaming(true);
  };

  const submitRename = (event) => {
    event.preventDefault();
    run(async () => {
      await renameCollection(collection.id, draftName);
      setRenaming(false);
    }, "Could not rename the collection.");
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete “${collection.name}”? This can't be undone.`)) return;
    run(async () => {
      await deleteCollection(collection.id);
      navigate("/collections");
    }, "Could not delete the collection.");
  };

  const spinThis = () => {
    updatePrefs({ lastCollectionId: collection.id });
    navigate("/");
  };

  return (
    <>
      <Link className="back-link" to="/collections">‹ Collections</Link>

      <div className="detail-head">
        {renaming ? (
          <form className="rename-form" onSubmit={submitRename}>
            <input
              className="text-input"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              aria-label="Collection name"
              maxLength={80}
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={!draftName.trim()}>Save</button>
            <button className="btn" type="button" onClick={() => setRenaming(false)}>Cancel</button>
          </form>
        ) : (
          <h1 className="page-title">{collection.name}</h1>
        )}
        {collection.isPreset && <span className="chip">Preset</span>}
      </div>
      <p className="page-sub">
        {members.length} {members.length === 1 ? "episode" : "episodes"}
      </p>

      <div className="detail-actions">
        <button className="btn btn-primary" onClick={spinThis} disabled={members.length === 0}>
          Spin this collection
        </button>
        {editable && !renaming && <button className="btn" onClick={startRename}>Rename</button>}
        {editable && (
          <button className="btn" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            {adding ? "Done adding" : "Add episodes"}
          </button>
        )}
        {editable && <button className="btn btn-danger" onClick={handleDelete}>Delete</button>}
      </div>

      {notice && <p className="notice" role="alert">{notice}</p>}

      {editable && adding && (
        <section className="add-panel">
          <h2>Add episodes</h2>
          <input
            className="text-input"
            style={{ width: "100%" }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, S05E06, or category"
            aria-label="Search episodes to add"
          />
          {candidates.length === 0 ? (
            <p className="empty" style={{ marginTop: ".75rem" }}>
              {query.trim() ? "No matching episodes." : "Every episode is already in this collection."}
            </p>
          ) : (
            <>
              <ul className="episode-list">
                {candidates.slice(0, MAX_RESULTS).map((e) => (
                  <li key={e.id} className="episode-row simple-row">
                    <span className="episode-body">
                      <span className="episode-title">{e.title}</span>
                      <span className="episode-meta"> {episodeLabel(e)} · {formatAirDate(e.airDate)}</span>
                    </span>
                    <button
                      className="icon-btn"
                      onClick={() => run(() => addToCollection(collection.id, e.id), "Could not add that episode.")}
                      aria-label={`Add ${e.title}`}
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
              {candidates.length > MAX_RESULTS && (
                <p className="more-note">
                  Showing {MAX_RESULTS} of {candidates.length}. Type more of the title to narrow it down.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {members.length === 0 ? (
        <p className="empty">
          {editable
            ? "No episodes yet. Use “Add episodes” to build this collection."
            : "This preset has no episodes yet. Add episode IDs to it in src/data/presets.json."}
        </p>
      ) : (
        <ul className="episode-list">
          {members.map((e) => (
            <li key={e.id} className="episode-row simple-row">
              <span className="episode-body">
                <span className="episode-title">{e.title}</span>
                <span className="episode-meta"> {episodeLabel(e)} · {formatAirDate(e.airDate)}</span>
              </span>
              {editable && (
                <button
                  className="icon-btn"
                  onClick={() => run(() => removeFromCollection(collection.id, e.id), "Could not remove that episode.")}
                  aria-label={`Remove ${e.title}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
