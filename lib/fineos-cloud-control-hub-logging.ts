import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { IRole, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { IStream, Stream } from "aws-cdk-lib/aws-kinesis";
import { Function, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { CfnSubscriptionFilter, FilterPattern, ILogGroup, LogGroup } from "aws-cdk-lib/aws-logs";
import { KinesisDestination, LambdaDestination } from "aws-cdk-lib/aws-logs-destinations";
import { LogLevel } from "aws-cdk-lib/aws-stepfunctions";
import { Service } from "aws-sdk";
import { Construct } from "constructs";

export class CCHKinesisLogging implements ILogging {

    private cchKinesisLambda:NodejsFunction
    private kinesisDestination:KinesisDestination
    private sfnLoggingGroup:LogGroup

    // Kinesis implementation of ILogging.  
    // When used the cch kinesis logging lambda is created.
    constructor(private scope:Construct, name:string, endpoint:string, stage:string,  region:string, account:string, role:IRole, filterRole:IRole, cchVersion:string){
                
            this.cchKinesisLambda = new NodejsFunction(this.scope, `${stage}-cch-kinesis-lambda`, {
                runtime: Runtime.NODEJS_20_X,
                entry: 'lambda/cchKinesisProcessor.js',
                handler: 'handler',
                description: 'Transforms log entries and publishes to Kinesis stream',
                functionName: `${stage}-cch-kinesis-lambda`,
                timeout: Duration.seconds(60),
                role,
                environment: {
                    CCH_VERSION: cchVersion,
                    REGION: region,
                    STAGE: stage, 
                    ACCOUNT: account
                }
            });

            const importedStream:IStream = Stream.fromStreamArn(scope, name, endpoint);
            this.kinesisDestination = new KinesisDestination(importedStream, {
                role: filterRole
            });
            this.cchKinesisLambda.logGroup.addSubscriptionFilter(`${stage}-cch-kinesis-lambda-subscription-filter`, {destination: this.kinesisDestination, 
                filterPattern:  FilterPattern.literal('[timestamp=*Z, request_id="*-*", (level="INFO") || (level="ERROR"), message!="CCHLambdaLogger*"]')})

            this.sfnLoggingGroup = new LogGroup(this.scope, `${stage}-sfn-cch-log-group`, { logGroupName: `/aws/vendedlogs/${stage}-sfn-cch-log-group`, removalPolicy: RemovalPolicy.DESTROY })

            const grant = this.cchKinesisLambda.grantInvoke({
                grantPrincipal: new ServicePrincipal(`logs.${region}.amazonaws.com`)
            })
        
            this.sfnLoggingGroup.addSubscriptionFilter( `${stage}-sfn-cch-log-group-subscription-filter`, {
                destination: new LambdaDestination(this.cchKinesisLambda), filterPattern: FilterPattern.allEvents()
            }).node.addDependency(grant)

            console.log("Kinesis and lambda subscription filters enabled")
    }

    getLambdaSubscriptionFilter(lambdaName: string, logGroup: ILogGroup): void {
        logGroup.addSubscriptionFilter(`${lambdaName}-subscription-filter`, {   
            destination: this.kinesisDestination, 
            filterPattern: FilterPattern.literal('[timestamp=*Z, request_id="*-*", (level="INFO") || (level="ERROR"), message!="CCHLambdaLogger*"]')})
    }

    getStateMachineLogSettings(stpFunctionName:string):StateMachineLogsDTO{
        return {
            trace: true,
            cloudwatch: {
                destination: this.sfnLoggingGroup,
                includeExecutionData: true,
                level: LogLevel.ALL
            }
        }
    }

    getLambdaLogSettings(): Tracing {
        return Tracing.ACTIVE
    }

    isKinesisEnabled(): string {
        return "true"
    }
}


export class CCHLogging implements ILogging{

    constructor(private scope:Construct, name:string, endpoint:string, stage:string,  region:string, account:string, role:IRole, private filterRole:IRole, cchVersion:string){}

    getLambdaSubscriptionFilter(lambdaName:string, logGroup: ILogGroup): void {
    }

    getLambdaLogSettings(): Tracing {
        return Tracing.ACTIVE
    }

    // Log settings for all state machines, defaults to no subscription filters.
    getStateMachineLogSettings(stpFunctionName:string, isSubscriptionFilterRequired:boolean=false): StateMachineLogsDTO {
        const loggingGroup = new LogGroup(this.scope, `${stpFunctionName}-log-group`, { logGroupName: `/aws/vendedlogs/${stpFunctionName}`, removalPolicy: RemovalPolicy.DESTROY })
        return {
            trace: true,
            cloudwatch: {
                destination: loggingGroup,
                includeExecutionData: true,
                level: LogLevel.ALL
            }
        }
    }

    isKinesisEnabled(): string {
        return "false";
    }
}

export interface ILogging{
    getStateMachineLogSettings(stpFunctionName:string, isSubscriptionFilterRequired?:boolean):StateMachineLogsDTO
    getLambdaLogSettings(): Tracing
    getLambdaSubscriptionFilter(lambdaName:string, logGroup:ILogGroup): void
    isKinesisEnabled(): string
}

export interface StateMachineLogsDTO{
    trace:boolean
    cloudwatch: {
        destination:ILogGroup
        includeExecutionData:boolean
        level:LogLevel
    }
}