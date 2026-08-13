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
  media            JSONB NOT NULL DEFAULT '[]',
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
ALTER TABLE products ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]';

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

-- Commercial fields are added separately so existing installations upgrade
-- safely when this schema is applied again.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS subtotal_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  quote_id       INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  customer_email TEXT,
  organisation   TEXT,
  billing_address TEXT,
  lines          JSONB NOT NULL DEFAULT '[]',
  subtotal_pkr   NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate       NUMERIC(6,3) NOT NULL DEFAULT 0,
  discount_pkr   NUMERIC(14,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  issue_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  payment_terms  TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_created_idx ON invoices(created_at DESC);

-- Shared abuse-control counters. Keeping these in Postgres makes limits work
-- across several web containers instead of resetting on every deploy.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  hits         INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits(window_start);

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS submission_hash TEXT;
CREATE INDEX IF NOT EXISTS quotes_submission_hash_idx ON quotes(submission_hash, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_tokens(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  details    JSONB NOT NULL DEFAULT '{}',
  ip_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_actor_idx ON admin_audit_log(actor_id, created_at DESC);
