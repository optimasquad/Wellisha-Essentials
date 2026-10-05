import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as pipeline from "aws-cdk-lib/aws-codepipeline";
import * as actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as build from "aws-cdk-lib/aws-codebuild";
import * as s3 from "aws-cdk-lib/aws-s3";

interface Props extends StackProps { connectionArn: string; owner: string; repository: string; }
export class WellishaValidationPipelineStack extends Stack {
  constructor(scope: Construct,id: string,props: Props) {
    super(scope,id,props);
    if (!/^arn:aws:(codeconnections|codestar-connections):[a-z0-9-]+:[0-9]{12}:connection\/[a-f0-9-]+$/.test(props.connectionArn))
      throw new Error("A real authorized GitHub CodeConnection ARN is required");
    if (![props.owner,props.repository].every(x=>typeof x==="string" && /^[A-Za-z0-9_.-]+$/.test(x))) throw new Error("Invalid GitHub repository");
    const artifacts = new s3.Bucket(this,"ValidationArtifacts", {
      encryption:s3.BucketEncryption.KMS_MANAGED,blockPublicAccess:s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL:true,removalPolicy:RemovalPolicy.RETAIN,
    });
    const source = new pipeline.Artifact();
    const reports = new pipeline.Artifact();
    const project = new build.PipelineProject(this,"ValidationBuild", {
      environment:{buildImage:build.LinuxBuildImage.STANDARD_7_0,privileged:true},
      buildSpec:build.BuildSpec.fromSourceFilename("deployment/buildspec-validate.yml"),
    });
    const flow = new pipeline.Pipeline(this,"ValidationPipeline", {
      artifactBucket:artifacts,pipelineType:pipeline.PipelineType.V2,executionMode:pipeline.ExecutionMode.QUEUED,
    });
    flow.addStage({stageName:"Source",actions:[new actions.CodeStarConnectionsSourceAction({
      actionName:"GitHub",connectionArn:props.connectionArn,owner:props.owner,repo:props.repository,branch:"main",output:source,
    })]});
    flow.addStage({stageName:"Validate",actions:[new actions.CodeBuildAction({
      actionName:"ApplicationAndInfrastructureTests",project,input:source,outputs:[reports],
    })]});
    flow.addStage({stageName:"Review",actions:[new actions.ManualApprovalAction({
      actionName:"ReviewValidationEvidence",
      additionalInformation:"Validation only. Staging/production deployment automation is not yet enabled.",
    })]});
    // Deliberately no deploy action while providers, runtime DB roles and TLS are unfinished.
  }
}
