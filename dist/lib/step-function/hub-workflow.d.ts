import { aws_stepfunctions as sfn } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { aws_codebuild as codebuild } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StateMachineLogsDTO } from '../fineos-cloud-control-hub-logging';
export interface HubWorkflowProps {
    name: string;
    instanceName: string;
    zone: string;
    region: string;
    customerAccount: string;
    customerConfigTable: dynamodb.ITable;
    iterate: lambda.IFunction;
    getSize: lambda.IFunction;
    readS3: lambda.IFunction;
    eventBusHandler: lambda.IFunction;
    validateTemplateDependencies: lambda.IFunction;
    validateTemplate: lambda.IFunction;
    validateTOF: lambda.IFunction;
    validateEmails: lambda.IFunction;
    logValidationSummary: lambda.IFunction;
    deployRoleName: string;
    repoRoleName: string;
    codeBuildPackageCustomer: codebuild.IProject;
    artifactBucket: s3.IBucket;
    fail: lambda.IFunction;
    executionFailed: lambda.IFunction;
    maxConcurrency: number;
    sfnRole: IRole;
    logging: StateMachineLogsDTO;
    setEnvPrefix: lambda.IFunction;
    logEnvStatus: lambda.IFunction;
    envConcurrency: number;
}
export declare class HubWorkflow extends sfn.StateMachine {
    constructor(scope: Construct, id: string, props: HubWorkflowProps);
}
