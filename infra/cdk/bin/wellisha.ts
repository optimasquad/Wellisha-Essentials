import { App } from "aws-cdk-lib";
import { WellishaFoundationStack } from "../lib/wellisha-foundation-stack";
import { WellishaValidationPipelineStack } from "../lib/wellisha-validation-pipeline-stack";
const app = new App();
const environment = app.node.tryGetContext("environment") ?? "staging";
if (!["staging", "production"].includes(environment)) throw new Error("Explicit staging/production environment required");
new WellishaFoundationStack(app, `Wellisha-${environment}`, {
  environment,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? "ap-south-1" },
});
const connectionArn=app.node.tryGetContext("connectionArn");
if(connectionArn) new WellishaValidationPipelineStack(app,"Wellisha-Validation", {
  connectionArn, owner:app.node.tryGetContext("repositoryOwner"),repository:app.node.tryGetContext("repositoryName"),
  env:{account:process.env.CDK_DEFAULT_ACCOUNT,region:process.env.CDK_DEFAULT_REGION??"ap-south-1"},
});
