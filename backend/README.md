# Wellisha services

`wellisha-services` is the Gradle project in `backend/`, sharing this repository
with the independent Next.js project in `storefront/`. API, worker and schema
initializer remain separate build artifacts and deployment units.

A new Kotlin/Spring Boot application. The schema initializer creates and versions
this application's PostgreSQL schema; it does not import an old application's data.

## Executables

Name classes after their responsibility: Application for executable entry points,
Controller for HTTP handlers, Repository for database access, Configuration for
wiring, and Publisher for queue delivery. Avoid names suggesting an old system
or data transfer. CommerceSchemaInitializer initializes this new application;
Flyway's standard db/migration folder only contains versioned schema SQL.

- WellishaApiApplication: authenticated commerce HTTP API.
- WellishaOutboxRelayApplication: background outbox delivery to SQS.
- CommerceSchemaInitializer: runs versioned Flyway schema SQL once and exits.
- CognitoApiSecurityConfiguration: Cognito access-token validation and API rules.
- CustomerAddressRepository: owned customer/address SQL.
- OrderAndShipmentRepository: initial order/shipment/notification read and write SQL.
- SqsOutboxPublisher: leases durable events, publishes, records progress.
- RequestLoggingFilter: correlation IDs and redacted request metrics.
- ApiExceptionHandler: safe error responses and structured diagnostic logs.
- PostgresDataSourceConfiguration: local test or AWS secret-backed connection pool.

## Build and local execution

Requires Java 21. Use the checked-in Gradle wrapper:
`./gradlew test bootJar` (Windows: `gradlew.bat`).
`./gradlew :apps:api:integrationTest` requires Docker and exercises real PostgreSQL;
it fails when Docker is missing rather than silently skipping tests.

Start isolated PostgreSQL with `docker compose -f local/compose.yaml up -d`.
Set variables from .env.example in your shell; these values are local-only.
Run `:apps:schema:bootRun` once, then `:apps:api:bootRun`.
Do not point the initializer at an existing database. AWS initialization must use
the schema-only role; API/worker roles need separate restricted credentials.

The API requires genuine Cognito access tokens. There is no development bypass.
Next.js can enable Cognito sign-in plus the /api/commerce BFF with explicit
COGNITO_* and COMMERCE_API_URL settings. Existing NextAuth sessions do not become
Cognito access tokens. Tokens expire safely; token refresh/account linking is
not implemented yet.

The outbox relay requires WORKER_MODE=outbox-relay and configured SQS queue URLs.
The worker artifact also supports payment, shipping, refund, email and sms modes,
each with its own QUEUE_URL_<MODE>. Quotes, timed reservations, Razorpay capture,
packing, Amazon purchase/private labels/tracking/cancellation, refunds and opted-in
SES/SNS notifications are implemented. See [lifecycle](../docs/implementation/commerce-lifecycle.md)
and [provider setup](../docs/implementation/provider-setup.md) for exact configuration
and recovery. Legacy unsafe create/verify endpoints return 503. Checkout defaults
to disabled until genuine account/provider acceptance and deployment gates pass.

## Security/observability

The implemented wire contract lives in [contracts/openapi.json](contracts/openapi.json).
See [contract workflow](contracts/README.md) for generated storefront DTO types
and the route/HTTP response compatibility tests. Generated DTOs and transport,
product variants/prepacked kits and fixture browser acceptance are implemented.
Genuine Cognito/provider acceptance remains external work.

Catalog/category/detail reads and owned cart operations now use API-controlled
pricing. See [pricing rules](../docs/implementation/pricing-rules.md) for the four
simple scheduled rule types, permission-scoped configuration read/write API,
audit/version behavior, UI refresh and operator examples. Same-SKU offers do not
stack. Stock is not reserved by a cart or quote; accepted orders reserve stock.
Provider acceptance keeps checkout disabled. The product list is a paged envelope
in contract version 0.3.0. Variants and prepacked kits are independent sellable SKUs.

All repository values use JDBC parameters. Private responses use no-store.
Credentials are never logged or included in API errors. Logs include correlation,
status, duration and safe exception type/frame information. Outside local/test,
database credentials must come from AWS Secrets Manager and PostgreSQL requires
sslmode=verify-full (supply the RDS CA certificate). Secrets are loaded at startup;
rotation currently requires restarting tasks so pools use the new credentials.

Schema SQL has a dedicated commerce namespace. No runtime DDL is run by API/workers.
Production roles/grants, secret rotation tests and live provider tests are release
gates, not completed features.
