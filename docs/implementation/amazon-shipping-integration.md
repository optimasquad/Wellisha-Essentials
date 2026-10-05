# Amazon Shipping integration and architecture

Status: selected by the user on October 4, 2026. Design updated; API implementation and commercial onboarding are pending. This supersedes the earlier MCF assumption.

## Ownership and order lifecycle

Wellisha owns store inventory, picking, packing, parcel measurements and label printing. Amazon Shipping collects prepared parcels from the registered store and delivers them. [Amazon packaging guidance](https://shipping.amazon.in/blog/effective-packaging-and-labelling)

Verified Razorpay payment creates a store pick/pack task through the existing PostgreSQL transaction/outbox path. Staff completes packing, records actual weight/dimensions and package contents, and marks the package ready. That durable event triggers the Shipping ECS worker via its dedicated SQS queue. Payment alone must not purchase a shipment.

Use internal states: AWAITING_PACKING -> PACKED_READY -> BOOKING_PENDING -> LABEL_READY -> AWAITING_PICKUP -> PICKED_UP -> IN_TRANSIT -> DELIVERED. Track booking UNKNOWN/FAILED, pickup exceptions, delivery exceptions and RTO separately. A label is not evidence of collection or delivery. These are Wellisha states mapped from provider events, not invented Amazon API enums. Customer payment, carrier booking charges, cancellation and refunds have separate records.

## Amazon integration requirements

Enroll Wellisha with Amazon Shipping and register the store pickup address. For a direct off-Amazon integration, register the application with the Amazon Logistics role and obtain authorization/refresh credentials. Follow the hybrid-seller guide if Wellisha also sells on Amazon. API access does not require inventing an Amazon marketplace order for a Wellisha purchase. Arrange test-label approval and first shipping date with the account manager. [Direct onboarding guide](https://developer-docs.shipping.amazon.com/apis/docs/off-amazon-guide)

Use backend Login with Amazon access-token renewal, independent of customer Cognito login. Never expose carrier credentials to website/mobile clients. [Authorization model](https://developer-docs.shipping.amazon.com/apis/docs/authorizing-amazon-shipping-api)

## Shipping API v2 adapter

| Operation | Planned use |
| --- | --- |
| getRates | Validate serviceability and obtain carrier/service, charge and pickup/delivery windows for actual package/address |
| getAdditionalInputs | Supply required service-specific input when the selected rate requests it |
| purchaseShipment | Purchase the selected rate and store shipment/tracking identifiers plus documents |
| getShipmentDocuments | Retrieve/reprint an existing label without purchasing again |
| getTracking | Poll shipment event history and reconcile missed updates |
| cancelShipment | Staff-authorized shipment cancellation, subject to provider outcome and physical handover |

For India, configure the EU endpoint and explicit AmazonShipping_IN business header; Wellisha-origin orders use EXTERNAL channel. Rates expire after ten minutes: refresh before purchase if expired. Current purchase guidance permits one package per shipment; represent packages as a list and create separate shipments for split packages. Use a stable packageClientReferenceId without treating it as a provider idempotency guarantee. [Rate/purchase tutorial](https://developer-docs.shipping.amazon.com/apis/docs/tutorial-purchase-a-shipment-from-a-rate)

The document endpoint retrieves previously generated labels. [Document retrieval](https://developer-docs.shipping.amazon.com/apis/docs/tutorial-retrieve-previously-generated-shipment-documents)

Tracking uses the returned carrierId and trackingId. Persist normalized events locally; never call Amazon for every customer page view. [Tracking tutorial](https://developer-docs.shipping.amazon.com/apis/docs/tutorial-track-a-shipment)

cancelShipment acts on the purchased shipmentId; its successful response does not refund the customer's Razorpay payment. Treat cancellation as its own workflow, with handover races and manual resolution after pickup. Reverse-pickup/returns and shipping-charge credits require confirmation under Wellisha's India contract. [Cancellation API](https://developer-docs.shipping.amazon.com/apis/reference/cancelshipment)

## Reliability, security and data

Keep the independent wellisha-web, wellisha-api and wellisha-worker-fulfillment ECS services. The fulfillment worker now runs the Amazon Shipping adapter. PostgreSQL remains authoritative for inventory, packing, booking attempts and shipment state. Provider calls run outside DB locks. Store carrier labels/documents privately in S3 with encryption, retention and short-lived staff-authorized download links; no public CDN caching of labels, customer addresses or tracking details.

Add package, package_line, packing_task, shipping_quote, shipment_purchase_attempt and shipment_document records beside existing shipment/tracking tables. Record merchant package reference, selected rate/request token and expiry, actual dimensions/weight, pickup address/window, carrier/service IDs, shipment/tracking IDs, document key and state/version. Store provider secrets in AWS Secrets Manager and retrieve with the Shipping worker's least-privilege role. Tokens are bounded in-memory caches; redact PII/secrets from logs.

Staff APIs: POST /v1/staff/orders/{id}/packages; POST /v1/staff/packages/{id}/ready; GET /v1/staff/shipments/{id}/documents. Apply permissions, idempotency keys, current ownership/store allocation checks and optimistic version/lock guards. A packed-ready request returns 202 only after the state and outbox commit. Customer APIs expose only owned shipment status. Customers cannot book, download shipping labels or execute cancellations.

At most one active purchase attempt per package; serialize booking against cancellation. On an ambiguous purchase timeout, retain UNKNOWN and reconcile using the approved provider/account mechanism or manual Amazon Shipping portal review. Do not assume a reference search or purchase-idempotency API exists. Never automatically repurchase, switch carriers or mark cancelled while the original booking might exist. Bounded retries with backoff apply only where safe, respecting throttling. Add DLQs, replay audit and booking/pickup-age alerts.

## Tracking ingress and pickup operations

Amazon tracking push requires manual subscription setup through the account manager and an authenticated HTTPS receiver. Implement the authentication method agreed with Amazon; do not assume Razorpay-style HMAC signatures. Validate payload limits, account/shipment binding and replay/duplicate handling; acknowledge only after durable inbox storage. Process events asynchronously and reconcile with polling if push is unavailable. [Tracking push onboarding](https://developer-docs.shipping.amazon.com/apis/docs/track-a-shipment-push-notifications)

Staff prints/attaches the approved label and hands over the prepared parcel. Display returned pickup windows and alert on missed collection. Confirm the account's pickup/manifest process before implementing a separate scheduling endpoint. Do not invent an API operation for store packing or guaranteed pickup. If booking is blocked, the customer sees preparing shipment and staff sees an actionable exception.

## Implementation and launch gates

Extend P00 with carrier commercial onboarding, registered pickup/return addresses, serviceability, cutoff times, approved dimensions/units, pricing/tax inputs, cancellation, RTO, reverse pickup and label sign-off. Extend P09 with the adapter, staff packing endpoints/UI, private documents, tracking intake and reconciliation. P08 supplies queue/outbox foundations; P11 notification messages follow confirmed pickup/delivery events. P07 handles Razorpay payments; P13 delivers the [AWS deployment mechanism](aws-deployment-plan.md).

Checkout shows the approved delivery promise and shipping-price policy before payment. Where a live estimate is required, obtain it before checkout confirmation with a bounded request and failure policy; post-payment asynchronous booking cannot silently change the customer-paid total. Refresh a final provider rate using actual packed dimensions; Wellisha handles any approved cost difference.

Contract-test real India API examples and test labels before production. Mock tests alone cannot establish API access, pickup coverage or physical collection.

## Additional planned tests

S01: unpaid or unready parcel cannot trigger purchase.
S02: authorized packed-ready commits task/outbox once under repeated/concurrent requests.
S03: invalid measurements, unregistered origin or ineligible postcode are rejected.
S04: expired rates refresh; failed extra input never purchases.
S05: split packages produce distinct shipment references and no duplicated purchase.
S06: dropped purchase response enters UNKNOWN; retries cannot double-book.
S07: existing label reprints without purchase; customer cannot fetch label.
S08: denied/rotated LWA secrets and 401/429/provider faults recover safely.
S09: authenticated tracking inbox rejects forged/cross-account events and deduplicates delayed events.
S10: cancellation races booking/pickup; carrier cancellation never implies customer refund.
S11: pickup missed, delivery exception and RTO drive correct customer/staff statuses.
S12: staging onboarding, label approval and physical pickup-to-delivery smoke test.

## Published review

[19. Amazon Shipping - Store Pickup Integration](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685971754088)
