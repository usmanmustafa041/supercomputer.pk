-- The whole database. Applied on every boot; every statement is written so
-- running it twice changes nothing.
--
-- No migration tool. Three tables and one project does not need one, and a
-- tool nobody on the team knows is worse than SQL everybody can read.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  organisation  TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions live here rather than in a signed token, so signing someone out or
-- disabling an account takes effect immediately instead of whenever the token
-- would have expired.
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS products (
  id               SERIAL PRIMARY KEY,
  sku              TEXT NOT NULL UNIQUE,
  slug             TEXT NOT NULL UNIQUE,
  kind             TEXT NOT NULL,
  brand            TEXT NOT NULL,
  model            TEXT NOT NULL,
  mpn              TEXT,
  family           TEXT NOT NULL DEFAULT '',
  condition        TEXT NOT NULL DEFAULT 'new',
  segment          TEXT NOT NULL DEFAULT 'datacenter',
  price_pkr        NUMERIC(14,2) NOT NULL DEFAULT 0,
  price_on_request BOOLEAN NOT NULL DEFAULT FALSE,
  stock_qty        INTEGER NOT NULL DEFAULT 0,
  lead_days        INTEGER NOT NULL DEFAULT 0,
  indent_only      BOOLEAN NOT NULL DEFAULT FALSE,
  warranty_months  INTEGER NOT NULL DEFAULT 12,
  release_year     INTEGER NOT NULL DEFAULT 2024,
  search_key       TEXT NOT NULL DEFAULT '',
  highlights       JSONB NOT NULL DEFAULT '[]',
  tags             JSONB NOT NULL DEFAULT '[]',
  -- Per-category engineering figures. A graphics card has memory size, a power
  -- supply has watts. One column per possible field would be mostly empty, and
  -- one table per category would need fifteen joins to list a catalog page.
  specs            JSONB NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_kind_idx    ON products(kind);
CREATE INDEX IF NOT EXISTS products_active_idx  ON products(is_active);
CREATE INDEX IF NOT EXISTS products_search_idx  ON products(search_key);
CREATE INDEX IF NOT EXISTS products_updated_idx ON products(updated_at DESC);
-- Lets us ask questions about the JSON without reading every row.
CREATE INDEX IF NOT EXISTS products_specs_idx   ON products USING GIN (specs);

CREATE TABLE IF NOT EXISTS quotes (
  id            SERIAL PRIMARY KEY,
  reference     TEXT NOT NULL UNIQUE,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  contact_name  TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  organisation  TEXT,
  phone         TEXT,
  city          TEXT,
  timeline      TEXT,
  target        TEXT NOT NULL DEFAULT 'desk',
  workloads     JSONB NOT NULL DEFAULT '[]',
  notes         TEXT,
  lines         JSONB NOT NULL DEFAULT '[]',
  summary       JSONB NOT NULL DEFAULT '{}',
  findings      JSONB NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'in_review', 'quoted', 'won', 'lost')),
  internal_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_status_idx  ON quotes(status);
CREATE INDEX IF NOT EXISTS quotes_created_idx ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_email_idx   ON quotes(contact_email);
