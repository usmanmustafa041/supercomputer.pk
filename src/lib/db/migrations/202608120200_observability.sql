CREATE TABLE request_log (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX request_log_created_idx ON request_log(created_at DESC);
CREATE INDEX request_log_slow_idx ON request_log(duration_ms DESC, created_at DESC);

CREATE TABLE operational_checks (
  id BIGSERIAL PRIMARY KEY,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
