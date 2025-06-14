"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCHRoles = void 0;
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class CCHRoles {
    constructor(scope, region, account, stage, cchArtifactBucket, tofArtifactBucket, manualApprovalTopicArn) {
        this.setCCHLambdaExecutionRole(scope, region, account, stage, cchArtifactBucket, tofArtifactBucket, manualApprovalTopicArn);
        this.setCCHSfnExecutionRole(scope, region, account, stage);
        this.setCCHSubscriptionFilterRole(scope, region, account, stage);
        this.setCCHEventHubLambdaRule(scope, region, account, stage);
    }
    setCCHLambdaExecutionRole(scope, region, account, stage, cchArtifactBucket, tofArtifactBucket, manualApprovalTopicArn) {
        const cchLambdaExecutionRoleName = `${stage}-${region}-cch-lambda-execution-role`;
        const lambdaStandardRole = new aws_iam_1.Role(scope, cchLambdaExecutionRoleName, {
            roleName: cchLambdaExecutionRoleName,
            assumedBy: new aws_iam_1.ServicePrincipal("lambda.amazonaws.com"),
            managedPolicies: [aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
        });
        this.cchLambdaExecutionRole = this.buildLambdaExecutionRolePolicies(scope, region, account, stage, lambdaStandardRole, cchArtifactBucket, tofArtifactBucket, manualApprovalTopicArn).withoutPolicyUpdates();
    }
    setCCHSfnExecutionRole(scope, region, account, stage) {
        const cchSfnExecutionRoleName = `${stage}-${region}-cch-sfn-execution-role`;
        const sfnStandardRole = new aws_iam_1.Role(scope, cchSfnExecutionRoleName, {
            assumedBy: new aws_iam_1.ServicePrincipal(`states.${region}.amazonaws.com`)
        });
        this.cchSfnExecutionRole = this.buildSfnExecutionRolePolicies(scope, region, account, stage, sfnStandardRole).withoutPolicyUpdates();
    }
    setCCHSubscriptionFilterRole(scope, region, account, stage) {
        const cchSubScriptionFilterRoleName = `${stage}-${region}-cch-subscription-filter-role`;
        const sfnStandardRole = new aws_iam_1.Role(scope, cchSubScriptionFilterRoleName, {
            assumedBy: new aws_iam_1.ServicePrincipal(`logs.${region}.amazonaws.com`)
        });
        this.cchSubscriptionFilterRole = this.buildSubscriptionFilterRolePolicies(scope, region, account, stage, sfnStandardRole).withoutPolicyUpdates();
    }
    setCCHEventHubLambdaRule(scope, region, account, stage) {
        const cchEventHubHandlerName = `${stage}-${region}-cch-event-hub-handler-role`;
        const eventHubHandlerRole = new aws_iam_1.Role(scope, cchEventHubHandlerName, {
            roleName: cchEventHubHandlerName,
            assumedBy: new aws_iam_1.ServicePrincipal("lambda.amazonaws.com"),
            managedPolicies: [
                aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
            ],
        });
        this.cchEventHubLambdaRole = this.buildEventHubRolePolicies(scope, region, account, stage, eventHubHandlerRole).withoutPolicyUpdates();
    }
    getCCHLambdaExecutionRole() {
        return this.cchLambdaExecutionRole;
    }
    getCCHsfnExecutionRole() {
        return this.cchSfnExecutionRole;
    }
    getCCHSubscriptionFilterRole() {
        return this.cchSubscriptionFilterRole;
    }
    getCCHEventHubLambdaRole() {
        return this.cchEventHubLambdaRole;
    }
    buildSfnExecutionRolePolicies(scope, region, account, stage, role) {
        const cchSfnExecutionPolicyName = `${stage}-${region}-cch-sfn-execution-policy`;
        role.attachInlinePolicy(new aws_iam_1.Policy(scope, cchSfnExecutionPolicyName, {
            statements: [
                new aws_iam_1.PolicyStatement({
                    actions: ["logs:CreateLogDelivery",
                        "logs:GetLogDelivery",
                        "logs:UpdateLogDelivery",
                        "logs:DeleteLogDelivery",
                        "logs:ListLogDeliveries",
                        "logs:PutLogEvents",
                        "logs:PutResourcePolicy",
                        "logs:DescribeResourcePolicies",
                        "logs:DescribeLogGroups"],
                    resources: ["*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["lambda:InvokeFunction"],
                    resources: [`arn:aws:lambda:${region}:${account}:function:*${stage}*`],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["codebuild:StartBuild",
                        "codebuild:StopBuild",
                        "codebuild:BatchGetBuilds",
                        "codebuild:BatchGetReports"],
                    resources: [`arn:aws:codebuild:${region}:${account}:project/*${stage}*`],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["events:PutTargets",
                        "events:PutRule",
                        "events:DescribeRule"],
                    resources: [`arn:aws:events:${region}:${account}:rule/StepFunctionsGetEventForCodeBuildStartBuildRule`,
                        `arn:aws:events:${region}:${account}:rule/StepFunctionsGetEventsForStepFunctionsExecutionRule`],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["dynamodb:GetItem"],
                    resources: [`arn:aws:dynamodb:${region}:${account}:table/*${stage}*`],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["states:StartExecution"],
                    resources: [`arn:aws:states:${region}:${account}:stateMachine:${stage}*`],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["states:DescribeExecution", "states:StopExecution"],
                    resources: [`arn:aws:states:${region}:${account}:execution:${stage}*:*`],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["xray:*"],
                    resources: ["*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["events:PutEvents"],
                    resources: [
                        `arn:aws:events:${region}:${account}:event-bus/${stage}-client-event-bus`,
                    ],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
            ]
        }));
        return role;
    }
    buildLambdaExecutionRolePolicies(scope, region, account, stage, role, cchArtifactBucket, tofArtifactBucket, manualApprovalTopicArn) {
        const cchLambdaExecutionPolicyName = `${stage}-${region}-cch-lambda-execution-policy`;
        role.attachInlinePolicy(new aws_iam_1.Policy(scope, cchLambdaExecutionPolicyName, {
            statements: [
                new aws_iam_1.PolicyStatement({
                    actions: ["states:StartExecution", "states:GetExecutionHistory", "states:ListTagsForResource", "states:DescribeExecution"],
                    resources: ["*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["cloudtrail:LookupEvents"],
                    resources: ["*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: [
                        "s3:Get*",
                        "s3:List*",
                        "s3-object-lambda:Get*",
                        "s3-object-lambda:List*"
                    ],
                    resources: [`arn:aws:s3:::${cchArtifactBucket.bucketName}`, `${cchArtifactBucket.bucketArn}/*`,
                        `arn:aws:s3:::${tofArtifactBucket.bucketName}`, `${tofArtifactBucket.bucketArn}/*`],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["sns:Publish",
                        "sns:GetTopicAttributes",
                        "sns:ListSubscriptionsByTopic",
                        "sns:CreateTopic"],
                    resources: [manualApprovalTopicArn + "*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["xray:*"],
                    resources: ["*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["logs:GetLogEvents"],
                    resources: [`arn:aws:logs:${region}:${account}:log-group:/aws/codebuild/${stage}-*`,
                        `arn:aws:logs:${region}:${account}:log-group:/aws/codebuild/deploymentBuildProject-${stage}*`],
                    effect: aws_iam_1.Effect.ALLOW
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["dynamodb:List*",
                        "dynamodb:GetItem"],
                    resources: [`arn:aws:dynamodb:${region}:${account}:table/${stage}-*`],
                    effect: aws_iam_1.Effect.ALLOW
                })
            ]
        }));
        return role;
    }
    buildSubscriptionFilterRolePolicies(scope, region, account, stage, role) {
        const cchSubscriptionFilterPolicyName = `${stage}-${region}-cch-subscription-filter-policy`;
        role.attachInlinePolicy(new aws_iam_1.Policy(scope, cchSubscriptionFilterPolicyName, {
            statements: [
                new aws_iam_1.PolicyStatement({
                    actions: ["kinesis:ListShards",
                        "kinesis:PutRecord",
                        "kinesis:PutRecords"],
                    resources: ["*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    actions: ["iam:PassRole"],
                    resources: [`arn:aws:iam::${account}:role/${stage}-*`],
                    effect: aws_iam_1.Effect.ALLOW,
                })
            ]
        }));
        return role;
    }
    buildEventHubRolePolicies(scope, region, account, stage, role) {
        const tofEventHubHandlerPolicyName = `${stage}-${region}-tof-event-hub-handler-policy`;
        role.attachInlinePolicy(new aws_iam_1.Policy(scope, tofEventHubHandlerPolicyName, {
            statements: [
                new aws_iam_1.PolicyStatement({
                    sid: "allowStsActions",
                    actions: ["sts:assumeRole", "sts:Get*"],
                    resources: ["*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    sid: "allowReadOrganizationsActions",
                    actions: ["organizations:Describe*", "organizations:List*"],
                    resources: ["*"],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    sid: "allowDynamoDbActions",
                    actions: ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query"],
                    resources: [
                        `arn:aws:dynamodb:${region}:${account}:table/${stage}-event-hub-events`,
                    ],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
                new aws_iam_1.PolicyStatement({
                    sid: "allowEventBridgeActions",
                    actions: ["events:*", "schemas:*"],
                    resources: [
                        `arn:aws:events:${region}:${account}:event-bus/${stage}-client-event-bus`,
                    ],
                    effect: aws_iam_1.Effect.ALLOW,
                }),
            ],
        }));
        return role;
    }
}
exports.CCHRoles = CCHRoles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZW9zLWNsb3VkLWNvbnRyb2wtaHViLXJvbGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL2ZpbmVvcy1jbG91ZC1jb250cm9sLWh1Yi1yb2xlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFBb0g7QUFJcEgsTUFBYSxRQUFRO0lBTWpCLFlBQVksS0FBZSxFQUFFLE1BQWEsRUFBRSxPQUFjLEVBQUUsS0FBWSxFQUFFLGlCQUF5QixFQUFFLGlCQUF5QixFQUFFLHNCQUE2QjtRQUN6SixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFDM0gsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUNPLHlCQUF5QixDQUFDLEtBQWUsRUFBRSxNQUFhLEVBQUUsT0FBYyxFQUFFLEtBQVksRUFBRSxpQkFBeUIsRUFBRSxpQkFBeUIsRUFBRSxzQkFBNkI7UUFDL0ssTUFBTSwwQkFBMEIsR0FBRyxHQUFHLEtBQUssSUFBSSxNQUFNLDRCQUE0QixDQUFBO1FBQ2pGLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxjQUFJLENBQUMsS0FBSyxFQUFFLDBCQUEwQixFQUFFO1lBQ25FLFFBQVEsRUFBRSwwQkFBMEI7WUFDcEMsU0FBUyxFQUFFLElBQUksMEJBQWdCLENBQUMsc0JBQXNCLENBQUM7WUFDdkQsZUFBZSxFQUFFLENBQUUsdUJB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RUFBRSxDQUFDLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDO29CQUNuRSxTQUFTLEVBQUU7d0JBQ1Qsb0JBQW9CLE1BQU0sSUFBSSxPQUFPLFVBQVUsS0FBSyxtQkFBbUI7cUJBQ3hFO29CQUNELE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7aUJBQ3JCLENBQUM7Z0JBQ0YsSUFBSSx5QkFBZSxDQUFDO29CQUNsQixHQUFHLEVBQUUseUJBQXlCO29CQUM5QixPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDO29CQUNsQyxTQUFTLEVBQUU7d0JBQ1Qsa0JBQWtCLE1BQU0sSUFBSSxPQUFPLGNBQWMsS0FBSyxtQkFBbUI7cUJBQzFFO29CQUNELE1BQU0sRUFBRSxnQkFBTSxDQUFDLEtBQUs7aUJBQ3JCLENBQUM7YUFDSDtTQUNGLENBQUMsQ0FDSCxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ047QUFyUkQsNEJBcVJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRWZmZWN0LCBJUm9sZSwgTWFuYWdlZFBvbGljeSwgUG9saWN5LCBQb2xpY3lTdGF0ZW1lbnQsIFJvbGUsIFNlcnZpY2VQcmluY2lwYWwgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xyXG5pbXBvcnQgeyBJQnVja2V0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENDSFJvbGVze1xyXG4gICAgcHJpdmF0ZSBjY2hMYW1iZGFFeGVjdXRpb25Sb2xlOiBJUm9sZVxyXG4gICAgcHJpdmF0ZSBjY2hTZm5FeGVjdXRpb25Sb2xlOiBJUm9sZVxyXG4gICAgcHJpdmF0ZSBjY2hTdWJzY3JpcHRpb25GaWx0ZXJSb2xlOiBJUm9sZVxyXG4gICAgcHJpdmF0ZSBjY2hFdmVudEh1YkxhbWJkYVJvbGU6IElSb2xlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOkNvbnN0cnVjdCwgcmVnaW9uOnN0cmluZywgYWNjb3VudDpzdHJpbmcsIHN0YWdlOnN0cmluZywgY2NoQXJ0aWZhY3RCdWNrZXQ6SUJ1Y2tldCwgdG9mQXJ0aWZhY3RCdWNrZXQ6SUJ1Y2tldCwgbWFudWFsQXBwcm92YWxUb3BpY0FybjpzdHJpbmcpe1xyXG4gICAgICAgIHRoaXMuc2V0Q0NITGFtYmRhRXhlY3V0aW9uUm9sZShzY29wZSwgcmVnaW9uLCBhY2NvdW50LCBzdGFnZSwgY2NoQXJ0aWZhY3RCdWNrZXQsIHRvZkFydGlmYWN0QnVja2V0LCBtYW51YWxBcHByb3ZhbFRvcGljQXJuKVxyXG4gICAgICAgIHRoaXMuc2V0Q0NIU2ZuRXhlY3V0aW9uUm9sZShzY29wZSwgcmVnaW9uLCBhY2NvdW50LCBzdGFnZSlcclxuICAgICAgICB0aGlzLnNldENDSFN1YnNjcmlwdGlvbkZpbHRlclJvbGUoc2NvcGUsIHJlZ2lvbiwgYWNjb3VudCwgc3RhZ2UpXHJcbiAgICAgICAgdGhpcy5zZXRDQ0hFdmVudEh1YkxhbWJkYVJ1bGUoc2NvcGUsIHJlZ2lvbiwgYWNjb3VudCwgc3RhZ2UpO1xyXG4gICAgfVxyXG4gICAgcHJpdmF0ZSBzZXRDQ0hMYW1iZGFFeGVjdXRpb25Sb2xlKHNjb3BlOkNvbnN0cnVjdCwgcmVnaW9uOnN0cmluZywgYWNjb3VudDpzdHJpbmcsIHN0YWdlOnN0cmluZywgY2NoQXJ0aWZhY3RCdWNrZXQ6SUJ1Y2tldCwgdG9mQXJ0aWZhY3RCdWNrZXQ6SUJ1Y2tldCwgbWFudWFsQXBwcm92YWxUb3BpY0FybjpzdHJpbmcpe1xyXG4gICAgICAgIGNvbnN0IGNjaExhbWJkYUV4ZWN1dGlvblJvbGVOYW1lID0gYCR7c3RhZ2V9LSR7cmVnaW9ufS1jY2gtbGFtYmRhLWV4ZWN1dGlvbi1yb2xlYFxyXG4gICAgICAgIGNvbnN0IGxhbWJkYVN0YW5kYXJkUm9sZSA9IG5ldyBSb2xlKHNjb3BlLCBjY2hMYW1iZGFFeGVjdXRpb25Sb2xlTmFtZSwge1xyXG4gICAgICAgICAgICByb2xlTmFtZTogY2NoTGFtYmRhRXhlY3V0aW9uUm9sZU5hbWUsXHJcbiAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoXCJsYW1iZGEuYW1hem9uYXdzLmNvbVwiKSxcclxuICAgICAgICAgICAgbWFuYWdlZFBvbGljaWVzOiBbIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwic2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZVwiKV0sXHJcbiAgICAgICAgfSlcclxuICAgICAgICB0aGlzLmNjaExhbWJkYUV4ZWN1dGlvblJvbGUgPSB0aGlzLmJ1aWxkTGFtYmRhRXhlY3V0aW9uUm9sZVBvbGljaWVzKHNjb3BlLCByZWdpb24sIGFjY291bnQsIHN0YWdlLFxyXG4gICAgICAgICAgICBsYW1iZGFTdGFuZGFyZFJvbGUsIGNjaEFydGlmYWN0QnVja2V0LCB0b2ZBcnRpZmFjdEJ1Y2tldCwgbWFudWFsQXBwcm92YWxUb3BpY0Fybikud2l0aG91dFBvbGljeVVwZGF0ZXMoKVxyXG4gICAgfVxyXG4gICAgcHJpdmF0ZSBzZXRDQ0hTZm5FeGVjdXRpb25Sb2xlKHNjb3BlOkNvbnN0cnVjdCwgcmVnaW9uOnN0cmluZywgYWNjb3VudDpzdHJpbmcsIHN0YWdlOnN0cmluZyl7XHJcbiAgICAgICAgY29uc3QgY2NoU2ZuRXhlY3V0aW9uUm9sZU5hbWUgPSBgJHtzdGFnZX0tJHtyZWdpb259LWNjaC1zZm4tZXhlY3V0aW9uLXJvbGVgXHJcbiAgICAgICAgY29uc3Qgc2ZuU3RhbmRhcmRSb2xlID0gbmV3IFJvbGUoc2NvcGUsIGNjaFNmbkV4ZWN1dGlvblJvbGVOYW1lLCB7XHJcbiAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoYHN0YXRlcy4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbWApXHJcbiAgICAgICAgfSlcclxuICAgICAgICB0aGlzLmNjaFNmbkV4ZWN1dGlvblJvbGUgPSB0aGlzLmJ1aWxkU2ZuRXhlY3V0aW9uUm9sZVBvbGljaWVzKHNjb3BlLCByZWdpb24sIGFjY291bnQsIHN0YWdlLCBzZm5TdGFuZGFyZFJvbGUpLndpdGhvdXRQb2xpY3lVcGRhdGVzKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNldENDSFN1YnNjcmlwdGlvbkZpbHRlclJvbGUoc2NvcGU6Q29uc3RydWN0LCByZWdpb246c3RyaW5nLCBhY2NvdW50OnN0cmluZywgc3RhZ2U6c3RyaW5nKXtcclxuICAgICAgICBjb25zdCBjY2hTdWJTY3JpcHRpb25GaWx0ZXJSb2xlTmFtZSA9IGAke3N0YWdlfS0ke3JlZ2lvbn0tY2NoLXN1YnNjcmlwdGlvbi1maWx0ZXItcm9sZWBcclxuICAgICAgICBjb25zdCBzZm5TdGFuZGFyZFJvbGUgPSBuZXcgUm9sZShzY29wZSwgY2NoU3ViU2NyaXB0aW9uRmlsdGVyUm9sZU5hbWUsIHtcclxuICAgICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbChgbG9ncy4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbWApXHJcbiAgICAgICAgfSlcclxuICAgICAgICB0aGlzLmNjaFN1YnNjcmlwdGlvbkZpbHRlclJvbGUgPSB0aGlzLmJ1aWxkU3Vic2NyaXB0aW9uRmlsdGVyUm9sZVBvbGljaWVzKHNjb3BlLCByZWdpb24sIGFjY291bnQsIHN0YWdlLCBzZm5TdGFuZGFyZFJvbGUpLndpdGhvdXRQb2xpY3lVcGRhdGVzKClcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNldENDSEV2ZW50SHViTGFtYmRhUnVsZShcclxuICAgICAgICBzY29wZTogQ29uc3RydWN0LFxyXG4gICAgICAgIHJlZ2lvbjogc3RyaW5nLFxyXG4gICAgICAgIGFjY291bnQ6IHN0cmluZyxcclxuICAgICAgICBzdGFnZTogc3RyaW5nXHJcbiAgICAgICkge1xyXG4gICAgICAgIGNvbnN0IGNjaEV2ZW50SHViSGFuZGxlck5hbWUgPSBgJHtzdGFnZX0tJHtyZWdpb259LWNjaC1ldmVudC1odWItaGFuZGxlci1yb2xlYDtcclxuICAgICAgICBjb25zdCBldmVudEh1YkhhbmRsZXJSb2xlID0gbmV3IFJvbGUoc2NvcGUsIGNjaEV2ZW50SHViSGFuZGxlck5hbWUsIHtcclxuICAgICAgICAgIHJvbGVOYW1lOiBjY2hFdmVudEh1YkhhbmRsZXJOYW1lLFxyXG4gICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbChcImxhbWJkYS5hbWF6b25hd3MuY29tXCIpLFxyXG4gICAgICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXHJcbiAgICAgICAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxyXG4gICAgICAgICAgICAgIFwic2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZVwiXHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuY2NoRXZlbnRIdWJMYW1iZGFSb2xlID0gdGhpcy5idWlsZEV2ZW50SHViUm9sZVBvbGljaWVzKFxyXG4gICAgICAgICAgc2NvcGUsXHJcbiAgICAgICAgICByZWdpb24sXHJcbiAgICAgICAgICBhY2NvdW50LFxyXG4gICAgICAgICAgc3RhZ2UsXHJcbiAgICAgICAgICBldmVudEh1YkhhbmRsZXJSb2xlXHJcbiAgICAgICAgKS53aXRob3V0UG9saWN5VXBkYXRlcygpO1xyXG4gICAgICB9XHJcblxyXG4gICAgZ2V0Q0NITGFtYmRhRXhlY3V0aW9uUm9sZSgpOklSb2xle1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNjaExhbWJkYUV4ZWN1dGlvblJvbGVcclxuICAgIH1cclxuICAgIGdldENDSHNmbkV4ZWN1dGlvblJvbGUoKTpJUm9sZXtcclxuICAgICAgICByZXR1cm4gdGhpcy5jY2hTZm5FeGVjdXRpb25Sb2xlXHJcbiAgICB9XHJcbiAgICBnZXRDQ0hTdWJzY3JpcHRpb25GaWx0ZXJSb2xlKCk6SVJvbGV7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2NoU3Vic2NyaXB0aW9uRmlsdGVyUm9sZVxyXG4gICAgfVxyXG4gICAgZ2V0Q0NIRXZlbnRIdWJMYW1iZGFSb2xlKCk6IElSb2xlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jY2hFdmVudEh1YkxhbWJkYVJvbGU7XHJcbiAgICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkU2ZuRXhlY3V0aW9uUm9sZVBvbGljaWVzKHNjb3BlOkNvbnN0cnVjdCwgcmVnaW9uOnN0cmluZywgYWNjb3VudDpzdHJpbmcsIHN0YWdlOnN0cmluZywgcm9sZTpSb2xlKTpSb2xle1xyXG4gICAgICAgIGNvbnN0IGNjaFNmbkV4ZWN1dGlvblBvbGljeU5hbWUgPSAgYCR7c3RhZ2V9LSR7cmVnaW9ufS1jY2gtc2ZuLWV4ZWN1dGlvbi1wb2xpY3lgXHJcbiAgICAgICAgXHJcbiAgICAgICAgcm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBQb2xpY3koc2NvcGUsIGNjaFNmbkV4ZWN1dGlvblBvbGljeU5hbWUsIHtcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1wibG9nczpDcmVhdGVMb2dEZWxpdmVyeVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJsb2dzOkdldExvZ0RlbGl2ZXJ5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImxvZ3M6VXBkYXRlTG9nRGVsaXZlcnlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibG9nczpEZWxldGVMb2dEZWxpdmVyeVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJsb2dzOkxpc3RMb2dEZWxpdmVyaWVzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImxvZ3M6UHV0TG9nRXZlbnRzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImxvZ3M6UHV0UmVzb3VyY2VQb2xpY3lcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibG9nczpEZXNjcmliZVJlc291cmNlUG9saWNpZXNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibG9nczpEZXNjcmliZUxvZ0dyb3Vwc1wiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1wibGFtYmRhOkludm9rZUZ1bmN0aW9uXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpsYW1iZGE6JHtyZWdpb259OiR7YWNjb3VudH06ZnVuY3Rpb246KiR7c3RhZ2V9KmBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1wiY29kZWJ1aWxkOlN0YXJ0QnVpbGRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiY29kZWJ1aWxkOlN0b3BCdWlsZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJjb2RlYnVpbGQ6QmF0Y2hHZXRCdWlsZHNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiY29kZWJ1aWxkOkJhdGNoR2V0UmVwb3J0c1wiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6Y29kZWJ1aWxkOiR7cmVnaW9ufToke2FjY291bnR9OnByb2plY3QvKiR7c3RhZ2V9KmBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1wiZXZlbnRzOlB1dFRhcmdldHNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZXZlbnRzOlB1dFJ1bGVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZXZlbnRzOkRlc2NyaWJlUnVsZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6ZXZlbnRzOiR7cmVnaW9ufToke2FjY291bnR9OnJ1bGUvU3RlcEZ1bmN0aW9uc0dldEV2ZW50Rm9yQ29kZUJ1aWxkU3RhcnRCdWlsZFJ1bGVgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgYXJuOmF3czpldmVudHM6JHtyZWdpb259OiR7YWNjb3VudH06cnVsZS9TdGVwRnVuY3Rpb25zR2V0RXZlbnRzRm9yU3RlcEZ1bmN0aW9uc0V4ZWN1dGlvblJ1bGVgXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcImR5bmFtb2RiOkdldEl0ZW1cIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmR5bmFtb2RiOiR7cmVnaW9ufToke2FjY291bnR9OnRhYmxlLyoke3N0YWdlfSpgXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcInN0YXRlczpTdGFydEV4ZWN1dGlvblwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6c3RhdGVzOiR7cmVnaW9ufToke2FjY291bnR9OnN0YXRlTWFjaGluZToke3N0YWdlfSpgXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcInN0YXRlczpEZXNjcmliZUV4ZWN1dGlvblwiLCBcInN0YXRlczpTdG9wRXhlY3V0aW9uXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpzdGF0ZXM6JHtyZWdpb259OiR7YWNjb3VudH06ZXhlY3V0aW9uOiR7c3RhZ2V9KjoqYF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXCJ4cmF5OipcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcImV2ZW50czpQdXRFdmVudHNcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGBhcm46YXdzOmV2ZW50czoke3JlZ2lvbn06JHthY2NvdW50fTpldmVudC1idXMvJHtzdGFnZX0tY2xpZW50LWV2ZW50LWJ1c2AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIClcclxuICAgICAgICByZXR1cm4gcm9sZVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBwcml2YXRlIGJ1aWxkTGFtYmRhRXhlY3V0aW9uUm9sZVBvbGljaWVzKHNjb3BlOkNvbnN0cnVjdCwgcmVnaW9uOnN0cmluZywgYWNjb3VudDpzdHJpbmcsIHN0YWdlOnN0cmluZyxcclxuICAgICAgICAgICAgcm9sZTpSb2xlLCBjY2hBcnRpZmFjdEJ1Y2tldDpJQnVja2V0LCB0b2ZBcnRpZmFjdEJ1Y2tldDpJQnVja2V0LCBtYW51YWxBcHByb3ZhbFRvcGljQXJuOnN0cmluZyk6Um9sZXtcclxuICAgICAgXHJcbiAgICAgICAgY29uc3QgY2NoTGFtYmRhRXhlY3V0aW9uUG9saWN5TmFtZSA9ICBgJHtzdGFnZX0tJHtyZWdpb259LWNjaC1sYW1iZGEtZXhlY3V0aW9uLXBvbGljeWAgICAgICAgIFxyXG4gICAgICAgIFxyXG4gICAgICAgIHJvbGUuYXR0YWNoSW5saW5lUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgUG9saWN5KHNjb3BlLCBjY2hMYW1iZGFFeGVjdXRpb25Qb2xpY3lOYW1lLCB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcInN0YXRlczpTdGFydEV4ZWN1dGlvblwiLCBcInN0YXRlczpHZXRFeGVjdXRpb25IaXN0b3J5XCIsIFwic3RhdGVzOkxpc3RUYWdzRm9yUmVzb3VyY2VcIixcInN0YXRlczpEZXNjcmliZUV4ZWN1dGlvblwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1wiY2xvdWR0cmFpbDpMb29rdXBFdmVudHNcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcInMzOkdldCpcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcInMzOkxpc3QqXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzMy1vYmplY3QtbGFtYmRhOkdldCpcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcInMzLW9iamVjdC1sYW1iZGE6TGlzdCpcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpzMzo6OiR7Y2NoQXJ0aWZhY3RCdWNrZXQuYnVja2V0TmFtZX1gLGAke2NjaEFydGlmYWN0QnVja2V0LmJ1Y2tldEFybn0vKmAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBhcm46YXdzOnMzOjo6JHt0b2ZBcnRpZmFjdEJ1Y2tldC5idWNrZXROYW1lfWAsIGAke3RvZkFydGlmYWN0QnVja2V0LmJ1Y2tldEFybn0vKmBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1wic25zOlB1Ymxpc2hcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic25zOkdldFRvcGljQXR0cmlidXRlc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzbnM6TGlzdFN1YnNjcmlwdGlvbnNCeVRvcGljXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNuczpDcmVhdGVUb3BpY1wiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbbWFudWFsQXBwcm92YWxUb3BpY0FybiArIFwiKlwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcInhyYXk6KlwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1wibG9nczpHZXRMb2dFdmVudHNcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmxvZ3M6JHtyZWdpb259OiR7YWNjb3VudH06bG9nLWdyb3VwOi9hd3MvY29kZWJ1aWxkLyR7c3RhZ2V9LSpgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYGFybjphd3M6bG9nczoke3JlZ2lvbn06JHthY2NvdW50fTpsb2ctZ3JvdXA6L2F3cy9jb2RlYnVpbGQvZGVwbG95bWVudEJ1aWxkUHJvamVjdC0ke3N0YWdlfSpgXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1dcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogWyBcImR5bmFtb2RiOkxpc3QqXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZHluYW1vZGI6R2V0SXRlbVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6ZHluYW1vZGI6JHtyZWdpb259OiR7YWNjb3VudH06dGFibGUvJHtzdGFnZX0tKmBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPV1xyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgKVxyXG4gICAgICAgIHJldHVybiByb2xlXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZFN1YnNjcmlwdGlvbkZpbHRlclJvbGVQb2xpY2llcyhzY29wZTpDb25zdHJ1Y3QsIHJlZ2lvbjpzdHJpbmcsIGFjY291bnQ6c3RyaW5nLCBzdGFnZTpzdHJpbmcsIHJvbGU6Um9sZSk6Um9sZXtcclxuICAgICAgICBjb25zdCBjY2hTdWJzY3JpcHRpb25GaWx0ZXJQb2xpY3lOYW1lID0gIGAke3N0YWdlfS0ke3JlZ2lvbn0tY2NoLXN1YnNjcmlwdGlvbi1maWx0ZXItcG9saWN5YFxyXG4gICAgICAgXHJcbiAgICAgICAgcm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koXHJcbiAgICAgICAgICAgIG5ldyBQb2xpY3koc2NvcGUsIGNjaFN1YnNjcmlwdGlvbkZpbHRlclBvbGljeU5hbWUsIHtcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcclxuICAgICAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogWyBcImtpbmVzaXM6TGlzdFNoYXJkc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJraW5lc2lzOlB1dFJlY29yZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJraW5lc2lzOlB1dFJlY29yZHNcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcImlhbTpQYXNzUm9sZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6aWFtOjoke2FjY291bnR9OnJvbGUvJHtzdGFnZX0tKmBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIClcclxuICAgICAgICByZXR1cm4gcm9sZVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYnVpbGRFdmVudEh1YlJvbGVQb2xpY2llcyhcclxuICAgICAgICBzY29wZTogQ29uc3RydWN0LFxyXG4gICAgICAgIHJlZ2lvbjogc3RyaW5nLFxyXG4gICAgICAgIGFjY291bnQ6IHN0cmluZyxcclxuICAgICAgICBzdGFnZTogc3RyaW5nLFxyXG4gICAgICAgIHJvbGU6IFJvbGVcclxuICAgICAgKTogUm9sZSB7XHJcbiAgICAgICAgY29uc3QgdG9mRXZlbnRIdWJIYW5kbGVyUG9saWN5TmFtZSA9IGAke3N0YWdlfS0ke3JlZ2lvbn0tdG9mLWV2ZW50LWh1Yi1oYW5kbGVyLXBvbGljeWA7XHJcbiAgICAgICAgcm9sZS5hdHRhY2hJbmxpbmVQb2xpY3koXHJcbiAgICAgICAgICBuZXcgUG9saWN5KHNjb3BlLCB0b2ZFdmVudEh1YkhhbmRsZXJQb2xpY3lOYW1lLCB7XHJcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcclxuICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIHNpZDogXCJhbGxvd1N0c0FjdGlvbnNcIixcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcInN0czphc3N1bWVSb2xlXCIsIFwic3RzOkdldCpcIl0sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXHJcbiAgICAgICAgICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIHNpZDogXCJhbGxvd1JlYWRPcmdhbml6YXRpb25zQWN0aW9uc1wiLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1wib3JnYW5pemF0aW9uczpEZXNjcmliZSpcIiwgXCJvcmdhbml6YXRpb25zOkxpc3QqXCJdLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBzaWQ6IFwiYWxsb3dEeW5hbW9EYkFjdGlvbnNcIixcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcImR5bmFtb2RiOlB1dEl0ZW1cIiwgXCJkeW5hbW9kYjpHZXRJdGVtXCIsIFwiZHluYW1vZGI6UXVlcnlcIl0sXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHtyZWdpb259OiR7YWNjb3VudH06dGFibGUvJHtzdGFnZX0tZXZlbnQtaHViLWV2ZW50c2AsXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBzaWQ6IFwiYWxsb3dFdmVudEJyaWRnZUFjdGlvbnNcIixcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcImV2ZW50czoqXCIsIFwic2NoZW1hczoqXCJdLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICAgIGBhcm46YXdzOmV2ZW50czoke3JlZ2lvbn06JHthY2NvdW50fTpldmVudC1idXMvJHtzdGFnZX0tY2xpZW50LWV2ZW50LWJ1c2AsXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuIHJvbGU7XHJcbiAgICAgIH1cclxufSJdfQ==