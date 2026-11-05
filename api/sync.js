import crypto from 'node:crypto';
import { handler, send } from './_lib/http.js';
import { requireUser } from './_lib/session.js';
import { db } from './_lib/db.js';
import { toPool } from './_lib/pools.js';
import { accountCharacters, ACCOUNT_REGIONS } from './_lib/blizzard.js';
import { armoryCharacter, mapLimit } from './_lib/armory.js';
import { MAX_CHARACTERS_PER_POOL, isValidCombo } from '../shared/gameData.js';

const key = (region, slug) => `${region}/${slug}`;
const fullName = (c) => [c.forename, c.surname].filter(Boolean).join(' ');
const lower = (s) => String(s || '').toLowerCase();

// Pulls the signed-in user's WoW Forever characters into their warbands:
//  - lists the characters on their Battle.net account in every region,
//  - creates a warband for each region + ruleset that has characters,
//  - adds new characters, or links a hand-entered one with the same name,
//  - refreshes every linked character (including ones added by name lookup)
//    with race, class, level and professions from the armory.
// Hand-entered characters that match nothing are left alone.
export default handler(['POST'], async (req, res) => {
  const user = await requireUser(req);
  const sql = db();
  const skipped = [];
  let signInAgain = !(user.access_token && new Date(user.token_expires_at) > new Date());

  const account = signInAgain ? [] : (await Promise.all(ACCOUNT_REGIONS.map((region) =>
    accountCharacters(region, user.access_token).catch((err) => {
      if (err.status === 401) signInAgain = true;
      else skipped.push({ name: `${region.toUpperCase()} characters`, reason: err.message });
      return [];
    })))).flat();

  const pools = await sql`SELECT * FROM pools WHERE user_id = ${user.id}`;
  const chars = await sql`
    SELECT c.*, p.region FROM characters c JOIN pools p ON p.id = c.pool_id
    WHERE p.user_id = ${user.id} ORDER BY c.pool_id, c.position`;

  // One armory read per character, whether it came from the account or a link.
  const targets = new Map();
  for (const c of chars) if (c.api_name) targets.set(key(c.region, c.api_name), { region: c.region, slug: c.api_name });
  for (const a of account) targets.set(key(a.region, a.slug), a);
  const list = [...targets.values()];
  const found = await mapLimit(list, 6, (t) => armoryCharacter(t.region, t.slug).catch(() => null));
  const snap = new Map(list.map((t, i) => [key(t.region, t.slug), found[i]]));

  const linked = new Set(chars.filter((c) => c.api_name).map((c) => key(c.region, c.api_name)));
  const result = { added: [], linked: [], updated: 0 };

  await sql.begin(async (tx) => {
    const fields = (s, keepIdentity) => ({
      ...(keepIdentity ? {} : { forename: s.forename, surname: s.surname, faction: s.faction, race: s.race, class: s.class, gender: s.gender }),
      level: s.level,
      professions: tx.json(s.professions),
      api_name: s.slug,
      synced_at: new Date(),
    });
    const usable = (s) => Boolean(s.faction && s.race && s.class && s.gender && isValidCombo(s.faction, s.race, s.class));
    const touched = new Set();

    for (const c of chars.filter((x) => x.api_name)) {
      const s = snap.get(key(c.region, c.api_name));
      if (!s) { skipped.push({ name: fullName(c), reason: 'not found on the armory' }); continue; }
      await tx`UPDATE characters SET ${tx(fields(s, !usable(s)))} WHERE id = ${c.id}`;
      touched.add(c.pool_id);
      result.updated += 1;
    }

    const poolFor = new Map(pools.map((p) => [`${p.region}/${p.ruleset}`, p]));
    const nextPos = new Map();
    for (const c of chars) nextPos.set(c.pool_id, Math.max(nextPos.get(c.pool_id) ?? 0, c.position + 1));
    const count = (poolId) => chars.filter((c) => c.pool_id === poolId).length
      + result.added.filter((a) => a.poolId === poolId).length;

    for (const a of account) {
      if (linked.has(key(a.region, a.slug))) continue;
      const s = snap.get(key(a.region, a.slug));
      if (!s) { skipped.push({ name: a.name, reason: 'not on the armory yet (log in with them once)' }); continue; }
      const name = fullName(s);
      if (!s.ruleset) { skipped.push({ name, reason: `the ${s.rulesetName || 'unknown'} ruleset isn't supported yet` }); continue; }
      if (!usable(s)) { skipped.push({ name, reason: "race or class wasn't recognised" }); continue; }

      let pool = poolFor.get(`${a.region}/${s.ruleset}`);
      if (!pool) {
        [pool] = await tx`
          INSERT INTO pools (user_id, region, ruleset) VALUES (${user.id}, ${a.region}, ${s.ruleset})
          ON CONFLICT (user_id, region, ruleset) DO UPDATE SET region = EXCLUDED.region RETURNING *`;
        poolFor.set(`${a.region}/${s.ruleset}`, pool);
      }

      // A hand-entered character with the same name becomes the linked one.
      const manual = chars.find((c) => c.pool_id === pool.id && !c.api_name && !c.claimed
        && lower(c.forename) === lower(s.forename) && (!c.surname || lower(c.surname) === lower(s.surname)));
      if (manual) {
        manual.claimed = true;
        await tx`UPDATE characters SET ${tx(fields(s, false))} WHERE id = ${manual.id}`;
        result.linked.push(name);
      } else if (count(pool.id) < MAX_CHARACTERS_PER_POOL) {
        const position = nextPos.get(pool.id) ?? 0;
        nextPos.set(pool.id, position + 1);
        await tx`INSERT INTO characters ${tx({ id: crypto.randomUUID(), pool_id: pool.id, position, ...fields(s, false) })}`;
        result.added.push({ name, poolId: pool.id });
      } else {
        skipped.push({ name, reason: `the warband is full (${MAX_CHARACTERS_PER_POOL} characters)` });
        continue;
      }
      linked.add(key(a.region, a.slug));
      touched.add(pool.id);
    }

    if (touched.size) await tx`UPDATE pools SET updated_at = now() WHERE id IN ${tx([...touched])}`;
  });

  const rows = await sql`
    SELECT p.*, (SELECT count(*)::int FROM characters c WHERE c.pool_id = p.id) AS character_count
    FROM pools p WHERE p.user_id = ${user.id} ORDER BY p.created_at`;
  send(res, 200, {
    pools: rows.map((r) => ({ ...toPool(r), characterCount: r.character_count })),
    added: result.added.map((a) => a.name),
    linked: result.linked,
    updated: result.updated,
    skipped,
    signInAgain,
  });
});
