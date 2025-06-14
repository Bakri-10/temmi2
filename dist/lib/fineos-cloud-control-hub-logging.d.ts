import { IRole } from "aws-cdk-lib/aws-iam";
import { Tracing } from "aws-cdk-lib/aws-lambda";
import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { LogLevel } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
export declare class CCHKinesisLogging implements ILogging {
    private scope;
    private cchKinesisLambda;
    private kinesisDestination;
    private sfnLoggingGroup;
    constructor(scope: Construct, name: string, endpoint: string, stage: string, region: string, account: string, role: IRole, filterRole: IRole, cchVersion: string);
    getLambdaSubscriptionFilter(lambdaName: string, logGroup: ILogGroup): void;
    getStateMachineLogSettings(stpFunctionName: string): StateMachineLogsDTO;
    getLambdaLogSettings(): Tracing;
    isKinesisEnabled(): string;
}
export declare class CCHLogging implements ILogging {
    private scope;
    private filterRole;
    constructor(scope: Construct, name: string, endpoint: string, stage: string, region: string, account: string, role: IRole, filterRole: IRole, cchVersion: string);
    getLambdaSubscriptionFilter(lambdaName: string, logGroup: ILogGroup): void;
    getLambdaLogSettings(): Tracing;
    getStateMachineLogSettings(stpFunctionName: string, isSubscriptionFilterRequired?: boolean): StateMachineLogsDTO;
    isKinesisEnabled(): string;
}
export interface ILogging {
    getStateMachineLogSettings(stpFunctionName: string, isSubscriptionFilterRequired?: boolean): StateMachineLogsDTO;
    getLambdaLogSettings(): Tracing;
    getLambdaSubscriptionFilter(lambdaName: string, logGroup: ILogGroup): void;
    isKinesisEnabled(): string;
}
export interface StateMachineLogsDTO {
    trace: boolean;
    cloudwatch: {
        destination: ILogGroup;
        includeExecutionData: boolean;
        level: LogLevel;
    };
}
