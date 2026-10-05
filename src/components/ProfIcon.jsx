import React, { useState } from 'react';
import { PROFESSION_BY_ID } from '../../shared/gameData.js';
import { professionIcon } from '../assets.js';

export default function ProfIcon({ id, size = 28 }) {
  const [broken, setBroken] = useState(false);
  const prof = PROFESSION_BY_ID[id];
  if (broken) return <span className="prof-icon prof-icon-text" style={{ width: size, height: size }} title={prof.name}>{prof.short}</span>;
  return (
    <img className="prof-icon" src={professionIcon(id)} width={size} height={size} alt={prof.name} title={prof.name}
      onError={() => setBroken(true)} loading="lazy" />
  );
}
