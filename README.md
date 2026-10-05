# Forever Warband

Warband planner for World of Warcraft: Forever — **forever.gilgidim.dev**.

- Sign in with Battle.net; each region + ruleset is its own warband.
- Faction → class → race picker that only offers combinations Forever allows (including the six new combos and Skyborne).
- Forename and surname, gender-specific race portrait, class colour.
- 9 primary + 3 secondary professions, 0–300, with a hard limit of 2 primaries.
- Drag (or ▲/▼) to order your characters (the top one is your main); **Save changes** stores the current state.
- Read-only share link (`/u/<your-battletag>`) for your brothers; they sign in to keep their own warbands.
- Import from Battle.net and Sync levels/professions once Blizzard publishes the Forever API namespace. Until then everything works by hand.

## Stack

Same shape as `wow-character-tracker`: React front end plus Vercel serverless functions in `/api`, using the same `BLIZZARD_CLIENT_ID` / `BLIZZARD_CLIENT_SECRET`. Differences: Vite instead of Create React App (deprecated), and Postgres for storage.

```
api/            Vercel functions (auth, pools, import, sync); helpers in api/_lib
shared/         Game rules + validation, used by both the browser and the API
src/            React app
db/schema.sql   Database tables
scripts/        Local API runner and migration
```

All Forever-specific guesses live in `shared/gameData.js` (profession cap, realm slugs, race/class matrix) so they're one-line changes after launch.

## Deploy

1. **GitHub** – push this folder to a new repo.
2. **Vercel** – import the repo (framework: Vite, defaults are fine).
3. **Database** – in the Vercel project: Storage → Marketplace → **Neon** → connect. This sets `DATABASE_URL`. Then run the schema once from your machine:
   ```
   DATABASE_URL="<pooled url from Vercel>" npm run db:migrate
   ```
4. **Battle.net app** – at <https://develop.battle.net/access/clients>, either reuse the Midnight client or create a new one, and add the redirect URL
   `https://forever.gilgidim.dev/api/auth/callback`
5. **Environment variables** (Vercel → Settings → Environment Variables):
   | Name | Value |
   | --- | --- |
   | `BLIZZARD_CLIENT_ID` / `BLIZZARD_CLIENT_SECRET` | from the Battle.net app |
   | `PUBLIC_URL` | `https://forever.gilgidim.dev` |
   | `SESSION_SECRET` | output of `openssl rand -hex 32` |
   | `BLIZZARD_PROFILE_NAMESPACE` | leave empty until launch (see below) |
6. **Domain** – Vercel → Settings → Domains → add `forever.gilgidim.dev`. In Cloudflare DNS add `CNAME forever → cname.vercel-dns.com`, **DNS only** (grey cloud), same as the `wow` subdomain.

## When Forever launches

Blizzard hasn't published the Forever profile API namespace yet (Classic Era's is `profile-classic1x`). Once it appears:

1. Set `BLIZZARD_PROFILE_NAMESPACE` (prefix only — the region is appended) and redeploy. Import and Sync buttons appear.
2. Fill in `realmSlug` for each ruleset in `shared/gameData.js` so imports only show characters from the matching realm.
3. Check `PROFESSION_CAP` and the race/class matrix against the live game.

## Local development

Needs Node 20+ and a Postgres database (local, or a Neon branch).

```
npm install
cp .env.example .env        # fill in DATABASE_URL and SESSION_SECRET
npm run db:migrate
npm run dev                 # site on http://localhost:5173, API on :3001
```

With `ALLOW_DEV_LOGIN=1` the sign-in page offers a test login, and `BLIZZARD_MOCK=1` returns fake Battle.net characters so Import and Sync can be tried before launch. Never set either on Vercel; dev login is also hard-disabled in production.

`npm test` runs the race/class and profession rule tests.

Icons load from Wowhead's icon CDN (`src/assets.js`); point `ICON_BASE` at `/icons` to self-host instead.
