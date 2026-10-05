// Runs the /api functions locally the way Vercel routes them, so you can
// develop without `vercel dev`. Vite proxies /api here (see vite.config.js).
import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'api');
const PORT = Number(process.env.API_PORT || 3001);

// Build route table from the file system: api/pools/[id].js -> /api/pools/:id
function routes(dir = root, prefix = '/api') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { out.push(...routes(full, `${prefix}/${entry.name}`)); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const base = entry.name.replace(/\.js$/, '');
    const urlPath = base === 'index' ? prefix : `${prefix}/${base}`;
    const params = [];
    const pattern = urlPath.replace(/\[(\w+)\]/g, (_, p) => { params.push(p); return '([^/]+)'; });
    out.push({ re: new RegExp(`^${pattern}/?$`), params, file: full, dynamic: params.length > 0 });
  }
  return out.sort((a, b) => a.dynamic - b.dynamic); // static routes win
}
const table = routes();

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = table.find((r) => r.re.test(url.pathname));
  if (!route) { res.statusCode = 404; return res.end('Not found'); }
  const match = url.pathname.match(route.re);
  req.query = Object.fromEntries(url.searchParams);
  route.params.forEach((p, i) => { req.query[p] = decodeURIComponent(match[i + 1]); });
  const mod = await import(`${pathToFileURL(route.file).href}?t=${fs.statSync(route.file).mtimeMs}`);
  await mod.default(req, res);
}).listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
