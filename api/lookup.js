import { handler, send, getQuery, HttpError } from './_lib/http.js';
import { requireUser } from './_lib/session.js';
import { armoryCharacter, armorySearch } from './_lib/armory.js';
import { REGION_BY_ID } from '../shared/gameData.js';

const URL_RE = /\/forever\/([a-z]{2})\/armory\/character\/([^/?#]+)/i;

// Finds a character on the Forever armory from a pasted name ("Loki Bane"),
// slug ("loki-bane") or armory link. Returns { character } on an exact hit,
// otherwise { matches } from the armory's name search to pick from.
export default handler(['GET'], async (req, res) => {
  await requireUser(req);
  const { q = '' } = getQuery(req);
  let { region } = getQuery(req);
  const text = String(q).trim();
  if (text.length < 2 || text.length > 200) throw new HttpError(400, 'Enter a character name or armory link.');

  let slug;
  const link = text.match(URL_RE);
  if (link) {
    region = link[1].toLowerCase();
    slug = decodeURIComponent(link[2]).toLowerCase();
  } else {
    slug = text.toLowerCase().split(/\s+/).join('-');
  }
  if (!REGION_BY_ID[region]) throw new HttpError(400, 'Unknown region.');

  const character = await armoryCharacter(region, slug);
  if (character) return send(res, 200, { character });

  const matches = (await armorySearch(region, slug.split('-')[0])).filter((c) => c.region === region).slice(0, 20);
  send(res, 200, { matches });
});
