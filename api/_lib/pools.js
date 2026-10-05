import { db } from './db.js';
import { HttpError } from './http.js';

export function toCharacter(row) {
  return {
    id: row.id,
    forename: row.forename,
    surname: row.surname,
    faction: row.faction,
    race: row.race,
    class: row.class,
    gender: row.gender,
    level: row.level,
    professions: row.professions || {},
    apiName: row.api_name,
    apiRealm: row.api_realm,
    syncedAt: row.synced_at,
  };
}

export function toPool(row) {
  return {
    id: row.id,
    region: row.region,
    ruleset: row.ruleset,
    isPublic: row.is_public,
    updatedAt: row.updated_at,
  };
}

// Loads a pool the viewer may see. Owners see everything; anyone else only
// sees public pools, read-only.
export async function loadPool(id, viewer) {
  const sql = db();
  const poolId = Number(id);
  if (!Number.isInteger(poolId)) throw new HttpError(404, 'Warband not found.');
  const [row] = await sql`
    SELECT p.*, u.battletag, u.handle FROM pools p JOIN users u ON u.id = p.user_id
    WHERE p.id = ${poolId}`;
  const isOwner = Boolean(viewer && row && viewer.id === row.user_id);
  if (!row || (!row.is_public && !isOwner)) throw new HttpError(404, 'Warband not found.');
  const chars = await sql`SELECT * FROM characters WHERE pool_id = ${poolId} ORDER BY position`;
  return {
    pool: { ...toPool(row), owner: { battletag: row.battletag, handle: row.handle } },
    characters: chars.map(toCharacter),
    canEdit: isOwner,
    ownerId: row.user_id,
  };
}

export async function requireOwnedPool(id, user) {
  const data = await loadPool(id, user);
  if (!data.canEdit) throw new HttpError(403, 'Only the owner can change this warband.');
  return data;
}

// Replaces the pool's characters with the given (already validated) list,
// in order. Runs in one transaction so a failed save changes nothing.
export async function saveCharacters(poolId, characters) {
  const sql = db();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM characters WHERE pool_id = ${poolId}`;
    for (const [position, c] of characters.entries()) {
      await tx`
        INSERT INTO characters
          (id, pool_id, position, forename, surname, faction, race, class, gender, level,
           professions, api_name, api_realm, synced_at)
        VALUES
          (${c.id}, ${poolId}, ${position}, ${c.forename}, ${c.surname}, ${c.faction}, ${c.race},
           ${c.class}, ${c.gender}, ${c.level}, ${tx.json(c.professions)}, ${c.apiName},
           ${c.apiRealm}, ${c.syncedAt})`;
    }
    await tx`UPDATE pools SET updated_at = now() WHERE id = ${poolId}`;
  });
}
