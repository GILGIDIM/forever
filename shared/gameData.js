// Game rules for World of Warcraft: Forever.
// Shared by the React app and the /api functions so validation is identical
// on both sides. Everything Blizzard hasn't confirmed yet is marked TODO and
// kept in one place so it is a one-line change after launch.

export const LEVEL_CAP = 60;

// Vanilla cap. Forever promises new profession content, so this may move.
export const PROFESSION_CAP = 300;
export const MAX_PRIMARY_PROFESSIONS = 2;
export const MAX_CHARACTERS_PER_POOL = 50;
export const MAX_NAME_LENGTH = 24;

export const REGIONS = [
  { id: 'eu', name: 'Europe' },
  { id: 'us', name: 'Americas' },
  { id: 'kr', name: 'Korea' },
  { id: 'tw', name: 'Taiwan' },
];

// One mega-realm per ruleset per region. realmSlug is what the Blizzard
// profile API expects; TODO: fill in once the realm names are public (they
// should appear when name reservation opens on 27 October).
export const RULESETS = [
  { id: 'normal', name: 'Normal', realmSlug: null },
  { id: 'pvp', name: 'PvP', realmSlug: null },
  { id: 'rp', name: 'RP', realmSlug: null },
  { id: 'hardcore', name: 'Hardcore', realmSlug: null },
];

export const FACTIONS = [
  { id: 'alliance', name: 'Alliance' },
  { id: 'horde', name: 'Horde' },
];

// Classic class colours (Shaman is the classic blue, not retail's).
export const CLASSES = [
  { id: 'druid', name: 'Druid', color: '#FF7C0A' },
  { id: 'hunter', name: 'Hunter', color: '#AAD372' },
  { id: 'mage', name: 'Mage', color: '#3FC7EB' },
  { id: 'paladin', name: 'Paladin', color: '#F48CBA' },
  { id: 'priest', name: 'Priest', color: '#FFFFFF' },
  { id: 'rogue', name: 'Rogue', color: '#FFF468' },
  { id: 'shaman', name: 'Shaman', color: '#0070DD' },
  { id: 'warlock', name: 'Warlock', color: '#8788EE' },
  { id: 'warrior', name: 'Warrior', color: '#C69B6D' },
];

// iconKey is the in-game icon file name (race_<iconKey>_<gender>).
// Skyborne is new, so its icon name is unknown and the UI falls back to a crest.
export const RACES = [
  { id: 'human', name: 'Human', iconKey: 'human' },
  { id: 'dwarf', name: 'Dwarf', iconKey: 'dwarf' },
  { id: 'gnome', name: 'Gnome', iconKey: 'gnome' },
  { id: 'nightelf', name: 'Night Elf', iconKey: 'nightelf' },
  { id: 'orc', name: 'Orc', iconKey: 'orc' },
  { id: 'tauren', name: 'Tauren', iconKey: 'tauren' },
  { id: 'troll', name: 'Troll', iconKey: 'troll' },
  { id: 'undead', name: 'Undead', iconKey: 'scourge' },
  { id: 'skyborne', name: 'Skyborne', iconKey: null, requiresPack: true },
];

// Allowed classes per faction and race (Warcraft Wiki, Forever page,
// September 2026). New Forever combos: Dwarf Shaman, Gnome Priest,
// Human Hunter, Orc Mage, Troll Warlock, Undead Paladin.
// Skyborne are on both factions: Mage for Alliance only, Shaman for Horde only.
export const RACE_CLASSES = {
  alliance: {
    dwarf: ['hunter', 'paladin', 'priest', 'rogue', 'shaman', 'warrior'],
    gnome: ['mage', 'priest', 'rogue', 'warlock', 'warrior'],
    human: ['hunter', 'mage', 'paladin', 'priest', 'rogue', 'warlock', 'warrior'],
    nightelf: ['druid', 'hunter', 'priest', 'rogue', 'warrior'],
    skyborne: ['druid', 'hunter', 'mage', 'rogue', 'warrior'],
  },
  horde: {
    orc: ['hunter', 'mage', 'rogue', 'shaman', 'warlock', 'warrior'],
    tauren: ['druid', 'hunter', 'shaman', 'warrior'],
    troll: ['hunter', 'mage', 'priest', 'rogue', 'shaman', 'warlock', 'warrior'],
    undead: ['mage', 'paladin', 'priest', 'rogue', 'warlock', 'warrior'],
    skyborne: ['druid', 'hunter', 'rogue', 'shaman', 'warrior'],
  },
};

export const PROFESSIONS = [
  { id: 'alchemy', short: 'Alc', name: 'Alchemy', kind: 'primary', icon: 'trade_alchemy' },
  { id: 'blacksmithing', short: 'BS', name: 'Blacksmithing', kind: 'primary', icon: 'trade_blacksmithing' },
  { id: 'enchanting', short: 'Enc', name: 'Enchanting', kind: 'primary', icon: 'trade_engraving' },
  { id: 'engineering', short: 'Eng', name: 'Engineering', kind: 'primary', icon: 'trade_engineering' },
  { id: 'herbalism', short: 'Herb', name: 'Herbalism', kind: 'primary', icon: 'spell_nature_naturetouchgrow' },
  { id: 'leatherworking', short: 'LW', name: 'Leatherworking', kind: 'primary', icon: 'inv_misc_armorkit_17' },
  { id: 'mining', short: 'Min', name: 'Mining', kind: 'primary', icon: 'trade_mining' },
  { id: 'skinning', short: 'Skin', name: 'Skinning', kind: 'primary', icon: 'inv_misc_pelt_wolf_01' },
  { id: 'tailoring', short: 'Tail', name: 'Tailoring', kind: 'primary', icon: 'trade_tailoring' },
  { id: 'cooking', short: 'Cook', name: 'Cooking', kind: 'secondary', icon: 'inv_misc_food_15' },
  { id: 'firstaid', short: 'FA', name: 'First Aid', kind: 'secondary', icon: 'spell_holy_sealofsacrifice' },
  { id: 'fishing', short: 'Fish', name: 'Fishing', kind: 'secondary', icon: 'trade_fishing' },
];

export const GENDERS = [
  { id: 'male', name: 'Male' },
  { id: 'female', name: 'Female' },
];

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
export const CLASS_BY_ID = byId(CLASSES);
export const RACE_BY_ID = byId(RACES);
export const PROFESSION_BY_ID = byId(PROFESSIONS);
export const REGION_BY_ID = byId(REGIONS);
export const RULESET_BY_ID = byId(RULESETS);
export const FACTION_BY_ID = byId(FACTIONS);

// Classes available to a faction (union over its races), in display order.
export function classesForFaction(faction) {
  const races = RACE_CLASSES[faction] || {};
  const set = new Set(Object.values(races).flat());
  return CLASSES.filter((c) => set.has(c.id));
}

// Races that can be the given class on the given faction.
export function racesFor(faction, classId) {
  const races = RACE_CLASSES[faction] || {};
  return RACES.filter((r) => races[r.id]?.includes(classId));
}

export function isValidCombo(faction, race, classId) {
  return Boolean(RACE_CLASSES[faction]?.[race]?.includes(classId));
}

// Lookups by the English names the Blizzard API returns.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const nameIndex = (list, extra = {}) => {
  const m = Object.fromEntries(list.map((x) => [norm(x.name), x.id]));
  return { ...m, ...extra };
};
const CLASS_NAME_INDEX = nameIndex(CLASSES);
const RACE_NAME_INDEX = nameIndex(RACES, { scourge: 'undead', forsaken: 'undead' });
const PROF_NAME_INDEX = nameIndex(PROFESSIONS);

export const classIdFromName = (n) => CLASS_NAME_INDEX[norm(n)] || null;
export const raceIdFromName = (n) => RACE_NAME_INDEX[norm(n)] || null;
export const professionIdFromName = (n) => PROF_NAME_INDEX[norm(n)] || null;
