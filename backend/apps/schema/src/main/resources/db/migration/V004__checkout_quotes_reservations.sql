CREATE TABLE checkout_quote (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customer(id),
  address_id TEXT NOT NULL, address_version BIGINT NOT NULL,
  input JSONB NOT NULL, price_snapshot JSONB NOT NULL,
  subtotal_minor BIGINT NOT NULL CHECK(subtotal_minor>=0),
  shipping_minor BIGINT NOT NULL CHECK(shipping_minor>=0),
  total_minor BIGINT NOT NULL CHECK(total_minor>=0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
  accepted_order_id TEXT UNIQUE REFERENCES orders(id), CHECK(expires_at>created_at)
);
CREATE INDEX checkout_quote_owner ON checkout_quote(customer_id,created_at DESC);
CREATE TABLE stock_reservation (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  state TEXT NOT NULL CHECK(state IN ('ACTIVE','CONSUMED','EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stock_reservation_due ON stock_reservation(expires_at) WHERE state='ACTIVE';
