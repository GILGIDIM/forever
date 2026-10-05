import { handler, redirect, setCookies, cookie, parseCookies, getQuery, publicUrl } from '../_lib/http.js';
import { OAUTH_HOST } from '../_lib/blizzard.js';
import { db } from '../_lib/db.js';
import { sessionCookie, handleFromBattletag } from '../_lib/session.js';

const fail = (res, reason) => redirect(res, `${publicUrl()}/?signin=${encodeURIComponent(reason)}`);

export default handler(['GET'], async (req, res) => {
  const { code, state, error } = getQuery(req);
  const expected = parseCookies(req).ft_oauth_state;
  if (error) return fail(res, 'cancelled');
  if (!code || !state || state !== expected) return fail(res, 'expired');

  const { BLIZZARD_CLIENT_ID: id, BLIZZARD_CLIENT_SECRET: secret } = process.env;
  const tokenRes = await fetch(`${OAUTH_HOST}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${publicUrl()}/api/auth/callback`,
    }),
  });
  if (!tokenRes.ok) return fail(res, 'token');
  const token = await tokenRes.json();

  const infoRes = await fetch(`${OAUTH_HOST}/userinfo`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!infoRes.ok) return fail(res, 'userinfo');
  const info = await infoRes.json(); // { id, battletag }

  const sql = db();
  const expires = new Date(Date.now() + (token.expires_in || 86400) * 1000);
  const [user] = await sql`
    INSERT INTO users (bnet_id, battletag, handle, access_token, token_expires_at)
    VALUES (${info.id}, ${info.battletag}, ${handleFromBattletag(info.battletag)},
            ${token.access_token}, ${expires})
    ON CONFLICT (bnet_id) DO UPDATE SET
      battletag = EXCLUDED.battletag,
      handle = EXCLUDED.handle,
      access_token = EXCLUDED.access_token,
      token_expires_at = EXCLUDED.token_expires_at
    RETURNING id`;

  setCookies(res, [await sessionCookie(user.id), cookie('ft_oauth_state', '', { maxAge: 0 })]);
  redirect(res, `${publicUrl()}/`);
});
