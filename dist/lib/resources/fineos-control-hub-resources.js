"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FineosControlHubResources = void 0;
const fs_1 = require("fs");
const js_yaml_1 = require("js-yaml");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const aws_cdk_lib_3 = require("aws-cdk-lib");
const aws_cdk_lib_4 = require("aws-cdk-lib");
const aws_cdk_lib_5 = require("aws-cdk-lib");
const aws_cdk_lib_6 = require("aws-cdk-lib");
const aws_cdk_lib_7 = require("aws-cdk-lib");
const hub_workflow_1 = require("../step-function/hub-workflow");
const fineos_cloud_control_hub_roles_1 = require("../fineos-cloud-control-hub-roles");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const fineos_cloud_control_hub_logging_1 = require("../fineos-cloud-control-hub-logging");
function FineosControlHubResources(scope, instanceName, account, region, props, extra) {
    var _a;
    //Create a bucket to hold template file
    const fcchArtifactBucket = new aws_cdk_lib_6.aws_s3.Bucket(scope, "ArtefactBucket", {
        bucketName: `${instanceName}-${region}-${props.zone.toLowerCase()}-cch-artefacts`,
        versioned: true,
        autoDeleteObjects: true,
        enforceSSL: true,
        removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
    });
    //TOF S3 Bucket to fetch validation errors summary from
    const tofbucketName = `${instanceName}-${region}-${props.zone.toLowerCase()}-fcn-cdk-artefact-bucket`;
    const tofArtifactBucket = aws_cdk_lib_6.aws_s3.Bucket.fromBucketName(scope, "TOFArtefactBucket", tofbucketName);
    const cchRoles = new fineos_cloud_control_hub_roles_1.CCHRoles(scope, region, account, instanceName, fcchArtifactBucket, tofArtifactBucket, extra.matopicARN);
    let cchLogger = new fineos_cloud_control_hub_logging_1.CCHLogging(scope, `${instanceName}-cch-disable-logging`, props.observability.endpoint, instanceName, region, account, cchRoles.getCCHLambdaExecutionRole(), cchRoles.getCCHSubscriptionFilterRole(), extra.cchVersion);
    if (props.observability.zones) {
        for (let zone of props.observability.zones) {
            if (zone === extra.deploymentZone) {
                cchLogger = new fineos_cloud_control_hub_logging_1.CCHKinesisLogging(scope, `${instanceName}-cch-kinesis-logging`, props.observability.endpoint, instanceName, region, account, cchRoles.getCCHLambdaExecutionRole(), cchRoles.getCCHSubscriptionFilterRole(), extra.cchVersion);
            }
        }
    }
    //Define a function to retrieve ExecutionFailed events
    const getExecutionFailedFunction = new aws_lambda_nodejs_1.NodejsFunction(scope, "GetExecutionFailedLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/getExecutionFailed.js",
        handler: "handler",
        description: "Retrieves ExecutionFailed event from failed step function execution",
        functionName: `${instanceName}-cch-get-executionfailed`,
        timeout: aws_cdk_lib_1.Duration.seconds(60),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-get-executionfailed`, getExecutionFailedFunction.logGroup);
    //Define a function to handle failed workflows
    const sfnFailureFunction = new aws_lambda_nodejs_1.NodejsFunction(scope, "FailWorkflowLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/failWorkflow.js",
        handler: "handler",
        description: "Raises error to stop step function, if issue found on previous tasks.",
        functionName: `${instanceName}-cch-fail-step`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-fail-step`, sfnFailureFunction.logGroup);
    //Define a function to iterate through the template file stages and tasks
    const sfnIterate = new aws_lambda_nodejs_1.NodejsFunction(scope, "IterateTasksLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/iterateTasks.js",
        handler: "handler",
        description: "Iterates though stages and tasks of Hub template",
        functionName: `${instanceName}-cch-iterate`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-iterate`, sfnIterate.logGroup);
    //Define a function to return stages length
    const sfnSize = new aws_lambda_nodejs_1.NodejsFunction(scope, "GetSizeLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/getSize.js",
        handler: "handler",
        description: "Get the size of an input array",
        functionName: `${instanceName}-cch-get-size`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-get-size`, sfnSize.logGroup);
    //Reference TOF Dynamo table that holds customer account config
    const customerConfigTable = aws_cdk_lib_3.aws_dynamodb.Table.fromTableName(scope, "CustomerAccountConfigTable", `${props.instanceName}-fcn-vending-customer-account-config`);
    //Reference the IAM role for the CodeBuild customer repo project
    const codeBuildRoleArn = `arn:aws:iam::${(_a = props.env) === null || _a === void 0 ? void 0 : _a.account}:role/${props.roles.vending}`;
    const codeBuildRole = aws_cdk_lib_5.aws_iam.Role.fromRoleArn(scope, "CodeBuildDeployerRole", codeBuildRoleArn, {
        mutable: false,
    });
    //Define a CodeBuild project to retrieve template file from customer repo
    const packageCustomerRepoProject = new aws_cdk_lib_4.aws_codebuild.Project(scope, "CCHPackageCustomerRepo", {
        buildSpec: aws_cdk_lib_4.aws_codebuild.BuildSpec.fromObject((0, js_yaml_1.load)((0, fs_1.readFileSync)("lib/code-build/package-customer-repo.yaml", "utf8"))),
        environment: {
            buildImage: aws_cdk_lib_4.aws_codebuild.LinuxBuildImage.STANDARD_7_0,
            privileged: true,
        },
        role: codeBuildRole,
        description: "Package a customer repo and copy to the artifact bucket",
        projectName: `${instanceName}-CCHPackageCustomerRepo`,
    });
    //Copy template schema file to S3 bucket
    new aws_cdk_lib_7.aws_s3_deployment.BucketDeployment(scope, "deployTemplateSchema", {
        sources: [aws_cdk_lib_7.aws_s3_deployment.Source.asset("./lib/schema")],
        destinationBucket: fcchArtifactBucket,
    });
    //Define a function to validate template file
    const sfnValidateTemplate = new aws_cdk_lib_2.aws_lambda_nodejs.NodejsFunction(scope, "validateTemplateLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/validateTemplate.js",
        handler: "handler",
        description: "Validate template file",
        functionName: `${instanceName}-cch-validate-template`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-validate-template`, sfnValidateTemplate.logGroup);
    //Define a function to handle event bus events
    const sfnEventBusHandler = new aws_lambda_nodejs_1.NodejsFunction(scope, "eventHubHandler", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/eventHubHandler.js",
        handler: "handler",
        description: "Handles Central Event Bus events.",
        functionName: `${instanceName}-cch-event-hub-handler`,
        timeout: aws_cdk_lib_1.Duration.seconds(120),
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
    const sfnValidateTOF = new aws_cdk_lib_2.aws_lambda_nodejs.NodejsFunction(scope, "validateTOFLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/validateTOFVersion.js",
        handler: "handler",
        description: "Validate TOF version",
        functionName: `${instanceName}-cch-validate-tof`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
        environment: {
            STAGE_PREFIX: instanceName,
            CCH_VERSION: extra.cchVersion,
            KINESIS_ENABLED: cchLogger.isKinesisEnabled(),
        },
        role: cchRoles.getCCHLambdaExecutionRole(),
        tracing: cchLogger.getLambdaLogSettings(),
    });
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-validate-tof`, sfnValidateTOF.logGroup);
    //Define a function to check email subscriptions
    const sfnValidateEmails = new aws_cdk_lib_2.aws_lambda_nodejs.NodejsFunction(scope, "validateEmailsLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/validateEmails.js",
        handler: "handler",
        description: "Validate email subscriptions",
        functionName: `${instanceName}-cch-validate-emails`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    });
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-validate-emails`, sfnValidateEmails.logGroup);
    //Define a function to read template from S3
    const sfnReadS3 = new aws_lambda_nodejs_1.NodejsFunction(scope, "readS3Lambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/readS3.js",
        handler: "handler",
        description: "Read template file from S3",
        functionName: `${instanceName}-cch-read-S3`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-read-S3`, sfnReadS3.logGroup);
    const sfnValidateTemplateDependencies = new aws_cdk_lib_2.aws_lambda_nodejs.NodejsFunction(scope, "validateTemplateDependenciesLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/validateTemplateDependency.js",
        handler: "handler",
        description: "Validate app dependencies from template",
        functionName: `${instanceName}-cch-validate-template-dependencies`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-validate-dependencies`, sfnValidateTemplateDependencies.logGroup);
    //Define a function to log validation erros summary for CCh tasks to New Relic
    const logValidationErrorsSummary = new aws_cdk_lib_2.aws_lambda_nodejs.NodejsFunction(scope, "logValidationSummaryLambda", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/logValidationSummary.js",
        handler: "handler",
        description: "Log Validation Errors Summary to New Relic",
        functionName: `${instanceName}-cch-log-validation-summary`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-log-validation-summary`, logValidationErrorsSummary.logGroup);
    //Define a function to set envPrefix to each task in the template
    const setEnvPrefix = new aws_cdk_lib_2.aws_lambda_nodejs.NodejsFunction(scope, "setEnvPrefix", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/setEnvPrefix.js",
        handler: "handler",
        description: "Set envPrefix to each task in the template",
        functionName: `${instanceName}-cch-set-envprefix`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-set-envprefix`, setEnvPrefix.logGroup);
    //Define a function to log environment execution status to New Relic
    const logEnvStatus = new aws_cdk_lib_2.aws_lambda_nodejs.NodejsFunction(scope, "logEnvExecutionStatus", {
        runtime: extra.fixedLambdaRuntime,
        entry: "lambda/logEnvExecutionStatus.js",
        handler: "handler",
        description: "Log environment execution status to New Relic.",
        functionName: `${instanceName}-cch-log-env-status`,
        timeout: aws_cdk_lib_1.Duration.seconds(30),
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
    cchLogger.getLambdaSubscriptionFilter(`${instanceName}-cch-log-env-status`, logEnvStatus.logGroup);
    //Define the Hub Workflow Step function
    const hubsfn = new hub_workflow_1.HubWorkflow(scope, "HubWorkflow", {
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
        logging: cchLogger.getStateMachineLogSettings(`${instanceName}-cloud-control-hub-workflow`),
    });
    fcchArtifactBucket.grantRead(sfnReadS3);
    fcchArtifactBucket.grantRead(sfnValidateTemplateDependencies);
    fcchArtifactBucket.grantRead(sfnValidateTemplate);
    fcchArtifactBucket.grantRead(hubsfn);
    fcchArtifactBucket.grantWrite(packageCustomerRepoProject);
}
exports.FineosControlHubResources = FineosControlHubResources;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZW9zLWNvbnRyb2wtaHViLXJlc291cmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9yZXNvdXJjZXMvZmluZW9zLWNvbnRyb2wtaHViLXJlc291cmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQkFBa0M7QUFDbEMscUNBQStCO0FBQy9CLDZDQUFzRDtBQUN0RCw2Q0FBOEQ7QUFDOUQsNkNBQXVEO0FBQ3ZELDZDQUF5RDtBQUN6RCw2Q0FBNkM7QUFDN0MsNkNBQTJDO0FBQzNDLDZDQUE0RDtBQUU1RCxnRUFBNEQ7QUFDNUQsc0ZBQTZEO0FBQzdELHFFQUErRDtBQUMvRCwwRkFJNkM7QUFJN0MsU0FBZ0IseUJBQXlCLENBQ3ZDLEtBQWdCLEVBQ2hCLFlBQW9CLEVBQ3BCLE9BQWUsRUFDZixNQUFjLEVBQ2QsS0FBc0MsRUFDdEMsS0FLQzs7SUFFRCx1Q0FBdUM7SUFDdkMsTUFBTSxrQkFBa0IsR0FBZSxJQUFJLG9CQUFFLENBQUMsTUFBTSxDQUNsRCxLQUFLLEVBQ0wsZ0JBQWdCLEVBQ2hCO1FBQ0UsVUFBVSxFQUFFLEdBQUcsWUFBWSxJQUFJLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0I7UUFDakYsU0FBUyxFQUFFLElBQUk7UUFDZixpQkFBaUIsRUFBRSxJQUFJO1FBQ3ZCLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87S0FDckMsQ0FDRixDQUFDO0lBRUYsdURBQXVEO0lBQ3ZELE1BQU0sYUFBYSxHQUFHLEdBQUcsWUFBWSxJQUFJLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSwwQkFBMEIsQ0FBQztJQUN0RyxNQUFNLGlCQUFpQixHQUFHLG9CQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FDaEQsS0FBSyxFQUNMLG1CQUFtQixFQUNuQixhQUFhLENBQ2QsQ0FBQztJQUVGLE1BQU0sUUFB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Q0FBQztRQUNMLDBEQUEwRDtRQUMxRCxjQUFjLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxjQUFjO1lBQzlDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGNBQWM7WUFDbEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxPQUFPLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFO1FBQzFDLE9BQU8sRUFBRSxTQUFTLENBQUMsMEJBQTBCLENBQzNDLEdBQUcsWUFBWSw2QkFBNkIsQ0FDN0M7S0FDRixDQUFDLENBQUM7SUFFSCxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDeEMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLCtCQUErQixDQUFDLENBQUM7SUFDOUQsa0JBQWtCLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDbEQsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQzVELENBQUM7QUF4ZUQsOERBd2VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBsb2FkIH0gZnJvbSBcImpzLXlhbWxcIjtcbmltcG9ydCB7IER1cmF0aW9uLCBSZW1vdmFsUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBhd3NfbGFtYmRhX25vZGVqcyBhcyBsYW1iZGFOb2RlIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBhd3NfZHluYW1vZGIgYXMgZHluYW1vZGIgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IGF3c19jb2RlYnVpbGQgYXMgY29kZWJ1aWxkIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBhd3NfaWFtIGFzIGlhbSB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgYXdzX3MzIGFzIHMzIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBhd3NfczNfZGVwbG95bWVudCBhcyBzM0RlcGxveSB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IEh1YldvcmtmbG93IH0gZnJvbSBcIi4uL3N0ZXAtZnVuY3Rpb24vaHViLXdvcmtmbG93XCI7XG5pbXBvcnQgeyBDQ0hSb2xlcyB9IGZyb20gXCIuLi9maW5lb3MtY2xvdWQtY29udHJvbC1odWItcm9sZXNcIjtcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzXCI7XG5pbXBvcnQge1xuICBJTG9nZ2luZyxcbiAgQ0NITG9nZ2luZyxcbiAgQ0NIS2luZXNpc0xvZ2dpbmcsXG59IGZyb20gXCIuLi9maW5lb3MtY2xvdWQtY29udHJvbC1odWItbG9nZ2luZ1wiO1xuaW1wb3J0IHsgUnVudGltZSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtbGFtYmRhXCI7XG5pbXBvcnQgeyBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFja1Byb3BzIH0gZnJvbSBcIi4uL2ZpbmVvcy1jbG91ZC1jb250cm9sLWh1Yi1zdGFja1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gRmluZW9zQ29udHJvbEh1YlJlc291cmNlcyhcbiAgc2NvcGU6IENvbnN0cnVjdCxcbiAgaW5zdGFuY2VOYW1lOiBzdHJpbmcsXG4gIGFjY291bnQ6IHN0cmluZyxcbiAgcmVnaW9uOiBzdHJpbmcsXG4gIHByb3BzOiBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFja1Byb3BzLFxuICBleHRyYToge1xuICAgIGZpeGVkTGFtYmRhUnVudGltZTogUnVudGltZTtcbiAgICBtYXRvcGljQVJOOiBzdHJpbmc7XG4gICAgY2NoVmVyc2lvbjogc3RyaW5nO1xuICAgIGRlcGxveW1lbnRab25lOiBzdHJpbmc7XG4gIH1cbikge1xuICAvL0NyZWF0ZSBhIGJ1Y2tldCB0byBob2xkIHRlbXBsYXRlIGZpbGVcbiAgY29uc3QgZmNjaEFydGlmYWN0QnVja2V0OiBzMy5JQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChcbiAgICBzY29wZSxcbiAgICBcIkFydGVmYWN0QnVja2V0XCIsXG4gICAge1xuICAgICAgYnVja2V0TmFtZTogYCR7aW5zdGFuY2VOYW1lfS0ke3JlZ2lvbn0tJHtwcm9wcy56b25lLnRvTG93ZXJDYXNlKCl9LWNjaC1hcnRlZmFjdHNgLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH1cbiAgKTtcblxuICAvL1RPRiBTMyBCdWNrZXQgdG8gZmV0Y2ggdmFsaWRhdGlvbiBlcnJvcnMgc3VtbWFyeSBmcm9tXG4gIGNvbnN0IHRvZmJ1Y2tldE5hbWUgPSBgJHtpbnN0YW5jZU5hbWV9LSR7cmVnaW9ufS0ke3Byb3BzLnpvbmUudG9Mb3dlckNhc2UoKX0tZmNuLWNkay1hcnRlZmFjdC1idWNrZXRgO1xuICBjb25zdCB0b2ZBcnRpZmFjdEJ1Y2tldCA9IHMzLkJ1Y2tldC5mcm9tQnVja2V0TmFtZShcbiAgICBzY29wZSxcbiAgICBcIlRPRkFydGVmYWN0QnVja2V0XCIsXG4gICAgdG9mYnVja2V0TmFtZVxuICApO1xuXG4gIGNvbnN0IGNjaFJvbGVzID0gbmV3IENDSFJvbGVzKFxuICAgIHNjb3BlLFxuICAgIHJlZ2lvbixcbiAgICBhY2NvdW50LFxuICAgIGluc3RhbmNlTmFtZSxcbiAgICBmY2NoQXJ0aWZhY3RCdWNrZXQsXG4gICAgdG9mQXJ0aWZhY3RCdWNrZXQsXG4gICAgZXh0cmEubWF0b3BpY0FSTlxuICApO1xuICBsZXQgY2NoTG9nZ2VyOiBJTG9nZ2luZyA9IG5ldyBDQ0hMb2dnaW5nKFxuICAgIHNjb3BlLFxuICAgIGAke2luc3RhbmNlTmFtZX0tY2NoLWRpc2FibGUtbG9nZ2luZ2AsXG4gICAgcHJvcHMub2JzZXJ2YWJpbGl0eS5lbmRwb2ludCxcbiAgICBpbnN0YW5jZU5hbWUsXG4gICAgcmVnaW9uLFxuICAgIGFjY291bnQsXG4gICAgY2NoUm9sZXMuZ2V0Q0NITGFtYmRhRXhlY3V0aW9uUm9sZSgpLFxuICAgIGNjaFJvbGVzLmdldENDSFN1YnNjcmlwdGlvbkZpbHRlclJvbGUoKSxcbiAgICBleHRyYS5jY2hWZXJzaW9uXG4gICk7XG4gIGlmIChwcm9wcy5vYnNlcnZhYmlsaXR5LnpvbmVzKSB7XG4gICAgZm9yIChsZXQgem9uZSBvZiBwcm9wcy5vYnNlcnZhYmlsaXR5LnpvbmVzKSB7XG4gICAgICBpZiAoem9uZSA9PT0gZXh0cmEuZGVwbG95bWVudFpvbmUpIHtcbiAgICAgICAgY2NoTG9nZ2VyID0gbmV3IENDSEtpbmVzaXNMb2dnaW5nKFxuICAgICAgICAgIHNjb3BlLFxuICAgICAgICAgIGAke2luc3RhbmNlTmFtZX0tY2NoLWtpbmVzaXMtbG9nZ2luZ2AsXG4gICAgICAgICAgcHJvcHMub2JzZXJ2YWJpbGl0eS5lbmRwb2ludCxcbiAgICAgICAgICBpbnN0YW5jZU5hbWUsXG4gICAgICAgICAgcmVnaW9uLFxuICAgICAgICAgIGFjY291bnQsXG4gICAgICAgICAgY2NoUm9sZXMuZ2V0Q0NITGFtYmRhRXhlY3V0aW9uUm9sZSgpLFxuICAgICAgICAgIGNjaFJvbGVzLmdldENDSFN1YnNjcmlwdGlvbkZpbHRlclJvbGUoKSxcbiAgICAgICAgICBleHRyYS5jY2hWZXJzaW9uXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy9EZWZpbmUgYSBmdW5jdGlvbiB0byByZXRyaWV2ZSBFeGVjdXRpb25GYWlsZWQgZXZlbnRzXG4gIGNvbnN0IGdldEV4ZWN1dGlvbkZhaWxlZEZ1bmN0aW9uID0gbmV3IE5vZGVqc0Z1bmN0aW9uKFxuICAgIHNjb3BlLFxuICAgIFwiR2V0RXhlY3V0aW9uRmFpbGVkTGFtYmRhXCIsXG4gICAge1xuICAgICAgcnVudGltZTogZXh0cmEuZml4ZWRMYW1iZGFSdW50aW1lLFxuICAgICAgZW50cnk6IFwibGFtYmRhL2dldEV4ZWN1dGlvbkZhaWxlZC5qc1wiLFxuICAgICAgaGFuZGxlcjogXCJoYW5kbGVyXCIsXG4gICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgXCJSZXRyaWV2ZXMgRXhlY3V0aW9uRmFpbGVkIGV2ZW50IGZyb20gZmFpbGVkIHN0ZXAgZnVuY3Rpb24gZXhlY3V0aW9uXCIsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLWdldC1leGVjdXRpb25mYWlsZWRgLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICByb2xlOiBjY2hSb2xlcy5nZXRDQ0hMYW1iZGFFeGVjdXRpb25Sb2xlKCksXG4gICAgICB0cmFjaW5nOiBjY2hMb2dnZXIuZ2V0TGFtYmRhTG9nU2V0dGluZ3MoKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFX1BSRUZJWDogaW5zdGFuY2VOYW1lLFxuICAgICAgICBSRUdJT046IHJlZ2lvbixcbiAgICAgICAgQUNDT1VOVDogYWNjb3VudCxcbiAgICAgICAgQ0NIX1ZFUlNJT046IGV4dHJhLmNjaFZlcnNpb24sXG4gICAgICAgIEtJTkVTSVNfRU5BQkxFRDogY2NoTG9nZ2VyLmlzS2luZXNpc0VuYWJsZWQoKSxcbiAgICAgIH0sXG4gICAgfVxuICApO1xuICBjY2hMb2dnZXIuZ2V0TGFtYmRhU3Vic2NyaXB0aW9uRmlsdGVyKFxuICAgIGAke2luc3RhbmNlTmFtZX0tY2NoLWdldC1leGVjdXRpb25mYWlsZWRgLFxuICAgIGdldEV4ZWN1dGlvbkZhaWxlZEZ1bmN0aW9uLmxvZ0dyb3VwXG4gICk7XG5cbiAgLy9EZWZpbmUgYSBmdW5jdGlvbiB0byBoYW5kbGUgZmFpbGVkIHdvcmtmbG93c1xuICBjb25zdCBzZm5GYWlsdXJlRnVuY3Rpb24gPSBuZXcgTm9kZWpzRnVuY3Rpb24oc2NvcGUsIFwiRmFpbFdvcmtmbG93TGFtYmRhXCIsIHtcbiAgICBydW50aW1lOiBleHRyYS5maXhlZExhbWJkYVJ1bnRpbWUsXG4gICAgZW50cnk6IFwibGFtYmRhL2ZhaWxXb3JrZmxvdy5qc1wiLFxuICAgIGhhbmRsZXI6IFwiaGFuZGxlclwiLFxuICAgIGRlc2NyaXB0aW9uOlxuICAgICAgXCJSYWlzZXMgZXJyb3IgdG8gc3RvcCBzdGVwIGZ1bmN0aW9uLCBpZiBpc3N1ZSBmb3VuZCBvbiBwcmV2aW91cyB0YXNrcy5cIixcbiAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLWZhaWwtc3RlcGAsXG4gICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgcm9sZTogY2NoUm9sZXMuZ2V0Q0NITGFtYmRhRXhlY3V0aW9uUm9sZSgpLFxuICAgIHRyYWNpbmc6IGNjaExvZ2dlci5nZXRMYW1iZGFMb2dTZXR0aW5ncygpLFxuICAgIGVudmlyb25tZW50OiB7XG4gICAgICBTVEFHRV9QUkVGSVg6IGluc3RhbmNlTmFtZSxcbiAgICAgIFJFR0lPTjogcmVnaW9uLFxuICAgICAgQUNDT1VOVDogYWNjb3VudCxcbiAgICAgIENDSF9WRVJTSU9OOiBleHRyYS5jY2hWZXJzaW9uLFxuICAgICAgS0lORVNJU19FTkFCTEVEOiBjY2hMb2dnZXIuaXNLaW5lc2lzRW5hYmxlZCgpLFxuICAgIH0sXG4gIH0pO1xuICBjY2hMb2dnZXIuZ2V0TGFtYmRhU3Vic2NyaXB0aW9uRmlsdGVyKFxuICAgIGAke2luc3RhbmNlTmFtZX0tY2NoLWZhaWwtc3RlcGAsXG4gICAgc2ZuRmFpbHVyZUZ1bmN0aW9uLmxvZ0dyb3VwXG4gICk7XG5cbiAgLy9EZWZpbmUgYSBmdW5jdGlvbiB0byBpdGVyYXRlIHRocm91Z2ggdGhlIHRlbXBsYXRlIGZpbGUgc3RhZ2VzIGFuZCB0YXNrc1xuICBjb25zdCBzZm5JdGVyYXRlID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHNjb3BlLCBcIkl0ZXJhdGVUYXNrc0xhbWJkYVwiLCB7XG4gICAgcnVudGltZTogZXh0cmEuZml4ZWRMYW1iZGFSdW50aW1lLFxuICAgIGVudHJ5OiBcImxhbWJkYS9pdGVyYXRlVGFza3MuanNcIixcbiAgICBoYW5kbGVyOiBcImhhbmRsZXJcIixcbiAgICBkZXNjcmlwdGlvbjogXCJJdGVyYXRlcyB0aG91Z2ggc3RhZ2VzIGFuZCB0YXNrcyBvZiBIdWIgdGVtcGxhdGVcIixcbiAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLWl0ZXJhdGVgLFxuICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIHJvbGU6IGNjaFJvbGVzLmdldENDSExhbWJkYUV4ZWN1dGlvblJvbGUoKSxcbiAgICB0cmFjaW5nOiBjY2hMb2dnZXIuZ2V0TGFtYmRhTG9nU2V0dGluZ3MoKSxcbiAgICBlbnZpcm9ubWVudDoge1xuICAgICAgU1RBR0VfUFJFRklYOiBpbnN0YW5jZU5hbWUsXG4gICAgICBSRUdJT046IHJlZ2lvbixcbiAgICAgIEFDQ09VTlQ6IGFjY291bnQsXG4gICAgICBDQ0hfVkVSU0lPTjogZXh0cmEuY2NoVmVyc2lvbixcbiAgICAgIEtJTkVTSVNfRU5BQkxFRDogY2NoTG9nZ2VyLmlzS2luZXNpc0VuYWJsZWQoKSxcbiAgICB9LFxuICB9KTtcbiAgY2NoTG9nZ2VyLmdldExhbWJkYVN1YnNjcmlwdGlvbkZpbHRlcihcbiAgICBgJHtpbnN0YW5jZU5hbWV9LWNjaC1pdGVyYXRlYCxcbiAgICBzZm5JdGVyYXRlLmxvZ0dyb3VwXG4gICk7XG5cbiAgLy9EZWZpbmUgYSBmdW5jdGlvbiB0byByZXR1cm4gc3RhZ2VzIGxlbmd0aFxuICBjb25zdCBzZm5TaXplID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHNjb3BlLCBcIkdldFNpemVMYW1iZGFcIiwge1xuICAgIHJ1bnRpbWU6IGV4dHJhLmZpeGVkTGFtYmRhUnVudGltZSxcbiAgICBlbnRyeTogXCJsYW1iZGEvZ2V0U2l6ZS5qc1wiLFxuICAgIGhhbmRsZXI6IFwiaGFuZGxlclwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkdldCB0aGUgc2l6ZSBvZiBhbiBpbnB1dCBhcnJheVwiLFxuICAgIGZ1bmN0aW9uTmFtZTogYCR7aW5zdGFuY2VOYW1lfS1jY2gtZ2V0LXNpemVgLFxuICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIHJvbGU6IGNjaFJvbGVzLmdldENDSExhbWJkYUV4ZWN1dGlvblJvbGUoKSxcbiAgICB0cmFjaW5nOiBjY2hMb2dnZXIuZ2V0TGFtYmRhTG9nU2V0dGluZ3MoKSxcbiAgICBlbnZpcm9ubWVudDoge1xuICAgICAgU1RBR0VfUFJFRklYOiBpbnN0YW5jZU5hbWUsXG4gICAgICBSRUdJT046IHJlZ2lvbixcbiAgICAgIEFDQ09VTlQ6IGFjY291bnQsXG4gICAgICBDQ0hfVkVSU0lPTjogZXh0cmEuY2NoVmVyc2lvbixcbiAgICAgIEtJTkVTSVNfRU5BQkxFRDogY2NoTG9nZ2VyLmlzS2luZXNpc0VuYWJsZWQoKSxcbiAgICB9LFxuICB9KTtcbiAgY2NoTG9nZ2VyLmdldExhbWJkYVN1YnNjcmlwdGlvbkZpbHRlcihcbiAgICBgJHtpbnN0YW5jZU5hbWV9LWNjaC1nZXQtc2l6ZWAsXG4gICAgc2ZuU2l6ZS5sb2dHcm91cFxuICApO1xuXG4gIC8vUmVmZXJlbmNlIFRPRiBEeW5hbW8gdGFibGUgdGhhdCBob2xkcyBjdXN0b21lciBhY2NvdW50IGNvbmZpZ1xuICBjb25zdCBjdXN0b21lckNvbmZpZ1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZShcbiAgICBzY29wZSxcbiAgICBcIkN1c3RvbWVyQWNjb3VudENvbmZpZ1RhYmxlXCIsXG4gICAgYCR7cHJvcHMuaW5zdGFuY2VOYW1lfS1mY24tdmVuZGluZy1jdXN0b21lci1hY2NvdW50LWNvbmZpZ2BcbiAgKTtcblxuICAvL1JlZmVyZW5jZSB0aGUgSUFNIHJvbGUgZm9yIHRoZSBDb2RlQnVpbGQgY3VzdG9tZXIgcmVwbyBwcm9qZWN0XG4gIGNvbnN0IGNvZGVCdWlsZFJvbGVBcm4gPSBgYXJuOmF3czppYW06OiR7cHJvcHMuZW52Py5hY2NvdW50fTpyb2xlLyR7cHJvcHMucm9sZXMudmVuZGluZ31gO1xuICBjb25zdCBjb2RlQnVpbGRSb2xlID0gaWFtLlJvbGUuZnJvbVJvbGVBcm4oXG4gICAgc2NvcGUsXG4gICAgXCJDb2RlQnVpbGREZXBsb3llclJvbGVcIixcbiAgICBjb2RlQnVpbGRSb2xlQXJuLFxuICAgIHtcbiAgICAgIG11dGFibGU6IGZhbHNlLFxuICAgIH1cbiAgKTtcblxuICAvL0RlZmluZSBhIENvZGVCdWlsZCBwcm9qZWN0IHRvIHJldHJpZXZlIHRlbXBsYXRlIGZpbGUgZnJvbSBjdXN0b21lciByZXBvXG4gIGNvbnN0IHBhY2thZ2VDdXN0b21lclJlcG9Qcm9qZWN0ID0gbmV3IGNvZGVidWlsZC5Qcm9qZWN0KFxuICAgIHNjb3BlLFxuICAgIFwiQ0NIUGFja2FnZUN1c3RvbWVyUmVwb1wiLFxuICAgIHtcbiAgICAgIGJ1aWxkU3BlYzogY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tT2JqZWN0KFxuICAgICAgICBsb2FkKFxuICAgICAgICAgIHJlYWRGaWxlU3luYyhcImxpYi9jb2RlLWJ1aWxkL3BhY2thZ2UtY3VzdG9tZXItcmVwby55YW1sXCIsIFwidXRmOFwiKVxuICAgICAgICApIGFzIGFueVxuICAgICAgKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIGJ1aWxkSW1hZ2U6IGNvZGVidWlsZC5MaW51eEJ1aWxkSW1hZ2UuU1RBTkRBUkRfN18wLFxuICAgICAgICBwcml2aWxlZ2VkOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGNvZGVCdWlsZFJvbGUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJQYWNrYWdlIGEgY3VzdG9tZXIgcmVwbyBhbmQgY29weSB0byB0aGUgYXJ0aWZhY3QgYnVja2V0XCIsXG4gICAgICBwcm9qZWN0TmFtZTogYCR7aW5zdGFuY2VOYW1lfS1DQ0hQYWNrYWdlQ3VzdG9tZXJSZXBvYCxcbiAgICB9XG4gICk7XG5cbiAgLy9Db3B5IHRlbXBsYXRlIHNjaGVtYSBmaWxlIHRvIFMzIGJ1Y2tldFxuICBuZXcgczNEZXBsb3kuQnVja2V0RGVwbG95bWVudChzY29wZSwgXCJkZXBsb3lUZW1wbGF0ZVNjaGVtYVwiLCB7XG4gICAgc291cmNlczogW3MzRGVwbG95LlNvdXJjZS5hc3NldChcIi4vbGliL3NjaGVtYVwiKV0sXG4gICAgZGVzdGluYXRpb25CdWNrZXQ6IGZjY2hBcnRpZmFjdEJ1Y2tldCxcbiAgfSk7XG5cbiAgLy9EZWZpbmUgYSBmdW5jdGlvbiB0byB2YWxpZGF0ZSB0ZW1wbGF0ZSBmaWxlXG4gIGNvbnN0IHNmblZhbGlkYXRlVGVtcGxhdGUgPSBuZXcgbGFtYmRhTm9kZS5Ob2RlanNGdW5jdGlvbihcbiAgICBzY29wZSxcbiAgICBcInZhbGlkYXRlVGVtcGxhdGVMYW1iZGFcIixcbiAgICB7XG4gICAgICBydW50aW1lOiBleHRyYS5maXhlZExhbWJkYVJ1bnRpbWUsXG4gICAgICBlbnRyeTogXCJsYW1iZGEvdmFsaWRhdGVUZW1wbGF0ZS5qc1wiLFxuICAgICAgaGFuZGxlcjogXCJoYW5kbGVyXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJWYWxpZGF0ZSB0ZW1wbGF0ZSBmaWxlXCIsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLXZhbGlkYXRlLXRlbXBsYXRlYCxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgcm9sZTogY2NoUm9sZXMuZ2V0Q0NITGFtYmRhRXhlY3V0aW9uUm9sZSgpLFxuICAgICAgdHJhY2luZzogY2NoTG9nZ2VyLmdldExhbWJkYUxvZ1NldHRpbmdzKCksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTVEFHRV9QUkVGSVg6IGluc3RhbmNlTmFtZSxcbiAgICAgICAgUkVHSU9OOiByZWdpb24sXG4gICAgICAgIEFDQ09VTlQ6IGFjY291bnQsXG4gICAgICAgIENDSF9WRVJTSU9OOiBleHRyYS5jY2hWZXJzaW9uLFxuICAgICAgICBLSU5FU0lTX0VOQUJMRUQ6IGNjaExvZ2dlci5pc0tpbmVzaXNFbmFibGVkKCksXG4gICAgICB9LFxuICAgIH1cbiAgKTtcbiAgY2NoTG9nZ2VyLmdldExhbWJkYVN1YnNjcmlwdGlvbkZpbHRlcihcbiAgICBgJHtpbnN0YW5jZU5hbWV9LWNjaC12YWxpZGF0ZS10ZW1wbGF0ZWAsXG4gICAgc2ZuVmFsaWRhdGVUZW1wbGF0ZS5sb2dHcm91cFxuICApO1xuXG4gIC8vRGVmaW5lIGEgZnVuY3Rpb24gdG8gaGFuZGxlIGV2ZW50IGJ1cyBldmVudHNcbiAgY29uc3Qgc2ZuRXZlbnRCdXNIYW5kbGVyID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHNjb3BlLCBcImV2ZW50SHViSGFuZGxlclwiLCB7XG4gICAgcnVudGltZTogZXh0cmEuZml4ZWRMYW1iZGFSdW50aW1lLFxuICAgIGVudHJ5OiBcImxhbWJkYS9ldmVudEh1YkhhbmRsZXIuanNcIixcbiAgICBoYW5kbGVyOiBcImhhbmRsZXJcIixcbiAgICBkZXNjcmlwdGlvbjogXCJIYW5kbGVzIENlbnRyYWwgRXZlbnQgQnVzIGV2ZW50cy5cIixcbiAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLWV2ZW50LWh1Yi1oYW5kbGVyYCxcbiAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDEyMCksXG4gICAgcm9sZTogY2NoUm9sZXMuZ2V0Q0NIRXZlbnRIdWJMYW1iZGFSb2xlKCksXG4gICAgdHJhY2luZzogY2NoTG9nZ2VyLmdldExhbWJkYUxvZ1NldHRpbmdzKCksXG4gICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgIC8vICAgQ0VOVFJBTF9IVUJfQUNDT1VOVF9JRDogZGVwbG95bWVudERldGFpbHMuQ2VudHJhbEh1YkFjY291bnRJZCxcbiAgICAgIFNUQUdFX1BSRUZJWDogaW5zdGFuY2VOYW1lLFxuICAgICAgQ0NIX1ZFUlNJT046IGV4dHJhLmNjaFZlcnNpb24sXG4gICAgICBLSU5FU0lTX0VOQUJMRUQ6IGNjaExvZ2dlci5pc0tpbmVzaXNFbmFibGVkKCksXG4gICAgfSxcbiAgfSk7XG5cbiAgLy9EZWZpbmUgYSBmdW5jdGlvbiB0byB2YWxpZGF0ZSBUT0YgdmVyc2lvblxuICBjb25zdCBzZm5WYWxpZGF0ZVRPRiA9IG5ldyBsYW1iZGFOb2RlLk5vZGVqc0Z1bmN0aW9uKFxuICAgIHNjb3BlLFxuICAgIFwidmFsaWRhdGVUT0ZMYW1iZGFcIixcbiAgICB7XG4gICAgICBydW50aW1lOiBleHRyYS5maXhlZExhbWJkYVJ1bnRpbWUsXG4gICAgICBlbnRyeTogXCJsYW1iZGEvdmFsaWRhdGVUT0ZWZXJzaW9uLmpzXCIsXG4gICAgICBoYW5kbGVyOiBcImhhbmRsZXJcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlZhbGlkYXRlIFRPRiB2ZXJzaW9uXCIsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLXZhbGlkYXRlLXRvZmAsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFX1BSRUZJWDogaW5zdGFuY2VOYW1lLFxuICAgICAgICBDQ0hfVkVSU0lPTjogZXh0cmEuY2NoVmVyc2lvbixcbiAgICAgICAgS0lORVNJU19FTkFCTEVEOiBjY2hMb2dnZXIuaXNLaW5lc2lzRW5hYmxlZCgpLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGNjaFJvbGVzLmdldENDSExhbWJkYUV4ZWN1dGlvblJvbGUoKSxcbiAgICAgIHRyYWNpbmc6IGNjaExvZ2dlci5nZXRMYW1iZGFMb2dTZXR0aW5ncygpLFxuICAgIH1cbiAgKTtcbiAgY2NoTG9nZ2VyLmdldExhbWJkYVN1YnNjcmlwdGlvbkZpbHRlcihcbiAgICBgJHtpbnN0YW5jZU5hbWV9LWNjaC12YWxpZGF0ZS10b2ZgLFxuICAgIHNmblZhbGlkYXRlVE9GLmxvZ0dyb3VwXG4gICk7XG5cbiAgLy9EZWZpbmUgYSBmdW5jdGlvbiB0byBjaGVjayBlbWFpbCBzdWJzY3JpcHRpb25zXG4gIGNvbnN0IHNmblZhbGlkYXRlRW1haWxzID0gbmV3IGxhbWJkYU5vZGUuTm9kZWpzRnVuY3Rpb24oXG4gICAgc2NvcGUsXG4gICAgXCJ2YWxpZGF0ZUVtYWlsc0xhbWJkYVwiLFxuICAgIHtcbiAgICAgIHJ1bnRpbWU6IGV4dHJhLmZpeGVkTGFtYmRhUnVudGltZSxcbiAgICAgIGVudHJ5OiBcImxhbWJkYS92YWxpZGF0ZUVtYWlscy5qc1wiLFxuICAgICAgaGFuZGxlcjogXCJoYW5kbGVyXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJWYWxpZGF0ZSBlbWFpbCBzdWJzY3JpcHRpb25zXCIsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLXZhbGlkYXRlLWVtYWlsc2AsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIHJvbGU6IGNjaFJvbGVzLmdldENDSExhbWJkYUV4ZWN1dGlvblJvbGUoKSxcbiAgICAgIHRyYWNpbmc6IGNjaExvZ2dlci5nZXRMYW1iZGFMb2dTZXR0aW5ncygpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU05TX1RPUElDX0FSTjogZXh0cmEubWF0b3BpY0FSTixcbiAgICAgICAgU1RBR0VfUFJFRklYOiBpbnN0YW5jZU5hbWUsXG4gICAgICAgIFJFR0lPTjogcmVnaW9uLFxuICAgICAgICBBQ0NPVU5UOiBhY2NvdW50LFxuICAgICAgICBDQ0hfVkVSU0lPTjogZXh0cmEuY2NoVmVyc2lvbixcbiAgICAgICAgS0lORVNJU19FTkFCTEVEOiBjY2hMb2dnZXIuaXNLaW5lc2lzRW5hYmxlZCgpLFxuICAgICAgfSxcbiAgICB9XG4gICk7XG4gIGNjaExvZ2dlci5nZXRMYW1iZGFTdWJzY3JpcHRpb25GaWx0ZXIoXG4gICAgYCR7aW5zdGFuY2VOYW1lfS1jY2gtdmFsaWRhdGUtZW1haWxzYCxcbiAgICBzZm5WYWxpZGF0ZUVtYWlscy5sb2dHcm91cFxuICApO1xuXG4gIC8vRGVmaW5lIGEgZnVuY3Rpb24gdG8gcmVhZCB0ZW1wbGF0ZSBmcm9tIFMzXG4gIGNvbnN0IHNmblJlYWRTMyA9IG5ldyBOb2RlanNGdW5jdGlvbihzY29wZSwgXCJyZWFkUzNMYW1iZGFcIiwge1xuICAgIHJ1bnRpbWU6IGV4dHJhLmZpeGVkTGFtYmRhUnVudGltZSxcbiAgICBlbnRyeTogXCJsYW1iZGEvcmVhZFMzLmpzXCIsXG4gICAgaGFuZGxlcjogXCJoYW5kbGVyXCIsXG4gICAgZGVzY3JpcHRpb246IFwiUmVhZCB0ZW1wbGF0ZSBmaWxlIGZyb20gUzNcIixcbiAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLXJlYWQtUzNgLFxuICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIHJvbGU6IGNjaFJvbGVzLmdldENDSExhbWJkYUV4ZWN1dGlvblJvbGUoKSxcbiAgICB0cmFjaW5nOiBjY2hMb2dnZXIuZ2V0TGFtYmRhTG9nU2V0dGluZ3MoKSxcbiAgICBlbnZpcm9ubWVudDoge1xuICAgICAgU1RBR0VfUFJFRklYOiBpbnN0YW5jZU5hbWUsXG4gICAgICBSRUdJT046IHJlZ2lvbixcbiAgICAgIEFDQ09VTlQ6IGFjY291bnQsXG4gICAgICBDQ0hfVkVSU0lPTjogZXh0cmEuY2NoVmVyc2lvbixcbiAgICAgIEtJTkVTSVNfRU5BQkxFRDogY2NoTG9nZ2VyLmlzS2luZXNpc0VuYWJsZWQoKSxcbiAgICB9LFxuICB9KTtcbiAgY2NoTG9nZ2VyLmdldExhbWJkYVN1YnNjcmlwdGlvbkZpbHRlcihcbiAgICBgJHtpbnN0YW5jZU5hbWV9LWNjaC1yZWFkLVMzYCxcbiAgICBzZm5SZWFkUzMubG9nR3JvdXBcbiAgKTtcblxuICBjb25zdCBzZm5WYWxpZGF0ZVRlbXBsYXRlRGVwZW5kZW5jaWVzID0gbmV3IGxhbWJkYU5vZGUuTm9kZWpzRnVuY3Rpb24oXG4gICAgc2NvcGUsXG4gICAgXCJ2YWxpZGF0ZVRlbXBsYXRlRGVwZW5kZW5jaWVzTGFtYmRhXCIsXG4gICAge1xuICAgICAgcnVudGltZTogZXh0cmEuZml4ZWRMYW1iZGFSdW50aW1lLFxuICAgICAgZW50cnk6IFwibGFtYmRhL3ZhbGlkYXRlVGVtcGxhdGVEZXBlbmRlbmN5LmpzXCIsXG4gICAgICBoYW5kbGVyOiBcImhhbmRsZXJcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlZhbGlkYXRlIGFwcCBkZXBlbmRlbmNpZXMgZnJvbSB0ZW1wbGF0ZVwiLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgJHtpbnN0YW5jZU5hbWV9LWNjaC12YWxpZGF0ZS10ZW1wbGF0ZS1kZXBlbmRlbmNpZXNgLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICByb2xlOiBjY2hSb2xlcy5nZXRDQ0hMYW1iZGFFeGVjdXRpb25Sb2xlKCksXG4gICAgICB0cmFjaW5nOiBjY2hMb2dnZXIuZ2V0TGFtYmRhTG9nU2V0dGluZ3MoKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQUdFX1BSRUZJWDogaW5zdGFuY2VOYW1lLFxuICAgICAgICBSRUdJT046IHJlZ2lvbixcbiAgICAgICAgQUNDT1VOVDogYWNjb3VudCxcbiAgICAgICAgQ0NIX1ZFUlNJT046IGV4dHJhLmNjaFZlcnNpb24sXG4gICAgICAgIEtJTkVTSVNfRU5BQkxFRDogY2NoTG9nZ2VyLmlzS2luZXNpc0VuYWJsZWQoKSxcbiAgICAgIH0sXG4gICAgfVxuICApO1xuICBjY2hMb2dnZXIuZ2V0TGFtYmRhU3Vic2NyaXB0aW9uRmlsdGVyKFxuICAgIGAke2luc3RhbmNlTmFtZX0tY2NoLXZhbGlkYXRlLWRlcGVuZGVuY2llc2AsXG4gICAgc2ZuVmFsaWRhdGVUZW1wbGF0ZURlcGVuZGVuY2llcy5sb2dHcm91cFxuICApO1xuXG4gIC8vRGVmaW5lIGEgZnVuY3Rpb24gdG8gbG9nIHZhbGlkYXRpb24gZXJyb3Mgc3VtbWFyeSBmb3IgQ0NoIHRhc2tzIHRvIE5ldyBSZWxpY1xuICBjb25zdCBsb2dWYWxpZGF0aW9uRXJyb3JzU3VtbWFyeSA9IG5ldyBsYW1iZGFOb2RlLk5vZGVqc0Z1bmN0aW9uKFxuICAgIHNjb3BlLFxuICAgIFwibG9nVmFsaWRhdGlvblN1bW1hcnlMYW1iZGFcIixcbiAgICB7XG4gICAgICBydW50aW1lOiBleHRyYS5maXhlZExhbWJkYVJ1bnRpbWUsXG4gICAgICBlbnRyeTogXCJsYW1iZGEvbG9nVmFsaWRhdGlvblN1bW1hcnkuanNcIixcbiAgICAgIGhhbmRsZXI6IFwiaGFuZGxlclwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiTG9nIFZhbGlkYXRpb24gRXJyb3JzIFN1bW1hcnkgdG8gTmV3IFJlbGljXCIsXG4gICAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLWxvZy12YWxpZGF0aW9uLXN1bW1hcnlgLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICByb2xlOiBjY2hSb2xlcy5nZXRDQ0hMYW1iZGFFeGVjdXRpb25Sb2xlKCksXG4gICAgICB0cmFjaW5nOiBjY2hMb2dnZXIuZ2V0TGFtYmRhTG9nU2V0dGluZ3MoKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNOU19UT1BJQ19BUk46IGV4dHJhLm1hdG9waWNBUk4sXG4gICAgICAgIFNUQUdFX1BSRUZJWDogaW5zdGFuY2VOYW1lLFxuICAgICAgICBSRUdJT046IHJlZ2lvbixcbiAgICAgICAgQUNDT1VOVDogYWNjb3VudCxcbiAgICAgICAgQ0NIX1ZFUlNJT046IGV4dHJhLmNjaFZlcnNpb24sXG4gICAgICAgIENVU1RPTUVSX1JFUE9fQlVDS0VUOiB0b2ZidWNrZXROYW1lLFxuICAgICAgICBLSU5FU0lTX0VOQUJMRUQ6IGNjaExvZ2dlci5pc0tpbmVzaXNFbmFibGVkKCksXG4gICAgICB9LFxuICAgIH1cbiAgKTtcbiAgY2NoTG9nZ2VyLmdldExhbWJkYVN1YnNjcmlwdGlvbkZpbHRlcihcbiAgICBgJHtpbnN0YW5jZU5hbWV9LWNjaC1sb2ctdmFsaWRhdGlvbi1zdW1tYXJ5YCxcbiAgICBsb2dWYWxpZGF0aW9uRXJyb3JzU3VtbWFyeS5sb2dHcm91cFxuICApO1xuXG4gIC8vRGVmaW5lIGEgZnVuY3Rpb24gdG8gc2V0IGVudlByZWZpeCB0byBlYWNoIHRhc2sgaW4gdGhlIHRlbXBsYXRlXG4gIGNvbnN0IHNldEVudlByZWZpeCA9IG5ldyBsYW1iZGFOb2RlLk5vZGVqc0Z1bmN0aW9uKHNjb3BlLCBcInNldEVudlByZWZpeFwiLCB7XG4gICAgcnVudGltZTogZXh0cmEuZml4ZWRMYW1iZGFSdW50aW1lLFxuICAgIGVudHJ5OiBcImxhbWJkYS9zZXRFbnZQcmVmaXguanNcIixcbiAgICBoYW5kbGVyOiBcImhhbmRsZXJcIixcbiAgICBkZXNjcmlwdGlvbjogXCJTZXQgZW52UHJlZml4IHRvIGVhY2ggdGFzayBpbiB0aGUgdGVtcGxhdGVcIixcbiAgICBmdW5jdGlvbk5hbWU6IGAke2luc3RhbmNlTmFtZX0tY2NoLXNldC1lbnZwcmVmaXhgLFxuICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIHJvbGU6IGNjaFJvbGVzLmdldENDSExhbWJkYUV4ZWN1dGlvblJvbGUoKSxcbiAgICB0cmFjaW5nOiBjY2hMb2dnZXIuZ2V0TGFtYmRhTG9nU2V0dGluZ3MoKSxcbiAgICBlbnZpcm9ubWVudDoge1xuICAgICAgU05TX1RPUElDX0FSTjogZXh0cmEubWF0b3BpY0FSTixcbiAgICAgIFNUQUdFX1BSRUZJWDogaW5zdGFuY2VOYW1lLFxuICAgICAgUkVHSU9OOiByZWdpb24sXG4gICAgICBBQ0NPVU5UOiBhY2NvdW50LFxuICAgICAgQ0NIX1ZFUlNJT046IGV4dHJhLmNjaFZlcnNpb24sXG4gICAgICBDVVNUT01FUl9SRVBPX0JVQ0tFVDogdG9mYnVja2V0TmFtZSxcbiAgICAgIEtJTkVTSVNfRU5BQkxFRDogY2NoTG9nZ2VyLmlzS2luZXNpc0VuYWJsZWQoKSxcbiAgICB9LFxuICB9KTtcbiAgY2NoTG9nZ2VyLmdldExhbWJkYVN1YnNjcmlwdGlvbkZpbHRlcihcbiAgICBgJHtpbnN0YW5jZU5hbWV9LWNjaC1zZXQtZW52cHJlZml4YCxcbiAgICBzZXRFbnZQcmVmaXgubG9nR3JvdXBcbiAgKTtcblxuICAvL0RlZmluZSBhIGZ1bmN0aW9uIHRvIGxvZyBlbnZpcm9ubWVudCBleGVjdXRpb24gc3RhdHVzIHRvIE5ldyBSZWxpY1xuICBjb25zdCBsb2dFbnZTdGF0dXMgPSBuZXcgbGFtYmRhTm9kZS5Ob2RlanNGdW5jdGlvbihcbiAgICBzY29wZSxcbiAgICBcImxvZ0VudkV4ZWN1dGlvblN0YXR1c1wiLFxuICAgIHtcbiAgICAgIHJ1bnRpbWU6IGV4dHJhLmZpeGVkTGFtYmRhUnVudGltZSxcbiAgICAgIGVudHJ5OiBcImxhbWJkYS9sb2dFbnZFeGVjdXRpb25TdGF0dXMuanNcIixcbiAgICAgIGhhbmRsZXI6IFwiaGFuZGxlclwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiTG9nIGVudmlyb25tZW50IGV4ZWN1dGlvbiBzdGF0dXMgdG8gTmV3IFJlbGljLlwiLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgJHtpbnN0YW5jZU5hbWV9LWNjaC1sb2ctZW52LXN0YXR1c2AsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIHJvbGU6IGNjaFJvbGVzLmdldENDSExhbWJkYUV4ZWN1dGlvblJvbGUoKSxcbiAgICAgIHRyYWNpbmc6IGNjaExvZ2dlci5nZXRMYW1iZGFMb2dTZXR0aW5ncygpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU05TX1RPUElDX0FSTjogZXh0cmEubWF0b3BpY0FSTixcbiAgICAgICAgU1RBR0VfUFJFRklYOiBpbnN0YW5jZU5hbWUsXG4gICAgICAgIFJFR0lPTjogcmVnaW9uLFxuICAgICAgICBBQ0NPVU5UOiBhY2NvdW50LFxuICAgICAgICBDQ0hfVkVSU0lPTjogZXh0cmEuY2NoVmVyc2lvbixcbiAgICAgICAgQ1VTVE9NRVJfUkVQT19CVUNLRVQ6IHRvZmJ1Y2tldE5hbWUsXG4gICAgICAgIEtJTkVTSVNfRU5BQkxFRDogY2NoTG9nZ2VyLmlzS2luZXNpc0VuYWJsZWQoKSxcbiAgICAgIH0sXG4gICAgfVxuICApO1xuICBjY2hMb2dnZXIuZ2V0TGFtYmRhU3Vic2NyaXB0aW9uRmlsdGVyKFxuICAgIGAke2luc3RhbmNlTmFtZX0tY2NoLWxvZy1lbnYtc3RhdHVzYCxcbiAgICBsb2dFbnZTdGF0dXMubG9nR3JvdXBcbiAgKTtcblxuICAvL0RlZmluZSB0aGUgSHViIFdvcmtmbG93IFN0ZXAgZnVuY3Rpb25cbiAgY29uc3QgaHVic2ZuID0gbmV3IEh1YldvcmtmbG93KHNjb3BlLCBcIkh1YldvcmtmbG93XCIsIHtcbiAgICBuYW1lOiBgJHtpbnN0YW5jZU5hbWV9LWNsb3VkLWNvbnRyb2wtaHViLXdvcmtmbG93YCxcbiAgICBpbnN0YW5jZU5hbWU6IGluc3RhbmNlTmFtZSxcbiAgICB6b25lOiBleHRyYS5kZXBsb3ltZW50Wm9uZSxcbiAgICBpdGVyYXRlOiBzZm5JdGVyYXRlLFxuICAgIGdldFNpemU6IHNmblNpemUsXG4gICAgcmVnaW9uOiByZWdpb24sXG4gICAgY3VzdG9tZXJBY2NvdW50OiBhY2NvdW50LFxuICAgIGN1c3RvbWVyQ29uZmlnVGFibGU6IGN1c3RvbWVyQ29uZmlnVGFibGUsXG4gICAgZGVwbG95Um9sZU5hbWU6IHByb3BzLnJvbGVzLmN1c3RvbWVyLFxuICAgIHJlcG9Sb2xlTmFtZTogcHJvcHMucm9sZXMuc291cmNlLFxuICAgIGNvZGVCdWlsZFBhY2thZ2VDdXN0b21lcjogcGFja2FnZUN1c3RvbWVyUmVwb1Byb2plY3QsXG4gICAgYXJ0aWZhY3RCdWNrZXQ6IGZjY2hBcnRpZmFjdEJ1Y2tldCxcbiAgICByZWFkUzM6IHNmblJlYWRTMyxcbiAgICBldmVudEJ1c0hhbmRsZXI6IHNmbkV2ZW50QnVzSGFuZGxlcixcbiAgICB2YWxpZGF0ZVRlbXBsYXRlRGVwZW5kZW5jaWVzOiBzZm5WYWxpZGF0ZVRlbXBsYXRlRGVwZW5kZW5jaWVzLFxuICAgIHZhbGlkYXRlVGVtcGxhdGU6IHNmblZhbGlkYXRlVGVtcGxhdGUsXG4gICAgdmFsaWRhdGVUT0Y6IHNmblZhbGlkYXRlVE9GLFxuICAgIHZhbGlkYXRlRW1haWxzOiBzZm5WYWxpZGF0ZUVtYWlscyxcbiAgICBsb2dWYWxpZGF0aW9uU3VtbWFyeTogbG9nVmFsaWRhdGlvbkVycm9yc1N1bW1hcnksXG4gICAgZmFpbDogc2ZuRmFpbHVyZUZ1bmN0aW9uLFxuICAgIGV4ZWN1dGlvbkZhaWxlZDogZ2V0RXhlY3V0aW9uRmFpbGVkRnVuY3Rpb24sXG4gICAgc2V0RW52UHJlZml4OiBzZXRFbnZQcmVmaXgsXG4gICAgbG9nRW52U3RhdHVzOiBsb2dFbnZTdGF0dXMsXG4gICAgLy8gRGVmYXVsdCB0byAzIHBhcmFsbGVsIHRhc2tzIGFzIHBlciByZXF1aXJlbWVudHMuXG4gICAgbWF4Q29uY3VycmVuY3k6IHByb3BzLmVudmlyb25tZW50Lm1heENvbmN1cnJlbmN5XG4gICAgICA/IHByb3BzLmVudmlyb25tZW50Lm1heENvbmN1cnJlbmN5XG4gICAgICA6IDMsXG4gICAgLy8gRGVmYXVsdCB0byAzIHBhcmFsbGVsIGVudmlyb25tZW50cyBhcyBwZXIgcmVxdWlyZW1lbnRzLlxuICAgIGVudkNvbmN1cnJlbmN5OiBwcm9wcy5lbnZpcm9ubWVudC5lbnZDb25jdXJyZW5jeVxuICAgICAgPyBwcm9wcy5lbnZpcm9ubWVudC5lbnZDb25jdXJyZW5jeVxuICAgICAgOiAzLFxuICAgIHNmblJvbGU6IGNjaFJvbGVzLmdldENDSHNmbkV4ZWN1dGlvblJvbGUoKSxcbiAgICBsb2dnaW5nOiBjY2hMb2dnZXIuZ2V0U3RhdGVNYWNoaW5lTG9nU2V0dGluZ3MoXG4gICAgICBgJHtpbnN0YW5jZU5hbWV9LWNsb3VkLWNvbnRyb2wtaHViLXdvcmtmbG93YFxuICAgICksXG4gIH0pO1xuXG4gIGZjY2hBcnRpZmFjdEJ1Y2tldC5ncmFudFJlYWQoc2ZuUmVhZFMzKTtcbiAgZmNjaEFydGlmYWN0QnVja2V0LmdyYW50UmVhZChzZm5WYWxpZGF0ZVRlbXBsYXRlRGVwZW5kZW5jaWVzKTtcbiAgZmNjaEFydGlmYWN0QnVja2V0LmdyYW50UmVhZChzZm5WYWxpZGF0ZVRlbXBsYXRlKTtcbiAgZmNjaEFydGlmYWN0QnVja2V0LmdyYW50UmVhZChodWJzZm4pO1xuICBmY2NoQXJ0aWZhY3RCdWNrZXQuZ3JhbnRXcml0ZShwYWNrYWdlQ3VzdG9tZXJSZXBvUHJvamVjdCk7XG59XG4iXX0=