import postgres from 'postgres';

// One client per warm function instance. Use the *pooled* Neon connection
// string in production (DATABASE_URL from the Vercel/Neon integration).
let sql;
export function db() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    const local = /localhost|127\.0\.0\.1/.test(url);
    sql = postgres(url, {
      ssl: local ? false : 'require',
      max: local ? 5 : 1,
      prepare: false, // required for Neon's pgbouncer pooler
      idle_timeout: 20,
    });
  }
  return sql;
}
