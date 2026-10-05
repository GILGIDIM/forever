import { handler, send, readJson } from './_lib/http.js';
import { requireUser } from './_lib/session.js';
import { db } from './_lib/db.js';
import { requireOwnedPool, loadPool } from './_lib/pools.js';
import { characterSnapshot } from './_lib/blizzard.js';

// Refreshes level and professions from the Blizzard API for every character
// in the pool that is linked to an in-game name. Unlinked characters keep
// their manual values. Saved straight to the database.
export default handler(['POST'], async (req, res) => {
  const user = await requireUser(req);
  const { poolId } = await readJson(req);
  const { pool, characters } = await requireOwnedPool(poolId, user);
  const sql = db();

  const linked = characters.filter((c) => c.apiName && c.apiRealm);
  const results = await Promise.all(linked.map(async (c) => {
    try {
      const snap = await characterSnapshot(pool.region, c.apiRealm, c.apiName);
      if (!snap) return { id: c.id, status: 'not-found' };
      const professions = snap.professions ?? c.professions;
      await sql`
        UPDATE characters SET level = ${snap.level}, professions = ${sql.json(professions)}, synced_at = now()
        WHERE id = ${c.id} AND pool_id = ${pool.id}`;
      return { id: c.id, status: 'updated' };
    } catch (err) {
      if (err.status === 503) throw err; // API not live yet: report once, not per character
      return { id: c.id, status: 'error' };
    }
  }));

  send(res, 200, { ...(await loadPool(pool.id, user)), results, ownerId: undefined });
});
