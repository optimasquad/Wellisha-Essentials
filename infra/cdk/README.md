# AWS infrastructure foundation

CDK TypeScript code creates private networking, encrypted/protected PostgreSQL,
immutable ECR repositories, separate ECS service definitions and task roles,
private shipment documents, SQS queues/DLQs, structured-log error metrics and
queue/error alarms routed to an SNS topic.

Run npm ci, npm test and npm run synth. Synthesis/tests create no AWS resources.
Do not deploy this foundation until account/region/cost and release prerequisites
are supplied and reviewed. All services intentionally have desiredCount=0.

An optional CodeConnections/CodePipeline/CodeBuild validation stack is implemented;
it validates code and requires manual review, with no deployment action yet.

Not yet implemented: deployment pipeline actions, domain/TLS/edge, Cognito,
Valkey, database runtime-role initialization/grants, RDS CA distribution and
Secrets Manager rotation automation. Image digests, real permissions/roles and
runtime settings must pass acceptance checks before enabling any service.
The alert topic has no destination subscription yet.

No application deployment has been executed.
