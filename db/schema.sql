-- Forever Tracker schema. Safe to run repeatedly (npm run db:migrate).

CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  bnet_id          BIGINT UNIQUE,            -- null only for local dev logins
  battletag        TEXT NOT NULL,
  handle           TEXT NOT NULL UNIQUE,     -- url-safe battletag, used in share links
  access_token     TEXT,                     -- Battle.net user token (wow.profile), ~24h
  token_expires_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pools (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region      TEXT NOT NULL,
  ruleset     TEXT NOT NULL,
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, region, ruleset)
);

CREATE TABLE IF NOT EXISTS characters (
  id          TEXT PRIMARY KEY,              -- uuid generated in the browser
  pool_id     INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,              -- 0 = main
  forename    TEXT NOT NULL,
  surname     TEXT NOT NULL DEFAULT '',
  faction     TEXT NOT NULL,
  race        TEXT NOT NULL,
  class       TEXT NOT NULL,
  gender      TEXT NOT NULL,
  level       INTEGER NOT NULL DEFAULT 1,
  professions JSONB NOT NULL DEFAULT '{}',   -- { "tailoring": 300, "cooking": 75 }
  api_name    TEXT,                          -- in-game name used for Blizzard API lookups
  api_realm   TEXT,                          -- realm slug for the lookup
  synced_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS characters_pool_idx ON characters (pool_id, position);
