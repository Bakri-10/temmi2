import {
  EnvironmentSchema,
  ObservabilitySchema,
  RolesSchema,
} from "./app-config/app-config";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { version } from "../package.json";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { FineosControlHubResources } from "./resources/fineos-control-hub-resources";

export interface FineosCloudControlHubStackProps extends StackProps {
  instanceName: string;
  zone: string;
  observability: ObservabilitySchema;
  roles: RolesSchema;
  environment: EnvironmentSchema;
  version: string;
}

export class FineosCloudControlHubStack extends Stack {
  //   private deploymentDetails: FineosEventHubDeploymentResources;
  constructor(
    scope: Construct,
    id: string,
    props: FineosCloudControlHubStackProps
  ) {
    super(scope, id, props);
    const fixedLambdaRuntime = Runtime.NODEJS_20_X;
    const cchVersion = version;
    const account = props.env?.account as string;
    const region = props.env?.region as string;
    const instanceName = props.instanceName;
    const deploymentZone = props.zone;

    //Topic for Manual Approval from TOF
    const matopicName = `${instanceName}-ManualApproval-CentralOrchestrationNotification`;
    const matopicARN = `arn:aws:sns:${region}:${account}:${matopicName}`;

    FineosControlHubResources(
      this,
      instanceName,
      account,
      region,
      //   this.deploymentDetails,
      props,
      {
        fixedLambdaRuntime: fixedLambdaRuntime,
        matopicARN: matopicARN,
        cchVersion: cchVersion,
        deploymentZone: deploymentZone,
      }
    );
  }
}
