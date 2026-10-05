import 'dotenv/config';
import fs from 'node:fs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first (see .env.example).'); process.exit(1); }
const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require' });
await sql.unsafe(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
console.log('Database schema is up to date.');
await sql.end();
