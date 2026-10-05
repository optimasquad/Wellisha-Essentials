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
- Shared OpenAPI foundation for all 12 implemented controller operations;
  generated storefront DTO types used by address, message and shipment screens.
  Contract checks cover controller route parity and real HTTP response shapes.
  Transport client generation and catalog/cart completion remain planned.
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

Class names describe responsibility; CommerceSchemaInitializer creates and
versions the fresh schema. Flyway's standard db/migration folder is schema
versioning terminology, not an old-application import.

See [restart checkpoint](restart-checkpoint.md) for the recovered working state,
repeatable local commands and the next implementation slices.
