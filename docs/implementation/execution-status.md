# Implementation status

This is a new Kotlin/Spring Boot backend, not a legacy-system migration.
The existing Next.js UI is being connected to it. No existing database schema
or data has been changed by backend initialization.

Implemented foundation:

- API, outbox relay and one-shot CommerceSchemaInitializer executables.
- Parameterized PostgreSQL repositories, customer ownership checks, validated
  inputs, exact minor-unit amounts, idempotent order creation and durable outbox.
- Cognito access-token validation, safe API errors, correlation IDs and request
  diagnostics without bodies, tokens or secret exception messages.
- Initial UI BFF, owned order/tracking pages, addresses and message inbox.
- Recovered storefront rename and media paths; customer address editing,
  message read state and sequential order/tracking polling with account isolation.
- 16 KB request-byte limits in both the storefront BFF and Kotlin API,
  including streamed bodies without Content-Length; compressed bodies rejected.
- Shared OpenAPI contract for all 20 implemented controller operations;
  generated storefront DTO types used by address, message and shipment screens.
  Contract checks cover controller route parity and real HTTP response shapes.
  Scheduled four-rule pricing, paged catalog/category/detail reads and owned
  cart CRUD now share API-controlled prices with versioned, audited staff writes.
  Transport SDK generation and parent-product variant grouping remain planned.
- Commerce-mode home, collection, detail, cart and announcement strip read current
  API prices, offer summaries and savings. Visible views refresh within 15 seconds,
  sooner at schedule boundaries and on focus/online events; hidden tabs pause.
  Prisma compatibility UI remains available when COMMERCE_API_URL is absent.
- Independent ECS service definitions, private encrypted RDS/S3, SQS/DLQs,
  CloudWatch alarms and optional AWS validation pipeline.

Verification:

- October 5 recovery verification: backend build and all three boot JARs passed;
  33 unit/HTTP tests passed (22 API/security and 11 domain tests).
- Infrastructure: four tests passed on the recovery run.
- UI: nine security/body-limit tests and TypeScript check passed.
- October 5 resumed work: 36 backend unit/HTTP tests (25 API/security/contract
  and 11 domain) and all three boot JARs passed; 12 storefront tests, TypeScript
  check and generated contract/type consistency check passed.
- October 5 resumed PostgreSQL verification: all nine real integration tests
  passed against isolated PostgreSQL 17.9 containers. Docker Desktop's Linux
  engine is now running (29.8.2). The successful command uses its active pipe and
  a fresh Gradle process. Tests run in UTC and initialize the commerce schema
  explicitly; Spring's test-only Flyway auto-start is disabled. This supersedes
  the earlier recovery-time Docker startup failure.

October 5 pricing slice verification: 43 backend unit/HTTP tests, 18 real
PostgreSQL integration scenarios and all three boot JARs passed. All 19 storefront
tests, TypeScript and generated contract/type consistency checks passed. Refresh
tests cover visible timing, focus/online resume, hidden pause, request sequencing
and denial/cleanup behavior. A local fixture preview returned HTTP 200 and the
BFF reflected a changed price from 20000 to 17000 paise. The SVG/PNG diagram was
rendered and visually inspected. Browser control was unavailable; this does not
constitute real Cognito/browser acceptance or a live staff/provider exercise.

Release gates still open:

- Payment, Amazon Shipping, refund and email/SMS consumers, reservation expiry,
  reconciliation, provider contracts and complete customer lifecycle tests.
- Additional schema initialization/isolation and runtime privilege acceptance,
  authentication/browser acceptance, production database grants,
  TLS/edge/Cognito configuration and deployment actions.
- CDK dependency audit currently reports a high advisory in bundled
  brace-expansion; npm audit fix cannot repair the bundled dependency.
  Resolve the advisory before releasing the infrastructure toolchain.
- Account/provider configuration and alert subscriptions. No AWS deployment or
  customer notifications have been executed. Checkout remains disabled.
- Production pricing scope/permission grants and staff MFA; full browser/device
  acceptance, generated transport SDKs and parent-product variant grouping.

Pricing is deliberately limited to percentage, fixed amount, bundle price and
buy-X-get-Y rules for one SKU, with non-overlapping schedules and no stacking.
See [pricing rules](pricing-rules.md), [SVG](../architecture/pricing-rules.svg)
and [.agents guidance](../../.agents/pricing-rules.md).

Class names describe responsibility; CommerceSchemaInitializer creates and
versions the fresh schema. Flyway's standard db/migration folder is schema
versioning terminology, not an old-application import.

See [restart checkpoint](restart-checkpoint.md) for the recovered working state,
repeatable local commands and the next implementation slices.
