import React, { useEffect, useRef, useState } from 'react';
import { CLASS_BY_ID, RACE_BY_ID } from '../../shared/gameData.js';
import { api } from '../api.js';
import Portrait from './Portrait.jsx';

export default function ImportDialog({ poolId, onAdd, onClose }) {
  const ref = useRef(null);
  const [state, setState] = useState({ loading: true, error: null, list: [] });
  const [picked, setPicked] = useState(new Set());

  useEffect(() => {
    ref.current?.showModal();
    api.importable(poolId)
      .then((d) => setState({ loading: false, error: null, list: d.characters }))
      .catch((e) => setState({ loading: false, error: e, list: [] }));
  }, [poolId]);

  const key = (c) => `${c.realmSlug}/${c.name}`;
  const toggle = (c) => setPicked((prev) => {
    const next = new Set(prev);
    next.has(key(c)) ? next.delete(key(c)) : next.add(key(c));
    return next;
  });

  const add = () => {
    onAdd(state.list.filter((c) => picked.has(key(c))));
    ref.current.close();
  };

  return (
    <dialog ref={ref} className="editor import" onClose={onClose} aria-labelledby="import-title">
      <header className="editor-head">
        <div>
          <h2 id="import-title">Import from Battle.net</h2>
          <p className="muted">Pick the characters to add. Names come across as forenames; add surnames afterwards.</p>
        </div>
        <button type="button" className="icon-btn close" onClick={() => ref.current.close()} aria-label="Close">✕</button>
      </header>

      {state.loading && <p className="hint">Asking Battle.net for your characters…</p>}
      {state.error && (
        <div className="notice">
          <p>{state.error.message}</p>
          {state.error.status === 401 && <a className="btn primary" href="/api/auth/login">Sign in again</a>}
        </div>
      )}
      {!state.loading && !state.error && state.list.length === 0 && (
        <p className="hint">No characters found on this account for this region and ruleset yet.</p>
      )}

      <ul className="import-list">
        {state.list.map((c) => {
          const disabled = c.alreadyAdded || !c.supported;
          return (
            <li key={key(c)} className={disabled ? 'disabled' : ''}>
              <label>
                <input type="checkbox" disabled={disabled} checked={picked.has(key(c))} onChange={() => toggle(c)} />
                <Portrait race={c.race} gender={c.gender} classId={c.class} faction={c.faction} level={c.level} size={40} />
                <span className="import-name">
                  <span className="forename">{c.name}</span>
                  <span className="muted">
                    {RACE_BY_ID[c.race]?.name || 'Unknown race'} {CLASS_BY_ID[c.class]?.name || 'unknown class'}
                    {c.realmName ? `, ${c.realmName}` : ''}
                    {c.alreadyAdded ? ' — already in this pool' : ''}
                    {!c.supported ? ' — not recognised as a Forever character' : ''}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <footer className="editor-foot">
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={() => ref.current.close()}>Cancel</button>
        <button type="button" className="btn primary" disabled={picked.size === 0} onClick={add}>
          Add {picked.size || ''} {picked.size === 1 ? 'character' : 'characters'}
        </button>
      </footer>
    </dialog>
  );
}
