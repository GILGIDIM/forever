import React, { useEffect, useRef, useState } from 'react';
import {
  FACTIONS, GENDERS, PROFESSIONS, LEVEL_CAP, PROFESSION_CAP,
  MAX_PRIMARY_PROFESSIONS, MAX_NAME_LENGTH, CLASS_BY_ID, RACE_BY_ID, REGION_BY_ID, RULESET_BY_ID,
  classesForFaction, racesFor, isValidCombo,
} from '../../shared/gameData.js';
import { api } from '../api.js';
import { fullName } from '../format.js';
import { validateCharacter } from '../../shared/validate.js';
import { raceIcon } from '../assets.js';
import ProfIcon from './ProfIcon.jsx';
import Portrait from './Portrait.jsx';

function RaceIcon({ race, gender }) {
  const [broken, setBroken] = useState(false);
  const src = raceIcon(race.id, gender);
  if (!src || broken) return <span className="race-crest" aria-hidden="true">{race.name[0]}</span>;
  return <img src={src} alt="" width={36} height={36} onError={() => setBroken(true)} />;
}

const PRIMARY = PROFESSIONS.filter((p) => p.kind === 'primary');
const SECONDARY = PROFESSIONS.filter((p) => p.kind === 'secondary');

function ProfessionRow({ prof, value, disabled, onToggle, onChange }) {
  const learned = value != null;
  return (
    <div className={`prof-row ${learned ? 'on' : ''}`}>
      <label className="prof-toggle">
        <input type="checkbox" checked={learned} disabled={disabled && !learned} onChange={onToggle} />
        <ProfIcon id={prof.id} size={24} />
        <span>{prof.name}</span>
      </label>
      {learned && (
        <span className="prof-skill">
          <input type="range" min={0} max={PROFESSION_CAP} value={value} onChange={(e) => onChange(Number(e.target.value))}
            aria-label={`${prof.name} skill`} />
          <input type="number" min={0} max={PROFESSION_CAP} value={value}
            onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, Math.min(PROFESSION_CAP, Number(e.target.value))))}
            aria-label={`${prof.name} skill value`} />
        </span>
      )}
    </div>
  );
}

// Paste a name or armory link; an exact hit fills the form, otherwise pick
// from the armory's name search.
function ArmoryLookup({ region, ruleset, onFound }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState({ busy: false, error: null, matches: null, note: null });

  const find = async (text = q) => {
    if (text.trim().length < 2) return;
    setState({ busy: true, error: null, matches: null, note: null });
    try {
      const d = await api.lookup(region, text.trim());
      if (!d.character) {
        setState({ busy: false, error: null, matches: d.matches, note: null });
        return;
      }
      const c = d.character;
      const elsewhere = c.region !== region || c.ruleset !== ruleset;
      onFound(c);
      setQ('');
      setState({
        busy: false, error: null, matches: null,
        note: elsewhere
          ? { warn: true, text: `Filled in from the armory, but ${fullName(c)} plays on ${REGION_BY_ID[c.region]?.name} ${c.rulesetName}, not this warband.` }
          : { warn: false, text: `Filled in from the armory. Sync with Battle.net keeps ${c.forename} up to date.` },
      });
    } catch (e) {
      setState({ busy: false, error: e, matches: null, note: null });
    }
  };

  return (
    <fieldset className="step">
      <legend>Find on the armory</legend>
      <div className="lookup">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Loki Bane, or paste an armory link"
          aria-label="Character name or armory link"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); find(); } }} />
        <button type="button" className="btn" onClick={() => find()} disabled={state.busy || q.trim().length < 2}>
          {state.busy ? 'Looking…' : 'Find'}
        </button>
      </div>
      {state.error && <p className="lookup-note warn" role="alert">{state.error.message}</p>}
      {state.note && <p className={`lookup-note ${state.note.warn ? 'warn' : 'muted'}`} role="status">{state.note.text}</p>}
      {state.matches && (state.matches.length === 0
        ? <p className="lookup-note muted">No one by that name on the {REGION_BY_ID[region]?.name} armory.</p>
        : (
          <ul className="match-list" aria-label="Armory matches">
            {state.matches.map((m) => (
              <li key={m.slug}>
                <button type="button" onClick={() => find(m.slug)}>
                  <Portrait race={m.race} gender={m.gender} classId={m.class} faction={m.faction} level={m.level} size={40} />
                  <span className="match-name">
                    <span><span className="forename">{m.forename}</span> <span className="surname">{m.surname}</span></span>
                    <span className="muted">
                      {RACE_BY_ID[m.race]?.name} {CLASS_BY_ID[m.class]?.name}, {m.rulesetName}
                      {m.ruleset !== ruleset ? ` (not ${RULESET_BY_ID[ruleset]?.name})` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </fieldset>
  );
}

export default function CharacterEditor({ character, isNew, region, ruleset, onSave, onDelete, onClose }) {
  const ref = useRef(null);
  const [c, setC] = useState(character);
  const [errors, setErrors] = useState([]);

  useEffect(() => { ref.current?.showModal(); }, []);

  const set = (patch) => setC((prev) => ({ ...prev, ...patch }));

  const pickFaction = (faction) => {
    const keepClass = classesForFaction(faction).some((x) => x.id === c.class);
    const keepRace = keepClass && isValidCombo(faction, c.race, c.class);
    set({ faction, class: keepClass ? c.class : '', race: keepRace ? c.race : '' });
  };
  const pickClass = (classId) => {
    const races = racesFor(c.faction, classId);
    const race = races.some((r) => r.id === c.race) ? c.race : (races.length === 1 ? races[0].id : '');
    set({ class: classId, race });
  };

  const primaries = PRIMARY.filter((p) => c.professions[p.id] != null).length;
  const toggleProf = (id) => {
    const next = { ...c.professions };
    if (next[id] != null) delete next[id]; else next[id] = 1;
    set({ professions: next });
  };
  const setSkill = (id, v) => set({ professions: { ...c.professions, [id]: v } });

  const submit = (e) => {
    e.preventDefault();
    const { character: clean, errors: errs } = validateCharacter(c);
    if (errs.length) { setErrors(errs); return; }
    onSave(clean);
  };

  const fromArmory = (a) => set({
    forename: a.forename, surname: a.surname, faction: a.faction, race: a.race || '', class: a.class || '',
    gender: a.gender, level: a.level, professions: a.professions, armorySlug: a.slug,
  });

  const classes = c.faction ? classesForFaction(c.faction) : [];
  const races = c.faction && c.class ? racesFor(c.faction, c.class) : [];

  return (
    <dialog ref={ref} className="editor" onClose={onClose} aria-labelledby="editor-title">
      <form onSubmit={submit} noValidate>
        <header className="editor-head">
          <Portrait race={c.race} gender={c.gender} classId={c.class} faction={c.faction} level={c.level} size={64} />
          <div>
            <h2 id="editor-title">{isNew ? 'New character' : (c.forename || 'Edit character')}</h2>
            <p className="muted">Drag rows in the list to change who comes first.</p>
          </div>
          <button type="button" className="icon-btn close" onClick={() => ref.current.close()} aria-label="Close">✕</button>
        </header>

        {c.armorySlug ? (
          <p className="hint">
            Linked to the armory as <strong>{c.armorySlug}</strong>; Sync with Battle.net refreshes level and professions.{' '}
            <button type="button" className="btn ghost small" onClick={() => set({ armorySlug: null })}>Unlink</button>
          </p>
        ) : <ArmoryLookup region={region} ruleset={ruleset} onFound={fromArmory} />}

        <fieldset className="step">
          <legend>Faction</legend>
          <div className="seg">
            {FACTIONS.map((f) => (
              <button type="button" key={f.id} className={`seg-btn faction-${f.id} ${c.faction === f.id ? 'on' : ''}`}
                aria-pressed={c.faction === f.id} onClick={() => pickFaction(f.id)}>{f.name}</button>
            ))}
          </div>
        </fieldset>

        <fieldset className="step" disabled={!c.faction}>
          <legend>Class</legend>
          {!c.faction && <p className="hint">Choose a faction first.</p>}
          <div className="class-grid">
            {classes.map((cl) => (
              <button type="button" key={cl.id} className={`class-btn ${c.class === cl.id ? 'on' : ''}`}
                style={{ '--class': cl.color }} aria-pressed={c.class === cl.id} onClick={() => pickClass(cl.id)}>
                {cl.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="step" disabled={!c.class}>
          <legend>Race and appearance</legend>
          {!c.class && <p className="hint">Choose a class to see which races can play it.</p>}
          <div className="race-grid">
            {races.map((r) => (
              <button type="button" key={r.id} className={`race-btn ${c.race === r.id ? 'on' : ''}`}
                aria-pressed={c.race === r.id} onClick={() => set({ race: r.id })}>
                <RaceIcon race={r} gender={c.gender || 'male'} />
                <span>{r.name}</span>
              </button>
            ))}
          </div>
          {c.race === 'skyborne' && <p className="hint">Skyborne need the Skyborne Heroic or Epic Pack.</p>}
          <div className="seg small">
            {GENDERS.map((g) => (
              <button type="button" key={g.id} className={`seg-btn ${c.gender === g.id ? 'on' : ''}`}
                aria-pressed={c.gender === g.id} onClick={() => set({ gender: g.id })}>{g.name}</button>
            ))}
          </div>
        </fieldset>

        <fieldset className="step names">
          <legend>Name and level</legend>
          <label>Forename<input value={c.forename} maxLength={MAX_NAME_LENGTH} onChange={(e) => set({ forename: e.target.value })} required /></label>
          <label>Surname<input value={c.surname} maxLength={MAX_NAME_LENGTH} onChange={(e) => set({ surname: e.target.value })} placeholder="Optional" /></label>
          <label className="level-input">Level
            <input type="number" min={1} max={LEVEL_CAP} value={c.level}
              onChange={(e) => set({ level: e.target.value === '' ? '' : Number(e.target.value) })} />
          </label>
        </fieldset>

        <fieldset className="step">
          <legend>Primary professions <span className="muted">{primaries} of {MAX_PRIMARY_PROFESSIONS}</span></legend>
          <div className="prof-list">
            {PRIMARY.map((p) => (
              <ProfessionRow key={p.id} prof={p} value={c.professions[p.id]}
                disabled={primaries >= MAX_PRIMARY_PROFESSIONS}
                onToggle={() => toggleProf(p.id)} onChange={(v) => setSkill(p.id, v)} />
            ))}
          </div>
        </fieldset>

        <fieldset className="step">
          <legend>Secondary professions</legend>
          <div className="prof-list">
            {SECONDARY.map((p) => (
              <ProfessionRow key={p.id} prof={p} value={c.professions[p.id]}
                onToggle={() => toggleProf(p.id)} onChange={(v) => setSkill(p.id, v)} />
            ))}
          </div>
        </fieldset>

        {errors.length > 0 && (
          <ul className="errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        )}

        <footer className="editor-foot">
          {!isNew && (
            <button type="button" className="btn danger" onClick={() => { if (confirm(`Remove ${c.forename || 'this character'} from the warband?`)) onDelete(c.id); }}>
              Remove
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={() => ref.current.close()}>Cancel</button>
          <button type="submit" className="btn primary">{isNew ? 'Add character' : 'Apply changes'}</button>
        </footer>
      </form>
    </dialog>
  );
}

export function blankCharacter(id, faction = 'horde') {
  return { id, forename: '', surname: '', faction, race: '', class: '', gender: 'male', level: 1, professions: {}, armorySlug: null, syncedAt: null };
}
