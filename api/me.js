import { handler, send } from './_lib/http.js';
import { currentUser, publicUser } from './_lib/session.js';
import { apiAvailable } from './_lib/blizzard.js';

export default handler(['GET'], async (req, res) => {
  const user = await currentUser(req);
  send(res, 200, {
    user: publicUser(user),
    apiAvailable: apiAvailable(),
    devLogin: process.env.ALLOW_DEV_LOGIN === '1' && process.env.VERCEL_ENV !== 'production',
  });
});
