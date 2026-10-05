# Wellisha restart checkpoint

Updated October 6, 2026. Read execution-status.md and commerce-lifecycle.md first.
The code is on `feat/commerce-foundation`, PR #1. The backend Gradle project is
`wellisha-services`; `storefront/` is the independent Next.js UI in the same repo.
This is a new backend with no legacy database import.

Commerce checkout, reservations, Razorpay, packing/Amazon Shipping, refunds,
notifications, reconciliation, variants and prepacked kits are implemented.
Local test evidence and external release gates are recorded in execution-status.md.
Provider setup is intentionally parallel work for the owner: provider-setup.md
lists signup, credentials, Secrets Manager fields, nonsecret task settings and
staging acceptance. No credentials should enter chat, source control or browser
variables. Checkout defaults to disabled and all ECS services to zero tasks.

## Local verification

From storefront: `npm test`, `npm run typecheck`, `npm run contracts:check`.
Browser fixtures: `npm run test:browser` uses installed Chrome headlessly and
starts/stops a localhost preview. This does not validate a genuine Cognito account.
From infra/cdk: `npm test`. From backend, Java 21 and Docker Linux engine:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:GRADLE_USER_HOME = Join-Path (Get-Location).Path '../.tools/gradle-home'
$env:DOCKER_HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine'
$env:Path = 'C:\Users\admin\AppData\Local\Programs\DockerDesktop\resources\bin;' + $env:Path
.\gradlew.bat --no-daemon --offline '-Pkotlin.compiler.execution.strategy=in-process' '-Dorg.gradle.jvmargs=-Xmx1g -XX:MaxMetaspaceSize=768m' test :apps:api:integrationTest bootJar --console=plain
```

Do not reset the working tree or point the initializer at an existing database.
Use schema-only credentials for DDL and restricted runtime credentials for API
and workers. Unknown external outcomes require evidence and reconciliation,
not repeated provider POSTs. Refunds, carrier cancellation and stock returns are
independent actions. See .agents/commerce-lifecycle.md and .agents/pricing-rules.md.
