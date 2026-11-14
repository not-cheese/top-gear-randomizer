import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../state/hooks.js";
import { validEpisodeIds } from "../domain/collections.js";
import "../styles/collections.css";

export default function CollectionsPage() {
  const { collections, episodeIndex, createCollection } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const presets = collections.filter((c) => c.isPreset);
  const custom = collections.filter((c) => !c.isPreset);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    try {
      const created = await createCollection(name);
      setName("");
      navigate(`/collections/${created.id}`);
    } catch (e) {
      setError(e.message || "Could not create the collection.");
    }
  }

  const renderList = (list) => (
    <ul className="collection-list">
      {list.map((c) => (
        <li key={c.id}>
          <Link className="collection-link" to={`/collections/${c.id}`}>
            <span className="collection-name">{c.name}</span>
            <span className="collection-count">{validEpisodeIds(c, episodeIndex).length} episodes ›</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <h1 className="page-title">Collections</h1>
      <p className="page-sub">Group episodes to spin the wheel on just those.</p>

      <form className="create-form" onSubmit={handleCreate}>
        <input
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New collection name"
          aria-label="New collection name"
          maxLength={80}
        />
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
          Create
        </button>
      </form>
      {error && <p className="notice" role="alert">{error}</p>}

      <h2 className="group-title">Your collections</h2>
      {custom.length === 0 ? (
        <p className="empty">You haven't made any collections yet.</p>
      ) : (
        renderList(custom)
      )}

      <h2 className="group-title">Preset collections</h2>
      {renderList(presets)}
    </>
  );
}
