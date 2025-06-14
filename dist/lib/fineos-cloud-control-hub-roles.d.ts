import { IRole } from "aws-cdk-lib/aws-iam";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
export declare class CCHRoles {
    private cchLambdaExecutionRole;
    private cchSfnExecutionRole;
    private cchSubscriptionFilterRole;
    private cchEventHubLambdaRole;
    constructor(scope: Construct, region: string, account: string, stage: string, cchArtifactBucket: IBucket, tofArtifactBucket: IBucket, manualApprovalTopicArn: string);
    private setCCHLambdaExecutionRole;
    private setCCHSfnExecutionRole;
    private setCCHSubscriptionFilterRole;
    private setCCHEventHubLambdaRule;
    getCCHLambdaExecutionRole(): IRole;
    getCCHsfnExecutionRole(): IRole;
    getCCHSubscriptionFilterRole(): IRole;
    getCCHEventHubLambdaRole(): IRole;
    private buildSfnExecutionRolePolicies;
    private buildLambdaExecutionRolePolicies;
    private buildSubscriptionFilterRolePolicies;
    private buildEventHubRolePolicies;
}
