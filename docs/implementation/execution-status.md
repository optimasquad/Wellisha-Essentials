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
- Independent ECS service definitions, private encrypted RDS/S3, SQS/DLQs,
  CloudWatch alarms and optional AWS validation pipeline.

Verification:

- Backend build: passed; 23 unit/HTTP tests passed.
- Infrastructure: four tests passed, including a rerun after the log-filter correction.
- UI: three security tests and TypeScript check passed.
- Nine real PostgreSQL integration tests are written; execution failed because
  Docker is unavailable. They are not reported as passing.

Release gates still open:

- Payment, Amazon Shipping, refund and email/SMS consumers, reservation expiry,
  reconciliation, provider contracts and complete customer lifecycle tests.
- Real PostgreSQL integration execution, authentication/browser acceptance,
  production database grants, TLS/edge/Cognito configuration and deployment actions.
- CDK dependency audit currently reports a high advisory in bundled
  brace-expansion; npm audit fix cannot repair the bundled dependency.
  Resolve the advisory before releasing the infrastructure toolchain.
- Account/provider configuration and alert subscriptions. No AWS deployment or
  customer notifications have been executed. Checkout remains disabled.

Class names describe responsibility; CommerceSchemaInitializer creates and
versions the fresh schema. Flyway's standard db/migration folder is schema
versioning terminology, not an old-application import.
