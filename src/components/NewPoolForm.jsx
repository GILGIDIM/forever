import React, { useState } from 'react';
import { REGIONS, RULESETS } from '../../shared/gameData.js';

// Region + ruleset picker. Each combination is its own warband.
export default function NewPoolForm({ existing = [], onCreate, onCancel, busy }) {
  const [region, setRegion] = useState('eu');
  const [ruleset, setRuleset] = useState('pvp');
  const taken = existing.some((p) => p.region === region && p.ruleset === ruleset);

  return (
    <form className="new-pool" onSubmit={(e) => { e.preventDefault(); onCreate(region, ruleset); }}>
      <fieldset>
        <legend>Region</legend>
        <div className="seg">
          {REGIONS.map((r) => (
            <button type="button" key={r.id} className={`seg-btn ${region === r.id ? 'on' : ''}`}
              aria-pressed={region === r.id} onClick={() => setRegion(r.id)}>{r.name}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Ruleset</legend>
        <div className="seg">
          {RULESETS.map((r) => (
            <button type="button" key={r.id} className={`seg-btn ${ruleset === r.id ? 'on' : ''}`}
              aria-pressed={ruleset === r.id} onClick={() => setRuleset(r.id)}>{r.name}</button>
          ))}
        </div>
      </fieldset>
      <div className="new-pool-actions">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn primary" disabled={busy}>
          {taken ? 'Open this warband' : 'Create warband'}
        </button>
      </div>
    </form>
  );
}
