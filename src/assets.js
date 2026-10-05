import { RACE_BY_ID, PROFESSION_BY_ID } from '../shared/gameData.js';

// In-game icons served from Wowhead's icon CDN. Swap ICON_BASE to self-host
// (drop files into /public/icons and set ICON_BASE = '/icons').
const ICON_BASE = 'https://wow.zamimg.com/images/wow/icons';

export function raceIcon(race, gender) {
  const key = RACE_BY_ID[race]?.iconKey;
  return key && gender ? `${ICON_BASE}/large/race_${key}_${gender}.jpg` : null;
}

export function professionIcon(id) {
  const icon = PROFESSION_BY_ID[id]?.icon;
  return icon ? `${ICON_BASE}/medium/${icon}.jpg` : null;
}
