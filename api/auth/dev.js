import { handler, redirect, setCookies, getQuery, publicUrl, HttpError } from '../_lib/http.js';
import { db } from '../_lib/db.js';
import { sessionCookie, handleFromBattletag } from '../_lib/session.js';

// Local-only sign-in so the app can be developed before Battle.net is set up.
// Disabled unless ALLOW_DEV_LOGIN=1, and always disabled on Vercel production.
export default handler(['GET'], async (req, res) => {
  if (process.env.ALLOW_DEV_LOGIN !== '1' || process.env.VERCEL_ENV === 'production') {
    throw new HttpError(404, 'Not found.');
  }
  const battletag = String(getQuery(req).as || 'Dev#0001').slice(0, 40);
  const sql = db();
  const handle = handleFromBattletag(battletag);
  const [user] = await sql`
    INSERT INTO users (battletag, handle, access_token, token_expires_at)
    VALUES (${battletag}, ${handle}, 'dev-token', now() + interval '1 day')
    ON CONFLICT (handle) DO UPDATE SET token_expires_at = now() + interval '1 day'
    RETURNING id`;
  setCookies(res, [await sessionCookie(user.id)]);
  redirect(res, `${publicUrl()}/`);
});
