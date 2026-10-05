import { handler, send, getQuery, HttpError } from './_lib/http.js';
import { requireUser } from './_lib/session.js';
import { requireOwnedPool } from './_lib/pools.js';
import { accountCharacters } from './_lib/blizzard.js';
import { RULESET_BY_ID, isValidCombo } from '../shared/gameData.js';

// Lists characters on the signed-in Battle.net account that could be added
// to the given pool. The browser picks which ones to add, then saves.
export default handler(['GET'], async (req, res) => {
  const user = await requireUser(req);
  const { pool, characters } = await requireOwnedPool(getQuery(req).poolId, user);

  if (!user.access_token || new Date(user.token_expires_at) <= new Date()) {
    throw new HttpError(401, 'Your Battle.net sign-in has expired. Sign in again to import.');
  }

  const realmSlug = RULESET_BY_ID[pool.ruleset]?.realmSlug;
  const all = await accountCharacters(pool.region, user.access_token);
  const linked = new Set(characters.map((c) => `${c.apiRealm}/${(c.apiName || '').toLowerCase()}`));

  const found = all
    .filter((c) => !realmSlug || c.realmSlug === realmSlug)
    .map((c) => ({
      ...c,
      supported: Boolean(c.faction && c.race && c.class && c.gender && isValidCombo(c.faction, c.race, c.class)),
      alreadyAdded: linked.has(`${c.realmSlug}/${c.name.toLowerCase()}`),
    }));

  send(res, 200, { characters: found, filteredByRealm: Boolean(realmSlug) });
});
