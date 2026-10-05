import { SignJWT, jwtVerify } from 'jose';
import { parseCookies, cookie, HttpError } from './http.js';
import { db } from './db.js';

const COOKIE = 'ft_session';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set (32+ characters)');
  return new TextEncoder().encode(s);
}

export async function sessionCookie(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${THIRTY_DAYS}s`)
    .sign(secret());
  return cookie(COOKIE, token, { maxAge: THIRTY_DAYS });
}

export const clearSessionCookie = () => cookie(COOKIE, '', { maxAge: 0 });

// Returns the signed-in user row, or null.
export async function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const sql = db();
    const [user] = await sql`SELECT * FROM users WHERE id = ${payload.uid}`;
    return user || null;
  } catch {
    return null;
  }
}

export async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'Sign in to do that.');
  return user;
}

// "Gilgidim#2123" -> "gilgidim-2123"
export const handleFromBattletag = (tag) =>
  String(tag).toLowerCase().replace('#', '-').replace(/[^a-z0-9-]/g, '');

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    battletag: user.battletag,
    handle: user.handle,
    canImport: Boolean(user.access_token && user.token_expires_at && new Date(user.token_expires_at) > new Date()),
  };
}
