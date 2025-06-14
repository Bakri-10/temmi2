import { EnvironmentSchema, ObservabilitySchema, RolesSchema } from "./app-config/app-config";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
export interface FineosCloudControlHubStackProps extends StackProps {
    instanceName: string;
    zone: string;
    observability: ObservabilitySchema;
    roles: RolesSchema;
    environment: EnvironmentSchema;
    version: string;
}
export declare class FineosCloudControlHubStack extends Stack {
    constructor(scope: Construct, id: string, props: FineosCloudControlHubStackProps);
}
