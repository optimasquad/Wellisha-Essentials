import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";

export interface WellishaFoundationProps extends StackProps { environment: "staging" | "production"; }
export class WellishaFoundationStack extends Stack {
  constructor(scope: Construct, id: string, props: WellishaFoundationProps) {
    super(scope, id, props);
    const production = props.environment === "production";
    const vpc = new ec2.Vpc(this, "Network", {
      maxAzs: 2, natGateways: production ? 2 : 1,
      subnetConfiguration: [
        { name: "edge", subnetType: ec2.SubnetType.PUBLIC },
        { name: "application", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        { name: "database", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
    });
    const cluster = new ecs.Cluster(this, "EcsCluster", { vpc });
    const alertTopic = new sns.Topic(this, "OperationalAlerts", { enforceSSL: true });
    // Subscription destinations are supplied by the release owner; no unsolicited emails are configured.
    new CfnOutput(this, "AlertTopicArn", { value: alertTopic.topicArn });
    const dbSg = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", { vpc, allowAllOutbound: false });
    const apiSg = new ec2.SecurityGroup(this, "ApiSecurityGroup", { vpc });
    const workerSg = new ec2.SecurityGroup(this, "WorkerSecurityGroup", { vpc });
    const schemaSg = new ec2.SecurityGroup(this, "SchemaSecurityGroup", { vpc });
    for (const sg of [apiSg, workerSg, schemaSg]) dbSg.addIngressRule(sg, ec2.Port.tcp(5432), "Only named application tasks");
    const db = new rds.DatabaseInstance(this, "Postgres", {
      vpc, vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }, securityGroups: [dbSg],
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_17_6 }),
      credentials: rds.Credentials.fromGeneratedSecret("wellisha_schema"),
      databaseName: "wellisha", instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      storageEncrypted: true, publiclyAccessible: false, multiAz: production,
      backupRetention: Duration.days(production ? 14 : 3), deletionProtection: production,
      removalPolicy: RemovalPolicy.RETAIN, allocatedStorage: 20, maxAllocatedStorage: 100,
    });
    const documents = new s3.Bucket(this, "PrivateShipmentDocuments", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED, enforceSSL: true,
      versioned: true, removalPolicy: RemovalPolicy.RETAIN,
    });
    const roles: Record<string, iam.Role> = {};
    const repositories: Record<string, ecr.Repository> = {};
    for (const app of ["web", "api", "worker", "schema"]) {
      repositories[app] = new ecr.Repository(this, `${app}Repository`, {
        imageScanOnPush: true, imageTagMutability: ecr.TagMutability.IMMUTABLE,
        removalPolicy: RemovalPolicy.RETAIN,
      });
    }
    const apiSecret = new secrets.Secret(this, "ApiDatabaseSecret", {
      generateSecretString: { secretStringTemplate: '{"username":"wellisha_api"}', generateStringKey: "password", excludePunctuation: true },
    });
    const workerSecret = new secrets.Secret(this, "WorkerDatabaseSecret", {
      generateSecretString: { secretStringTemplate: '{"username":"wellisha_worker"}', generateStringKey: "password", excludePunctuation: true },
    });
    const queues: Record<string, sqs.Queue> = {};
    for (const kind of ["payment", "shipping", "refund", "email", "sms", "catalog-media"]) {
      const dlq = new sqs.Queue(this, `${kind}DeadLetterQueue`, {
        encryption: sqs.QueueEncryption.SQS_MANAGED, enforceSSL: true, retentionPeriod: Duration.days(14),
      });
      queues[kind] = new sqs.Queue(this, `${kind}Queue`, {
        encryption: sqs.QueueEncryption.SQS_MANAGED, enforceSSL: true,
        visibilityTimeout: Duration.minutes(5), retentionPeriod: Duration.days(4),
        deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
      });
      const dlqAlarm = new cloudwatch.Alarm(this, `${kind}DlqAlarm`, {
        metric: dlq.metricApproximateNumberOfMessagesVisible(), threshold: 1, evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      dlqAlarm.addAlarmAction(new actions.SnsAction(alertTopic));
      const ageAlarm = new cloudwatch.Alarm(this, `${kind}QueueAgeAlarm`, {
        metric: queues[kind].metricApproximateAgeOfOldestMessage(), threshold: 300, evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      ageAlarm.addAlarmAction(new actions.SnsAction(alertTopic));
    }
    // Definitions only: desiredCount=0 / no public ingress until schema roles,
    // identity, TLS routing and application release gates have passed.
    for (const service of ["web", "api", "outbox-relay", "payment", "shipping", "refund", "email", "sms", "catalog-media", "schema"]) {
      const role = new iam.Role(this, `${service}TaskRole`, { assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com") });
      roles[service] = role;
      const group = new logs.LogGroup(this, `${service}Logs`, {
        retention: production ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.RETAIN,
      });
      const errors = new logs.MetricFilter(this, `${service}ErrorMetric`, {
        logGroup: group, filterPattern: logs.FilterPattern.literal('{ $.log.level = "ERROR" }'),
        metricNamespace: "Wellisha", metricName: `${props.environment}-${service}-Errors`, metricValue: "1",
      });
      const alarm = new cloudwatch.Alarm(this, `${service}ErrorAlarm`, {
        metric: errors.metric({ statistic: "Sum", period: Duration.minutes(5) }), threshold: 5, evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      alarm.addAlarmAction(new actions.SnsAction(alertTopic));
      const task = new ecs.FargateTaskDefinition(this, `${service}Task`, {
        taskRole: role, cpu: service === "web" ? 512 : 256, memoryLimitMiB: service === "web" ? 1024 : 512,
      });
      const repo = repositories[service === "web" ? "web" : service === "api" ? "api" : service === "schema" ? "schema" : "worker"];
      const digest = this.node.tryGetContext(`imageDigest-${service}`);
      if (digest !== undefined && !/^sha256:[0-9a-f]{64}$/.test(digest)) throw new Error("Image must be a validated immutable digest");
      const environment: Record<string, string> = {
        DATABASE_JDBC_URL: `jdbc:postgresql://${db.dbInstanceEndpointAddress}:5432/wellisha?sslmode=verify-full`,
        CHECKOUT_ENABLED: "false",
      };
      if (service === "api") {
        environment.DATABASE_SECRET_ARN = apiSecret.secretArn;
        apiSecret.grantRead(role);
      } else if (service !== "web" && service !== "schema") {
        environment.DATABASE_SECRET_ARN = workerSecret.secretArn;
        workerSecret.grantRead(role);
      }
      const modes = ["payment", "shipping", "refund", "email", "sms"];
      if (modes.includes(service)) {
        environment.WORKER_MODE = service;
        environment[`QUEUE_URL_${service.toUpperCase()}`] = queues[service].queueUrl;
      }
      const paymentArn = this.node.tryGetContext("razorpaySecretArn");
      const shippingArn = this.node.tryGetContext("amazonShippingSecretArn");
      const grantProvider = (arn: unknown, key: string) => {
        if (arn === undefined) return; // desiredCount=0 until the release owner supplies configuration.
        if (typeof arn !== "string" || !/^arn:aws:secretsmanager:[a-z0-9-]+:\d{12}:secret:[A-Za-z0-9/_+=.@-]+$/.test(arn)) throw new Error("Invalid provider secret ARN");
        environment[key] = arn;
        secrets.Secret.fromSecretCompleteArn(this, `${service}-${key}`, arn).grantRead(role);
      };
      if (["api", "payment", "refund"].includes(service)) grantProvider(paymentArn, "RAZORPAY_SECRET_ARN");
      if (service === "shipping") grantProvider(shippingArn, "AMAZON_SHIPPING_SECRET_ARN");
      if (["api", "shipping"].includes(service)) environment.SHIPMENT_DOCUMENT_BUCKET = documents.bucketName;
      if (service === "api") documents.grantRead(role);
      if (service === "email") role.addToPolicy(new iam.PolicyStatement({ actions: ["ses:SendEmail"], resources: [`arn:aws:ses:${this.region}:${this.account}:identity/*`] }));
      if (service === "sms") {
        // Direct phone-number publishing requires Resource '*'; deny all topic ARNs.
        role.addToPolicy(new iam.PolicyStatement({ actions: ["sns:Publish"], resources: ["*"] }));
        role.addToPolicy(new iam.PolicyStatement({ effect: iam.Effect.DENY, actions: ["sns:Publish"], resources: ["arn:aws:sns:*:*:*"] }));
      }
      if (service === "outbox-relay") {
        environment.WORKER_MODE = "outbox-relay";
        for (const [kind, queue] of Object.entries(queues)) {
          environment[`QUEUE_URL_${kind.toUpperCase().replaceAll("-", "_")}`] = queue.queueUrl;
          queue.grantSendMessages(role);
        }
      }
      if (queues[service]) queues[service].grantConsumeMessages(role);
      if (service === "shipping") documents.grantReadWrite(role);
      if (service === "schema") {
        environment.DATABASE_SECRET_ARN = db.secret!.secretArn;
        db.secret!.grantRead(role);
        apiSecret.grantRead(role); workerSecret.grantRead(role);
      }
      const container = task.addContainer("app", {
        image: ecs.ContainerImage.fromEcrRepository(repo, digest ?? "bootstrap-not-runnable"),
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: service, logGroup: group }), environment,
      });
      if (service === "web" || service === "api") container.addPortMappings({ containerPort: service === "web" ? 3000 : 8080 });
      if (service !== "schema") new ecs.FargateService(this, `${service}Service`, {
        cluster, taskDefinition: task, desiredCount: 0,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [service === "web" ? new ec2.SecurityGroup(this, "WebSecurityGroup", { vpc }) : service === "api" ? apiSg : workerSg],
        circuitBreaker: { rollback: true }, assignPublicIp: false,
      });
    }
    new CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new CfnOutput(this, "DatabaseHost", { value: db.dbInstanceEndpointAddress });
    new CfnOutput(this, "DocumentsBucket", { value: documents.bucketName });
    new CfnOutput(this, "ApiSecretArn", { value: apiSecret.secretArn });
    // DB grants, RDS CA, Cognito, cache, edge/TLS and deploy pipeline remain explicit follow-up work.
  }
}
