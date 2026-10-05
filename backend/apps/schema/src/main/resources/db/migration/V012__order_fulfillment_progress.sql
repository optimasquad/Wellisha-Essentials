-- Derive the customer summary from saved parcel allocations, never stale order flags.
CREATE VIEW commerce.order_fulfillment_progress AS
WITH ordered AS (
  SELECT order_id,sum(quantity) AS units FROM commerce.order_line GROUP BY order_id
), parcels AS (
  SELECT s.order_id,array_agg(DISTINCT s.state) AS states,
    sum(l.quantity) AS allocated,
    COALESCE(sum(l.quantity) FILTER (WHERE s.state='DELIVERED'),0) AS delivered
  FROM commerce.shipment s JOIN commerce.parcel_line l ON l.parcel_id=s.id
  GROUP BY s.order_id
)
SELECT o.id,o.customer_id,o.total_minor,o.currency,o.payment_state,o.created_at,
  CASE
    WHEN o.payment_state!='CAPTURED' OR p.order_id IS NULL THEN o.fulfillment_state
    WHEN p.delivered=q.units THEN 'DELIVERED'
    WHEN p.states && ARRAY['DELIVERY_EXCEPTION','RETURN_TO_ORIGIN','BOOKING_UNKNOWN'] THEN 'DELIVERY_EXCEPTION'
    WHEN p.delivered>0 THEN 'PARTIALLY_DELIVERED'
    WHEN 'OUT_FOR_DELIVERY'=ANY(p.states) THEN 'OUT_FOR_DELIVERY'
    WHEN p.states && ARRAY['PICKED_UP','IN_TRANSIT'] THEN 'IN_TRANSIT'
    WHEN 'CANCELLED'=ANY(p.states) THEN 'SHIPMENT_CANCELLED'
    WHEN p.allocated=q.units AND p.states <@ ARRAY['LABEL_READY','AWAITING_PICKUP'] THEN 'AWAITING_PICKUP'
    ELSE 'PACKING'
  END AS fulfillment_state
FROM commerce.orders o LEFT JOIN ordered q ON q.order_id=o.id LEFT JOIN parcels p ON p.order_id=o.id;
