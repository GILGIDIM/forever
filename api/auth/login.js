import crypto from 'node:crypto';
import { handler, redirect, setCookies, cookie, publicUrl, HttpError } from '../_lib/http.js';
import { OAUTH_HOST } from '../_lib/blizzard.js';

// Starts Battle.net sign-in. wow.profile lets us list the account's
// characters for import.
export default handler(['GET'], async (req, res) => {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  if (!clientId) throw new HttpError(500, 'Battle.net sign-in is not configured.');
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${publicUrl()}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid wow.profile',
    state,
  });
  setCookies(res, [cookie('ft_oauth_state', state, { maxAge: 600 })]);
  redirect(res, `${OAUTH_HOST}/authorize?${params}`);
});
