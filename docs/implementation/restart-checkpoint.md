# Wellisha restart checkpoint

Saved October 5, 2026 after recovering from the system crash.

## Agreed direction

Keep the TypeScript/Next.js website in `storefront/`. Build the new commerce
backend in Kotlin/Spring Boot with PostgreSQL. Deploy the API, outbox relay and
schema initializer independently using the AWS definitions in `infra/cdk/`.
Use one repository with independent UI and service projects; the Gradle project
in `backend/` is named `wellisha-services`.
Cognito access tokens authenticate commerce requests. Razorpay payments,
Amazon Shipping and asynchronous notifications remain planned integrations.
This is a fresh backend; no old database import is part of initialization.

The architecture diagrams show the target system, not proof that every service
is implemented. [Execution status](execution-status.md) is the current result
record; [code plan](code-plan.md) gives the dependency ordering.

## Recovered work

- The tracked storefront rename survived. References now point to `storefront`,
  and the curated PNGs and supplied video are under `storefront/public/media`.
  Remaining old folders contain local artifacts, not the active source tree.
- Address editing uses backend version checks. Account screens isolate results
  by customer; aborted requests cannot change the next customer's login state.
- Order/tracking polling runs sequentially, stops on access denial, and handles
  temporarily missing tracking without inventing delivery estimates.
- The API bounds JSON bodies before parsing. The BFF now counts streamed bytes
  before decoding instead of buffering an unlimited body. Both enforce 16 KB
  and reject compressed bodies. Origin checks precede mutation-body reads.
- Prisma client generation uses its portable default output path. No database
  initialization, seeding, AWS deployment or provider calls were run in recovery.

These changes remain in the local working tree together with the pre-crash work.
Do not reset or overwrite it when resuming.

## Verification and local commands

From `storefront/`: `npm test` and `npm run typecheck` passed (nine tests).
From `infra/cdk/`: `npm test` passed (four tests).

From `backend/`, `gradlew.bat --offline test bootJar --console=plain` passed
(33 unit/HTTP tests and API/schema/worker artifacts). A forced rerun verified the
recovered tests; the final run also included the two new HTTP filter-chain cases.

The machine's JAVA_HOME pointed at the JDK's `bin` folder. Recovery used a
session-only correction; future shells may still need:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:GRADLE_USER_HOME = Join-Path (Get-Location).Path '../.tools/gradle-home'
.\gradlew.bat --offline test bootJar --console=plain
```

Run those commands from `backend/`. The Gradle cache is local to the workspace.
Real PostgreSQL integration tests still require a working Docker Linux engine.
The subsequent October 5 check found Docker CLI 29.8.2 installed at
`C:\Users\admin\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`.
The current terminal had an older PATH, so the integration rerun added that
directory to its session PATH. Docker Desktop reports that it cannot start;
WSL is missing and the startup log reports Virtual Machine Platform not enabled.
The integration task failed during container initialization, before the nine
PostgreSQL scenarios could execute. No database container was initialized.
Browser/Cognito acceptance has not been verified in recovery.

The resumed October 5 run supersedes that Docker failure: Docker Desktop now
reports a running Linux engine, and all nine real PostgreSQL scenarios passed.
The default `docker_engine` pipe failed access; use the active Desktop pipe and
a fresh Gradle process. The first database connection also exposed a host
timezone alias rejected by PostgreSQL. Gradle test JVMs now use UTC; the
integration fixture disables automatic Flyway startup and initializes its
isolated commerce schema before each test.

Successful integration command from `backend/`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:Path = 'C:\Users\admin\AppData\Local\Programs\DockerDesktop\resources\bin;' + $env:Path
$env:DOCKER_HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine'
$env:GRADLE_USER_HOME = Join-Path (Get-Location).Path '../.tools/gradle-home'
.\gradlew.bat --no-daemon --offline :apps:api:integrationTest --console=plain
```

Use a terminal with Docker pipe access. The test suite initializes disposable
Testcontainers databases only; no application database or AWS resource was changed.

## Next implementation slices

The subsequent pricing/catalog/cart slice is complete for the documented first
scope: four simple same-SKU scheduled offer types, configuration read/write API
with both scope and server-owned permission, price versions/audit, bounded paged
catalog and detail/category reads, owned cart CRUD and automatic commerce-mode
UI refresh. Current verification is 43 backend unit/HTTP tests, 18 PostgreSQL
scenarios, 19 storefront tests, TypeScript and all three backend boot JARs passed.
The local fixture BFF reflected a changed price; refresh scheduling has executable
tests. Browser control was unavailable, so real Cognito/browser acceptance remains
open. See [pricing policy](pricing-rules.md), [diagram](../architecture/pricing-rules.svg)
and [.agents guidance](../../.agents/pricing-rules.md) before extending offers.

October 5 resumed work added `backend/contracts/openapi.json` and generated
storefront DTO types. All 12 currently implemented controller operations are
documented with authentication, address versions, list limits, body limits,
nullable shipment fields and disabled checkout behavior. The account address,
message and shipment screens import generated types and keep runtime JSON checks.
Three backend HTTP contract tests and three storefront contract checks passed.
Backend unit/HTTP total is now 36; storefront total is 12. TypeScript, generated
type consistency and all three backend boot JARs passed. See
[contract workflow](../../backend/contracts/README.md) for update commands.
Transport client generation, catalog/cart and browser acceptance remain open.

1. P03/P04: extend the now-passing PostgreSQL suite with repeat initialization,
   unrelated-schema isolation and restricted runtime privilege acceptance.
2. P05/P12: complete parent-product/variant grouping and generated transport SDKs;
   verify genuine browser/Cognito shopping and staff pricing journeys. Initial
   paged catalog/cart APIs and automatic pricing refresh are now implemented.
3. P06/P08: add explicit stock reservation expiry and retry/reconciliation
   behavior before connecting payment processing.
4. P07/P09/P11: implement signed payment intake, Amazon Shipping packing and
   tracking, and isolated notification consumers with provider contract tests.

Checkout remains disabled until its reservation, payment and provider acceptance
gates pass. Production grants, deployment configuration, provider accounts and
the previously recorded CDK audit advisory also remain open.
