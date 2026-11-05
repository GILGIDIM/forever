// Blizzard profile API: lists the WoW Forever characters on the signed-in
// account (user token with the wow.profile scope).
//
// The Forever namespace is profile-forever-<region>. Blizzard hasn't
// documented it; community testing (November 2026) shows /profile/user/wow
// working there, with characters carrying a surname and no realm.
// Everything else about a character comes from the armory (armory.js).

import { armorySlug } from '../../shared/gameData.js';
import { HttpError } from './http.js';

const MOCK = process.env.BLIZZARD_MOCK === '1';
const NAMESPACE = process.env.BLIZZARD_PROFILE_NAMESPACE || 'profile-forever';
export const OAUTH_HOST = (process.env.BNET_OAUTH_HOST || 'https://oauth.battle.net').replace(/\/$/, '');

// The armory has Forever pages for these; KR's API namespace answers 403 for now.
export const ACCOUNT_REGIONS = ['eu', 'us', 'tw', 'kr'];

// Slug from the realmless character link (".../character/loki-bane?..."),
// falling back to name + surname.
function slugFor(c) {
  const m = c.character?.href?.match(/\/profile\/wow\/character\/([^/?]+)\?/);
  return m ? decodeURIComponent(m[1]).toLowerCase() : armorySlug(c.name, c.surname);
}

// [{ region, slug, name }] for one region. Empty if the account has no
// Forever characters there; throws 401 if the token has expired.
export async function accountCharacters(region, userToken) {
  if (MOCK) return mockAccount(region);
  const url = `https://${region}.api.blizzard.com/profile/user/wow?namespace=${NAMESPACE}-${region}&locale=en_GB`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` }, signal: AbortSignal.timeout(10_000) });
  if (res.status === 401) throw new HttpError(401, 'Your Battle.net sign-in has expired. Sign in again to sync.');
  if (res.status === 403 || res.status === 404) return [];
  if (!res.ok) throw new HttpError(502, `Battle.net returned ${res.status} listing your ${region.toUpperCase()} characters.`);
  const data = await res.json();
  return (data.wow_accounts || [])
    .flatMap((a) => a.characters || [])
    .map((c) => ({ region, slug: slugFor(c), name: [c.name, c.surname].filter(Boolean).join(' ') }));
}

// --- mock data for local development (BLIZZARD_MOCK=1) ------------------------

function mockAccount(region) {
  if (region !== 'eu') return [];
  return ['loki-bane', 'griznak-stonetusk', 'lepita-moonwhisper', 'zalzi-ashveil']
    .map((slug) => ({ region, slug, name: slug }));
}
