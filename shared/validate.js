import {
  FACTION_BY_ID, CLASS_BY_ID, RACE_BY_ID, PROFESSION_BY_ID, GENDERS,
  LEVEL_CAP, PROFESSION_CAP, MAX_PRIMARY_PROFESSIONS, MAX_CHARACTERS_PER_POOL,
  MAX_NAME_LENGTH, isValidCombo,
} from './gameData.js';

const GENDER_IDS = new Set(GENDERS.map((g) => g.id));
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

const cleanName = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');

// Returns { character, errors }. character is normalised (trimmed names,
// integer levels, professions limited to known ids with 0..cap values).
export function validateCharacter(input) {
  const errors = [];
  const c = input || {};
  const out = {
    id: String(c.id || ''),
    forename: cleanName(c.forename),
    surname: cleanName(c.surname),
    faction: c.faction,
    race: c.race,
    class: c.class,
    gender: c.gender,
    level: c.level == null || c.level === '' ? 1 : Number(c.level),
    professions: {},
    apiName: c.apiName ? cleanName(c.apiName) : null,
    apiRealm: c.apiRealm ? String(c.apiRealm).trim() : null,
    syncedAt: c.syncedAt || null,
  };

  if (!ID_RE.test(out.id)) errors.push('Character is missing an id.');
  if (!out.forename) errors.push('Forename is required.');
  if (out.forename.length > MAX_NAME_LENGTH) errors.push(`Forename must be ${MAX_NAME_LENGTH} characters or fewer.`);
  if (out.surname.length > MAX_NAME_LENGTH) errors.push(`Surname must be ${MAX_NAME_LENGTH} characters or fewer.`);
  if (!FACTION_BY_ID[out.faction]) errors.push('Choose a faction.');
  if (!CLASS_BY_ID[out.class]) errors.push('Choose a class.');
  if (!RACE_BY_ID[out.race]) errors.push('Choose a race.');
  if (FACTION_BY_ID[out.faction] && CLASS_BY_ID[out.class] && RACE_BY_ID[out.race]
      && !isValidCombo(out.faction, out.race, out.class)) {
    errors.push(`${RACE_BY_ID[out.race].name} ${CLASS_BY_ID[out.class].name} isn't available to the ${FACTION_BY_ID[out.faction].name}.`);
  }
  if (!GENDER_IDS.has(out.gender)) errors.push('Choose a gender.');
  if (!Number.isInteger(out.level) || out.level < 1 || out.level > LEVEL_CAP) {
    errors.push(`Level must be a whole number from 1 to ${LEVEL_CAP}.`);
  }

  let primaries = 0;
  for (const [profId, raw] of Object.entries(c.professions || {})) {
    const prof = PROFESSION_BY_ID[profId];
    if (!prof) { errors.push(`Unknown profession "${profId}".`); continue; }
    if (raw == null || raw === '') continue; // not learned
    const skill = Number(raw);
    if (!Number.isInteger(skill) || skill < 0 || skill > PROFESSION_CAP) {
      errors.push(`${prof.name} skill must be from 0 to ${PROFESSION_CAP}.`);
      continue;
    }
    if (prof.kind === 'primary') primaries += 1;
    out.professions[profId] = skill;
  }
  if (primaries > MAX_PRIMARY_PROFESSIONS) {
    errors.push(`A character can have at most ${MAX_PRIMARY_PROFESSIONS} primary professions.`);
  }

  return { character: out, errors };
}

export function validatePool(characters) {
  if (!Array.isArray(characters)) return { characters: [], errors: ['Characters must be a list.'] };
  const errors = [];
  if (characters.length > MAX_CHARACTERS_PER_POOL) {
    errors.push(`A pool can hold at most ${MAX_CHARACTERS_PER_POOL} characters.`);
  }
  const seen = new Set();
  const out = characters.map((raw, i) => {
    const { character, errors: e } = validateCharacter(raw);
    const label = character.forename || `Character ${i + 1}`;
    e.forEach((msg) => errors.push(`${label}: ${msg}`));
    if (seen.has(character.id)) errors.push(`${label}: duplicate id.`);
    seen.add(character.id);
    return character;
  });
  return { characters: out, errors };
}
