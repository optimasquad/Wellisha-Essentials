CREATE TABLE notification_contact (
  customer_id TEXT PRIMARY KEY REFERENCES customer(id),
  email TEXT, phone TEXT, email_enabled BOOLEAN NOT NULL DEFAULT false, sms_enabled BOOLEAN NOT NULL DEFAULT false,
  version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE notification_delivery (
  id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customer(id), order_id TEXT NOT NULL REFERENCES orders(id),
  event_id TEXT NOT NULL, channel TEXT NOT NULL CHECK(channel IN ('EMAIL','SMS')),
  destination TEXT NOT NULL, message TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(state IN ('PENDING','CALLING','SENT','UNKNOWN','FAILED')),
  provider_message_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id,event_id,channel)
);
