-- Customers, auditable inventory, commercial revisions and payment records.

CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  customer_number TEXT NOT NULL UNIQUE,
  organisation TEXT,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  ntn TEXT,
  strn TEXT,
  credit_limit_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_email_unique ON customers(lower(email)) WHERE email IS NOT NULL;

CREATE TABLE customer_contacts (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_addresses (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL CHECK (address_type IN ('billing','shipping','both')),
  label TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'Pakistan',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_saved_builds (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT 'desk',
  lines JSONB NOT NULL DEFAULT '[]',
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_support_events (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE document_sequences (
  document_type TEXT NOT NULL,
  period TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(document_type, period)
);

CREATE OR REPLACE FUNCTION next_document_number(kind TEXT, prefix TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE period_key TEXT := to_char(CURRENT_DATE, 'YYYYMM');
DECLARE next_value INTEGER;
BEGIN
  INSERT INTO document_sequences(document_type, period, last_number)
  VALUES(kind, period_key, 1)
  ON CONFLICT(document_type, period)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO next_value;
  RETURN prefix || '-' || period_key || '-' || lpad(next_value::TEXT, 5, '0');
END $$;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check CHECK (status IN (
  'new','reviewing','quote_sent','accepted','stock_reserved','invoice_issued',
  'partially_paid','paid','preparing','delivered','cancelled','lost',
  'in_review','quoted','won'
));
ALTER TABLE quotes ADD COLUMN customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE quotes ADD COLUMN billing_address JSONB;
ALTER TABLE quotes ADD COLUMN shipping_address JSONB;
ALTER TABLE quotes ADD COLUMN sent_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN opened_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN accepted_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN last_reminded_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN tax_name TEXT NOT NULL DEFAULT 'Sales tax';
ALTER TABLE quotes ADD COLUMN customer_ntn TEXT;
ALTER TABLE quotes ADD COLUMN customer_strn TEXT;

CREATE TABLE quote_revisions (
  id BIGSERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  lines JSONB NOT NULL,
  summary JSONB NOT NULL,
  findings JSONB NOT NULL,
  subtotal_pkr NUMERIC(14,2) NOT NULL,
  tax_rate NUMERIC(6,3) NOT NULL,
  discount_pkr NUMERIC(14,2) NOT NULL,
  valid_until DATE,
  payment_terms TEXT,
  note TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quote_id, revision_number)
);

CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase_import','received','reserved_quote','reservation_released','sold',
    'returned','damaged','warranty_replacement','manual_adjustment'
  )),
  quantity_delta INTEGER NOT NULL DEFAULT 0,
  reserved_delta INTEGER NOT NULL DEFAULT 0,
  unit_cost_pkr NUMERIC(14,2),
  quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  reference TEXT,
  note TEXT,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (quantity_delta <> 0 OR reserved_delta <> 0 OR movement_type = 'purchase_import')
);
CREATE INDEX inventory_movements_product_idx ON inventory_movements(product_id, occurred_at DESC);
CREATE INDEX inventory_movements_quote_idx ON inventory_movements(quote_id) WHERE quote_id IS NOT NULL;

INSERT INTO inventory_movements(product_id, movement_type, quantity_delta, reference, note)
SELECT id, 'manual_adjustment', stock_qty, 'OPENING-BALANCE', 'Opening balance imported from products.stock_qty'
FROM products WHERE stock_qty <> 0;

CREATE VIEW inventory_balances AS
SELECT p.id AS product_id, p.sku,
  COALESCE(sum(m.quantity_delta), 0)::INTEGER AS on_hand,
  COALESCE(sum(m.reserved_delta), 0)::INTEGER AS reserved,
  (COALESCE(sum(m.quantity_delta), 0) - COALESCE(sum(m.reserved_delta), 0))::INTEGER AS available
FROM products p LEFT JOIN inventory_movements m ON m.product_id = p.id
GROUP BY p.id, p.sku;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN (
  'draft','issued','sent','partially_paid','paid','preparing','delivered','cancelled','void'
));
ALTER TABLE invoices ADD COLUMN customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN shipping_address TEXT;
ALTER TABLE invoices ADD COLUMN tax_name TEXT NOT NULL DEFAULT 'Sales tax';
ALTER TABLE invoices ADD COLUMN customer_ntn TEXT;
ALTER TABLE invoices ADD COLUMN customer_strn TEXT;
ALTER TABLE invoices ADD COLUMN cancellation_note TEXT;
ALTER TABLE invoices ADD COLUMN sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN opened_at TIMESTAMPTZ;

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  payment_reference TEXT NOT NULL UNIQUE,
  amount_pkr NUMERIC(14,2) NOT NULL CHECK (amount_pkr > 0),
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_invoice_idx ON payments(invoice_id, received_at DESC);

CREATE TABLE document_templates (
  id BIGSERIAL PRIMARY KEY,
  template_type TEXT NOT NULL CHECK (template_type IN ('quote','invoice')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notification_events_pending_idx ON notification_events(status, created_at);

-- Create customer records for existing quote history, preserving all snapshots.
INSERT INTO customers(customer_number, organisation, display_name, email, phone)
SELECT next_document_number('customer','CUS'), max(organisation), max(contact_name), lower(contact_email), max(phone)
FROM quotes GROUP BY lower(contact_email)
ON CONFLICT DO NOTHING;
UPDATE quotes q SET customer_id = c.id FROM customers c
WHERE q.customer_id IS NULL AND lower(q.contact_email) = lower(c.email);
UPDATE invoices i SET customer_id = c.id FROM customers c
WHERE i.customer_id IS NULL AND i.customer_email IS NOT NULL AND lower(i.customer_email) = lower(c.email);
