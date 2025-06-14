import { Effect, IRole, ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class CCHRoles{
    private cchLambdaExecutionRole: IRole
    private cchSfnExecutionRole: IRole
    private cchSubscriptionFilterRole: IRole
    private cchEventHubLambdaRole: IRole;

    constructor(scope:Construct, region:string, account:string, stage:string, cchArtifactBucket:IBucket, tofArtifactBucket:IBucket, manualApprovalTopicArn:string){
        this.setCCHLambdaExecutionRole(scope, region, account, stage, cchArtifactBucket, tofArtifactBucket, manualApprovalTopicArn)
        this.setCCHSfnExecutionRole(scope, region, account, stage)
        this.setCCHSubscriptionFilterRole(scope, region, account, stage)
        this.setCCHEventHubLambdaRule(scope, region, account, stage);
    }
    private setCCHLambdaExecutionRole(scope:Construct, region:string, account:string, stage:string, cchArtifactBucket:IBucket, tofArtifactBucket:IBucket, manualApprovalTopicArn:string){
        const cchLambdaExecutionRoleName = `${stage}-${region}-cch-lambda-execution-role`
        const lambdaStandardRole = new Role(scope, cchLambdaExecutionRoleName, {
            roleName: cchLambdaExecutionRoleName,
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
            managedPolicies: [ ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
        })
        this.cchLambdaExecutionRole = this.buildLambdaExecutionRolePolicies(scope, region, account, stage,
            lambdaStandardRole, cchArtifactBucket, tofArtifactBucket, manualApprovalTopicArn).withoutPolicyUpdates()
    }
    private setCCHSfnExecutionRole(scope:Construct, region:string, account:string, stage:string){
        const cchSfnExecutionRoleName = `${stage}-${region}-cch-sfn-execution-role`
        const sfnStandardRole = new Role(scope, cchSfnExecutionRoleName, {
            assumedBy: new ServicePrincipal(`states.${region}.amazonaws.com`)
        })
        this.cchSfnExecutionRole = this.buildSfnExecutionRolePolicies(scope, region, account, stage, sfnStandardRole).withoutPolicyUpdates()
    }

    private setCCHSubscriptionFilterRole(scope:Construct, region:string, account:string, stage:string){
        const cchSubScriptionFilterRoleName = `${stage}-${region}-cch-subscription-filter-role`
        const sfnStandardRole = new Role(scope, cchSubScriptionFilterRoleName, {
            assumedBy: new ServicePrincipal(`logs.${region}.amazonaws.com`)
        })
        this.cchSubscriptionFilterRole = this.buildSubscriptionFilterRolePolicies(scope, region, account, stage, sfnStandardRole).withoutPolicyUpdates()
    }

    private setCCHEventHubLambdaRule(
        scope: Construct,
        region: string,
        account: string,
        stage: string
      ) {
        const cchEventHubHandlerName = `${stage}-${region}-cch-event-hub-handler-role`;
        const eventHubHandlerRole = new Role(scope, cchEventHubHandlerName, {
          roleName: cchEventHubHandlerName,
          assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
          managedPolicies: [
            ManagedPolicy.fromAwsManagedPolicyName(
              "service-role/AWSLambdaBasicExecutionRole"
            ),
          ],
        });
        this.cchEventHubLambdaRole = this.buildEventHubRolePolicies(
          scope,
          region,
          account,
          stage,
          eventHubHandlerRole
        ).withoutPolicyUpdates();
      }

    getCCHLambdaExecutionRole():IRole{
        return this.cchLambdaExecutionRole
    }
    getCCHsfnExecutionRole():IRole{
        return this.cchSfnExecutionRole
    }
    getCCHSubscriptionFilterRole():IRole{
        return this.cchSubscriptionFilterRole
    }
    getCCHEventHubLambdaRole(): IRole {
        return this.cchEventHubLambdaRole;
      }

    private buildSfnExecutionRolePolicies(scope:Construct, region:string, account:string, stage:string, role:Role):Role{
        const cchSfnExecutionPolicyName =  `${stage}-${region}-cch-sfn-execution-policy`
        
        role.attachInlinePolicy(
            new Policy(scope, cchSfnExecutionPolicyName, {
                statements: [
                    new PolicyStatement({
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
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["lambda:InvokeFunction"],
                        resources: [`arn:aws:lambda:${region}:${account}:function:*${stage}*`],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["codebuild:StartBuild",
                            "codebuild:StopBuild",
                            "codebuild:BatchGetBuilds",
                            "codebuild:BatchGetReports"],
                        resources: [`arn:aws:codebuild:${region}:${account}:project/*${stage}*`],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["events:PutTargets",
                            "events:PutRule",
                            "events:DescribeRule"],
                        resources: [`arn:aws:events:${region}:${account}:rule/StepFunctionsGetEventForCodeBuildStartBuildRule`,
                                    `arn:aws:events:${region}:${account}:rule/StepFunctionsGetEventsForStepFunctionsExecutionRule`],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["dynamodb:GetItem"],
                        resources: [`arn:aws:dynamodb:${region}:${account}:table/*${stage}*`],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["states:StartExecution"],
                        resources: [`arn:aws:states:${region}:${account}:stateMachine:${stage}*`],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["states:DescribeExecution", "states:StopExecution"],
                        resources: [`arn:aws:states:${region}:${account}:execution:${stage}*:*`],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["xray:*"],
                        resources: ["*"],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["events:PutEvents"],
                        resources: [
                          `arn:aws:events:${region}:${account}:event-bus/${stage}-client-event-bus`,
                        ],
                        effect: Effect.ALLOW,
                    }),
                ]
            })
        )
        return role
    }
    
    private buildLambdaExecutionRolePolicies(scope:Construct, region:string, account:string, stage:string,
            role:Role, cchArtifactBucket:IBucket, tofArtifactBucket:IBucket, manualApprovalTopicArn:string):Role{
      
        const cchLambdaExecutionPolicyName =  `${stage}-${region}-cch-lambda-execution-policy`        
        
        role.attachInlinePolicy(
            new Policy(scope, cchLambdaExecutionPolicyName, {
                statements: [
                    new PolicyStatement({
                        actions: ["states:StartExecution", "states:GetExecutionHistory", "states:ListTagsForResource","states:DescribeExecution"],
                        resources: ["*"],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["cloudtrail:LookupEvents"],
                        resources: ["*"],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: [
                          "s3:Get*",
                          "s3:List*",
                          "s3-object-lambda:Get*",
                          "s3-object-lambda:List*"
                        ],
                        resources: [`arn:aws:s3:::${cchArtifactBucket.bucketName}`,`${cchArtifactBucket.bucketArn}/*`,
                                    `arn:aws:s3:::${tofArtifactBucket.bucketName}`, `${tofArtifactBucket.bucketArn}/*`],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["sns:Publish",
                            "sns:GetTopicAttributes",
                            "sns:ListSubscriptionsByTopic",
                            "sns:CreateTopic"],
                        resources: [manualApprovalTopicArn + "*"],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["xray:*"],
                        resources: ["*"],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["logs:GetLogEvents"],
                        resources: [`arn:aws:logs:${region}:${account}:log-group:/aws/codebuild/${stage}-*`,
                            `arn:aws:logs:${region}:${account}:log-group:/aws/codebuild/deploymentBuildProject-${stage}*`],
                        effect: Effect.ALLOW
                    }),
                    new PolicyStatement({
                        actions: [ "dynamodb:List*",
                        "dynamodb:GetItem"],
                        resources: [`arn:aws:dynamodb:${region}:${account}:table/${stage}-*`],
                        effect: Effect.ALLOW
                    })
                ]
            })
        )
        return role
    }

    private buildSubscriptionFilterRolePolicies(scope:Construct, region:string, account:string, stage:string, role:Role):Role{
        const cchSubscriptionFilterPolicyName =  `${stage}-${region}-cch-subscription-filter-policy`
       
        role.attachInlinePolicy(
            new Policy(scope, cchSubscriptionFilterPolicyName, {
                statements: [
                    new PolicyStatement({
                        actions: [ "kinesis:ListShards",
                            "kinesis:PutRecord",
                            "kinesis:PutRecords"],
                        resources: ["*"],
                        effect: Effect.ALLOW,
                    }),
                    new PolicyStatement({
                        actions: ["iam:PassRole"],
                        resources: [`arn:aws:iam::${account}:role/${stage}-*`],
                        effect: Effect.ALLOW,
                    })
                ]
            })
        )
        return role
    }

    private buildEventHubRolePolicies(
        scope: Construct,
        region: string,
        account: string,
        stage: string,
        role: Role
      ): Role {
        const tofEventHubHandlerPolicyName = `${stage}-${region}-tof-event-hub-handler-policy`;
        role.attachInlinePolicy(
          new Policy(scope, tofEventHubHandlerPolicyName, {
            statements: [
              new PolicyStatement({
                sid: "allowStsActions",
                actions: ["sts:assumeRole", "sts:Get*"],
                resources: ["*"],
                effect: Effect.ALLOW,
              }),
              new PolicyStatement({
                sid: "allowReadOrganizationsActions",
                actions: ["organizations:Describe*", "organizations:List*"],
                resources: ["*"],
                effect: Effect.ALLOW,
              }),
              new PolicyStatement({
                sid: "allowDynamoDbActions",
                actions: ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query"],
                resources: [
                  `arn:aws:dynamodb:${region}:${account}:table/${stage}-event-hub-events`,
                ],
                effect: Effect.ALLOW,
              }),
              new PolicyStatement({
                sid: "allowEventBridgeActions",
                actions: ["events:*", "schemas:*"],
                resources: [
                  `arn:aws:events:${region}:${account}:event-bus/${stage}-client-event-bus`,
                ],
                effect: Effect.ALLOW,
              }),
            ],
          })
        );
        return role;
      }
}