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

test("provider configuration reaches only consuming tasks", () => {
  const app = new App({context:{razorpaySecretArn:"arn:aws:secretsmanager:ap-south-1:123456789012:secret:wellisha/razorpay-abcdef",amazonShippingSecretArn:"arn:aws:secretsmanager:ap-south-1:123456789012:secret:wellisha/shipping-abcdef"}});
  const t = Template.fromStack(new WellishaFoundationStack(app,"Configured",{environment:"staging"}));
  const consumers={RAZORPAY_SECRET_ARN:[],AMAZON_SHIPPING_SECRET_ARN:[]};
  for(const task of Object.values(t.findResources("AWS::ECS::TaskDefinition")))for(const container of task.Properties.ContainerDefinitions){
    const env=Object.fromEntries((container.Environment||[]).map(value=>[value.Name,value.Value]));
    const service=container.LogConfiguration.Options["awslogs-stream-prefix"];
    for(const key of Object.keys(consumers))if(env[key])consumers[key].push(service);
    if(["payment","shipping","refund","email","sms"].includes(service))assert.equal(env.WORKER_MODE,service);
  }
  assert.deepEqual(consumers.RAZORPAY_SECRET_ARN.sort(),["api","payment","refund"]);
  assert.deepEqual(consumers.AMAZON_SHIPPING_SECRET_ARN,["shipping"]);
});

test("provider secret configuration rejects plaintext credentials",()=>{
  const app=new App({context:{razorpaySecretArn:"plaintext-key"}});
  assert.throws(()=>new WellishaFoundationStack(app,"InvalidSecret",{environment:"staging"}),/Invalid provider secret ARN/);
});
