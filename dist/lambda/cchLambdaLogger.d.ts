export class CCHLambdaLogger {
    constructor(stagePrefix: any, region: any, account: any, cchVersion: any, context: any, kinesisEnabled: any, customerPrefix: any, customerZone: any, executionId: any, subflowExecutionId: any, fcchExecutionId: any, producerId: any);
    counter: number;
    stagePrefix: any;
    region: any;
    account: any;
    cchVersion: any;
    customerPrefix: any;
    customerZone: any;
    executionId: any;
    context: any;
    kinesisEnabled: any;
    subflowExecutionId: any;
    fcchExecutionId: any;
    producerId: any;
    error(errorOutput?: string): void;
    log(logPrefix: any, logOutput: any): void;
    formatAWSServiceURL(): string;
    kinesisOut(logOutput: any, errorOutput: any): void;
}
