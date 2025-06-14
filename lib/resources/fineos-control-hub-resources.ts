import { readFileSync } from "fs";
import { load } from "js-yaml";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { aws_lambda_nodejs as lambdaNode } from "aws-cdk-lib";
import { aws_dynamodb as dynamodb } from "aws-cdk-lib";
import { aws_codebuild as codebuild } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { aws_s3_deployment as s3Deploy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { HubWorkflow } from "../step-function/hub-workflow";
import { CCHRoles } from "../fineos-cloud-control-hub-roles";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  ILogging,
  CCHLogging,
  CCHKinesisLogging,
} from "../fineos-cloud-control-hub-logging";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { FineosCloudControlHubStackProps } from "../fineos-cloud-control-hub-stack";

export function FineosControlHubResources(
  scope: Construct,
  instanceName: string,
  account: string,
  region: string,
  props: FineosCloudControlHubStackProps,
  extra: {
    fixedLambdaRuntime: Runtime;
    matopicARN: string;
    cchVersion: string;
    deploymentZone: string;
  }
) {
  //Create a bucket to hold template file
  const fcchArtifactBucket: s3.IBucket = new s3.Bucket(
    scope,
    "ArtefactBucket",
    {
      bucketName: `${instanceName}-${region}-${props.zone.toLowerCase()}-cch-artefacts`,
      versioned: true,
      autoDeleteObjects: true,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
    }
  );

  //TOF S3 Bucket to fetch validation errors summary from
  const tofbucketName = `${instanceName}-${region}-${props.zone.toLowerCase()}-fcn-cdk-artefact-bucket`;
  const tofArtifactBucket = s3.Bucket.fromBucketName(
    scope,
    "TOFArtefactBucket",
    tofbucketName
  );

  const cchRoles = new CCHRoles(
    scope,
    region,
    account,
    instanceName,
    fcchArtifactBucket,
    tofArtifactBucket,
    extra.matopicARN
  );
  let cchLogger: ILogging = new CCHLogging(
    scope,
    `${instanceName}-cch-disable-logging`,
    props.observability.endpoint,
    instanceName,
    region,
    account,
    cchRoles.getCCHLambdaExecutionRole(),
    cchRoles.getCCHSubscriptionFilterRole(),
    extra.cchVersion
  );
  if (props.observability.zones) {
    for (let zone of props.observability.zones) {
      if (zone === extra.deploymentZone) {
        cchLogger = new CCHKinesisLogging(
          scope,
          `${instanceName}-cch-kinesis-logging`,
          props.observability.endpoint,
          instanceName,
          region,
          account,
          cchRoles.getCCHLambdaExecutionRole(),
          cchRoles.getCCHSubscriptionFilterRole(),
          extra.cchVersion
        );
      }
    }
  }

  //Define a function to retrieve ExecutionFailed events
  const getExecutionFailedFunction = new NodejsFunction(
    scope,
    "GetExecutionFailedLambda",
    {
      runtime: extra.fixedLambdaRuntime,
      entry: "lambda/getExecutionFailed.js",
      handler: "handler",
      description:
        "Retrieves ExecutionFailed event from failed step function execution",
      functionName: `${instanceName}-cch-get-executionfailed`,
      timeout: Duration.seconds(60),
      role: cchRoles.getCCHLambdaExecutionRole(),
      tracing: cchLogger.getLambdaLogSettings(),
      environment: {
        STAGE_PREFIX: instanceName,
        REGION: region,
        ACCOUNT: account,
        CCH_VERSION: extra.cchVersion,
        KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
      },
    }
  );
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-get-executionfailed`,
    getExecutionFailedFunction.logGroup
  );

  //Define a function to handle failed workflows
  const sfnFailureFunction = new NodejsFunction(scope, "FailWorkflowLambda", {
    runtime: extra.fixedLambdaRuntime,
    entry: "lambda/failWorkflow.js",
    handler: "handler",
    description:
      "Raises error to stop step function, if issue found on previous tasks.",
    functionName: `${instanceName}-cch-fail-step`,
    timeout: Duration.seconds(30),
    role: cchRoles.getCCHLambdaExecutionRole(),
    tracing: cchLogger.getLambdaLogSettings(),
    environment: {
      STAGE_PREFIX: instanceName,
      REGION: region,
      ACCOUNT: account,
      CCH_VERSION: extra.cchVersion,
      KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
    },
  });
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-fail-step`,
    sfnFailureFunction.logGroup
  );

  //Define a function to iterate through the template file stages and tasks
  const sfnIterate = new NodejsFunction(scope, "IterateTasksLambda", {
    runtime: extra.fixedLambdaRuntime,
    entry: "lambda/iterateTasks.js",
    handler: "handler",
    description: "Iterates though stages and tasks of Hub template",
    functionName: `${instanceName}-cch-iterate`,
    timeout: Duration.seconds(30),
    role: cchRoles.getCCHLambdaExecutionRole(),
    tracing: cchLogger.getLambdaLogSettings(),
    environment: {
      STAGE_PREFIX: instanceName,
      REGION: region,
      ACCOUNT: account,
      CCH_VERSION: extra.cchVersion,
      KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
    },
  });
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-iterate`,
    sfnIterate.logGroup
  );

  //Define a function to return stages length
  const sfnSize = new NodejsFunction(scope, "GetSizeLambda", {
    runtime: extra.fixedLambdaRuntime,
    entry: "lambda/getSize.js",
    handler: "handler",
    description: "Get the size of an input array",
    functionName: `${instanceName}-cch-get-size`,
    timeout: Duration.seconds(30),
    role: cchRoles.getCCHLambdaExecutionRole(),
    tracing: cchLogger.getLambdaLogSettings(),
    environment: {
      STAGE_PREFIX: instanceName,
      REGION: region,
      ACCOUNT: account,
      CCH_VERSION: extra.cchVersion,
      KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
    },
  });
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-get-size`,
    sfnSize.logGroup
  );

  //Reference TOF Dynamo table that holds customer account config
  const customerConfigTable = dynamodb.Table.fromTableName(
    scope,
    "CustomerAccountConfigTable",
    `${props.instanceName}-fcn-vending-customer-account-config`
  );

  //Reference the IAM role for the CodeBuild customer repo project
  const codeBuildRoleArn = `arn:aws:iam::${props.env?.account}:role/${props.roles.vending}`;
  const codeBuildRole = iam.Role.fromRoleArn(
    scope,
    "CodeBuildDeployerRole",
    codeBuildRoleArn,
    {
      mutable: false,
    }
  );

  //Define a CodeBuild project to retrieve template file from customer repo
  const packageCustomerRepoProject = new codebuild.Project(
    scope,
    "CCHPackageCustomerRepo",
    {
      buildSpec: codebuild.BuildSpec.fromObject(
        load(
          readFileSync("lib/code-build/package-customer-repo.yaml", "utf8")
        ) as any
      ),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      role: codeBuildRole,
      description: "Package a customer repo and copy to the artifact bucket",
      projectName: `${instanceName}-CCHPackageCustomerRepo`,
    }
  );

  //Copy template schema file to S3 bucket
  new s3Deploy.BucketDeployment(scope, "deployTemplateSchema", {
    sources: [s3Deploy.Source.asset("./lib/schema")],
    destinationBucket: fcchArtifactBucket,
  });

  //Define a function to validate template file
  const sfnValidateTemplate = new lambdaNode.NodejsFunction(
    scope,
    "validateTemplateLambda",
    {
      runtime: extra.fixedLambdaRuntime,
      entry: "lambda/validateTemplate.js",
      handler: "handler",
      description: "Validate template file",
      functionName: `${instanceName}-cch-validate-template`,
      timeout: Duration.seconds(30),
      role: cchRoles.getCCHLambdaExecutionRole(),
      tracing: cchLogger.getLambdaLogSettings(),
      environment: {
        STAGE_PREFIX: instanceName,
        REGION: region,
        ACCOUNT: account,
        CCH_VERSION: extra.cchVersion,
        KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
      },
    }
  );
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-validate-template`,
    sfnValidateTemplate.logGroup
  );

  //Define a function to handle event bus events
  const sfnEventBusHandler = new NodejsFunction(scope, "eventHubHandler", {
    runtime: extra.fixedLambdaRuntime,
    entry: "lambda/eventHubHandler.js",
    handler: "handler",
    description: "Handles Central Event Bus events.",
    functionName: `${instanceName}-cch-event-hub-handler`,
    timeout: Duration.seconds(120),
    role: cchRoles.getCCHEventHubLambdaRole(),
    tracing: cchLogger.getLambdaLogSettings(),
    environment: {
      //   CENTRAL_HUB_ACCOUNT_ID: deploymentDetails.CentralHubAccountId,
      STAGE_PREFIX: instanceName,
      CCH_VERSION: extra.cchVersion,
      KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
    },
  });

  //Define a function to validate TOF version
  const sfnValidateTOF = new lambdaNode.NodejsFunction(
    scope,
    "validateTOFLambda",
    {
      runtime: extra.fixedLambdaRuntime,
      entry: "lambda/validateTOFVersion.js",
      handler: "handler",
      description: "Validate TOF version",
      functionName: `${instanceName}-cch-validate-tof`,
      timeout: Duration.seconds(30),
      environment: {
        STAGE_PREFIX: instanceName,
        CCH_VERSION: extra.cchVersion,
        KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
      },
      role: cchRoles.getCCHLambdaExecutionRole(),
      tracing: cchLogger.getLambdaLogSettings(),
    }
  );
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-validate-tof`,
    sfnValidateTOF.logGroup
  );

  //Define a function to check email subscriptions
  const sfnValidateEmails = new lambdaNode.NodejsFunction(
    scope,
    "validateEmailsLambda",
    {
      runtime: extra.fixedLambdaRuntime,
      entry: "lambda/validateEmails.js",
      handler: "handler",
      description: "Validate email subscriptions",
      functionName: `${instanceName}-cch-validate-emails`,
      timeout: Duration.seconds(30),
      role: cchRoles.getCCHLambdaExecutionRole(),
      tracing: cchLogger.getLambdaLogSettings(),
      environment: {
        SNS_TOPIC_ARN: extra.matopicARN,
        STAGE_PREFIX: instanceName,
        REGION: region,
        ACCOUNT: account,
        CCH_VERSION: extra.cchVersion,
        KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
      },
    }
  );
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-validate-emails`,
    sfnValidateEmails.logGroup
  );

  //Define a function to read template from S3
  const sfnReadS3 = new NodejsFunction(scope, "readS3Lambda", {
    runtime: extra.fixedLambdaRuntime,
    entry: "lambda/readS3.js",
    handler: "handler",
    description: "Read template file from S3",
    functionName: `${instanceName}-cch-read-S3`,
    timeout: Duration.seconds(30),
    role: cchRoles.getCCHLambdaExecutionRole(),
    tracing: cchLogger.getLambdaLogSettings(),
    environment: {
      STAGE_PREFIX: instanceName,
      REGION: region,
      ACCOUNT: account,
      CCH_VERSION: extra.cchVersion,
      KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
    },
  });
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-read-S3`,
    sfnReadS3.logGroup
  );

  const sfnValidateTemplateDependencies = new lambdaNode.NodejsFunction(
    scope,
    "validateTemplateDependenciesLambda",
    {
      runtime: extra.fixedLambdaRuntime,
      entry: "lambda/validateTemplateDependency.js",
      handler: "handler",
      description: "Validate app dependencies from template",
      functionName: `${instanceName}-cch-validate-template-dependencies`,
      timeout: Duration.seconds(30),
      role: cchRoles.getCCHLambdaExecutionRole(),
      tracing: cchLogger.getLambdaLogSettings(),
      environment: {
        STAGE_PREFIX: instanceName,
        REGION: region,
        ACCOUNT: account,
        CCH_VERSION: extra.cchVersion,
        KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
      },
    }
  );
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-validate-dependencies`,
    sfnValidateTemplateDependencies.logGroup
  );

  //Define a function to log validation erros summary for CCh tasks to New Relic
  const logValidationErrorsSummary = new lambdaNode.NodejsFunction(
    scope,
    "logValidationSummaryLambda",
    {
      runtime: extra.fixedLambdaRuntime,
      entry: "lambda/logValidationSummary.js",
      handler: "handler",
      description: "Log Validation Errors Summary to New Relic",
      functionName: `${instanceName}-cch-log-validation-summary`,
      timeout: Duration.seconds(30),
      role: cchRoles.getCCHLambdaExecutionRole(),
      tracing: cchLogger.getLambdaLogSettings(),
      environment: {
        SNS_TOPIC_ARN: extra.matopicARN,
        STAGE_PREFIX: instanceName,
        REGION: region,
        ACCOUNT: account,
        CCH_VERSION: extra.cchVersion,
        CUSTOMER_REPO_BUCKET: tofbucketName,
        KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
      },
    }
  );
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-log-validation-summary`,
    logValidationErrorsSummary.logGroup
  );

  //Define a function to set envPrefix to each task in the template
  const setEnvPrefix = new lambdaNode.NodejsFunction(scope, "setEnvPrefix", {
    runtime: extra.fixedLambdaRuntime,
    entry: "lambda/setEnvPrefix.js",
    handler: "handler",
    description: "Set envPrefix to each task in the template",
    functionName: `${instanceName}-cch-set-envprefix`,
    timeout: Duration.seconds(30),
    role: cchRoles.getCCHLambdaExecutionRole(),
    tracing: cchLogger.getLambdaLogSettings(),
    environment: {
      SNS_TOPIC_ARN: extra.matopicARN,
      STAGE_PREFIX: instanceName,
      REGION: region,
      ACCOUNT: account,
      CCH_VERSION: extra.cchVersion,
      CUSTOMER_REPO_BUCKET: tofbucketName,
      KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
    },
  });
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-set-envprefix`,
    setEnvPrefix.logGroup
  );

  //Define a function to log environment execution status to New Relic
  const logEnvStatus = new lambdaNode.NodejsFunction(
    scope,
    "logEnvExecutionStatus",
    {
      runtime: extra.fixedLambdaRuntime,
      entry: "lambda/logEnvExecutionStatus.js",
      handler: "handler",
      description: "Log environment execution status to New Relic.",
      functionName: `${instanceName}-cch-log-env-status`,
      timeout: Duration.seconds(30),
      role: cchRoles.getCCHLambdaExecutionRole(),
      tracing: cchLogger.getLambdaLogSettings(),
      environment: {
        SNS_TOPIC_ARN: extra.matopicARN,
        STAGE_PREFIX: instanceName,
        REGION: region,
        ACCOUNT: account,
        CCH_VERSION: extra.cchVersion,
        CUSTOMER_REPO_BUCKET: tofbucketName,
        KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
      },
    }
  );
  cchLogger.getLambdaSubscriptionFilter(
    `${instanceName}-cch-log-env-status`,
    logEnvStatus.logGroup
  );

  //Define the Hub Workflow Step function
  const hubsfn = new HubWorkflow(scope, "HubWorkflow", {
    name: `${instanceName}-cloud-control-hub-workflow`,
    instanceName: instanceName,
    zone: extra.deploymentZone,
    iterate: sfnIterate,
    getSize: sfnSize,
    region: region,
    customerAccount: account,
    customerConfigTable: customerConfigTable,
    deployRoleName: props.roles.customer,
    repoRoleName: props.roles.source,
    codeBuildPackageCustomer: packageCustomerRepoProject,
    artifactBucket: fcchArtifactBucket,
    readS3: sfnReadS3,
    eventBusHandler: sfnEventBusHandler,
    validateTemplateDependencies: sfnValidateTemplateDependencies,
    validateTemplate: sfnValidateTemplate,
    validateTOF: sfnValidateTOF,
    validateEmails: sfnValidateEmails,
    logValidationSummary: logValidationErrorsSummary,
    fail: sfnFailureFunction,
    executionFailed: getExecutionFailedFunction,
    setEnvPrefix: setEnvPrefix,
    logEnvStatus: logEnvStatus,
    // Default to 3 parallel tasks as per requirements.
    maxConcurrency: props.environment.maxConcurrency
      ? props.environment.maxConcurrency
      : 3,
    // Default to 3 parallel environments as per requirements.
    envConcurrency: props.environment.envConcurrency
      ? props.environment.envConcurrency
      : 3,
    sfnRole: cchRoles.getCCHsfnExecutionRole(),
    logging: cchLogger.getStateMachineLogSettings(
      `${instanceName}-cloud-control-hub-workflow`
    ),
  });

  fcchArtifactBucket.grantRead(sfnReadS3);
  fcchArtifactBucket.grantRead(sfnValidateTemplateDependencies);
  fcchArtifactBucket.grantRead(sfnValidateTemplate);
  fcchArtifactBucket.grantRead(hubsfn);
  fcchArtifactBucket.grantWrite(packageCustomerRepoProject);
}
