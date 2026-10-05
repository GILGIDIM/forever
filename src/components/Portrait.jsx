import React, { useState } from 'react';
import { CLASS_BY_ID, RACE_BY_ID } from '../../shared/gameData.js';
import { raceIcon } from '../assets.js';

// Race/gender portrait framed in the class colour, with the level set in the
// corner the way the old unit frames showed it.
export default function Portrait({ race, gender, classId, faction, level, size = 52 }) {
  const [broken, setBroken] = useState(false);
  const src = raceIcon(race, gender);
  const color = CLASS_BY_ID[classId]?.color || '#5b6577';
  const raceName = RACE_BY_ID[race]?.name || 'Unknown race';
  return (
    <div className={`portrait faction-${faction}`} style={{ '--class': color, '--size': `${size}px` }}>
      {src && !broken ? (
        <img src={src} alt={`${raceName} ${gender || ''}`.trim()} onError={() => setBroken(true)} loading="lazy" />
      ) : (
        <span className="portrait-crest" aria-label={raceName}>{raceName.charAt(0)}</span>
      )}
      {level != null && <span className="portrait-level" aria-label={`Level ${level}`}>{level}</span>}
    </div>
  );
}
