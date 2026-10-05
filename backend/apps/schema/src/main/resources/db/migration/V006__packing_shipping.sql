CREATE TABLE parcel (
  id TEXT PRIMARY KEY REFERENCES shipment(id), order_id TEXT NOT NULL REFERENCES orders(id),
  weight_grams INTEGER NOT NULL CHECK(weight_grams BETWEEN 1 AND 30000),
  length_mm INTEGER NOT NULL CHECK(length_mm BETWEEN 1 AND 2000),
  width_mm INTEGER NOT NULL CHECK(width_mm BETWEEN 1 AND 2000),
  height_mm INTEGER NOT NULL CHECK(height_mm BETWEEN 1 AND 2000),
  actor_id TEXT NOT NULL REFERENCES customer(id), idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL,
  UNIQUE(order_id,idempotency_key)
);
CREATE TABLE parcel_line (
  parcel_id TEXT NOT NULL REFERENCES parcel(id), product_id TEXT NOT NULL REFERENCES product(id),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 100), PRIMARY KEY(parcel_id,product_id)
);
CREATE TABLE shipping_attempt (
  parcel_id TEXT PRIMARY KEY REFERENCES parcel(id), state TEXT NOT NULL CHECK(state IN ('RATING','PURCHASING','UNKNOWN','DOCUMENT_PENDING','BOOKED','FAILED')),
  request_token TEXT, rate_id TEXT, carrier_id TEXT, rate_snapshot JSONB,
  expires_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE shipment ADD COLUMN carrier_id TEXT;
ALTER TABLE shipment ADD COLUMN cancellation_state TEXT;
CREATE TABLE shipment_document (
  shipment_id TEXT PRIMARY KEY REFERENCES shipment(id), bucket_key TEXT NOT NULL, format TEXT NOT NULL
);
