# Wellisha implementation code plan

Status: implementation in progress. Kotlin + Spring Boot and PostgreSQL are confirmed. This is a brand-new backend application, with no legacy database or payment-data migration. Existing Next.js UI code remains in place. See backend/README.md for implemented components and remaining release gates.

October 6 update: the web commerce lifecycle is implemented through quotes,
reservations, Razorpay capture/reconciliation, staff packing, Amazon booking/labels/
tracking/cancellation, bounded refunds and SES/SNS notifications. Variants,
prepacked mixed-product kits and generated transport are included. Keep the four
nonstacking pricing rules; kit contents are catalog data and kit stock is independent.
The layout below is the broader target, not a claim that mobile/media modules exist.
Use [execution status](execution-status.md) for actual results and
[provider setup](provider-setup.md) as the parallel owner workstream. Deployment,
real-account acceptance and commercial policy approval are required before launch.

## 1. Stack and scope

| Layer | Language / technology | Decision |
| --- | --- | --- |
| Website and staff UI | TypeScript, React, Next.js | Retain existing storefront application |
| Android / iOS UI | TypeScript, React Native / Expo | Proposed; validate native login, payment and release builds |
| Commerce API | Kotlin, Spring Boot, Spring MVC, Spring Security | Confirmed backend direction |
| Async workers | Kotlin, Spring Boot, AWS SDK for Java v2 | Separate deployable process from API |
| Runtime / build | JVM 21 / Amazon Corretto, Gradle Kotlin DSL | Proposed baseline; pin supported compatible releases in foundation phase |
| Persistence | PostgreSQL on RDS, Flyway SQL migrations, Spring JDBC repositories | PostgreSQL confirmed; JDBC is the planned initial persistence approach |
| Contracts | OpenAPI with generated TypeScript/mobile clients | Shared wire contracts; persistence models stay backend-only |
| AWS | ECS Fargate, SQS/EventBridge, Cognito, S3, Secrets Manager | Existing architecture; region, sizing and provider access remain to be verified |

Start with a modular commerce backend and a separate worker application sharing domain modules. Deploy independently without creating a separate microservice for every business domain. The website source directory is storefront, named after its customer-facing purpose.

Choose Spring JDBC / JdbcClient with explicit parameterized SQL and Spring-managed transactions initially. This makes PostgreSQL locks, constraints, JSONB queries and reporting visible in the code. JPA can be evaluated later for a specific module rather than becoming a prerequisite. Do not mix reactive request handling with blocking JDBC in the initial backend.

## 2. Repository layout to create

```text
storefront/                         existing TypeScript / Next.js UI and BFF
backend/
  settings.gradle.kts
  build.gradle.kts
  gradle/libs.versions.toml           pinned dependencies
  apps/api/                          Spring Boot HTTP application
  apps/worker/                       Spring Boot queue/scheduled application
  apps/schema/                       CommerceSchemaInitializer: creates/versions the new schema
  modules/identity/
  modules/catalog/
  modules/customer/
  modules/cart/
  modules/checkout/
  modules/orders/
  modules/payments/
  modules/fulfillment/
  modules/support/
  modules/notifications/
  modules/media/
  modules/reliability/                inbox/outbox, receipts, attempts
  modules/platform/                   configuration, logging, clocks, IDs
  database/src/main/resources/db/migration/
  contracts/openapi.json             implemented wire foundation
  test-support/                       PostgreSQL containers, JWT fixtures, provider stubs
  local/compose.yaml                  local PostgreSQL and optional cache
infra/cdk/                           AWS stacks and deployment configuration
docs/implementation/code-plan.md
```

Use package root com.wellisha. Each business module contains api DTOs, application use cases, domain rules, repository ports, JDBC persistence and provider adapters as needed. Controllers parse/validate/authenticate and delegate; repositories scope data access; domain rules enforce state transitions.

Dependencies flow from applications to modules. Modules expose explicit operations, not another module's tables or mutable entities. Keep shared platform code small. Provider adapters implement interfaces such as PaymentGateway, FulfillmentProvider and NotificationSender.

## 3. Existing UI integration and security inventory

| Existing file / behavior | Planned change |
| --- | --- |
| storefront/app/api/orders/create/route.ts | Remove browser-supplied totals/discounts; validate address ownership; replace with Kotlin quote/order flow |
| storefront/app/api/orders/verify/route.ts | Bind stored order, owner, provider order and payment; browser return cannot authorize fulfillment |
| storefront/app/api/cart/route.ts | Scope every cart-item read/write to the authenticated customer |
| storefront/app/api/addresses/route.ts | Scope address access and immutable order address snapshots |
| storefront/app/api/admin/* | Replace role-only UI assumptions with server permissions and staff MFA |
| storefront/lib/auth.ts | Configure Cognito sign-in for the new backend; verify any future account linking separately |
| storefront/prisma/schema.prisma | Preserve the existing UI schema and user edits; no data import into the new backend |
| Existing server pages querying Prisma | Switch to typed API/BFF calls after equivalent contract behavior passes |

The two order handlers and the Prisma schema were re-read when preparing this plan. The remaining handlers need a complete implementation audit; this inventory is not a full security audit. Preserve the existing uncommitted Prisma portability change.

## 4. Work packages and delivery order

| ID | Work package / concrete deliverable | Depends on | Exit evidence |
| --- | --- | --- | --- |
| P00 | Validate fulfillment onboarding, stock owner, sandbox APIs, cancel/return rules and Cognito providers | None | Provider capability matrix, new-application identity setup, agreed business rules |
| P01 | Stabilize current checkout: owned resources, authoritative quote, payment binding, exact money and concurrent stock handling | None; coordinate with P00 | Tampering, cross-customer and concurrency tests pass; unsafe checkout disabled until verified |
| P02 | Create Gradle modules, API/worker boot apps, configuration validation, structured errors, health probes and local environment | None | Reproducible build; local API and worker boot; no secret defaults |
| P03 | PostgreSQL baseline and CommerceSchemaInitializer; constraints, indexes and versioned schema SQL | P02 | Fresh install and repeat initialization pass with real PostgreSQL |
| P04 | Cognito token validation, identity mapping, ownership policies, staff permission model, audit records | P02, P03; provider login POC from P00 | Wrong issuer/token type/client, expired tokens and cross-customer attempts rejected |
| P05 | Catalog, product variants, approved media, customer/profile/address and cart APIs | P03, P04 | Existing website journeys use generated API client; ownership and pagination pass |
| P06 | Quotes, stock reservations, immutable orders, operation idempotency and payment-attempt state | P03-P05, stock rules from P00 | Two concurrent buyers cannot oversell; same key replays; changed payload conflicts |
| P07 | Razorpay adapter, raw-body signed webhook inbox, payment processing and reconciliation | P06 | Forged/duplicate/late events and lost responses cannot cause incorrect payment or dispatch |
| P08 | Transactional outbox relay, SQS consumers, leases, DLQs, replay and reconciliation scheduler | P03; start before P06/P07 async wiring | Crash/retry tests demonstrate recoverable at-least-once processing |
| P09 | Fulfillment adapter and worker, shipment normalization, tracking intake and polling | P00, P08 | Sandbox order-to-tracking flow passes with stable request IDs and timeout reconciliation |
| P10 | Support cases, agent cancellation, return eligibility and bounded refund orchestration | P04, P07-P09; policy from P00 | Customer execution denied; cancel/dispatch race and ambiguous refund tests pass |
| P11 | Email/SMS notification workers, import jobs and media approval workflow | P05, P08 | Failure isolation, bounded retries, source/output separation and approved assets verified |
| P12 | Website/staff migration and proposed native apps; login, checkout, tracking, support and status UI | Starts at P04/P05; completes after P10/P11 | Browser/device journeys, CSRF/session handling and contract compatibility pass |
| P13 | AWS staging, deployment jobs, secrets/IAM, telemetry, load/security/recovery tests and cutover | Starts at P02; production after all relevant packages | Reviewed infra, restore/cutover rehearsal, critical journeys and penetration test evidence |

Work package IDs are planning IDs, not Jira tickets. API contracts and UI work start early; provider-dependent release gates stay blocked until real sandbox evidence exists. Calendar estimates require team capacity and confirmed integration access; do not treat this ordering as a promised schedule.

## 5. First coding slice

1. P01: add security regression scenarios for browser discount tampering, another customer's address/order, mismatched Razorpay order and duplicate checkout.
2. P02: scaffold backend Gradle build, Kotlin Spring configuration, API/worker entrypoints, error contract, health endpoints and local PostgreSQL.
3. P03: create identity/customer tables, address ownership constraints and initial Flyway migrations; add PostgreSQL integration-test support.
4. P04: implement Cognito access-token validation and server-owned permissions.
5. P05: deliver GET /v1/me and owned address CRUD as the first authenticated vertical slice.
6. Generate the TypeScript client and connect the existing profile/address UI through the Next.js BFF.
7. Demonstrate that user A cannot read or modify user B's address, that DTOs exclude internal fields, and that the migration/build are repeatable.

Deliver this slice before live Razorpay or fulfillment side effects. This proves the Kotlin-to-PostgreSQL-to-Next.js path and its security boundary.

## 6. API contract backlog

### Pricing and offer delivery

Prices and offers are API-controlled. Use the four simple same-SKU rules in
[pricing rules](pricing-rules.md): percentage, fixed amount, bundle total and
buy-X-get-Y. Operators change data through a version-checked, permission-scoped
API rather than a UI deployment. One active offer per SKU, no stacking and no
custom/nested rule language are the initial policy. Base/discount/offer versions
remain server-owned. The storefront reads current API results and automatically
refetches visible catalog/product/cart views within 15 seconds, sooner at an
offer boundary and on focus/online events. Add percentage/fixed thresholds and
worked bundle/free-unit examples to acceptance; do not copy competitor prices.

P05/P12 deliver bounded catalog/detail/category APIs, owned cart CRUD, authoritative
cart totals and live pricing UI. P06 must add accepted quotes and reservation
expiry before enabling checkout. Mix-and-match bundles, cross-SKU gifts and coupon
stacking require a separate approved policy and are outside the four-rule slice.
See [SVG rules diagram](../architecture/pricing-rules.svg) and
[agent guidance](../../.agents/pricing-rules.md).

| Module | Initial endpoints | Authorization / invariant |
| --- | --- | --- |
| Identity/customer | GET/PATCH /v1/me; GET/POST /v1/me/addresses; PATCH/DELETE /v1/me/addresses/{id} | Authenticated owner; sensitive fields allowlisted |
| Catalog | GET /v1/products; GET /v1/products/{slug}; GET /v1/categories | Public approved catalog; bounded filters and pagination |
| Cart | GET /v1/cart; POST /v1/cart/items; PATCH/DELETE /v1/cart/items/{id} | Owned cart only; positive bounded quantities |
| Checkout | POST /v1/checkout/quotes; POST /v1/orders | Server totals; accepted quote; ownership; reservation; idempotency |
| Payment return | POST /v1/orders/{id}/payment-confirmations | Owned order; verify binding; return status; never dispatch from browser evidence alone |
| Orders/tracking | GET /v1/orders; GET /v1/orders/{id}; GET /v1/orders/{id}/tracking | Owner or separately authorized staff; separate payment/shipment/refund views |
| Support | POST /v1/orders/{id}/support-cases; GET /v1/support-cases/{id} | Owner creates case; case creation does not mutate order state |
| Agent operations | POST /v1/agent/orders/{id}/cancellations; POST /v1/agent/orders/{id}/refunds; POST /v1/agent/orders/{id}/manual-actions | Explicit permissions, MFA policy, case/reason/evidence, idempotency; refund eligibility required |
| Cancellation/refund status | GET /v1/orders/{id}/cancellations/{requestId}; GET /v1/orders/{id}/refunds | Owner may read; execution remains agent/worker controlled |
| Admin/import/media | POST /v1/admin/catalog-imports; GET /v1/admin/jobs/{id}; POST /v1/admin/media/{id}/approvals | Restricted permissions; audited publication |
| Partner intake | POST /v1/webhooks/razorpay; POST /v1/webhooks/fulfillment/{provider} | Razorpay raw-body signature; Amazon Shipping agreed authentication; durable inbox before acknowledgement |

Publish request/response schemas, required scopes, field limits, error examples and idempotency semantics in OpenAPI before each module is wired into a client. Validate fulfillment endpoint shape against the actual partner contract.

Use 401 for invalid/missing authentication, 403 for insufficient privilege, ownership-safe 404 where appropriate, 409 for state/idempotency conflicts and 422 for semantically invalid input. Return a stable code, correlation ID and safe message; omit stack traces, secrets and unnecessary personal data.

## 7. PostgreSQL schema and migration plan

| Migration group | Core tables / constraints |
| --- | --- |
| Identity/customer | customer, external_identity unique (issuer, subject), staff_permission, address with customer FK, consent |
| Catalog | product, variant unique SKU, price_version, catalog_release, approved_media, import_job |
| Cart/quotes | cart unique customer, cart_item unique cart/variant, quote, quote_line, immutable accepted price/address snapshots |
| Inventory/orders | inventory_balance, stock_reservation, reservation_line, orders, order_line, order_address_snapshot |
| Money/providers | payment_attempt, provider_payment unique provider/payment ID, refund_intent, refund_attempt, integration_attempt |
| Fulfillment/support | fulfillment_request, shipment, shipment_line, tracking_event, support_case, cancellation_request, return_request, agent_action |
| Reliability/audit | inbox_event unique provider/event key, outbox_event, consumer_receipt unique consumer/event, notification_delivery, audit_event |

Versioned Flyway names are assigned in implementation order. Use a dedicated migration job/role; API and worker roles cannot alter schema. Configure Flyway not to run independently in every autoscaling API/worker instance.

Represent final monetary amounts as BIGINT minor units plus currency, using checked Kotlin Long arithmetic and explicit rounding for calculated discounts/tax. Add nonnegative/quantity constraints where valid. Preserve immutable item, address and price snapshots; do not derive historical receipts from mutable products.

Use server-generated identifiers for new records and exact minor-unit monetary values from the first release. Do not import existing UI database records or old payments. Flyway's db/migration directory is its standard name for versioned schema SQL; it does not imply migration from an older application.

Add validated versioned JSONB for optional product attributes and partner metadata. Keep ownership, totals, stock and statuses typed. Bound document size and allowed fields, add selective expression/GIN indexes, and promote heavily queried attributes to typed columns. Retain raw signed webhook bytes or a protected payload reference where exact evidence is required.

Use expand-and-contract migrations, bounded backfills and measured lock durations. A rollback deploy must still understand the expanded schema; removal happens after old readers/writers are retired. Tune query plans and indexes first; add replicas/partitioning only for demonstrated needs. Payment and stock decisions read authoritative data.

## 8. Payment and asynchronous state handling

Order lifecycle is separate from payment, shipment, cancellation and refund state. Define legal transitions with versions; avoid one status field that implies all outcomes.

For checkout, commit the pending order, stock reservation, payment attempt and outbox work in a short transaction, then return 202 with an owned status URL. A payment worker calls Razorpay outside DB locks with a durable attempt identity. Persist the provider order mapping before exposing checkout details. If a request outcome is unknown, reconcile instead of creating another payment attempt blindly; verify which provider operations support idempotency. Section 16 defines the customer pending/ready behavior.

For signed captured-payment intake, validate the raw body, persist a unique inbox event, then acknowledge. A processor verifies stored order/provider mapping, owner, amount, currency and captured status. Commit payment state, the order transition and OrderPaid outbox event atomically. Late capture after reservation expiry must recheck stock or initiate the approved compensating refund.

The outbox relay publishes with stable event IDs and marks dispatch progress after acceptance. A crash may publish twice. Consumers record receipts and legal aggregate versions; finish durable work before deleting the SQS message. Use leases/visibility renewal, bounded retries, backoff and audited DLQ replay. Reconcile stuck or ambiguous attempts. Never claim exactly-once external delivery.

For fulfillment, persist an attempt before calling the provider, reuse its merchant reference and reconcile lost responses. Serialize cancellation intent against dispatch; an in-flight submission is possibly accepted until verified. Refund limits account for completed and in-flight intents; reserve allowable refund amount transactionally before the external request. Notification failures cannot roll back a paid order.

## 9. Security implementation requirements

- Spring Security validates signature, issuer, expiry, access-token type, configured client/audience semantics and scopes for Cognito. ID tokens cannot authorize API calls. Privileged operations also check current server-owned permissions.
- Every address, cart item, order, shipment, support case and refund read/write applies resource ownership or an explicit staff permission. The API derives customer identity from authentication, not request fields.
- Staff MFA and separate permissions cover catalog publication, cancellation, refunds and DLQ replay. Record actor, case/reason, before/after state and correlation ID in audit records.
- Next.js BFF holds tokens server-side and uses Secure/HttpOnly/SameSite cookies with CSRF protection. Mobile uses PKCE and platform secure storage. No Razorpay or database secrets reach clients.
- Parameterize SQL, allowlist sort identifiers, validate payloads, bound uploads/pagination and apply per-user/IP/operation abuse limits. Webhooks use provider signatures and suitable limits without browser challenges.
- Use separate API/worker/migration IAM and DB roles, private RDS networking, TLS, Secrets Manager, restricted S3 access and container patching. Public media and private customer documents have distinct policies.
- Logs redact tokens, signatures, addresses and payment-sensitive fields. Publish safe health checks; detailed actuator endpoints are restricted. Validate configuration at startup rather than using empty credentials.
- CI gates dependency/secrets/container scanning and critical regression tests. No unresolved critical/high findings or payment-integrity defects at production release; an independent penetration test is a release gate.

## 10. Tests and acceptance evidence

| Test group | Required evidence |
| --- | --- |
| Domain | Exact money/rounding; quote expiry; legal transitions; stock/refund bounds |
| PostgreSQL integration | Real PostgreSQL via Testcontainers: migrations, constraints, JSONB queries, transactions and race scenarios |
| Authorization | Two-customer isolation across all owned resources; staff permission matrix; invalid Cognito token cases |
| Payments | Forged signatures; wrong owner/order/amount/currency; captured versus authorized; duplicates; late capture; lost callback and provider timeouts |
| Queue/resilience | Crash before/after publish, receipt commit and acknowledgement; repeated/out-of-order events; lease expiry; DLQ replay |
| Fulfillment/refunds | Sandbox tracking; split shipments; cancellation/dispatch race; ambiguous request outcomes; concurrent refund intents |
| Clients | Website/staff browser flows; proposed native login/payment/deep-link/offline/restart scenarios on real devices |
| Operations | Load baseline, DB/worker failure, backlog alarms, restore, migration locks, canary and rollback rehearsal |

Use JUnit, Spring integration tests, PostgreSQL Testcontainers, provider HTTP stubs and deterministic clocks/IDs. A mocked repository alone does not prove database concurrency or constraints. Use Playwright for web and validate the proposed mobile test tool against release builds.

Set numeric latency, peak throughput, error-budget and recovery targets after workload/budget discovery. Record the workload and environment with results; do not promise performance from the programming language alone.

## 11. Deployment and cutover

Create dev/staging/production configuration and isolated secrets/resources. AWS CDK v2 in TypeScript provisions the infrastructure through CloudFormation. Proposed release tooling is AWS CodeConnections (GitHub source), CodePipeline (orchestration) and CodeBuild (build/test/release), with scoped IAM service/cross-account roles. Promote immutable ECR image digests to independent ECS Fargate UI/API/worker services. This supersedes the earlier GitHub Actions deployment assumption. See the [AWS deployment plan](aws-deployment-plan.md) for planned files, bootstrap, pipeline stages, migration gates, permissions and rollback.

The pipeline validates contracts, Kotlin checks/tests, real PostgreSQL migrations, web builds and security scans. Apply one reviewed migration job before rolling services. Track API latency/errors, DB pool saturation, outbox age, queue/DLQ age, reconciliation failures and unresolved payment/refund attempts.

Connect UI journeys to the new backend behind routing/feature flags. The Next.js BFF adopts the generated client. Orders, payments and fulfillment must have one authoritative writer. Disable unsafe existing handlers before enabling the corresponding new backend flow.

Launch requires fresh-schema initialization evidence, provider and identity sandbox evidence, browser/native release readiness, security review and demonstrated restore/rollback. Disable superseded routes and remove web database credentials after the Kotlin API owns all required reads/writes.

## 12. Open decisions and definition of done

Confirm order/SKU peaks, capacity/cost limits, PostgreSQL version available in the chosen AWS region, stock owner, serviceability, tax/shipping/discount rules, reservation expiry, cancellation/return policy, retention, Microsoft account audience and identity migration. Commercial approval and provider credentials are external dependencies; stubs are not proof of access.

A work package is done when code, contracts, migrations, meaningful tests, safe logs/metrics, runbook and rollback behavior are reviewed, and its exit evidence passes. The initial release is done when the full customer and authorized-agent lifecycle works across the agreed clients, with secure ownership, correct money/stock, resilient integration processing and operational recovery.

## 13. SQL injection prevention and regression gates

Every repository query binds all untrusted values through JdbcClient/JDBC prepared statements. User input cannot be interpolated into SQL, JSONB expressions, LIKE clauses or stored procedure code. Escaping and input validation are additional controls, not substitutes for parameter binding.

SQL identifiers cannot be bound as values: map public sort/filter options to fixed reviewed column names and ASC/DESC constants. Reject unknown options before executing a query. Keep SQL fragments in code-controlled templates; never accept client-provided SQL or JSON paths. Parameterize pagination values and bound page sizes. For LIKE search, bind the pattern and explicitly define whether wildcard characters are literals or supported search syntax.

Add code review and static-analysis gates for raw Statement use, dynamic query concatenation and unsafe native/HQL queries. API/worker DB roles have only required DML privileges, no superuser or DDL grants. Review security-definer functions and search_path settings if introduced. WAF is supplementary.

| ID | Test level | Required case / assertion |
| --- | --- | --- |
| SQL-U01 | Unit | Sort/filter map rejects SQL fragments, unknown columns and direction values |
| SQL-I01 | Integration, real PostgreSQL | Quoted/boolean/comment payloads in search, email, address, product slug and order IDs stay values or return safe validation errors |
| SQL-I02 | Integration | UNION and stacked-statement payloads cannot expose another customer's records or modify schema/data |
| SQL-I03 | Integration | JSONB filter names and values cannot alter SQL structure; unsupported paths are rejected |
| SQL-I04 | Integration | Malicious sort, pagination and LIKE inputs cannot broaden ownership-scoped results |
| SQL-I05 | Integration | After injection attempts, assert row counts, table presence and owned-data isolation remain unchanged |
| SQL-I06 | Integration | Runtime roles cannot create/drop tables, change grants or access unrelated schemas |
| SQL-S01 | Staging security | Automated injection checks and independent review cover every reachable query endpoint |

Run malicious requests through the actual HTTP/controller/repository/database path in a disposable test database; do not test only a validator or mock away SQL execution. Include normal apostrophes and Unicode as valid input so protection does not break legitimate names. Tests and controls reduce risk; neither a language nor a finite test suite proves every attack impossible. [OWASP SQL injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

## 14. Credentials in AWS Secrets Manager

All production/staging credentials and secrets live in AWS Secrets Manager: separate API/worker/migration PostgreSQL credentials; Razorpay secret keys and webhook secrets; fulfillment credentials; applicable OAuth client/BFF encryption secrets. No credentials in source, Docker layers, committed .env files, browser/mobile bundles, logs or ordinary plaintext CDK/task-definition environment settings. Public configuration and public client IDs are not secrets.

Use ECS task roles and CodePipeline/CodeBuild service roles for AWS access, without stored long-lived AWS access keys. Prefer task-role-based Secrets Manager retrieval through a bounded-cache secret provider, with GetSecretValue scoped to exact environment/service ARNs and kms:Decrypt only for the required customer-managed key. Nonsecret settings contain references, never secret values. Migration tasks receive a separate role/secret. Fail safely if a required secret is unavailable.

Define and test rotation for each provider: rotate RDS credentials using a validated strategy, refresh cached secrets and recycle affected connection pools with bounded retries. For any secret supplied through ECS startup injection instead, restrict the execution role and redeploy tasks on rotation; running containers do not automatically receive rotated injected values. Support old/new webhook verification secrets during a controlled overlap where the provider permits it, then remove the old secret. Never log secret content or full authenticated connection strings.

Tests: missing secret, denied IAM/KMS access, wrong environment ARN, malformed secret, provider authentication failure, rotation during concurrent traffic, stale cache recovery and redaction in logs/errors/actuator endpoints. Use fake secrets locally and a restricted AWS staging test for real IAM/rotation behavior. [AWS Secrets Manager](https://aws.amazon.com/documentation-overview/secrets-manager/), [ECS secret rotation behavior](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html)

## 15. Unit, integration and provider contract test ownership

The [test-case specification](test-cases.md) defines 66 initial cases across unit, HTTP/PostgreSQL/security integration, WireMock/provider, AWS/secrets and UI/E2E suites. These are executable-test requirements; tests are not yet implemented or run.

Every work package must include unit tests for its rules and integration tests for its real boundaries in the same change. Maintain a requirements-to-test matrix linking each endpoint/business invariant to test names and work package IDs; any missing row blocks the package from completion. Coverage percentages alone do not demonstrate correctness.

Unit tests cover money/rounding/overflow, quote/reservation expiry, allowed state transitions, refund bounds, permission policies, filter allowlists, retry decisions and secret redaction. Use Kotlin/JUnit with deterministic clocks and IDs.

Integration tests exercise Spring HTTP/security validation with real PostgreSQL Testcontainers and Flyway. Cover migrations, constraints, isolation, transactions, concurrency, outbox/inbox and malformed input. Use WireMock for Razorpay, fulfillment and messaging HTTP dependencies, including delays, dropped connections, 401/429/5xx, malformed bodies and unknown outcomes. Verify outbound request bodies, stable merchant/idempotency references and that unsafe retries do not cause repeated side effects. [WireMock matching](https://wiremock.org/docs/request-matching/)

Add queue-consumer integration tests for duplicates, out-of-order events, worker crashes and acknowledgements; run an AWS staging suite for real SQS/IAM/Cognito/Secrets Manager behavior that local stubs cannot prove. Provider sandbox contract tests establish that mocked assumptions match real APIs.

CI runs unit, PostgreSQL integration, HTTP/provider contract, migration, OpenAPI compatibility and security scanning. Browser/native E2E and recovery/load/security suites run before release. Store test reports and traceability evidence. Do not substitute stubs for required partner onboarding or production readiness.

## 16. Independent ECS services, caching and prompt async responses

| ECS service / task | Responsibility | Scaling and isolation |
| --- | --- | --- |
| wellisha-web | Next.js UI rendering and BFF sessions | Independent deployment/scaling; no commerce DB credentials |
| wellisha-api | Kotlin/Spring Boot APIs and signed intake | API latency/error/CPU signals; own task role and connection budget |
| wellisha-worker-payment | Payment setup, webhook processing and reconciliation | Payment queue/backlog and provider limits |
| wellisha-worker-fulfillment | Fulfillment requests and tracking normalization | Fulfillment queue/backlog; separate provider concurrency |
| wellisha-worker-refund | Approved refunds and reconciliation | Isolated permissions, money controls and provider rate limits |
| wellisha-worker-notification | Email/SMS work | Failure isolation; notification backlog |
| wellisha-worker-catalog-media | Imports, cache publication and media jobs | Separate heavy-job concurrency; split import/media when load justifies it |
| wellisha-outbox-relay | Durable event dispatch | Independent retry/lease behavior and outbox-age monitoring |
| Schema initializer task | Reviewed versioned schema SQL for the new application | One deployment job; not a continuously scaled ECS service |

Worker services may share a build/image with distinct profiles and narrowly scoped roles/queues. The web UI, API and workers are always separate ECS services. Reserve sufficient task capacity per service and cap aggregate DB/provider concurrency during scaling. Native mobile UI runs on devices; its API/backend lives on ECS.

CloudFront caches hashed UI assets and approved public media. Initially keep personalized Next.js HTML/BFF/API responses out of shared CDN caches. Valkey caches public catalog/category/product read models using versioned keys and release invalidation. Add bounded TTLs, stampede control and DB fallback budgets; measure hit rate and tail latency. Keep cart, customer data, quotes, stock reservation decisions, payment/refund truth and authorization out of shared caches. Stale catalog is revalidated at checkout with customer consent for repricing. Restrict distributed cache access and use TLS.

Order submission performs only authentication, validation and a short authoritative PostgreSQL commit of the order/reservation/attempt/outbox. Return 202 with owned order ID, state PAYMENT_SETUP_PENDING and a status URL once committed; return an error if durability fails. Payment worker prepares the provider order; client obtains checkout details from the owned order status only when ready. Never open checkout before stored provider binding exists.

After payment, display verification pending while webhook/reconciliation confirms captured funds. Then atomically mark paid and enqueue a Wellisha store pick/pack task. Amazon Shipping booking follows staff packed-ready confirmation. The customer sees the confirmed order immediately after verified payment, without waiting for packing, dispatch, email or SMS. The UI polls with backoff/ETags initially and survives reload/offline without duplicate submission; evaluate push/SSE only if required.

Database transactions remain ACID and commit before a success/accepted acknowledgement. Asynchronous processing removes external waits from customer requests, not validation or durability. Test 202 durability, repeated clicks, queue/provider outages, pending-to-ready transitions, failed setup, webhook lag, cache outage, invalidation and independent scaling. Numeric latency targets are defined from workload discovery and demonstrated by load tests.

## 17. UI reference and wireframe scope

Use the [Plush collection page](https://www.plushforher.com/collections/buy-3-at-499) as a reference for a promotional strip, category navigation, product cards with price/actions, search/cart access and responsive shopping layout. Adapt these patterns to Wellisha's own branding, approved imagery and business rules. Do not copy competitor logos, product claims, photos or promotional prices; Wellisha promotions require approved server-side pricing rules.

Website/staff UI language is TypeScript with React/Next.js. Android/iOS UI remains proposed TypeScript with React Native/Expo. UI wireframes are visual review artifacts; WireMock is for API test doubles, and the two have different roles.

Review wireframes for desktop collection and mobile product detail; cart and checkout; customer tracking and support; staff cancellation and refund review. Include loading, empty, sold-out, validation, pending payment, failed payment, split shipment, stale tracking and refund status behavior in the UI implementation backlog. Add dedicated login/account wireframes during identity implementation.

Wireframes use placeholder imagery and prices pending approval. Customer screens offer tracking and contact support; only the staff UI exposes cancellation/refund execution. Show payment/provider pending states honestly, preserve keyboard/screen-reader access and validate narrow screens. Server-calculated totals and authorization are enforced by the API regardless of visible UI controls.

## 18. Published Miro UI and deployment review

- [14. UI Wireframes - Collection and Product](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685970316408)
- [15. UI Wireframes - Cart and Checkout](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685970316487)
- [16. UI Wireframes - Tracking and Support](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685970316561)
- [17. UI Wireframes - Staff Cancellation and Refund](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685970316631)
- [18. ECS Services, Cache and Async Responses](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685970424616)

Wireframes are editable review layouts with placeholder imagery/prices, not implemented UI. Eight screens cover collection/product, cart/checkout, tracking/support and staff operations. The ECS frame shows separate services, cache boundaries and prompt asynchronous responses.

## References

- [Agreed architecture](../architecture/confluence-design.md)
- [Miro stack decision](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685968990781)
- [Spring Kotlin support](https://docs.spring.io/spring-boot/reference/features/kotlin.html)
- [Spring JDBC and parameterized access](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html)
- [Spring database migration guidance](https://docs.spring.io/spring-boot/how-to/data-initialization.html)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/17/datatype-json.html)
- [Testcontainers database testing](https://java.testcontainers.org/)
- [SQS at-least-once delivery and idempotency](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)

## Amazon Shipping decision update

Customer visibility: [Fulfillment updates and notifications](customer-fulfillment-updates.md) defines asynchronous SMS, email and in-app messages plus authenticated owned-order retrieval. Show each shipment's packing/pickup/delivery state, tracking, timeline, available estimate, last update and exceptions. Notification failures do not block shipping or order visibility. Extend P09, P11 and P12 with these requirements and their acceptance checks.

Asynchronous fulfillment mechanism: commit a store packing task and outbox event with verified payment; commit PackagePackedReady and its outbox event when authorized staff completes packing. The outbox relay sends a stable event ID to a dedicated Amazon Shipping SQS queue. The independent fulfillment ECS service consumes it with durable receipts, a unique active booking attempt per package, cancellation/version guards, visibility renewal and delete-after-commit handling. Standard SQS plus idempotency and database state guards is the initial choice; evaluate FIFO only if strict per-package sequencing is required, without assuming FIFO prevents duplicate external purchases. Safe transient failures use bounded backoff; exhausted jobs go to a DLQ with audited replay. An ambiguous purchase response enters UNKNOWN and reconciliation/manual review, not automatic repurchase. EventBridge remains optional fan-out for multiple independent consumers; SQS provides buffering and worker backpressure. Customers read saved status without waiting for Amazon.

See [Amazon Shipping integration and architecture](amazon-shipping-integration.md). Wellisha retains stock and packs parcels. Verified payment creates store packing tasks; only packed-ready triggers asynchronous Amazon Shipping booking. Implement rates, purchase, private labels, pickup exception handling, tracking and staff-only cancellation. Add twelve Shipping-specific planned cases S01-S12 to the existing test specification.
