import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { FineosCloudControlHubStackProps } from "../fineos-cloud-control-hub-stack";
export declare function FineosControlHubResources(scope: Construct, instanceName: string, account: string, region: string, props: FineosCloudControlHubStackProps, extra: {
    fixedLambdaRuntime: Runtime;
    matopicARN: string;
    cchVersion: string;
    deploymentZone: string;
}): void;
