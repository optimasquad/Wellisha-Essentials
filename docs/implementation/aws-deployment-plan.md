# Wellisha AWS deployment plan

Status: CDK foundation, optional validation pipeline and commerce applications are
implemented locally; AWS deployment has not been performed. Backend:
`wellisha-services` Kotlin/Spring Boot; UI: TypeScript/Next.js; Amazon Shipping
follows Wellisha packing. All services default to zero tasks and checkout disabled.
Follow [provider setup](provider-setup.md) for signup, Secrets Manager inventory,
nonsecret task settings and the parallel owner configuration workstream. See
[execution status](execution-status.md) for tested scope and external release gates.

## Tooling decision

| Tool | Responsibility |
| --- | --- |
| AWS CDK v2, TypeScript | Version-controlled VPC, ECS services, RDS, cache, queues, edge, IAM and deployment stacks |
| AWS CloudFormation | Apply the infrastructure synthesized by CDK and report stack changes |
| AWS CodeConnections | Connect the existing GitHub repository to AWS without repository AWS access keys |
| AWS CodePipeline | Orchestrate validation, staging, production release and approval gates |
| AWS CodeBuild | Run builds/tests/scans, publish images, invoke CDK and orchestrate migration/smoke tasks |
| Amazon ECR | Immutable UI/API/worker/migration container images |
| ECS Fargate | Independent UI, API and queue worker services; one-off migration task |
| CloudWatch | Deployment alarms, health, logs, queues and operational dashboards |

CDK supports TypeScript and synthesizes infrastructure for CloudFormation deployment. [CDK deployment](https://docs.aws.amazon.com/cdk/v2/guide/deploy.html)
AWS supports a GitHub connection source for CodePipeline. [CodeConnections](https://docs.aws.amazon.com/en_en/codepipeline/latest/userguide/connections-github.html)

Use this AWS-native release path as the proposed replacement for the earlier GitHub Actions deployment assumption. GitHub remains source control; PR validation can run there, but only one system owns production releases. CodeDeploy is optional for a later evaluated blue/green design; initial ECS services use rolling deployment with circuit breaker and alarms.

## Files to implement

- infra/cdk/bin/wellisha.ts: entrypoint with validated account/region/environment configuration.
- infra/cdk/lib/network-stack.ts: private subnets, egress, endpoints and security groups.
- infra/cdk/lib/data-stack.ts: RDS PostgreSQL, Valkey, encrypted S3, queues/DLQs and retention.
- infra/cdk/lib/identity-stack.ts: Cognito configuration and separate staff permissions.
- infra/cdk/lib/edge-stack.ts: Route 53, ACM, CloudFront/WAF and ALB configuration.
- infra/cdk/lib/services-stack.ts: task definitions, task roles, health probes, resource limits and autoscaling.
- infra/cdk/lib/pipeline-stack.ts: source connection, scoped build/deploy roles and environment gates.
- deployment/buildspec-validate.yml, buildspec-images.yml, buildspec-release.yml: reproducible build and release commands.
- deployment/release-manifest.schema.json: source commit, contract/schema versions and all immutable image digests.
- deployment/run-migration-task and smoke-test scripts: task completion/exit validation and critical journey checks.
- docs/runbooks/deploy.md, rollback.md, restore.md and shipping-operations.md.

These are planned files; no working pipeline is implied by this document.

## Account, network and bootstrap

Prefer separate nonproduction and production accounts, separate secrets and data, plus scoped cross-account release roles. Mumbai is proposed; verify service availability and approved budget before provisioning. Configure billing/operational contacts and cost alarms. Human bootstrap uses temporary IAM Identity Center credentials.

An authorized operator bootstraps CDK for each target account/region, installs/authorizes the GitHub CodeConnection, and provisions the initial foundation/pipeline stacks. The connection requires an account owner with GitHub installation permissions. Resolve DNS/domain ownership, certificates, Cognito callbacks and approved origin URLs before enabling public traffic.

Put RDS, cache and ECS tasks in private subnets. Only the edge/ALB exposes customer endpoints. Migration tasks reach RDS through their restricted security group; database ports are not publicly opened. Configure outbound provider access for Razorpay and Amazon Shipping without accepting inbound access to tasks. CDN caches public assets/catalog only.

## Release flow

1. A reviewed merge starts a release from one recorded commit. Serialize deployments per environment and prevent an older run overtaking a newer run.
2. Validate Kotlin/Next.js builds, OpenAPI compatibility, dependency/secret scans and CDK synthesis/diff. Run unit tests, real PostgreSQL/Flyway integration tests, WireMock contracts and SQL-injection/ownership regressions. Testcontainers requires a Docker-capable isolated build environment; enable privilege only for the project that needs it.
3. Build UI, API, shared worker and migration images once; scan and push to ECR. Create the release manifest with content digests. Worker profiles retain separate ECS services and IAM roles.
4. Review infrastructure changes and apply compatible foundation changes in staging. Initial foundation creation can use an explicit disabled-service mode until valid application images exist; do not launch placeholder production containers.
5. Start exactly one staging migration Fargate task using the candidate migration digest and migration-only secret/role. Wait for STOPPED, inspect the application container exit code and logs, and fail the pipeline on any error/timeout. Never equate task submission with migration success.
6. Deploy candidate staging services through CDK using the manifest digests. Wait for CloudFormation and ECS stabilization, then execute owned-resource, checkout-pending, packing/booking/tracking, queue and secret-access smoke tests with test providers.
7. Capture reports, infrastructure diff, migration evidence, monitoring and rollback references. Production approval is a planned pipeline gate after staging evidence; it is not a request to deploy now. [CodePipeline approval action](https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html)
8. Promote the exact tested image digests to production without rebuilding. Apply approved compatible infrastructure changes, run one production expand migration, then roll API/workers/UI in the contract-compatible order.
9. Monitor health, API errors/latency, database pool saturation, queue age, booking UNKNOWN attempts and critical transaction outcomes. Verify stability and record the deployed manifest.
10. Run risky backfills as separately monitored jobs. Remove legacy routes/schema only in a later approved contract migration after old clients/workers and queued events are compatible.

Use CDK/CloudFormation as the single owner of task definitions and service image revisions, including app releases via manifest configuration. Do not also deploy the same services using an independent ECS action or console updates, which would create configuration drift.

## Secrets and permissions

CodePipeline/CodeBuild use dedicated IAM service roles and narrowly scoped cross-account roles; no static AWS keys in GitHub. Restrict source/build/upload/deploy permissions and iam:PassRole to exact task/execution roles. Untrusted PR builds have no production access.

Secrets Manager holds environment-specific database credentials, Razorpay secrets and Amazon LWA refresh/client secrets. Only runtime tasks that require a secret can retrieve it; build steps cannot bake secrets into images. The migration task alone has DDL permissions. CDK passes secret ARNs, never plaintext values, into configuration. Release artifacts and labels use private encrypted S3 with retention and restricted access.

## Rollback and recovery

Enable ECS rolling-deployment circuit breaker with rollback; it can restore the last completed deployment after startup/health failure. [ECS circuit breaker](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html)
Add CloudWatch deployment alarms and application smoke gates; healthy containers alone do not prove correct checkout or shipping behavior. The first deployment has no previous healthy revision, so establish and verify the baseline before normal promotion.

Keep prior digests/manifests. Revert app versions only if schema/contracts/events remain backward compatible. Consumers must drain/finish durable work safely on shutdown; rollout cannot drop queue receipts or repeat shipment purchases. Do not automatically undo SQL migrations or customer transactions.

Retain production RDS/S3 resources with deletion protection where supported, backups and documented restore/PITR exercises. Database recovery is an incident workflow with payment/shipment reconciliation, not a routine deployment rollback. CodePipeline failure must block later stages; code and CloudFormation rollback do not reverse provider side effects.

## Implementation milestones and readiness

Extend P02 with container/build preparation and P03 with the migration executable. Start P13 early: foundation/CDK synthesis -> IAM/pipeline bootstrap -> staging deploy -> smoke/rollback rehearsal -> production release gate. Amazon Shipping work is P09, payments P07 and queue foundations P08.

Before live deployment confirm account IDs, region, domain/DNS, GitHub connection, capacity/cost limits, provider sandbox/live credentials and release owner. Verify no public DB access, separate task roles/services, failed-migration stop, immutable promotion, unhealthy-service rollback, Secrets Manager rotation, queue recovery, restore and logs redaction.

Existing 78 planned application/Shipping cases remain. Add deployment acceptance evidence for pipeline serialization, migration task failure, artifact promotion and rollback; mark passed only after real execution.
