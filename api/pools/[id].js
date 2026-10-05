import { handler, send, readJson, getQuery, HttpError } from '../_lib/http.js';
import { currentUser, requireUser } from '../_lib/session.js';
import { db } from '../_lib/db.js';
import { loadPool, requireOwnedPool, saveCharacters } from '../_lib/pools.js';
import { validatePool } from '../../shared/validate.js';

const strip = ({ ownerId, ...rest }) => rest;

export default handler(['GET', 'PUT', 'PATCH', 'DELETE'], async (req, res) => {
  const { id } = getQuery(req);

  if (req.method === 'GET') {
    const viewer = await currentUser(req);
    return send(res, 200, strip(await loadPool(id, viewer)));
  }

  const user = await requireUser(req);
  const { pool } = await requireOwnedPool(id, user);
  const sql = db();

  if (req.method === 'PUT') {
    // Saves the whole pool as shown in the browser: order, edits, removals.
    const body = await readJson(req);
    const { characters, errors } = validatePool(body.characters);
    if (errors.length) throw new HttpError(400, 'Some characters need fixing before saving.', errors);
    await saveCharacters(pool.id, characters);
    return send(res, 200, strip(await loadPool(id, user)));
  }

  if (req.method === 'PATCH') {
    const { isPublic } = await readJson(req);
    if (typeof isPublic !== 'boolean') throw new HttpError(400, 'isPublic must be true or false.');
    await sql`UPDATE pools SET is_public = ${isPublic} WHERE id = ${pool.id}`;
    return send(res, 200, strip(await loadPool(id, user)));
  }

  await sql`DELETE FROM pools WHERE id = ${pool.id}`;
  send(res, 200, { ok: true });
});
