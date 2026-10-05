const test = require("node:test");
const { App } = require("aws-cdk-lib");
const { Template } = require("aws-cdk-lib/assertions");
const { WellishaFoundationStack } = require("../dist/lib/wellisha-foundation-stack");
const assert = require("node:assert/strict");
function template() { return Template.fromStack(new WellishaFoundationStack(new App(), "Test", { environment: "production" })); }
test("database is private encrypted protected and backed up", () => {
  template().hasResourceProperties("AWS::RDS::DBInstance", {
    PubliclyAccessible: false, StorageEncrypted: true, DeletionProtection: true, MultiAZ: true, BackupRetentionPeriod: 14,
  });
});
test("every work queue has a DLQ and alarm", () => {
  const t = template(); t.resourceCountIs("AWS::SQS::Queue", 12);
  assert.equal(Object.values(t.findResources("AWS::SQS::Queue")).filter(q => q.Properties.RedrivePolicy).length, 6);
  t.resourceCountIs("AWS::CloudWatch::Alarm", 22);
});
test("services are separate and fail closed before deployment readiness", () => {
  const t = template(); t.resourceCountIs("AWS::ECS::Service", 9);
  for (const service of Object.values(t.findResources("AWS::ECS::Service"))) {
    assert.equal(service.Properties.DesiredCount, 0);
    assert.equal(service.Properties.DeploymentConfiguration.DeploymentCircuitBreaker.Rollback, true);
    assert.equal(service.Properties.NetworkConfiguration.AwsvpcConfiguration.AssignPublicIp, "DISABLED");
  }
});
test("shipping documents have no public access", () => {
  template().hasResourceProperties("AWS::S3::Bucket", { PublicAccessBlockConfiguration: {
    BlockPublicAcls:true, BlockPublicPolicy:true, IgnorePublicAcls:true, RestrictPublicBuckets:true,
  } });
});

