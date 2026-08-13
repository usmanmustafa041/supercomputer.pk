DROP TABLE IF EXISTS notification_events, document_templates, payments, inventory_movements, quote_revisions, customer_support_events, customer_saved_builds, customer_addresses, customer_contacts CASCADE;
DROP VIEW IF EXISTS inventory_balances;
ALTER TABLE invoices DROP COLUMN IF EXISTS customer_id, DROP COLUMN IF EXISTS shipping_address, DROP COLUMN IF EXISTS tax_name, DROP COLUMN IF EXISTS customer_ntn, DROP COLUMN IF EXISTS customer_strn, DROP COLUMN IF EXISTS cancellation_note, DROP COLUMN IF EXISTS sent_at, DROP COLUMN IF EXISTS opened_at;
ALTER TABLE quotes DROP COLUMN IF EXISTS customer_id, DROP COLUMN IF EXISTS revision_number, DROP COLUMN IF EXISTS billing_address, DROP COLUMN IF EXISTS shipping_address, DROP COLUMN IF EXISTS sent_at, DROP COLUMN IF EXISTS opened_at, DROP COLUMN IF EXISTS accepted_at, DROP COLUMN IF EXISTS last_reminded_at, DROP COLUMN IF EXISTS tax_name, DROP COLUMN IF EXISTS customer_ntn, DROP COLUMN IF EXISTS customer_strn;
DROP FUNCTION IF EXISTS next_document_number(TEXT,TEXT);
DROP TABLE IF EXISTS document_sequences, customers CASCADE;
