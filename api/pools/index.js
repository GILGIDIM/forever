import { handler, send, readJson, HttpError } from '../_lib/http.js';
import { requireUser } from '../_lib/session.js';
import { db } from '../_lib/db.js';
import { toPool } from '../_lib/pools.js';
import { REGION_BY_ID, RULESET_BY_ID } from '../../shared/gameData.js';

export default handler(['GET', 'POST'], async (req, res) => {
  const user = await requireUser(req);
  const sql = db();

  if (req.method === 'POST') {
    const { region, ruleset } = await readJson(req);
    if (!REGION_BY_ID[region] || !RULESET_BY_ID[ruleset]) {
      throw new HttpError(400, 'Choose a region and a ruleset.');
    }
    const [row] = await sql`
      INSERT INTO pools (user_id, region, ruleset) VALUES (${user.id}, ${region}, ${ruleset})
      ON CONFLICT (user_id, region, ruleset) DO UPDATE SET region = EXCLUDED.region
      RETURNING *`;
    return send(res, 201, { pool: { ...toPool(row), characterCount: 0 } });
  }

  const rows = await sql`
    SELECT p.*, (SELECT count(*)::int FROM characters c WHERE c.pool_id = p.id) AS character_count
    FROM pools p WHERE p.user_id = ${user.id} ORDER BY p.created_at`;
  send(res, 200, { pools: rows.map((r) => ({ ...toPool(r), characterCount: r.character_count })) });
});
