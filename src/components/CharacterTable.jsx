import React, { useState } from 'react';
import { PROFESSIONS, CLASS_BY_ID, RACE_BY_ID, LEVEL_CAP } from '../../shared/gameData.js';
import { skillRag, levelRag } from '../format.js';
import Portrait from './Portrait.jsx';
import ProfIcon from './ProfIcon.jsx';

const PRIMARY = PROFESSIONS.filter((p) => p.kind === 'primary');
const SECONDARY = PROFESSIONS.filter((p) => p.kind === 'secondary');

function SkillCell({ value, prof, divider }) {
  const learned = value != null;
  return (
    <td className={`skill ${learned ? skillRag(value) : 'skill-none'} ${divider ? 'divider' : ''}`}
      aria-label={learned ? `${prof.name} ${value}` : `${prof.name} not learned`}>
      {learned ? value : <span aria-hidden="true">·</span>}
    </td>
  );
}

export default function CharacterTable({ characters, canEdit, onEdit, onMove }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const counts = Object.fromEntries(PROFESSIONS.map((p) => [
    p.id, characters.filter((c) => c.professions[p.id] != null).length,
  ]));

  const endDrag = () => { setDragIndex(null); setOverIndex(null); };

  return (
    <div className="table-wrap">
      <table className="pool-table">
        <thead>
          <tr>
            {canEdit && <th className="col-move"><span className="sr-only">Order</span></th>}
            <th className="col-who" scope="col">Character</th>
            <th className="col-level" scope="col">Level</th>
            {[...PRIMARY, ...SECONDARY].map((p, i) => (
              <th key={p.id} scope="col" className={`col-prof ${i === PRIMARY.length ? 'divider' : ''} ${p.kind}`}>
                <span className="prof-count" title={`${counts[p.id]} with ${p.name}`}>{counts[p.id]}</span>
                <ProfIcon id={p.id} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {characters.map((c, i) => {
            const cls = CLASS_BY_ID[c.class];
            const learned = PROFESSIONS.filter((p) => c.professions[p.id] != null);
            return (
              <tr key={c.id}
                className={`${i === dragIndex ? 'dragging' : ''} ${i === overIndex && dragIndex !== null && i !== dragIndex ? (i > dragIndex ? 'drop-below' : 'drop-above') : ''}`}
                draggable={canEdit}
                onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { if (dragIndex !== null) { e.preventDefault(); setOverIndex(i); } }}
                onDrop={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) onMove(dragIndex, i); endDrag(); }}
                onDragEnd={endDrag}
                style={{ '--class': cls?.color }}>
                {canEdit && (
                  <td className="col-move">
                    <span className="grip" aria-hidden="true">⋮⋮</span>
                    <span className="move-buttons">
                      <button type="button" className="icon-btn" onClick={() => onMove(i, i - 1)} disabled={i === 0}
                        aria-label={`Move ${c.forename} up`}>▲</button>
                      <button type="button" className="icon-btn" onClick={() => onMove(i, i + 1)} disabled={i === characters.length - 1}
                        aria-label={`Move ${c.forename} down`}>▼</button>
                    </span>
                  </td>
                )}
                <th scope="row" className="col-who">
                  <div className="who">
                    <Portrait race={c.race} gender={c.gender} classId={c.class} faction={c.faction} level={c.level} />
                    <div className="who-text">
                      {canEdit ? (
                        <button type="button" className="name-btn" onClick={() => onEdit(c)}>
                          <span className="forename">{c.forename}</span>{c.surname && <span className="surname"> {c.surname}</span>}
                        </button>
                      ) : (
                        <span className="name-static"><span className="forename">{c.forename}</span>{c.surname && <span className="surname"> {c.surname}</span>}</span>
                      )}
                      <span className="who-meta">
                        {i === 0 && <span className="main-tag">Main</span>}
                        <span>{RACE_BY_ID[c.race]?.name}</span> <span className="class-name">{cls?.name}</span>
                      </span>
                      {learned.length > 0 && (
                        <span className="prof-chips">
                          {learned.map((p) => (
                            <span key={p.id} className={`chip ${skillRag(c.professions[p.id])}`}>
                              <ProfIcon id={p.id} size={18} /> {c.professions[p.id]}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </th>
                <td className="col-level">
                  <div className={`level-bar ${levelRag(c.level)}`} role="meter" aria-valuemin={1} aria-valuemax={LEVEL_CAP}
                    aria-valuenow={c.level} aria-label={`Level ${c.level} of ${LEVEL_CAP}`}>
                    <span style={{ width: `${(c.level / LEVEL_CAP) * 100}%` }} />
                  </div>
                </td>
                {[...PRIMARY, ...SECONDARY].map((p, j) => (
                  <SkillCell key={p.id} prof={p} value={c.professions[p.id]} divider={j === PRIMARY.length} />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
