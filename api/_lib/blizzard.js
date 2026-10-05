// Blizzard API access. Same client-credentials flow as the Midnight tracker,
// plus user-token calls for importing characters after Battle.net sign-in.
//
// WoW Forever's API namespace isn't published yet. Set
// BLIZZARD_PROFILE_NAMESPACE once it is (e.g. "profile-classic1x" is Classic
// Era's); the region suffix is added here. Until then, import/sync report
// that the API isn't available and the site works on manual entry.

import { classIdFromName, raceIdFromName, professionIdFromName, PROFESSION_CAP, LEVEL_CAP } from '../../shared/gameData.js';
import { HttpError } from './http.js';

const MOCK = process.env.BLIZZARD_MOCK === '1';
export const OAUTH_HOST = (process.env.BNET_OAUTH_HOST || 'https://oauth.battle.net').replace(/\/$/, '');

export function profileNamespace(region) {
  const prefix = process.env.BLIZZARD_PROFILE_NAMESPACE;
  return prefix ? `${prefix}-${region}` : null;
}

export const apiAvailable = () => MOCK || Boolean(process.env.BLIZZARD_PROFILE_NAMESPACE);

let appToken = null;
let appTokenExpiry = 0;

async function getAppToken() {
  if (appToken && Date.now() < appTokenExpiry) return appToken;
  const { BLIZZARD_CLIENT_ID: id, BLIZZARD_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new HttpError(500, 'Blizzard API credentials are not configured.');
  const res = await fetch(`${OAUTH_HOST}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new HttpError(502, `Battle.net token request failed (${res.status}).`);
  const data = await res.json();
  appToken = data.access_token;
  appTokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return appToken;
}

async function apiGet(region, path, token) {
  const ns = profileNamespace(region);
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://${region}.api.blizzard.com${path}${sep}namespace=${ns}&locale=en_GB`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new HttpError(502, `Blizzard API returned ${res.status} for ${path}.`);
  return res.json();
}

const slugName = (n) => encodeURIComponent(String(n).toLowerCase());

// --- user-token calls --------------------------------------------------------

// Characters on the signed-in account, normalised to our ids.
export async function accountCharacters(region, userToken) {
  if (MOCK) return mockAccount();
  if (!apiAvailable()) throw new HttpError(503, 'The WoW Forever API is not available yet.');
  const data = await apiGet(region, '/profile/user/wow', userToken);
  const chars = (data?.wow_accounts || []).flatMap((a) => a.characters || []);
  return chars.map((c) => ({
    name: c.name,
    realmSlug: c.realm?.slug || null,
    realmName: c.realm?.name || null,
    level: c.level ?? null,
    faction: c.faction?.type ? c.faction.type.toLowerCase() : null,
    race: raceIdFromName(c.playable_race?.name),
    class: classIdFromName(c.playable_class?.name),
    gender: c.gender?.type ? c.gender.type.toLowerCase() : null,
  }));
}

// --- app-token calls ---------------------------------------------------------

function parseProfessions(data) {
  const out = {};
  const groups = [...(data?.primaries || []), ...(data?.secondaries || [])];
  for (const p of groups) {
    const id = professionIdFromName(p.profession?.name);
    if (!id) continue;
    // Retail nests skill in tiers[]; Classic-style responses put it on the entry.
    const tier = Array.isArray(p.tiers) ? p.tiers[0] : p;
    const skill = tier?.skill_points;
    if (Number.isInteger(skill)) out[id] = Math.max(0, Math.min(PROFESSION_CAP, skill));
  }
  return out;
}

// Level + professions for one character. professions is null when the
// endpoint doesn't exist for this game version, so we don't wipe manual data.
export async function characterSnapshot(region, realmSlug, name) {
  if (MOCK) return mockSnapshot(name);
  if (!apiAvailable()) throw new HttpError(503, 'The WoW Forever API is not available yet.');
  const token = await getAppToken();
  const base = `/profile/wow/character/${encodeURIComponent(realmSlug)}/${slugName(name)}`;
  const [profile, profs] = await Promise.all([
    apiGet(region, base, token),
    apiGet(region, `${base}/professions`, token).catch(() => null),
  ]);
  if (!profile) return null;
  return {
    level: Math.max(1, Math.min(LEVEL_CAP, profile.level || 1)),
    professions: profs ? parseProfessions(profs) : null,
  };
}

// --- mock data for local development (BLIZZARD_MOCK=1) ------------------------

function mockAccount() {
  return [
    { name: 'Loki', realmSlug: 'mock-pvp', realmName: 'Mock PvP', level: 23, faction: 'horde', race: 'undead', class: 'mage', gender: 'male' },
    { name: 'Griznak', realmSlug: 'mock-pvp', realmName: 'Mock PvP', level: 17, faction: 'horde', race: 'troll', class: 'rogue', gender: 'male' },
    { name: 'Lepita', realmSlug: 'mock-pvp', realmName: 'Mock PvP', level: 9, faction: 'horde', race: 'troll', class: 'priest', gender: 'female' },
  ];
}

function mockSnapshot(name) {
  const seed = [...String(name)].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return {
    level: 1 + (seed % LEVEL_CAP),
    professions: { tailoring: seed % (PROFESSION_CAP + 1), cooking: (seed * 7) % 226 },
  };
}
