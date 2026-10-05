import { handler, send, setCookies } from '../_lib/http.js';
import { clearSessionCookie } from '../_lib/session.js';

export default handler(['POST'], async (req, res) => {
  setCookies(res, [clearSessionCookie()]);
  send(res, 200, { ok: true });
});
