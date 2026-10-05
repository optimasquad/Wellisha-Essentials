# Wellisha Essentials - AWS Commerce Architecture

| Document field | Value |
| --- | --- |
| Status | Proposed; implementation and business decisions pending |
| Prepared | October 4, 2026 |
| Implementation plan | [Code plan](../implementation/code-plan.md) and [78 planned test cases](../implementation/test-cases.md); services and tests remain to be implemented |
| Code baseline | Current Next.js application; documentation commit `9cb0975`; local Prisma portability change exists separately |
| Primary region | Proposed `ap-south-1` (Mumbai), subject to service and account verification |
| Audience | Product, engineering, operations, fulfillment partners |
| Diagrams | Ten editable Miro diagrams; local `wellisha-aws.drawio` source has ten pages |

## 1. Recommendation and Scope

Confirmed backend choice: Kotlin + Spring Boot with PostgreSQL. Separate the existing Next.js user interface from the Kotlin commerce API. Deploy the web application, API, and Kotlin background workers independently on Amazon ECS with Fargate. Java 21 / Amazon Corretto 21 is the proposed JVM runtime; pin compatible supported Spring Boot and Kotlin releases during implementation. Use one PostgreSQL database with clear module ownership initially, managed by Amazon RDS, and Amazon ElastiCache for Valkey for catalog caching. Use a transactional outbox, Amazon EventBridge, and dedicated SQS queues for reliable asynchronous work.

The same versioned API serves the website and the initial Android/iOS applications. Retain the current web investment; use React Native with Expo as the proposed mobile direction after a proof of concept for authentication, Razorpay, deep links, and release builds. Share API contracts and business types, while keeping platform-specific presentation and token storage separate.

This is a design and migration proposal. The existing code has not yet gained these capabilities, and an architecture cannot guarantee zero bugs. Section 13 defines the verification required before release.

### Working Assumptions

- India-first sales, INR, physical products, and prepaid Razorpay checkout initially.
- Customers purchase on Wellisha. A contracted fulfillment provider delivers those orders.
- Confirmed: web, Android, and iOS applications are required together. Native login, checkout, delivery tracking, contact-support, and cancellation/refund status are initial-release scope.
- Confirmed: customers cannot cancel orders themselves. An authorized support agent handles cancellation requests, including any required manual provider workflow.
- Amazon Shipping is selected for pickup and delivery from the Wellisha store. Wellisha retains inventory and packs/labels parcels; commercial onboarding, registered pickup coverage and API access remain launch gates.
- Flipkart and Meesho are optional sales-channel integrations or outbound purchase links until external-order fulfillment is explicitly confirmed.
- Traffic, SKU count, order volume, budget, COD, warehouse arrangement, return policy, and support hours are not yet specified. Capacity targets below are proposals, not measured performance.

**Review comment - Product:** Direct Wellisha checkout and all three client platforms are confirmed. Confirm COD requirements, warehouse ownership, and the first fulfillment provider.

## 2. Current Code and Required Enhancements

Paths below are relative to `storefront/`. Findings are based on inspected handlers, not a full security audit.

| Current implementation | Consequence | Required change |
| --- | --- | --- |
| `app/page.tsx`, `app/products/page.tsx` query Prisma directly | Web rendering is coupled to the database | Move reads behind the commerce API; web has no DB credentials |
| `app/api/orders/create/route.ts:28` accepts a request discount amount | The browser can influence the amount charged | Price, discounts, tax, shipping, and eligibility computed on the server |
| The same order handler accepts `addressId` without an ownership query | Another user's address could be referenced | Load address by both ID and authenticated customer |
| `app/api/orders/verify/route.ts:46` updates an order by the submitted ID | Signature verification alone does not bind payment to the customer's stored order | Validate order ownership, stored provider order/payment IDs, captured status, amount, and currency |
| `app/api/cart/route.ts:132` and `:162` mutate by item ID alone | Authenticated users may target another cart's items | Scope every mutation to the authenticated cart/customer |
| Order creation has no atomic stock reservation | Concurrent checkouts can oversell | Database reservation transaction, expiry, and reconciliation |
| `lib/auth.ts:67` enables email-based account linking | Matching an email alone is insufficient proof to merge identities safely | Explicit, verified identity linking and stable internal customer IDs |
| Prisma monetary fields use `Float` | Rounding can affect totals | Store integer minor units with currency, or exact decimal with explicit conversion |
| Catalog price sorting currently sorts by `createdAt` | The selected sort does not match price order | Define effective variant-price ordering and test pagination |
| Queries can turn DB failures into empty catalogs | Users and monitoring cannot distinguish failure from no stock | Explicit degraded states, structured errors, health monitoring |
| No payment webhook, fulfillment, refund, or queue worker routes in the inspected route inventory | Browser callbacks and manual actions cannot provide durable order processing | Add verified inbox, state transitions, outbox, workers, and reconciliation |
| Package scripts lack automated tests; lint/framework versions differ | Regression detection is incomplete | Compatible supported dependency versions, locked installs, and release checks |

**Review comment - Engineering:** Fix payment integrity and resource ownership before opening production checkout. Run a complete review during implementation; this list is the starting point.

## 3. High-Level AWS Architecture

See the editable [01 AWS Architecture diagram](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685962793087) on Miro.

| Layer | Proposed service | Responsibility |
| --- | --- | --- |
| DNS and TLS | Route 53, ACM | Storefront, API, and auth domains; certificates appropriate to each service/region |
| Edge | CloudFront, AWS WAF | Static content delivery, request filtering, rate controls |
| Origin routing | Application Load Balancer | Route web and `/v1/*` API traffic to distinct ECS target groups; health checks |
| Web | ECS Fargate, separate web service | Next.js rendering and web session/BFF endpoints; no commerce rules or DB access |
| Backend | ECS Fargate, separate API service | Catalog, pricing, cart, checkout, orders, tracking, support cases, agent/admin actions, webhook intake |
| Async processing | ECS Fargate workers | Import, outbox dispatch, cache publication, payment, fulfillment, refund, notification jobs |
| Identity | Cognito user pool | Google, Microsoft OIDC, Apple, and optional local accounts |
| Durable data | RDS PostgreSQL Multi-AZ | Commerce records, reservations, inbox/outbox, jobs, and audit history |
| Cache | ElastiCache for Valkey | Versioned catalog views, short-lived read cache; never payment truth |
| Object storage | S3 | Product images, import source files, row-error reports, invoices; separate access policies |
| Media processing | Image worker, AWS Elemental MediaConvert | Approved responsive image variants, video encodes, and playback derivatives |
| Events and queues | EventBridge, SQS, per-queue DLQs | Fan-out and independent retries for each workflow |
| Scheduled work | EventBridge Scheduler | Catalog imports, reservation expiry, provider reconciliation, stale-job detection |
| Email | Amazon SES | Transactional messages and delivery feedback |
| SMS | AWS End User Messaging SMS | Transactional SMS using registered sender/template configuration |
| Operations | CloudWatch, OpenTelemetry, CloudTrail | Metrics, tracing, logs, audit, alerts |
| Secrets and encryption | Secrets Manager, KMS, IAM | Provider secrets, scoped task roles, encrypted storage and queues |
| Delivery | AWS CodePipeline / CodeBuild, ECR, AWS CDK | Tested container builds and repeatable infrastructure deployments |

Deploy production web/API tasks across at least two Availability Zones, with a minimum of two tasks for each serving service. Use separate worker services by queue when independent scaling or isolation is needed; they may share a codebase. Start with modules within one commerce API, rather than independently deployed services for every domain. ECS supports target-tracking scaling; database and cache capacity still require their own planning. [AWS ECS scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html)

Place ECS tasks, RDS, and cache in private subnets. Use a public ALB restricted to CloudFront origin traffic with an origin verification header and network restrictions; route partner webhooks through the edge without browser challenge rules. Use authenticated service-to-service requests for the web BFF. Add per-AZ outbound egress for provider calls and VPC endpoints where useful. RDS Multi-AZ protects against an AZ failure; it is not a cross-region recovery plan. [RDS Multi-AZ](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)

Cache hashed static assets and public images at CloudFront. Initially disable CDN caching for API responses and personalized HTML, including cart, account, checkout, admin, and webhooks. Catalog caching is controlled in the API/Valkey layer so invalidation is unambiguous. Use `no-store` on personalized responses and forward auth headers/cookies correctly.

**Review comment - Operations:** Confirm region, monthly budget, on-call coverage, and expected traffic before selecting task sizes, database class, cache topology, and backup retention.

## 4. Code Separation and API Contracts

Proposed future repository structure; these directories are not implemented by this proposal:

```text
apps/web/                 Next.js storefront and staff/agent console
apps/mobile/              React Native/Expo Android and iOS clients
services/commerce-api/    Kotlin + Spring Boot API, domain modules, authorization
services/workers/         Kotlin + Spring Boot queue consumers and outbox relay
packages/contracts/      OpenAPI spec, schemas, generated client SDK
packages/domain/         Backend-only rules and value objects
packages/database/       Flyway SQL migrations, Kotlin repositories, PostgreSQL models
packages/observability/  Structured telemetry helpers
infra/cdk/               AWS stacks per environment
docs/architecture/       Architecture and decision records
```

Use REST JSON under `/v1`, cursor pagination, stable error codes, correlation IDs, ISO-8601 UTC timestamps, and currency plus integer minor units. Use Kotlin + Spring Boot and Spring Security for the API; avoid coupling domain logic to Next.js request objects. Validate Cognito access tokens, enforce ownership and permissions at each operation, and generate TypeScript/mobile clients from OpenAPI with compatibility checks in CI. Configure Kotlin Spring support and strict nullability checks; pin tested dependencies. [Spring Boot Kotlin support](https://docs.spring.io/spring-boot/reference/features/kotlin.html)

| Contract | Expected behavior |
| --- | --- |
| `GET /v1/products`, `/products/{slug}` | Versioned public catalog; predictable filters and price sorting |
| `POST /v1/admin/catalog-imports` | Validate source reference; return `202` with job ID |
| `GET /v1/admin/jobs/{id}` | Progress, accepted/rejected rows, effective time, cache-publication status |
| `POST /v1/checkout/quotes` | Authoritative totals and short-lived quote version |
| `POST /v1/orders` | Idempotency key required; revalidate quote and reserve stock |
| `GET /v1/orders/{id}` | Owner/admin only; separate payment and shipment progress |
| `GET /v1/orders/{id}/tracking` | Owner/admin access; shipment timelines, provider ETA, tracking number, last update |
| `POST /v1/orders/{id}/support-cases` | Owner creates a support request; no cancellation, refund, or shipment mutation |
| `GET /v1/support-cases/{id}` | Owner or assigned/authorized support staff reads progress |
| `POST /v1/agent/orders/{id}/cancellations` | Authorized agent only, case ID + reason + idempotency key; `202` means pending |
| `GET /v1/orders/{id}/cancellations/{requestId}` | Owner may read agent-initiated cancellation/refund status; cannot execute it |
| `POST /v1/agent/orders/{id}/manual-actions` | Agent records provider-portal action/evidence for verification; does not directly mark an order refunded |
| `POST /v1/webhooks/{provider}` | Verify signature, persist inbox, acknowledge after durable acceptance |

Web uses a BFF session with Secure, HttpOnly, SameSite cookies, CSRF defenses, and server-side token handling. Mobile uses bearer access tokens stored with platform secure storage. Both call the same business API. Offline mobile browsing may show previously cached products; checkout always requires an online quote. Maintain backward-compatible API behavior while older app versions remain supported.

## 5. Login and Identity

See the editable [02 Federated Login diagram](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685962793411) on Miro.

Use Cognito as the common issuer for commerce API access tokens. Configure Google and Apple federation and Microsoft through OIDC. Additional providers require an actual supported federation integration, application registration, and approved redirect URIs; arbitrary websites cannot be used as identity providers. [Cognito federation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html)

For Microsoft, distinguish personal Outlook/Hotmail accounts from work/school accounts. The Microsoft application audience and issuer configuration must match the intended accounts. Test personal and organization tenants end to end with Cognito; do not assume a tenant-independent metadata URL alone guarantees issuer compatibility. [Microsoft OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc), [Cognito OIDC setup](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html)

Use authorization code flow with PKCE, state and nonce, exact callback allowlists, and the system browser on native apps. The API checks access-token issuer, signature, expiry, `token_use`, app client/audience as applicable, and scopes; it then applies current server-owned roles and resource ownership. Never treat an ID token as an API access token. Staff use MFA and privileged operations check current authorization rather than trusting a stale UI role.

Store an internal `Customer` ID and a unique mapping to `(issuer, subject)`. Migrate existing accounts and order ownership explicitly. Existing bcrypt passwords need a tested migration mechanism or password reset; copying hashes into Cognito is not assumed. Account linking requires proof of control of both identities, and migration must handle duplicate emails and Apple private-relay addresses.

Include Sign in with Apple in the proposed native login set and verify release compliance against Apple's login-services requirements. Provide account deletion and define what commerce records must be retained. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Review comment - Product/Identity:** Confirm personal Microsoft accounts only versus work/school access, guest checkout, and the account-migration experience.

## 6. Asynchronous Product and Price Updates

See the editable [03 Catalog Publication diagram](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685962793507) on Miro.

### Ingestion and Publication

1. An authorized admin uploads CSV/JSON to a restricted S3 import prefix, or Scheduler starts an approved source sync. S3/EventBridge notifications enqueue an import job; all entry paths converge on a persisted `ImportJob` identity.
2. The worker validates schema, SKU mapping, currency, amount bounds, sale dates, inventory source, and duplicate records. Use `(source, sourceVersion, SKU)` uniqueness and optimistic version checks. Retain a row-error report in S3.
3. Write valid changes to staging. For coherent bulk price changes, activate a staged catalog release only after validation succeeds. Bound transactions by release/chunk design; do not hold a transaction across an entire large file or external API call. A release uses immutable price rows and an atomic active-version pointer.
4. The activation transaction writes prices/product visibility and an outbox event together. Scheduled releases activate at the stored UTC effective time. Prefer an all-or-nothing release for related promotions; report item-level failures for independent inventory updates.
5. The outbox relay publishes committed events to EventBridge, checks per-entry results, and marks only successful entries as published. Crashes may cause redelivery. EventBridge routes `CatalogPublished` to the cache queue and optional channel-sync queues.
6. The cache worker builds immutable keys such as `catalog:{release}:{queryHash}` and `product:{sku}:{version}`, verifies the release is complete, and switches the active cache pointer atomically only to a newer valid generation. A stale worker cannot roll the pointer backward.
7. Record source ingestion, DB activation, and cache publication separately. An admin sees `CACHE_PENDING` until the visible catalog is refreshed. Retain old releases for rollback; rollback publishes a new, higher generation pointing to approved data.

The outbox prevents a committed business change from losing its event due to a failed queue publish. Delivery is at least once; every consumer still needs persistent deduplication and version checks. [AWS transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

### Consistency Rules

- PostgreSQL is authoritative. Cache loss must be recoverable by rebuilding from the active database release.
- Proposed browse cache TTL is 60 seconds, with jitter, short negative caching, and request coalescing. Catalog version checks, keys, and collection results must all participate in invalidation; updating a product key alone does not update listings or price-sorted pages.
- Target cache publication within 60 seconds of release activation under the agreed load. A DB/cache version mismatch or excessive lag bypasses stale cache for the affected release and raises an alert. Bound fallback traffic to avoid overwhelming PostgreSQL.
- Catalog activation, visibility, and reprice behavior are explicit. Disabled products and unavailable variants are rejected by authoritative checkout even if an old browser tab displays them.
- A quote expires after a proposed five minutes, but is revalidated when the order is created. A changed price returns `409 PRICE_CHANGED` with a new quote for customer acceptance. Existing paid orders retain immutable item/price snapshots.
- Cache failure degrades browsing to a rate-limited DB-backed path; database failure prevents new orders. Never accept checkout using stale cached totals.
- External marketplace prices and inventory are separate channel records with sync status. Channel update failure does not rewrite the Wellisha price silently.

**Review comment - Merchandising:** Identify the authoritative catalog source, update frequency, bulk-release rules, and who may approve price changes.

## 7. Checkout and Payment Integrity

See the editable [04 Checkout and Fulfillment diagram](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685962793588) on Miro.

1. API validates customer/address ownership, product availability, serviceable destination, current variant price, discount eligibility, tax, and shipping. The client supplies item intent and a coupon code, never a trusted discount amount.
2. In a short PostgreSQL transaction, lock/check inventory, create an expiring reservation, record a pending order with immutable item/address/price snapshots, and store an idempotent payment attempt plus outbox work. Enforce unique idempotency keys scoped to customer and operation, including a hash of request parameters.
3. Create the Razorpay order outside the database transaction. Store the provider order ID before presenting checkout. If the provider response is ambiguous, mark the attempt `UNKNOWN` and reconcile before retrying; do not assume the provider receipt field provides idempotency. Return `202` with a pollable order when payment setup is still pending.
4. The client completes Razorpay checkout. Its callback may trigger a server-side status check, but durable verified provider evidence drives the paid transition.
5. Verify webhook signatures over raw request bytes, use the dedicated webhook secret, enforce body limits, and persist a unique inbox event before returning success. A worker checks stored provider identifiers, captured amount/currency, and the allowed transition. Duplicates and out-of-order events are normal. [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/)
6. In one transaction, transition the matching order to paid once, consume the reservation/discount allocation once, mark the inbox processed, and append `OrderPaid` to the outbox. Remove only the purchased cart lines/quantities, preserving later cart additions.
7. Store pick/pack tasks consume `OrderPaid` independently of notifications; Amazon Shipping purchase follows staff `PackagePackedReady`, not payment alone. Use a deterministic merchant fulfillment ID and a recorded integration attempt. For a timeout, query the provider before retrying creation.
8. A scheduled reconciler checks stuck payment attempts, missing webhooks, expired reservations, and paid-but-unfulfilled orders. A late payment after reservation expiry triggers a fresh stock check or compensation/refund; it must not silently oversell.

Do not keep database locks open during network requests. Reserve coupon capacity during checkout and release it on expiry; permanently count usage at the agreed successful-payment state. Use exact arithmetic, explicit rounding rules, and totals bounded at zero. Never log payment secrets or full personal data.

## 8. Fulfillment and Marketplace Boundaries

| Integration | Supported design role | Gate before implementation |
| --- | --- | --- |
| Amazon Shipping | Collect Wellisha-packed parcels from its registered store and deliver website orders | Confirm Shipping account/API authorization, pickup/return addresses, serviceability, label approval, cutoffs, tracking push and cancellation/returns terms |
| Flipkart seller APIs | Synchronize listings and manage orders originating on Flipkart | Seller/developer access, channel SKU mapping, order-notification setup, and tested cancellation rules |
| Meesho | Optional channel integration or marketplace purchase link | Obtain current official partner API contract and access; external-order fulfillment remains unverified |
| Contracted 3PL / delivery provider | Fulfill Wellisha-origin orders | Distinguish warehousing/pick-pack from parcel delivery; confirm API, pickup locations, serviceability, tracking, cancellation, and return support |
| Marketplace redirect | Customer completes payment and order management on that marketplace | Approved product links; clear checkout ownership and no second Wellisha payment |

Amazon Shipping API v2 is the selected integration. Staff packs and marks parcels ready; a worker obtains rates, purchases shipments, stores labels and updates tracking. [Shipping integration plan](../implementation/amazon-shipping-integration.md) supersedes the earlier MCF assumption.

Flipkart's API is explicitly a seller integration with its marketplace. Its documented order lifecycle does not by itself establish a generic delivery service for Wellisha checkout. [Flipkart seller APIs](https://seller.flipkart.com/api-docs/FMSAPI.html), [Order management](https://seller.flipkart.com/api-docs/order-api-docs/OMAPIOverview.html)

The public Meesho material located describes fulfillment of Meesho orders. No verified public contract for creating externally paid Wellisha orders was established during this research. Keep that connector disabled until confirmed; do not scrape or automate consumer checkout. [Meesho company disclosure](https://investor.meesho.com/investor-web/_next/docs/ipo/meesho-udhrp1.pdf)

Define provider adapters with capabilities: `quote/serviceability`, `createFulfillment`, `getStatus`, `requestCancellation`, `createReturn`, and `reconcile`. A provider may not support every capability. Track provider SKU, order ID, shipment IDs, per-line quantities, tracking events, and raw-to-internal status mappings. Expect split shipments, partial fulfillment, return-to-origin, and asynchronous cancellation acknowledgement.

Do not switch providers after an ambiguous create result until reconciliation proves the first provider did not accept it. Allocate inventory by channel and reconcile physical stock; selling the same units through multiple channels needs shared reservations or conservative safety stock.

**Review comment - Commercial/Logistics:** Obtain the first provider's sandbox credentials and contract. Confirm packaging, inventory custody, dispatch cutoffs, partial cancellation, returns, RTO, and customer-support ownership.

## 9. Agent-Only Cancellations, Returns, and Refunds

See the editable [05 Agent Cancellation and Refund diagram](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685962793711) on Miro.

Customers see **Track delivery** and **Contact support** on web, Android, and iOS. There is no Cancel button or self-service cancellation API. Customer credentials must receive `403` for agent cancellation operations even when the customer owns the order. Support-case creation cannot automatically cancel, stop fulfillment, or initiate a refund. The same boundary applies to customer-facing chatbots and automated support channels.

The agent handles the request through a staff console after verifying the customer and order, checking shipment state and policy, and recording a case ID and reason. Use scoped permissions such as `support:read`, `order:cancel`, and `refund:request`, with MFA, current server-side role checks, assignment/access rules, and finance approval for agreed thresholds. Read-only support staff cannot cancel orders. Log actor, reason, timestamps, previous/new state, provider reference, and approval evidence.

Here, manual/offline cancellation means a support interaction or authorized provider-portal action outside the customer checkout UI. If the provider requires a portal, the agent records the external reference in the case; a worker or authorized reconciliation action verifies provider state before updating cancellation/refund results. Do not edit database rows or accept an unverified screenshot as proof that money was returned. If the agent console is unavailable, retain a controlled case record and reconcile it when service resumes.

Use separate state fields for the order, payment, fulfillment, cancellation request, and refund. Avoid a single status that implies both delivery cancellation and money returned.

| Situation | Required behavior |
| --- | --- |
| Agent-approved unpaid cancellation, no external fulfillment | Cancel atomically, release reservation, and watch for a late capture |
| Paid, fulfillment not submitted | Serialize cancellation against submission; stop dispatch and create refund work |
| Provider accepted, shipment not handed over | Record `CANCEL_REQUESTED`; call provider asynchronously and reconcile its final response |
| Provider rejects or shipment already dispatched | Report cancellation unavailable; offer a return/RTO process according to policy |
| Split shipment or partial cancellation | Evaluate each line and shipped quantity; calculate proportional refund and fees from stored snapshots |
| Provider cancellation confirmed | Record canceled quantities; adjust reservations/stock according to actual inventory disposition; enqueue refund |
| Refund accepted by gateway | Show `REFUND_PENDING` until verified completion; handle failure and reconciliation |

Use a per-order transactional lock/version to serialize an agent-approved cancellation with fulfillment submission. Merely opening a support case does not set cancellation intent. Workers re-read the desired state before external actions. A durable `SUBMITTING` attempt counts as possibly accepted: if cancellation races an in-flight submission, reconcile and then cancel with the provider instead of assuming that no shipment exists. No distributed transaction spans PostgreSQL, the fulfillment provider, and Razorpay.

Deduplicate refund intents; the cumulative refund must not exceed the captured amount minus completed/pending refunds. For an ambiguous refund API response, reconcile before sending another request. Return `202` plus a request ID to the agent console for cancellation, and notify the customer of acceptance/rejection separately from refund completion. A support request or agent submission is not a guarantee of cancellation. Amazon exposes cancellation as a provider operation whose result must be checked. [Amazon Shipping cancellation API](https://developer-docs.shipping.amazon.com/apis/reference/cancelshipment)

System-managed expiry of unpaid orders and payment-failure compensation remain automated technical workflows. These do not give customers a cancellation capability. Agree their business rules explicitly and record the system actor in the audit trail.

**Review comment - Support/Finance:** Agent-only cancellation is confirmed. Approve contact channels and staffed hours, response SLA, verification script, cancellation cutoff, refund approval limits, partial-shipment rules, shipping-fee treatment, and return eligibility for hygiene products.

### 9.1 Customer Delivery Tracking

See the editable [07 Delivery Tracking diagram](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685962839954) on Miro.

Expose a common order timeline on all three clients: payment confirmed, processing, packed, shipped, out for delivery, delivered, delayed/exception, or return-to-origin as applicable. Show each shipment separately for split orders, the carrier and tracking number, provider-supplied ETA, last-updated time, and a support link. Show agent cancellation and refund progress separately from the shipping timeline. Do not invent a delivery date or live location when the provider does not supply it.

Signed provider webhooks enter the API inbox and are processed asynchronously into normalized `TrackingEvent` and `Shipment` records. Deduplicate provider events and apply the provider-specific state machine so delayed messages cannot regress a delivered shipment; subsequent return events are a separate valid flow. Where signed webhooks are unavailable, use authenticated server-side polling and reconcile provider state on a schedule. Record event time and received time separately.

Clients read an owner-authorized tracking endpoint; use short foreground polling with ETags (initial proposal: 30-60 seconds), refresh on app resume, and back off when unchanged or offline. The endpoint reads durable tracking state, not a direct carrier call for each customer refresh. Label stale data with its last update and offer support. Optional push/deep-link notifications can refresh the view but never replace authenticated API state.

Carrier tracking links must come from approved provider domains. No public endpoint exposes a customer's address or order history based only on an order number; unauthenticated tracking, if later required, needs a scoped expiring signed link and separate review. Tracking failures do not remove the order or create cancellation rights.

## 10. Asynchronous Email and SMS

See the editable [06 Notifications diagram](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685962793844) on Miro.

Business transactions append notification-relevant events to the outbox. EventBridge routes them to independent email and SMS queues. Workers resolve customer preferences and approved templates, record a unique `(eventId, recipientId, channel, templateVersion)` delivery intent, send through SES or AWS End User Messaging SMS, and persist the provider message ID.

Use separate queue retry policies, bounded exponential backoff with jitter, visibility-timeout extension for long tasks, and a DLQ for exhausted messages. Retry transient errors; permanent invalid-recipient/template errors require correction. A duplicate event does not create a new logical notification. An ambiguous external send may still create a duplicate because delivery is not end-to-end exactly once; record the uncertain attempt, reconcile when possible, and choose a documented retry policy.

SES requires verified sending identities and production access for unrestricted recipient sending. Configure DKIM, SPF/DMARC, bounce/complaint processing, and suppression. Process provider delivery outcomes asynchronously rather than treating send acceptance as delivery. [SES production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)

For Indian SMS local routes, provision the sender, principal entity and approved templates and include the required entity/template IDs. Verify the selected AWS region and registered route. Keep order notifications and marketing consent separate. [AWS India sender registration](https://docs.aws.amazon.com/sms-voice/latest/userguide/registrations-sms-senderid-india-support.html), [India message parameters](https://docs.aws.amazon.com/sms-voice/latest/userguide/registrations-sms-senderid-india-specify-ids.html)

Use SES and AWS End User Messaging directly in this new design. AWS has announced Amazon Pinpoint end of support on October 30, 2026; its messaging channel APIs continue under AWS End User Messaging. [AWS service transition](https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html)

Proposed events include `OrderPaid`, `ShipmentDispatched`, `DeliveryConfirmed`, `CancellationAccepted`, `CancellationRejected`, `RefundCompleted`, and `RefundFailed`. A notification outage must not undo a paid order or block fulfillment. Redact product detail from notification previews when appropriate to the product's privacy sensitivity.

## 11. Data Ownership and Event Contracts

| Domain | Key records |
| --- | --- |
| Identity/customer | Customer, ExternalIdentity, Address, Consent, role/audit records |
| Catalog/pricing | Product, Variant, PriceVersion, CatalogRelease, ChannelListing, ImportJob |
| Stock | InventoryBalance, StockReservation, ReservationLine, InventoryAdjustment |
| Commerce | Cart, Quote, Order, immutable OrderLine and AddressSnapshot |
| Payment | PaymentAttempt, ProviderPayment, RefundIntent, RefundAttempt |
| Fulfillment/support | FulfillmentRequest, Shipment, ShipmentLine, TrackingEvent, SupportCase, AgentAction, CancellationRequest, ReturnRequest |
| Reliability | OutboxEvent, InboxEvent, ConsumerReceipt, IntegrationAttempt, NotificationDelivery |

Modules own their writes and expose operations to other modules. A single PostgreSQL deployment initially simplifies local ACID transactions; independent databases can follow when team ownership or scale justifies them. Share OpenAPI DTO contracts with clients, never persistence entities or database access.

### PostgreSQL Flexibility and Safe Evolution

Confirmed: PostgreSQL is the authoritative store. Keep core order, stock, money, payment, ownership and state fields in typed relational columns with foreign keys, unique constraints and checks. Use exact money representation, short transactions and optimistic versions or explicit row locks for competing transitions.

Use validated, versioned JSONB for optional product attributes and provider-specific metadata. Define allowed fields and size limits; apply targeted GIN/expression indexes only for real query patterns. Promote frequently queried business-critical attributes into typed columns. JSONB is an extension point, not a replacement for core constraints. [PostgreSQL JSONB](https://www.postgresql.org/docs/17/datatype-json.html)

Organize tables and repositories by domain (catalog, commerce, payments, fulfillment and reliability). Separate schemas may clarify ownership, but do not replace API authorization or database privileges. Keep integrations behind provider interfaces so adding a partner does not require rewriting order logic.

Use Flyway SQL migrations in a single controlled deployment job, rather than every autoscaling API task. Apply expand-and-contract changes: add compatible fields, backfill in bounded batches, switch readers/writers, and remove old fields only after the rollback window. Keep Hibernate automatic schema mutation disabled in production if JPA is introduced. Rehearse migration locking, rollback compatibility and point-in-time restore. [Spring database migrations](https://docs.spring.io/spring-boot/how-to/data-initialization.html)

Keep persistence behind Kotlin repositories. Parameterize query values and allowlist dynamic filters/sorts. Use explicit SQL for complex reporting or JSONB queries when useful, bound pagination, and inspect query plans under realistic load. Tune indexes and connection pools before introducing partitioning or read replicas; replicas must not decide stock or payment correctness.

S3 holds media, invoice PDFs, imports and large payloads. PostgreSQL stores searchable metadata and object references. Customer documents remain private with scoped access. Spring Security, customer ownership checks, staff MFA, least-privilege DB roles and audited mutations remain required throughout schema evolution.

See [13. Kotlin Backend and PostgreSQL Flexibility](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685968990781) for the agreed stack and data extension strategy. These are architecture decisions; backend implementation remains pending.

```json
{
  "eventId": "unique-event-id",
  "eventType": "OrderPaid",
  "schemaVersion": 1,
  "aggregateType": "Order",
  "aggregateId": "order-id",
  "aggregateVersion": 4,
  "occurredAt": "2026-10-04T06:00:00Z",
  "correlationId": "request-id",
  "data": { "orderId": "order-id" }
}
```

Put identifiers and the minimum necessary business facts in events; workers obtain authorized details from owned repositories. Do not broadcast full addresses or credentials. Use unique `(consumerName, eventId)` receipts recorded transactionally with internal effects; external effects additionally require durable integration-attempt state and provider reconciliation. Out-of-order events must not regress aggregate state. Standard SQS queues are the default; use FIFO only where its ordering properties are necessary, while retaining durable application idempotency.

## 12. Reliability, Security, and Operations

Proposed service objectives, to be validated against budget and load:

| Measure | Initial target / validation |
| --- | --- |
| Serving availability | 99.9% monthly for owned web/API; measure provider-caused failures separately as well as end-user success |
| Catalog reads | p95 API latency below 300 ms at agreed load, excluding client network |
| Checkout API | p95 owned processing below 1 second; external payment/setup may remain pending |
| Cache freshness | 99% of accepted releases published within 60 seconds of activation |
| Notifications | 99% submitted to provider within 60 seconds; delivery time is provider-dependent |
| AZ failure | Automatic service/DB failover, verified by a staged exercise |
| Database recovery | Proposed RPO <= 5 minutes and RTO <= 60 minutes for the tested recovery scenario |
| Regional disaster | Separate recovery exercise using cross-region backup copies; copy lag defines a different RPO, not the five-minute local target |

Instrument checkout conversion, payment mismatches, outbox age, oldest queue message, DLQ count, failed imports, cache-version lag, reservation expiry, fulfillment delay, refund age, SMS errors, and email bounces. Correlate request, order, payment attempt, event, and provider IDs without recording secrets or unnecessary PII.

Use managed secrets, least-privilege task roles, TLS, encrypted stores, DB/cache security groups, scoped presigned S3 URLs, import size/type limits, and an admin audit trail. Verify webhook signatures even when requests pass WAF. Apply abuse controls without blocking legitimate provider retries. Back up PostgreSQL with point-in-time recovery and exercise restore; enable object versioning/lifecycle as appropriate. Restrict and audit DLQ replay.

Provider outages trigger timeouts, circuit breakers, retry budgets, and visible pending states. API readiness reflects required dependencies; liveness does not restart healthy processes merely because a provider is down. A cache outage can degrade reads; a DB outage must fail order creation safely. Define an operator runbook for reconciliation, DLQ repair/replay, catalog rollback, refunds, and restore.

Costs depend on persistent Fargate tasks, RDS Multi-AZ, cache redundancy, ALB/NAT, data transfer, logs, and messaging volume. Prepare an AWS calculator estimate once traffic, database size, and availability targets are agreed; no defensible monthly price is available from current inputs. Consider lower non-production capacity with synthetic data. Add budgets and cost allocation tags.

## 13. Quality Gates and Platform Compatibility

| Test layer | Required scenarios |
| --- | --- |
| Unit/property tests | Money rounding, coupon limits, refund bounds, allowed state transitions |
| API authorization | Cross-customer cart/address/order/tracking access, role revocation, invalid/expired tokens, customer forbidden from every agent cancellation/refund operation |
| Database integration | Concurrent last-item checkout, reservation expiry, atomic outbox writes, duplicate event delivery |
| Catalog integration | Invalid import rows, older versions, activation failure, cache outage, rollback, sorted pagination |
| Provider contract tests | Signed/invalid webhooks, duplicates, out-of-order events, timeout after provider acceptance, rate limiting |
| End-to-end web | Google/Microsoft login, listing, cart, repricing, payment, split-shipment tracking, contact support, agent cancellation, refund progress |
| Mobile | Android and iOS physical-device tests for login redirects, secure storage, Razorpay, tracking, support, deep links, poor connectivity, process restart, and absence of customer cancellation actions |
| Browser/accessibility | Chrome, Safari/WebKit, Firefox, Edge; small screens, keyboard navigation, labels, screen readers, touch targets |
| Resilience/load | Cache loss, DB failover, worker crash, provider outage, notification outage, bursts during a price release |
| Release checks | Typecheck, lint, tests, dependency/secrets/container scanning, migration rehearsal, rollback and restore evidence |

Use Playwright for browser workflows and a native test tool such as Maestro or Detox for mobile after validating the chosen stack. Pin tested framework versions and a lockfile; the current Next.js, ESLint, and related dependency set must be reviewed before migration. Compatibility is demonstrated with release builds and device testing, not implied by shared TypeScript.

Define release acceptance as no unresolved critical/high security or payment-integrity defects, passing critical journeys, and demonstrated recovery. This is a measurable standard; it does not claim the system will have no bugs.

## 14. Deployment and Migration Stages

| Stage | Deliverable | Exit condition |
| --- | --- | --- |
| 0. Integration discovery | Provider commercial/API access, login POC, volume/budget assumptions | Direct checkout confirmed; provider selected; sandbox tracking and agent cancellation demonstrated |
| 1. Stabilize current checkout | Ownership, totals, payment binding, stock reservations, tests | Critical integrity scenarios pass in staging |
| 2. Extract API | Shared OpenAPI contract; web switched from Prisma to API | Web and an independent client pass the same commerce flows |
| 3. AWS foundation | CDK, separate accounts/environments, VPC, ECS, RDS, cache, secrets, CI/CD | Repeatable deployment and restore; production has no test secrets |
| 4. Catalog pipeline | Imports, versioned pricing, outbox, cache workers, admin job UI | Price changes, failed imports, and cache recovery proven |
| 5. Commerce automation | Webhook inbox, fulfillment adapter, tracking, support console, agent cancellation/refund, reconciliation | Sandbox purchase through tracking/support/agent-cancel/refund, including ambiguous outcomes and denied customer mutations |
| 6. Communications and identity | SES/SMS readiness, Cognito federation, existing-user migration | Delivery outcomes and identity migration tested with real test accounts |
| 7. Client readiness and rollout | Web, Android, and iOS released together; mobile development starts alongside API extraction | Device/browser gates, store release readiness, canary monitoring, rollback rehearsal, business acceptance |

Use CodePipeline/CodeBuild service roles and scoped cross-account deployment roles, ECR image digests, and CDK reviewed change sets. Deploy web/API/workers independently. Apply expand-and-contract database migrations before switching writers; never run migrations from every autoscaling task. Use feature flags and a limited canary rollout for checkout/provider changes. Old and new code must not both execute side effects for the same order. Rollback must retain pending jobs and keep event schemas compatible.

## 15. Decisions and Confluence Review Comments

| ID | Proposed decision / open question | Reviewer |
| --- | --- | --- |
| D01 | Confirmed by user: direct Wellisha checkout, with contracted fulfillment | Product and Commercial |
| D02 | Separate Next.js web, commerce API, and workers on ECS Fargate | Engineering and Operations |
| D03 | PostgreSQL authoritative; asynchronous versioned cache publication | Engineering and Merchandising |
| D04 | Cognito with Google/Microsoft/Apple; verified account linking | Identity and Product |
| D05 | Razorpay retained; durable webhook confirmation and refunds | Finance and Engineering |
| D06 | Amazon Shipping selected; Wellisha stores/packs; Flipkart/Meesho channel support conditional | Logistics and Commercial |
| D07 | Confirmed by user: web, Android, and iOS together; native apps share API contracts | Product |
| D08 | Mumbai region, 99.9% proposed SLO, capacity/cost pending | Operations |
| D09 | Confirmed by user: customer delivery tracking and contact support; cancellation execution restricted to authorized agents | Support and Engineering |
| Q01 | What daily/peak orders, SKUs, traffic, and catalog update frequency? | Product |
| Q02 | Who owns stock and packing, and what are cancellation/return rules? | Logistics |
| Q03 | Which personal/organization Microsoft accounts and existing users must migrate? | Identity |
| Q04 | Resolved: existing Architecture Design document in the Wellisha Essentials space; editable diagrams on the linked Miro board | Documentation owner |

Suggested inline review comments: "Confirm the owner and target date for this decision"; "Attach provider evidence or sandbox results here"; "Record the accepted failure behavior and customer message"; "Link the test evidence before approving release".

Reference material is linked beside the claims it supports and collected in `sources.md` for reviewers. Reconfirm provider capabilities, service availability, and policies at implementation time.

## 16. Product Images and Video

See the editable [10 Product Media Publication diagram](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685962840063) on Miro. Source material was supplied under `F:\Idea Projects\Images and Videos`: one product-art close-up, one full carton dieline, and one 70-second 1080p H.264 video. Two packaging mockups have been generated locally: a square packshot and a wide banner. They preserve the visible 15-pad, 320 mm XXL product direction and need final brand/label review. See `docs/media/README.md` for provenance and `docs/media/prompts.md` for the exact generation prompts.

Use an S3 master prefix to retain originals and review masters. An object-created event triggers an idempotent media job keyed by asset ID and source version. Validate actual file type, size and dimensions, strip unnecessary metadata from published derivatives, and keep source and output prefixes distinct to avoid recursive processing. Generate bounded image dimensions in WebP/AVIF plus a compatible fallback; do not upscale weak originals or reconstruct legal microtext as authoritative product information.

Use AWS Elemental MediaConvert for production video renditions, starting with broadly supported H.264/AAC MP4 with progressive-download layout and adding HLS only when needed. Store poster frames, captions, duration, dimensions, language, approval status, and variant URLs. The supplied video is preserved unchanged locally; no new video was generated in this task. [AWS MediaConvert](https://docs.aws.amazon.com/mediaconvert/latest/ug/what-is.html)

Publish only an approved asset version in catalog media records. CloudFront serves immutable public-product derivative URLs using S3 origin access control; source masters, imports, invoices and customer records remain private. Web uses responsive image sources; native clients request the appropriate variant. Use the square composition on narrow screens instead of cropping the carton from the wide image. Serve video with controls and `playsinline`, metadata-only preload, and no automatic sound. Test real Safari/iOS and Android playback as part of release verification.

**Review comment - Brand:** Approve packaging/logo fidelity, product claims and video audio before publication. Replace generated packaging microtext with verified production artwork whenever exact detail is needed.

## 17. Miro Board Organization

Target board: [Wellisha architecture board](https://miro.com/app/board/uXjVEer-YZg=/). Published October 4, 2026: ten editable Miro diagrams, plus Failure Handling and Security and Decisions and Release Gates. The board was read back to verify its contents.

| Frame | Scope | Lead diagram |
| --- | --- | --- |
| Booking | Login, product/media discovery, prices, cart, delivery address, quote, stock reservation, Razorpay and verified payment | `08-booking` |
| Post-Booking Operations | Fulfillment, tracking, support, authorized agent cancellation, refunds, returns, email/SMS, reconciliation | `09-post-booking` |

The shared AWS foundation and all seven detailed sequence diagrams are published in separate frames. Each frame includes review or failure-handling notes. The board includes the confirmed agent-only cancellation rule and two additional review frames. The local publication record is in `miro-board-plan.md`.

The implementation plan specifies separate ECS services for the TypeScript/Next.js website, Kotlin/Spring Boot API and background workers. CloudFront caches public assets/media and Valkey caches versioned public catalog data. Orders receive HTTP 202 only after a durable PostgreSQL order/reservation/payment-attempt/outbox commit; payment preparation, verification and fulfillment have explicit asynchronous states. Shared caches do not determine private order access, checkout totals or stock availability. SQL uses bound parameters and allowlisted identifiers; production credentials use AWS Secrets Manager.

The implementation plan, test specification and five new UI/deployment review links are saved in the existing Confluence architecture live document. Nineteen active Miro frames now include eight initial UI screens and the ECS/cache/async design. This is a review plan; services and tests remain to be implemented.


Amazon Shipping is the selected carrier for Wellisha-packed parcels. See [integration requirements and architecture](../implementation/amazon-shipping-integration.md) and the new Shipping Miro frame recorded in publication-record.json. Commercial/API onboarding and implementation remain pending.

Deployment proposal: [AWS deployment plan](../implementation/aws-deployment-plan.md) defines CDK TypeScript infrastructure, CodeConnections/GitHub source, CodePipeline/CodeBuild releases, immutable ECR promotion, controlled ECS migration tasks and rollback. No infrastructure has been deployed.
