# Wellisha Sequence Diagrams

Generated from the same flow definitions as the draw.io pages. Each diagram shows the main flow; its notes and the design document define failure handling and conditional outcomes. Customers can track deliveries and contact support; cancellation execution is agent-only.

## 02  Federated Login

Common identity for web, Android and iOS | Public mobile client uses PKCE; web uses a session BFF

```mermaid
sequenceDiagram
    autonumber
    participant P0 as Customer
    participant P1 as Web BFF / Native app
    participant P2 as Cognito
    participant P3 as Google / Microsoft / Apple
    participant P4 as Commerce API
    participant P5 as PostgreSQL
    P0->>P1: Choose provider
    P1->>P2: Authorize: state, nonce, PKCE
    P2->>P3: Federated sign-in
    P3-->>P2: Validated provider response
    P2-->>P1: Authorization code
    P1->>P2: Exchange code + verifier
    P2-->>P1: Access token + refresh token
    P1->>P4: Call API with access token
    P4->>P4: Validate JWT, scopes, role
    P4->>P5: Resolve issuer/subject identity, check resource owner
    P5-->>P4: Customer and authorization context
    P4-->>P1: Authorized response
    Note over P0,P5: Web: Secure HttpOnly session, tokens stay server-side. Native: system browser and secure token storage. Test personal Outlook and organization tenants, link identities only after verified proof of ownership.
```

## 03  Catalog and Price Publication

Database commit precedes cache publication | Outbox + at-least-once processing | Versioned releases

```mermaid
sequenceDiagram
    autonumber
    participant P0 as Admin / Scheduler S3 source
    participant P1 as Import queue + worker
    participant P2 as PostgreSQL
    participant P3 as Outbox relay EventBridge
    participant P4 as Cache queue + worker
    participant P5 as Valkey / API
    P0-->>P1: Submit source version + job ID
    P1->>P1: Deduplicate, validate, stage
    P1->>P2: Activate release + outbox in one transaction
    P2-->>P1: Committed version, cache pending
    P3->>P2: Claim committed outbox entries
    P2-->>P3: CatalogPublished(version)
    P3-->>P4: Publish, acknowledge only successful entries
    P4->>P2: Load authoritative release
    P2-->>P4: Products, prices and visibility
    P4->>P5: Build immutable views, CAS newer pointer
    P4->>P2: Record cache publication status
    P5->>P5: Read cache, bounded DB fallback
    Note over P0,P5: Duplicates and older events are harmless. Failed jobs retry, then DLQ. Reconcile DB/cache versions. Checkout always revalidates live prices and stock, price changes require customer acceptance.
```

## 04  Checkout, Payment and Fulfillment

Customers pay on Wellisha | Captured payment evidence drives order confirmation | External outcomes may be pending

```mermaid
sequenceDiagram
    autonumber
    participant P0 as Web / Android / iOS
    participant P1 as Commerce API
    participant P2 as PostgreSQL
    participant P3 as Razorpay
    participant P4 as Inbox / outbox + workers
    participant P5 as Fulfillment provider
    P0->>P1: Create order: quote + idempotency key
    P1->>P2: Reprice, reserve stock, persist pending order
    P1->>P3: Create payment order outside DB transaction
    P3-->>P1: Provider order ID or unknown outcome
    P1->>P2: Persist payment mapping, unknown -> reconcile
    P1-->>P0: Checkout details or 202 pending
    P0->>P3: Customer completes payment
    P3-->>P1: Signed captured-payment webhook
    P1->>P2: Verify signature, persist unique inbox
    P1-->>P3: Acknowledge durable receipt
    P4->>P2: Validate payment binding, paid + outbox transaction
    P4-->>P5: Book shipment after packed-ready
    P5-->>P4: Accepted / status / ambiguous result
    P4->>P2: Persist tracking, reconcile, notification outbox
    P0->>P1: Read order, payment and shipment status
    Note over P0,P5: Do not dispatch on browser success alone. Duplicate/out-of-order events cannot repeat effects. Late payment after stock expiry: recheck stock or compensate. Provider timeout: reconcile before retry.
```

## 05  Agent Cancellation and Refund

Customers contact support; only authorized agents can cancel | Backend RBAC enforces the restriction

```mermaid
sequenceDiagram
    autonumber
    participant P0 as Customer app
    participant P1 as Support agent Staff console
    participant P2 as Commerce API
    participant P3 as DB inbox/outbox + queue workers
    participant P4 as Fulfillment provider
    participant P5 as Razorpay
    P0->>P2: Create support case, no order mutation
    P1->>P2: Read assigned case, verify customer/order
    P1->>P2: Agent cancellation: case + reason + key
    P2->>P3: Check agent permission, lock, record intent
    P2-->>P1: 202 pending cancellation
    P3-->>P4: Cancel / reconcile in-flight submission
    P4-->>P3: Accepted, rejected or pending
    P3->>P3: Confirmed cancel -> refund intent
    P3-->>P5: Submit deduplicated refund
    P5-->>P2: Signed refund outcome callback
    P2->>P3: Durable inbox, validate, notify customer
    P0->>P2: Read tracking and agent-action status
    Note over P0,P5: Customer call to cancellation API -> 403. A support case never automatically cancels an order. Manual provider-portal actions require an agent audit record and verified reconciliation before completion.
```

## 06  Asynchronous Email and SMS

Notifications never block checkout or fulfillment | Separate channel queues and delivery tracking

```mermaid
sequenceDiagram
    autonumber
    participant P0 as Commerce transaction
    participant P1 as DB outbox
    participant P2 as Relay + EventBridge
    participant P3 as Email / SMS queues + DLQs
    participant P4 as Channel workers
    participant P5 as SES / AWS SMS
    P0->>P1: Commit business state + notification event
    P2->>P1: Claim committed event
    P1-->>P2: Order / shipment / refund event
    P2-->>P3: Fan out to independent channels
    P3-->>P4: Deliver at least once
    P4->>P1: Resolve consent/template, record unique send intent
    P4->>P5: Send email or registered SMS
    P5-->>P4: Provider acceptance / message ID
    P4->>P1: Store sent / unknown / failed attempt
    P5-->>P3: Delivery feedback through event adapter
    P3-->>P4: Process receipt / retry / DLQ
    P4->>P1: Update delivery outcome, suppress invalid recipients
    Note over P0,P5: Send acceptance is not delivery. Persistent dedupe limits repeats, ambiguous sends need a defined retry policy. SES production access, India SMS entity/template registration, marketing consent is separate.
```

## 07  Customer Delivery Tracking

One tracking experience across web, Android and iOS | Shipment-level timeline, ETA and last update

```mermaid
sequenceDiagram
    autonumber
    participant P0 as Carrier / fulfillment
    participant P1 as Webhook API + durable inbox
    participant P2 as Tracking worker
    participant P3 as PostgreSQL
    participant P4 as Commerce API
    participant P5 as Customer app
    P0-->>P1: Signed shipment event
    P1->>P3: Verify signature, store unique event
    P1-->>P0: Acknowledge durable receipt
    P2->>P3: Claim inbox event, deduplicate
    P2->>P3: Normalize status, persist timeline + outbox
    P2->>P0: Scheduled polling for missing/stale events
    P0-->>P2: Current provider shipment state
    P5->>P4: GET own order tracking, access token
    P4->>P3: Check ownership, read each shipment
    P3-->>P4: Timeline, ETA, last update, exceptions
    P4-->>P5: Tracking view, contact-support link
    P5->>P4: Refresh with ETag, back off offline
    Note over P0,P5: No customer cancellation action. Split shipments remain separate, stale data is labeled. Do not regress shipment state for late events or expose another customer's order by tracking ID.
```

## 10  Product Media Publication

Approved product identity across web, Android and iOS | Originals preserved; delivery assets versioned

```mermaid
sequenceDiagram
    autonumber
    participant P0 as Merchandising
    participant P1 as S3 master assets
    participant P2 as EventBridge / SQS Media worker
    participant P3 as Image processing / MediaConvert
    participant P4 as Catalog media records
    participant P5 as CloudFront / clients
    P0->>P1: Upload original / generated review master
    P1-->>P2: Object-created event + asset version
    P2->>P2: Validate type, size, metadata, deduplicate
    P2-->>P3: Create bounded image/video derivatives
    P3->>P1: Write derivatives to separate output prefix
    P3-->>P2: Completion / failure event
    P2->>P4: Record ready variants, still unpublished
    P0->>P4: Review branding, labels, video, approve version
    P4-->>P5: Publish immutable URLs + dimensions + alt text
    P5->>P1: Fetch approved derivative through origin access
    P5->>P5: Choose viewport size / supported video format
    Note over P0,P5: Generated packaging is a mockup until approved. No processing loop: source and derivative prefixes differ. Only public product media is CDN-readable, invoices, imports and customer data remain private.
```
