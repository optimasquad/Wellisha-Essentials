-- Poll scheduling must not overwrite the timestamp used for cancellation recovery.
ALTER TABLE commerce.shipment ADD COLUMN tracking_polled_at TIMESTAMPTZ;
