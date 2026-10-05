CREATE TABLE customer (
  id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(issuer,subject)
);
CREATE TABLE address (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customer(id),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120), phone TEXT NOT NULL,
  address_line TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL,
  pincode TEXT NOT NULL CHECK(pincode ~ '^[1-9][0-9]{5}$'),
  version BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX address_owner ON address(customer_id,created_at DESC);
CREATE TABLE product (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT NOT NULL UNIQUE,
  price_minor BIGINT NOT NULL CHECK(price_minor >= 0), stock INTEGER NOT NULL CHECK(stock >= 0),
  active BOOLEAN NOT NULL DEFAULT false, attributes JSONB NOT NULL DEFAULT '{"version":1}'
);
CREATE TABLE orders (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customer(id),
  total_minor BIGINT NOT NULL CHECK(total_minor >= 0), currency CHAR(3) NOT NULL,
  payment_state TEXT NOT NULL, fulfillment_state TEXT NOT NULL,
  address_snapshot JSONB NOT NULL, idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), version BIGINT NOT NULL DEFAULT 0,
  UNIQUE(customer_id,idempotency_key)
);
CREATE INDEX orders_owner ON orders(customer_id,created_at DESC);
CREATE TABLE order_line (
  order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL REFERENCES product(id),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100),
  total_minor BIGINT NOT NULL CHECK(total_minor>=0), PRIMARY KEY(order_id,product_id)
);
CREATE TABLE outbox (
  id TEXT PRIMARY KEY, aggregate_id TEXT NOT NULL, event_type TEXT NOT NULL,
  payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ, attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX outbox_pending ON outbox(created_at) WHERE dispatched_at IS NULL;
CREATE TABLE inbox (
  provider TEXT NOT NULL, event_id TEXT NOT NULL, payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ,
  PRIMARY KEY(provider,event_id)
);
CREATE TABLE consumer_receipt (
  consumer TEXT NOT NULL,event_id TEXT NOT NULL,processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(consumer,event_id)
);
CREATE TABLE shipment (
  id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),package_reference TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'AWAITING_PACKING',provider_shipment_id TEXT UNIQUE,tracking_id TEXT,
  estimated_delivery TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  label_key TEXT,version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE tracking_event (
  shipment_id TEXT NOT NULL REFERENCES shipment(id),event_id TEXT NOT NULL,state TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,PRIMARY KEY(shipment_id,event_id)
);
CREATE TABLE notification (
  id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customer(id),order_id TEXT NOT NULL REFERENCES orders(id),
  event_id TEXT NOT NULL,message TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),read_at TIMESTAMPTZ,
  UNIQUE(customer_id,event_id)
);
CREATE INDEX notification_owner ON notification(customer_id,created_at DESC);

