import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RULESET_BY_ID, MAX_CHARACTERS_PER_POOL } from '../../shared/gameData.js';
import { api } from '../api.js';
import { newId, timeAgo, poolLabel } from '../format.js';
import CharacterTable from './CharacterTable.jsx';
import CharacterEditor, { blankCharacter } from './CharacterEditor.jsx';
import ImportDialog from './ImportDialog.jsx';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function PoolView({ poolId, apiAvailable }) {
  const [data, setData] = useState(null);       // last saved server state
  const [chars, setChars] = useState([]);       // working copy
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);   // { tone, text, details }
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { character, isNew }
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api.pool(poolId);
      setData(d);
      setChars(d.characters);
    } catch (e) { setError(e); }
  }, [poolId]);

  useEffect(() => { setData(null); load(); }, [load]);

  const dirty = data ? !same(chars, data.characters) : false;

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const realm = data ? RULESET_BY_ID[data.pool.ruleset]?.realmSlug : null;
  const linkedCount = useMemo(() => chars.filter((c) => c.apiName && c.apiRealm).length, [chars]);

  if (error) return <div className="notice"><p>{error.message}</p></div>;
  if (!data) return <p className="hint pad">Loading characters…</p>;

  const { pool, canEdit } = data;

  const move = (from, to) => {
    if (to < 0 || to >= chars.length) return;
    const next = [...chars];
    const [c] = next.splice(from, 1);
    next.splice(to, 0, c);
    setChars(next);
  };

  const applyEdit = (c) => {
    setChars((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]));
    setEditing(null);
  };

  const remove = (id) => { setChars((prev) => prev.filter((c) => c.id !== id)); setEditing(null); };

  const addImported = (list) => {
    setChars((prev) => [...prev, ...list.map((c) => ({
      id: newId(), forename: c.name, surname: '', faction: c.faction, race: c.race, class: c.class,
      gender: c.gender, level: c.level || 1, professions: {}, apiName: c.name, apiRealm: c.realmSlug, syncedAt: null,
    }))]);
    setStatus({ tone: 'info', text: `Added ${list.length}. Save changes to keep them, then Sync to pull levels and professions.` });
  };

  const save = async () => {
    setBusy(true); setStatus(null);
    try {
      const d = await api.savePool(pool.id, chars);
      setData(d); setChars(d.characters);
      setStatus({ tone: 'ok', text: 'Saved.' });
    } catch (e) {
      setStatus({ tone: 'error', text: e.message, details: e.details });
    } finally { setBusy(false); }
  };

  const sync = async () => {
    setBusy(true); setStatus(null);
    try {
      const d = await api.sync(pool.id);
      setData(d); setChars(d.characters);
      const updated = d.results.filter((r) => r.status === 'updated').length;
      const missing = d.results.length - updated;
      setStatus({ tone: missing ? 'info' : 'ok', text: `Synced ${updated} of ${d.results.length} linked characters.${missing ? ` ${missing} couldn't be found.` : ''}` });
    } catch (e) {
      setStatus({ tone: 'error', text: e.message });
    } finally { setBusy(false); }
  };

  const toggleVisibility = async () => {
    setBusy(true);
    try {
      const d = await api.setVisibility(pool.id, !pool.isPublic);
      setData((prev) => ({ ...prev, pool: d.pool }));
    } catch (e) { setStatus({ tone: 'error', text: e.message }); } finally { setBusy(false); }
  };

  const shareUrl = `${window.location.origin}/u/${pool.owner.handle}`;
  const copyShare = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setStatus({ tone: 'ok', text: 'Share link copied.' }); }
    catch { setStatus({ tone: 'info', text: shareUrl }); }
  };

  const lastSynced = chars.map((c) => c.syncedAt).filter(Boolean).sort().pop();

  return (
    <section className="pool" aria-label={`${poolLabel(pool)} characters`}>
      <div className="toolbar">
        <div className="toolbar-title">
          <h1>{canEdit ? 'Your characters' : `${pool.owner.battletag.split('#')[0]}'s characters`}</h1>
          <p className="muted">
            {poolLabel(pool)}, {chars.length} {chars.length === 1 ? 'character' : 'characters'}
            {lastSynced ? `, synced ${timeAgo(lastSynced)}` : ''}
            {!canEdit ? ', view only' : ''}
          </p>
        </div>
        {canEdit && (
          <div className="toolbar-actions">
            <button type="button" className="btn" disabled={chars.length >= MAX_CHARACTERS_PER_POOL}
              onClick={() => setEditing({ character: blankCharacter(newId(), chars[0]?.faction), isNew: true })}>
              Add character
            </button>
            {apiAvailable && (
              <>
                <button type="button" className="btn" onClick={() => setImporting(true)} disabled={busy}>Import from Battle.net</button>
                <button type="button" className="btn" onClick={sync} disabled={busy || dirty || linkedCount === 0}
                  title={dirty ? 'Save your changes first' : linkedCount === 0 ? 'No characters are linked to Battle.net' : 'Refresh levels and professions'}>
                  Sync
                </button>
              </>
            )}
            <button type="button" className={`btn primary ${dirty ? 'pulse' : ''}`} onClick={save} disabled={!dirty || busy}>
              {dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        )}
      </div>

      {status && (
        <div className={`status status-${status.tone}`} role={status.tone === 'error' ? 'alert' : 'status'}>
          <p>{status.text}</p>
          {status.details?.length > 0 && <ul>{status.details.map((d) => <li key={d}>{d}</li>)}</ul>}
        </div>
      )}

      {chars.length === 0 ? (
        <div className="empty">
          <p>{canEdit ? 'No characters yet. Add one to get started; you can drag to reorder later.' : 'Nothing here yet.'}</p>
          {canEdit && (
            <button type="button" className="btn primary"
              onClick={() => setEditing({ character: blankCharacter(newId()), isNew: true })}>Add your first character</button>
          )}
        </div>
      ) : (
        <CharacterTable characters={chars} canEdit={canEdit} onMove={move}
          onEdit={(c) => setEditing({ character: c, isNew: false })} />
      )}

      {canEdit && (
        <div className="share">
          <label className="switch">
            <input type="checkbox" checked={pool.isPublic} onChange={toggleVisibility} disabled={busy} />
            <span>Anyone with your link can view this warband</span>
          </label>
          {pool.isPublic && (
            <button type="button" className="btn ghost" onClick={copyShare}>Copy share link</button>
          )}
        </div>
      )}

      {editing && (
        <CharacterEditor key={editing.character.id} character={editing.character} isNew={editing.isNew}
          defaultRealm={realm}
          onSave={applyEdit} onDelete={remove} onClose={() => setEditing(null)} />
      )}
      {importing && <ImportDialog poolId={pool.id} onAdd={addImported} onClose={() => setImporting(false)} />}
    </section>
  );
}
