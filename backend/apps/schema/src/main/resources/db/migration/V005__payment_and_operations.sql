CREATE TABLE payment_attempt (
  order_id TEXT PRIMARY KEY REFERENCES orders(id), receipt TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK(state IN ('CALLING','READY','UNKNOWN','FAILED')),
  provider_order_id TEXT UNIQUE, key_id TEXT, started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE captured_payment (
  payment_id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0), currency CHAR(3) NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE packing_task (
  order_id TEXT PRIMARY KEY REFERENCES orders(id), state TEXT NOT NULL DEFAULT 'AWAITING_PACKING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE refund_request (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id),
  amount_minor BIGINT NOT NULL CHECK(amount_minor>0), reason TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES customer(id), idempotency_key TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('PENDING','CALLING','UNKNOWN','PROCESSED','FAILED')),
  provider_refund_id TEXT UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id,idempotency_key)
);
ALTER TABLE inbox ADD COLUMN payload_hash TEXT;
ALTER TABLE inbox ADD COLUMN processing_state TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE inbox ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inbox ADD COLUMN next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE inbox ADD COLUMN lease_token TEXT;
ALTER TABLE inbox ADD COLUMN lease_until TIMESTAMPTZ;
CREATE INDEX inbox_due ON inbox(next_attempt_at) WHERE processed_at IS NULL;
