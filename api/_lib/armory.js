// Reads the public WoW Forever armory (worldofwarcraft.blizzard.com/forever).
// The official API lists an account's characters but its per-character
// routes aren't working yet, so ruleset, level and professions come from the
// JSON each armory page embeds for its own front end. Unofficial: if Blizzard
// reshapes those pages, this is the only file to fix.

import {
  classIdFromName, raceIdFromName, professionIdFromName, rulesetIdFromSlug,
  PROFESSION_CAP, LEVEL_CAP,
} from '../../shared/gameData.js';

const MOCK = process.env.BLIZZARD_MOCK === '1';
const SITE = 'https://worldofwarcraft.blizzard.com/en-gb/forever';

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ForeverWarband/1.0; +https://forever.gilgidim.dev)' },
    signal: AbortSignal.timeout(10_000),
  });
  // Unknown characters come back as 500, not 404, so any failure is "not found".
  return res.ok ? res.text() : null;
}

function embeddedJson(html, re) {
  const m = html?.match(re);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function parseProfessions(profs) {
  const out = {};
  for (const p of [...(profs?.primaries || []), ...(profs?.secondaries || [])]) {
    const id = professionIdFromName(p.name);
    const skill = p.tiers?.[0]?.skillPoints;
    if (id && Number.isInteger(skill)) out[id] = Math.max(0, Math.min(PROFESSION_CAP, skill));
  }
  return out;
}

// Armory character (page or search result) -> our character fields.
function normalise(c) {
  return {
    slug: c.slug,
    region: c.region,
    forename: c.name,
    surname: c.surname || '',
    faction: c.faction?.slug || null,
    race: raceIdFromName(c.race?.name),
    class: classIdFromName(c.class?.name),
    gender: c.gender?.slug || null,
    level: Math.max(1, Math.min(LEVEL_CAP, c.level || 1)),
    ruleset: rulesetIdFromSlug(c.ruleset?.slug),
    rulesetName: c.ruleset?.name || null,
  };
}

// Full character, including professions. null if the armory doesn't know it.
export async function armoryCharacter(region, slug) {
  if (MOCK) return mockCharacter(region, slug);
  const html = await fetchPage(`${SITE}/${region}/armory/character/${encodeURIComponent(slug)}`);
  const state = embeddedJson(html, /var characterProfileInitialState = (\{.*?\});\s*<\/script>/s);
  const c = state?.character;
  if (!c?.slug) return null;
  return { ...normalise(c), professions: parseProfessions(c.professions) };
}

// Name search. Results have no professions; look one up for the full record.
export async function armorySearch(region, query) {
  if (MOCK) return [mockCharacter(region, `${query.toLowerCase()}-mock`)];
  const html = await fetchPage(`${SITE}/${region}/armory?q=${encodeURIComponent(query)}`);
  const model = embeddedJson(html, /<script id="model">model = (\{.*?\});?\s*<\/script>/s);
  const chars = model?.categories?.find((x) => x.enum === 'CHARACTER')?.results || [];
  return chars.map(normalise);
}

// Runs fn over items, at most `limit` at a time, so a big account doesn't
// fire dozens of armory requests at once.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// --- mock data for local development (BLIZZARD_MOCK=1) ------------------------

function mockCharacter(region, slug) {
  const [name, surname = ''] = slug.split('-');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const seed = [...slug].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const rppvp = slug.startsWith('zalzi'); // one mock character on another ruleset
  return {
    slug, region, forename: cap(name), surname: cap(surname),
    faction: 'horde', race: 'troll', class: ['mage', 'rogue', 'priest'][seed % 3], gender: seed % 2 ? 'female' : 'male',
    level: 1 + (seed % LEVEL_CAP),
    ruleset: rppvp ? 'rppvp' : 'pvp', rulesetName: rppvp ? 'Roleplay PvP' : 'PvP',
    professions: { tailoring: seed % 76, cooking: (seed * 7) % 76, firstaid: (seed * 3) % 76 },
  };
}
