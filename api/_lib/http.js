// Small helpers so handlers read the same on Vercel and in scripts/dev-api.js.

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const isSecure = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

export function cookie(name, value, { maxAge, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax'];
  if (httpOnly) parts.push('HttpOnly');
  if (isSecure()) parts.push('Secure');
  if (maxAge != null) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

export function setCookies(res, cookies) {
  res.setHeader('Set-Cookie', cookies);
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel pre-parses
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

export function getQuery(req) {
  if (req.query) return req.query;
  return Object.fromEntries(new URL(req.url, 'http://x').searchParams);
}

// Wraps a handler: method allow-list + consistent error responses.
export function handler(methods, fn) {
  return async (req, res) => {
    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      return send(res, 405, { error: 'Method not allowed' });
    }
    try {
      await fn(req, res);
    } catch (err) {
      if (err.status) return send(res, err.status, { error: err.message, details: err.details });
      console.error(err);
      return send(res, 500, { error: 'Something went wrong on the server.' });
    }
  };
}

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const publicUrl = () => (process.env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
