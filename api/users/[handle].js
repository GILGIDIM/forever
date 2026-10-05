import { handler, send, getQuery, HttpError } from '../_lib/http.js';
import { currentUser } from '../_lib/session.js';
import { db } from '../_lib/db.js';
import { toPool } from '../_lib/pools.js';

// Someone's public pools, for the read-only share page /u/<handle>.
export default handler(['GET'], async (req, res) => {
  const handle = String(getQuery(req).handle || '').toLowerCase();
  const sql = db();
  const [owner] = await sql`SELECT id, battletag, handle FROM users WHERE handle = ${handle}`;
  if (!owner) throw new HttpError(404, 'No one with that link has a warband yet.');
  const viewer = await currentUser(req);
  const isOwner = viewer?.id === owner.id;
  const rows = await sql`
    SELECT p.*, (SELECT count(*)::int FROM characters c WHERE c.pool_id = p.id) AS character_count
    FROM pools p WHERE p.user_id = ${owner.id} AND (p.is_public OR ${isOwner})
    ORDER BY p.created_at`;
  send(res, 200, {
    owner: { battletag: owner.battletag, handle: owner.handle },
    isOwner,
    pools: rows.map((r) => ({ ...toPool(r), characterCount: r.character_count })),
  });
});
