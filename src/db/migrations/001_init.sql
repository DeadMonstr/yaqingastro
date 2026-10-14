CREATE TABLE categories (
  id          INTEGER PRIMARY KEY,
  slug        TEXT    NOT NULL UNIQUE,          -- a-z0-9-, якорь #cat-<slug>
  name_ru     TEXT    NOT NULL,
  name_uz     TEXT    NOT NULL DEFAULT '',
  name_en     TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL,
  is_visible  INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE dishes (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_ru     TEXT    NOT NULL,
  name_uz     TEXT    NOT NULL DEFAULT '',
  name_en     TEXT    NOT NULL DEFAULT '',
  desc_ru     TEXT    NOT NULL DEFAULT '',
  desc_uz     TEXT    NOT NULL DEFAULT '',
  desc_en     TEXT    NOT NULL DEFAULT '',
  amount      INTEGER,                          -- NULL: вес/объём не показывать
  unit        TEXT    CHECK (unit IN ('g', 'ml', 'pcs')),
  price       INTEGER NOT NULL,                 -- в сумах
  image       TEXT,                             -- id фото или NULL
  sort_order  INTEGER NOT NULL,
  is_visible  INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX dishes_category ON dishes(category_id, sort_order);

CREATE TABLE content (
  key         TEXT PRIMARY KEY,                 -- ключ из content-schema.js
  value       TEXT NOT NULL,                    -- JSON
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  login         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                  -- scrypt: salt и хэш
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,                 -- 32 случайных байта, hex
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
