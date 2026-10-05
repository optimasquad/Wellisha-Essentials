# Customer fulfillment visibility and notifications

Status: required behavior added to the implementation plan; not implemented. “Message” is interpreted as the Wellisha website/mobile in-app inbox. WhatsApp is a separate channel requiring provider onboarding and customer consent.

## Saved fulfillment details

Customer GET /v1/orders/{id} and GET /v1/orders/{id}/tracking return only the authenticated customer's order. Include separate payment and fulfillment states, per-package item/quantity allocation, preparing/packed/pickup/transit/delivered status, carrier name (Amazon Shipping), tracking number/link when available, pickup confirmation, delivery estimate when available, event timeline, last update time, delivery exception/RTO status and contact-support action. Clearly label unavailable estimates or stale updates.

Persist shipment data in PostgreSQL from authenticated provider intake and reconciliation. Read the saved view, not an Amazon request on every page load. A label or purchased shipment means awaiting pickup, not shipped. Multi-package orders show each shipment independently. Do not expose carrier secrets, staff-only labels, internal notes, another customer's data or unrestricted proof-of-delivery documents.

Search/retrieve-my-order uses an authenticated account and ownership-scoped query. Order number or phone number alone cannot grant access. An assistant/chat interface must call the same authorized order API. Guest tracking, if introduced later, needs a separately reviewed verification/limited-access flow.

## Asynchronous customer updates

Commit a customer-visible shipment change and its outbox event atomically. Route events to separate SMS and email SQS queues/workers, plus a durable in-app notification record. Notification failure does not roll back an order, stall carrier booking or hide the saved order status.

Send appropriate updates for order/payment confirmation, shipment booked/awaiting pickup when useful, confirmed pickup/dispatch, important delivery exceptions, out-for-delivery if supplied, delivered and RTO/refund progress where relevant. Avoid notifying every raw carrier scan. Use normalized transitions and per-order/package/event/channel uniqueness; duplicate or delayed provider events cannot resend or regress messages.

Email uses SES; SMS uses AWS End User Messaging SMS. Confirm destination-country sender/template registration, account access, sending limits and applicable transactional messaging requirements before production. Obtain channel consent/preferences where applicable. Do not treat a provider-accepted SMS/email as proof of delivery: track delivery feedback where available.

Messages contain a minimal order reference, clear current status and a link to the authenticated Wellisha order page. Avoid sensitive product details in SMS/push previews. Never put tokens, full addresses or payment secrets in messages or URLs. Customer contact details come from validated order/account snapshots, not arbitrary request destinations.

For each channel, persist delivery attempt/provider ID/state; retry safe transient failures with bounded backoff, DLQ and audited replay. Capture bounce/complaint/invalid-number failures and suppress repeated sends where appropriate. Duplicate sends can still occur after an ambiguous external response unless the provider supports a safe retry mechanism; reconcile or record UNKNOWN instead of claiming exactly-once delivery.

## In-app inbox and acceptance checks

AWS references: [India SMS Entity/Template IDs](https://docs.aws.amazon.com/sms-voice/latest/userguide/registrations-sms-senderid-india-specify-ids.html) and [SES delivery/bounce/complaint feedback](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications.html).

Plan GET /v1/me/notifications and PATCH /v1/me/notifications/{id}/read, with ownership checks, bounded pagination and unread state. Notifications link to the owned order and do not replace the authoritative order timeline. Refresh order/inbox views with bounded polling initially; push/SSE can be added when justified.

Extend P09 shipment read models, P11 notifications and P12 customer UI. Verify cross-customer denial, split-package displays, honest pickup states, unavailable/stale estimates, SMS/email failure isolation, duplicate/out-of-order events, bounce/invalid-number handling, preference enforcement and authenticated order retrieval. Extend existing planned suites before implementation; this document does not claim tests have run.
