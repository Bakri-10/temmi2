export function handler(event: any, context: any): Promise<{
    statusCode: number;
    body: string;
}>;
export function ValidateEvent(event: any): Promise<{
    producerId: any;
    data: {
        arn: any;
        template: any;
        customerPrefix: any;
        zone: any;
        envPrefix: any;
        error: {
            Error: any;
            Cause: any;
        };
    };
    component: any;
    sourceCustomer: {
        customerPrefix: any;
        env: any;
        zone: any;
        type: any;
    };
    targetCustomer: {
        customerPrefix: any;
        env: any;
        zone: any;
        type: any;
    };
    source: any;
    sourceAccount: any;
    sourceRegion: any;
    detailType: any;
    resources: any;
}>;
