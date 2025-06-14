"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("aws-cdk-lib/assertions");
const fineos_cloud_control_hub_stack_1 = require("../lib/fineos-cloud-control-hub-stack");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const app_config_1 = require("../lib/app-config/app-config");
const packageInfo = __importStar(require("./config/test-package.json"));
const iamRoleCount = 7;
const iamPolicyCount = 6;
const lambdaCount = 16;
const stepFunctionCount = 1;
describe("Stack Tests", () => {
    let template;
    beforeAll(async () => {
        template = await createStackTemplate();
    });
    test("Role Count", () => {
        template.findResources("AWS::Lambda::Function");
        const functionNameCapture = new assertions_1.Capture();
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: functionNameCapture,
        });
    });
    test("Role Count", () => {
        template.resourceCountIs("AWS::IAM::Role", iamRoleCount);
    });
    test("Policy Count", () => {
        template.resourceCountIs("AWS::IAM::Policy", iamPolicyCount);
    });
    test("Lambda Count should be " + lambdaCount, () => {
        template.resourceCountIs("AWS::Lambda::Function", lambdaCount);
    });
    test("lambda function names begins with stage-prefix", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: assertions_1.Match.stringLikeRegexp("hub1-*"),
        });
    });
    test("Iterate lambda function", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-iterate",
        });
    });
    test("ReadS3 lambda function", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-read-S3",
        });
    });
    test("GetSize lambda function", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-get-size",
        });
    });
    test("GetExecutionFailed lambda function", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-get-executionfailed",
        });
    });
    test("Fail lambda function", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-fail-step",
        });
    });
    test("Validate template lambda function", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-validate-template",
        });
    });
    test("Validate TOF lambda function", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-validate-tof",
        });
    });
    test("Validate Email Subscription function", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-validate-emails",
        });
    });
    test("Send Validation Errors Summary to New Relic", () => {
        template.hasResourceProperties("AWS::Lambda::Function", {
            FunctionName: "hub1-cch-log-validation-summary",
        });
    });
    test("Count", () => {
        template.resourceCountIs("AWS::StepFunctions::StateMachine", stepFunctionCount);
    });
    test("stage prefix present in statemachine name", () => {
        template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
            StateMachineName: assertions_1.Match.stringLikeRegexp("hub1-*"),
        });
    });
    test("invalid-app-config-overrides-should-error", () => {
        expect(() => {
            app_config_1.AppConfig.loadConfig("", { "my-config": "empty-config" });
        }).toThrow("JSON Syntax Error in configOverride");
    });
    test("valid-app-config-overrides-should-not-error", () => {
        let overrides = app_config_1.AppConfig.loadConfig("", JSON.stringify({
            tags: {
                BillingCode: "Central",
                Owner: "Central",
                Project: "FCENG11571",
            },
            roles: {
                customer: "CentralOrchestrationBuilderRole",
                source: "IaCCrossAccountCodeCommitRole",
                vending: "CentralOrchestrationDeployer",
                permissionBoundary: "CdkScopedPermission",
                customerReadOnly: "CentralOrchestrationReadOnlyRole",
            },
            environment: {
                checkAllowedZones: false,
                region: "eu-west-1",
                account: "959904340079",
            },
            artifacts: {
                customerRepoPath: "customer-config",
                trustedAccount: "039991878949",
            },
            observability: { endpoint: "", zones: [""] },
            codeArtifact: { account: "164290132769", region: "eu-west-1" },
        }));
        // Overrides should pass through with no error and be returned as config
        expect(overrides.roles.customer).toEqual("CentralOrchestrationBuilderRole");
    });
    test("app-config-is-used-from-file", () => {
        let config = app_config_1.AppConfig.loadConfig("test/config/qa-app-config.yaml", undefined);
        expect(config.roles.customer).toEqual("CentralOrchestrationBuilderRole");
    });
    test("invalid-app-config-file-path-should-error", () => {
        expect(() => {
            app_config_1.AppConfig.loadConfig("test/config/qa-app-file.yaml", undefined);
        }).toThrow("Error processing config file");
    });
    test("should-error-with-missing-billing-code-tag-eng", () => {
        const config = app_config_1.AppConfig.loadConfig("", JSON.stringify({
            tags: { Owner: "Central", Project: "FCENG11571" },
            roles: {
                customer: "CentralOrchestrationBuilderRole",
                source: "IaCCrossAccountCodeCommitRole",
                vending: "CentralOrchestrationDeployer",
                permissionBoundary: "CdkScopedPermission",
                customerReadOnly: "CentralOrchestrationReadOnlyRole",
            },
            environment: {
                checkAllowedZones: false,
                region: "eu-west-1",
                account: "959904340079",
            },
            artifacts: {
                customerRepoPath: "customer-config",
                trustedAccount: "039991878949",
            },
            observability: { endpoint: "", zones: [""] },
            codeArtifact: { account: "164290132769", region: "eu-west-1" },
        }));
        const app = new aws_cdk_lib_1.App({});
        const props = {
            env: {
                account: config.environment.account,
                region: config.environment.region,
            },
            version: packageInfo.version,
            observability: config.observability,
            environment: config.environment,
            roles: config.roles,
            instanceName: "testing",
            zone: "TEST",
        };
        const stack = new fineos_cloud_control_hub_stack_1.FineosCloudControlHubStack(app, "test-stack", props);
        expect(() => {
            app_config_1.AppConfig.applyAndValidateTags(config, packageInfo, "eng", stack, "test");
        }).toThrow("BillingCode tag is required for all deployments");
    });
    test("should-error-with-missing-owner-code-tag-eng", () => {
        const config = app_config_1.AppConfig.loadConfig("", JSON.stringify({
            tags: { BillingCode: "Central", Project: "FCENG11571" },
            roles: {
                customer: "CentralOrchestrationBuilderRole",
                source: "IaCCrossAccountCodeCommitRole",
                vending: "CentralOrchestrationDeployer",
                permissionBoundary: "CdkScopedPermission",
                customerReadOnly: "CentralOrchestrationReadOnlyRole",
            },
            environment: {
                checkAllowedZones: false,
                region: "eu-west-1",
                account: "959904340079",
            },
            artifacts: {
                customerRepoPath: "customer-config",
                trustedAccount: "039991878949",
            },
            observability: { endpoint: "", zones: [""] },
            codeArtifact: { account: "164290132769", region: "eu-west-1" },
        }));
        const app = new aws_cdk_lib_1.App({});
        const props = {
            env: {
                account: config.environment.account,
                region: config.environment.region,
            },
            version: packageInfo.version,
            observability: config.observability,
            environment: config.environment,
            roles: config.roles,
            instanceName: "testing",
            zone: "TEST",
        };
        const stack = new fineos_cloud_control_hub_stack_1.FineosCloudControlHubStack(app, "test-stack", props);
        expect(() => {
            app_config_1.AppConfig.applyAndValidateTags(config, packageInfo, "eng", stack, "test");
        }).toThrow("Owner tag is required for all deployments");
    });
    test("should-error-with-missing-project-code-tag-eng", () => {
        const config = app_config_1.AppConfig.loadConfig("", JSON.stringify({
            tags: { BillingCode: "Central", Owner: "Central" },
            roles: {
                customer: "CentralOrchestrationBuilderRole",
                source: "IaCCrossAccountCodeCommitRole",
                vending: "CentralOrchestrationDeployer",
                permissionBoundary: "CdkScopedPermission",
                customerReadOnly: "CentralOrchestrationReadOnlyRole",
            },
            environment: {
                checkAllowedZones: false,
                region: "eu-west-1",
                account: "959904340079",
            },
            artifacts: {
                customerRepoPath: "customer-config",
                trustedAccount: "039991878949",
            },
            observability: { endpoint: "", zones: [""] },
            codeArtifact: { account: "164290132769", region: "eu-west-1" },
        }));
        const app = new aws_cdk_lib_1.App({});
        const props = {
            env: {
                account: config.environment.account,
                region: config.environment.region,
            },
            version: packageInfo.version,
            observability: config.observability,
            environment: config.environment,
            roles: config.roles,
            instanceName: "testing",
            zone: "TEST",
        };
        const stack = new fineos_cloud_control_hub_stack_1.FineosCloudControlHubStack(app, "test-stack", props);
        expect(() => {
            app_config_1.AppConfig.applyAndValidateTags(config, packageInfo, "eng", stack, "test");
        }).toThrow("Project tag is required in the engineering organization");
    });
    test("should-error-with-missing-billing-code-tag-qa", () => {
        const config = app_config_1.AppConfig.loadConfig("", JSON.stringify({
            tags: { Owner: "Central", Project: "FCENG11571" },
            roles: {
                customer: "CentralOrchestrationBuilderRole",
                source: "IaCCrossAccountCodeCommitRole",
                vending: "CentralOrchestrationDeployer",
                permissionBoundary: "CdkScopedPermission",
                customerReadOnly: "CentralOrchestrationReadOnlyRole",
            },
            environment: {
                checkAllowedZones: false,
                region: "eu-west-1",
                account: "959904340079",
            },
            artifacts: {
                customerRepoPath: "customer-config",
                trustedAccount: "039991878949",
            },
            observability: { endpoint: "", zones: [""] },
            codeArtifact: { account: "164290132769", region: "eu-west-1" },
        }));
        const app = new aws_cdk_lib_1.App({});
        const props = {
            env: {
                account: config.environment.account,
                region: config.environment.region,
            },
            version: packageInfo.version,
            observability: config.observability,
            environment: config.environment,
            roles: config.roles,
            instanceName: "testing",
            zone: "TEST",
        };
        const stack = new fineos_cloud_control_hub_stack_1.FineosCloudControlHubStack(app, "test-stack", props);
        expect(() => {
            app_config_1.AppConfig.applyAndValidateTags(config, packageInfo, "qa", stack, "test");
        }).toThrow("BillingCode tag is required for all deployments");
    });
    test("should-error-with-missing-owner-code-tag-qa", () => {
        const config = app_config_1.AppConfig.loadConfig("", JSON.stringify({
            tags: { BillingCode: "Central", Project: "FCENG11571" },
            roles: {
                customer: "CentralOrchestrationBuilderRole",
                source: "IaCCrossAccountCodeCommitRole",
                vending: "CentralOrchestrationDeployer",
                permissionBoundary: "CdkScopedPermission",
                customerReadOnly: "CentralOrchestrationReadOnlyRole",
            },
            environment: {
                checkAllowedZones: false,
                region: "eu-west-1",
                account: "959904340079",
            },
            artifacts: {
                customerRepoPath: "customer-config",
                trustedAccount: "039991878949",
            },
            observability: { endpoint: "", zones: [""] },
            codeArtifact: { account: "164290132769", region: "eu-west-1" },
        }));
        const app = new aws_cdk_lib_1.App({});
        const props = {
            env: {
                account: config.environment.account,
                region: config.environment.region,
            },
            version: packageInfo.version,
            observability: config.observability,
            environment: config.environment,
            roles: config.roles,
            instanceName: "testing",
            zone: "TEST",
        };
        const stack = new fineos_cloud_control_hub_stack_1.FineosCloudControlHubStack(app, "test-stack", props);
        expect(() => {
            app_config_1.AppConfig.applyAndValidateTags(config, packageInfo, "qa", stack, "test");
        }).toThrow("Owner tag is required for all deployments");
    });
    // Only eng forces project tag, not mandatory in ENG/CUST.
    test("should-not-error-with-missing-project-code-tag-qa", () => {
        const config = app_config_1.AppConfig.loadConfig("", JSON.stringify({
            tags: {
                Project: "my-project",
                BillingCode: "Central",
                Owner: "Central",
                "extra-tag": "tag-value",
            },
            roles: {
                customer: "CentralOrchestrationBuilderRole",
                source: "IaCCrossAccountCodeCommitRole",
                vending: "CentralOrchestrationDeployer",
                permissionBoundary: "CdkScopedPermission",
                customerReadOnly: "CentralOrchestrationReadOnlyRole",
            },
            environment: {
                checkAllowedZones: false,
                region: "eu-west-1",
                account: "959904340079",
            },
            artifacts: {
                customerRepoPath: "customer-config",
                trustedAccount: "039991878949",
            },
            observability: { endpoint: "", zones: [""] },
            codeArtifact: { account: "164290132769", region: "eu-west-1" },
        }));
        const app = new aws_cdk_lib_1.App({});
        const props = {
            env: {
                account: config.environment.account,
                region: config.environment.region,
            },
            version: packageInfo.version,
            observability: config.observability,
            environment: config.environment,
            roles: config.roles,
            instanceName: "testing",
            zone: "TEST",
        };
        const stack = new fineos_cloud_control_hub_stack_1.FineosCloudControlHubStack(app, "test-stack", props);
        app_config_1.AppConfig.applyAndValidateTags(config, packageInfo, "eng", stack, "test");
        expect(config.roles.customer).toEqual("CentralOrchestrationBuilderRole");
    });
    test("tags-are-applied-from-config", () => {
        template.hasResourceProperties("AWS::S3::Bucket", {
            Tags: [
                {
                    Key: "aws-cdk:auto-delete-objects",
                    Value: "true",
                },
                {
                    Key: "aws-cdk:cr-owned:2ae59b2d",
                    Value: "true",
                },
                {
                    Key: "BillingCode",
                    Value: "eng-billing-code",
                },
                {
                    Key: "Environment",
                    Value: "Central",
                },
                {
                    Key: "ExtraTag",
                    Value: "extra-tag-value",
                },
                {
                    Key: "hub-version",
                    Value: "1.3.1",
                },
                {
                    Key: "IACComponent",
                    Value: "FCC_Cloud_Control_Hub",
                },
                {
                    Key: "IACVersion",
                    Value: "1.3.1",
                },
                {
                    Key: "OrganisationUnitName",
                    Value: "hub1",
                },
                {
                    Key: "Owner",
                    Value: "eng-owner",
                },
                {
                    Key: "Project",
                    Value: "eng-project",
                },
            ],
        });
    });
});
async function createStackTemplate() {
    const context = {
        zone: "ENG",
        instanceName: "hub1",
    };
    const app = new aws_cdk_lib_1.App({
        context: context,
    });
    //get environment
    const zone = app.node.tryGetContext("zone") || "QA";
    if (zone === undefined || !["QA", "ENG", "CUST"].includes(zone)) {
        console.error("Please provide a context variable for zone. This must be one of QA, ENG or CUST.");
    }
    //Read config file
    const config = app_config_1.AppConfig.loadConfig(`test/config/${zone.toLowerCase()}-app-config.yaml`, undefined);
    //Get stage prefix. Will be prefixed to resource names
    const instanceName = app.node.tryGetContext("instanceName") || "testing";
    //Build props object
    const props = {
        env: {
            account: config.environment.account,
            region: config.environment.region,
        },
        environment: config.environment,
        version: packageInfo.version,
        observability: config.observability,
        roles: config.roles,
        instanceName: instanceName,
        zone: zone,
    };
    const stack = new fineos_cloud_control_hub_stack_1.FineosCloudControlHubStack(app, `${props.instanceName}-FineosCloudControlHubStack`, props);
    app_config_1.AppConfig.applyAndValidateTags(config, packageInfo, zone, stack, instanceName);
    app.synth();
    return assertions_1.Template.fromStack(stack);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZW9zLWNsb3VkLWNvbnRyb2wtaHViLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90ZXN0L2ZpbmVvcy1jbG91ZC1jb250cm9sLWh1Yi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1REFJa0M7QUFDaEMsMEZBRytDO0FBQy9DLDZDQUFrQztBQUNsQyw2REFBMEU7QUFDMUUsd0VBQTBEO0FBRTFELE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUM7QUFDekIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO0FBQ3ZCLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBRTVCLFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQzNCLElBQUksUUFBa0IsQ0FBQztJQUV2QixTQUFTLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDbkIsUUFBUSxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLFFBQVEsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNoRCxNQUFNLG1CQUFtQixHQUFHLElBQUksb0JBQWEsRUFBRSxDQUFDO1FBRWhELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRTtZQUN0RCxZQUFZLEVBQUUsbUJBQW1CO1NBQ2xDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdEIsUUFBUSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLFFBQVEsQ0FBQyxlQUFl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IHtcbiAgICBNYXRjaCxcbiAgICBUZW1wbGF0ZSxcbiAgICBDYXB0dXJlIGFzIEFzc2VydENhcHR1cmUsXG4gIH0gZnJvbSBcImF3cy1jZGstbGliL2Fzc2VydGlvbnNcIjtcbiAgaW1wb3J0IHtcbiAgICBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFjayxcbiAgICBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFja1Byb3BzLFxuICB9IGZyb20gXCIuLi9saWIvZmluZW9zLWNsb3VkLWNvbnRyb2wtaHViLXN0YWNrXCI7XG4gIGltcG9ydCB7IEFwcCB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuICBpbXBvcnQgeyBBcHBDb25maWcsIEFwcENvbmZpZ1NjaGVtYSB9IGZyb20gXCIuLi9saWIvYXBwLWNvbmZpZy9hcHAtY29uZmlnXCI7XG4gIGltcG9ydCAqIGFzIHBhY2thZ2VJbmZvIGZyb20gXCIuL2NvbmZpZy90ZXN0LXBhY2thZ2UuanNvblwiO1xuICBcbiAgY29uc3QgaWFtUm9sZUNvdW50ID0gNztcbiAgY29uc3QgaWFtUG9saWN5Q291bnQgPSA2O1xuICBjb25zdCBsYW1iZGFDb3VudCA9IDE2O1xuICBjb25zdCBzdGVwRnVuY3Rpb25Db3VudCA9IDE7XG4gIFxuICBkZXNjcmliZShcIlN0YWNrIFRlc3RzXCIsICgpID0+IHtcbiAgICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlO1xuICBcbiAgICBiZWZvcmVBbGwoYXN5bmMgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUgPSBhd2FpdCBjcmVhdGVTdGFja1RlbXBsYXRlKCk7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJSb2xlIENvdW50XCIsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoXCJBV1M6OkxhbWJkYTo6RnVuY3Rpb25cIik7XG4gICAgICBjb25zdCBmdW5jdGlvbk5hbWVDYXB0dXJlID0gbmV3IEFzc2VydENhcHR1cmUoKTtcbiAgXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoXCJBV1M6OkxhbWJkYTo6RnVuY3Rpb25cIiwge1xuICAgICAgICBGdW5jdGlvbk5hbWU6IGZ1bmN0aW9uTmFtZUNhcHR1cmUsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcIlJvbGUgQ291bnRcIiwgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpJQU06OlJvbGVcIiwgaWFtUm9sZUNvdW50KTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcIlBvbGljeSBDb3VudFwiLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OklBTTo6UG9saWN5XCIsIGlhbVBvbGljeUNvdW50KTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcIkxhbWJkYSBDb3VudCBzaG91bGQgYmUgXCIgKyBsYW1iZGFDb3VudCwgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpMYW1iZGE6OkZ1bmN0aW9uXCIsIGxhbWJkYUNvdW50KTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcImxhbWJkYSBmdW5jdGlvbiBuYW1lcyBiZWdpbnMgd2l0aCBzdGFnZS1wcmVmaXhcIiwgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKFwiQVdTOjpMYW1iZGE6OkZ1bmN0aW9uXCIsIHtcbiAgICAgICAgRnVuY3Rpb25OYW1lOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKFwiaHViMS0qXCIpLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJJdGVyYXRlIGxhbWJkYSBmdW5jdGlvblwiLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoXCJBV1M6OkxhbWJkYTo6RnVuY3Rpb25cIiwge1xuICAgICAgICBGdW5jdGlvbk5hbWU6IFwiaHViMS1jY2gtaXRlcmF0ZVwiLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJSZWFkUzMgbGFtYmRhIGZ1bmN0aW9uXCIsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6TGFtYmRhOjpGdW5jdGlvblwiLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogXCJodWIxLWNjaC1yZWFkLVMzXCIsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcIkdldFNpemUgbGFtYmRhIGZ1bmN0aW9uXCIsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6TGFtYmRhOjpGdW5jdGlvblwiLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogXCJodWIxLWNjaC1nZXQtc2l6ZVwiLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJHZXRFeGVjdXRpb25GYWlsZWQgbGFtYmRhIGZ1bmN0aW9uXCIsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6TGFtYmRhOjpGdW5jdGlvblwiLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogXCJodWIxLWNjaC1nZXQtZXhlY3V0aW9uZmFpbGVkXCIsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcIkZhaWwgbGFtYmRhIGZ1bmN0aW9uXCIsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6TGFtYmRhOjpGdW5jdGlvblwiLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogXCJodWIxLWNjaC1mYWlsLXN0ZXBcIixcbiAgICAgIH0pO1xuICAgIH0pO1xuICBcbiAgICB0ZXN0KFwiVmFsaWRhdGUgdGVtcGxhdGUgbGFtYmRhIGZ1bmN0aW9uXCIsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6TGFtYmRhOjpGdW5jdGlvblwiLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogXCJodWIxLWNjaC12YWxpZGF0ZS10ZW1wbGF0ZVwiLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJWYWxpZGF0ZSBUT0YgbGFtYmRhIGZ1bmN0aW9uXCIsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6TGFtYmRhOjpGdW5jdGlvblwiLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogXCJodWIxLWNjaC12YWxpZGF0ZS10b2ZcIixcbiAgICAgIH0pO1xuICAgIH0pO1xuICBcbiAgICB0ZXN0KFwiVmFsaWRhdGUgRW1haWwgU3Vic2NyaXB0aW9uIGZ1bmN0aW9uXCIsICgpID0+IHtcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6TGFtYmRhOjpGdW5jdGlvblwiLCB7XG4gICAgICAgIEZ1bmN0aW9uTmFtZTogXCJodWIxLWNjaC12YWxpZGF0ZS1lbWFpbHNcIixcbiAgICAgIH0pO1xuICAgIH0pO1xuICBcbiAgICB0ZXN0KFwiU2VuZCBWYWxpZGF0aW9uIEVycm9ycyBTdW1tYXJ5IHRvIE5ldyBSZWxpY1wiLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoXCJBV1M6OkxhbWJkYTo6RnVuY3Rpb25cIiwge1xuICAgICAgICBGdW5jdGlvbk5hbWU6IFwiaHViMS1jY2gtbG9nLXZhbGlkYXRpb24tc3VtbWFyeVwiLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJDb3VudFwiLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXG4gICAgICAgIFwiQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmVcIixcbiAgICAgICAgc3RlcEZ1bmN0aW9uQ291bnRcbiAgICAgICk7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJzdGFnZSBwcmVmaXggcHJlc2VudCBpbiBzdGF0ZW1hY2hpbmUgbmFtZVwiLCAoKSA9PiB7XG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoXCJBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZVwiLCB7XG4gICAgICAgIFN0YXRlTWFjaGluZU5hbWU6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoXCJodWIxLSpcIiksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcImludmFsaWQtYXBwLWNvbmZpZy1vdmVycmlkZXMtc2hvdWxkLWVycm9yXCIsICgpID0+IHtcbiAgICAgIGV4cGVjdCgoKSA9PiB7XG4gICAgICAgIEFwcENvbmZpZy5sb2FkQ29uZmlnKFwiXCIsIHsgXCJteS1jb25maWdcIjogXCJlbXB0eS1jb25maWdcIiB9KTtcbiAgICAgIH0pLnRvVGhyb3coXCJKU09OIFN5bnRheCBFcnJvciBpbiBjb25maWdPdmVycmlkZVwiKTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcInZhbGlkLWFwcC1jb25maWctb3ZlcnJpZGVzLXNob3VsZC1ub3QtZXJyb3JcIiwgKCkgPT4ge1xuICAgICAgbGV0IG92ZXJyaWRlczogQXBwQ29uZmlnU2NoZW1hID0gQXBwQ29uZmlnLmxvYWRDb25maWcoXG4gICAgICAgIFwiXCIsXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB0YWdzOiB7XG4gICAgICAgICAgICBCaWxsaW5nQ29kZTogXCJDZW50cmFsXCIsXG4gICAgICAgICAgICBPd25lcjogXCJDZW50cmFsXCIsXG4gICAgICAgICAgICBQcm9qZWN0OiBcIkZDRU5HMTE1NzFcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJvbGVzOiB7XG4gICAgICAgICAgICBjdXN0b21lcjogXCJDZW50cmFsT3JjaGVzdHJhdGlvbkJ1aWxkZXJSb2xlXCIsXG4gICAgICAgICAgICBzb3VyY2U6IFwiSWFDQ3Jvc3NBY2NvdW50Q29kZUNvbW1pdFJvbGVcIixcbiAgICAgICAgICAgIHZlbmRpbmc6IFwiQ2VudHJhbE9yY2hlc3RyYXRpb25EZXBsb3llclwiLFxuICAgICAgICAgICAgcGVybWlzc2lvbkJvdW5kYXJ5OiBcIkNka1Njb3BlZFBlcm1pc3Npb25cIixcbiAgICAgICAgICAgIGN1c3RvbWVyUmVhZE9ubHk6IFwiQ2VudHJhbE9yY2hlc3RyYXRpb25SZWFkT25seVJvbGVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICBjaGVja0FsbG93ZWRab25lczogZmFsc2UsXG4gICAgICAgICAgICByZWdpb246IFwiZXUtd2VzdC0xXCIsXG4gICAgICAgICAgICBhY2NvdW50OiBcIjk1OTkwNDM0MDA3OVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXJ0aWZhY3RzOiB7XG4gICAgICAgICAgICBjdXN0b21lclJlcG9QYXRoOiBcImN1c3RvbWVyLWNvbmZpZ1wiLFxuICAgICAgICAgICAgdHJ1c3RlZEFjY291bnQ6IFwiMDM5OTkxODc4OTQ5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBvYnNlcnZhYmlsaXR5OiB7IGVuZHBvaW50OiBcIlwiLCB6b25lczogW1wiXCJdIH0sXG4gICAgICAgICAgY29kZUFydGlmYWN0OiB7IGFjY291bnQ6IFwiMTY0MjkwMTMyNzY5XCIsIHJlZ2lvbjogXCJldS13ZXN0LTFcIiB9LFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIC8vIE92ZXJyaWRlcyBzaG91bGQgcGFzcyB0aHJvdWdoIHdpdGggbm8gZXJyb3IgYW5kIGJlIHJldHVybmVkIGFzIGNvbmZpZ1xuICAgICAgZXhwZWN0KG92ZXJyaWRlcy5yb2xlcy5jdXN0b21lcikudG9FcXVhbChcIkNlbnRyYWxPcmNoZXN0cmF0aW9uQnVpbGRlclJvbGVcIik7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJhcHAtY29uZmlnLWlzLXVzZWQtZnJvbS1maWxlXCIsICgpID0+IHtcbiAgICAgIGxldCBjb25maWc6IEFwcENvbmZpZ1NjaGVtYSA9IEFwcENvbmZpZy5sb2FkQ29uZmlnKFxuICAgICAgICBcInRlc3QvY29uZmlnL3FhLWFwcC1jb25maWcueWFtbFwiLFxuICAgICAgICB1bmRlZmluZWRcbiAgICAgICk7XG4gICAgICBleHBlY3QoY29uZmlnLnJvbGVzLmN1c3RvbWVyKS50b0VxdWFsKFwiQ2VudHJhbE9yY2hlc3RyYXRpb25CdWlsZGVyUm9sZVwiKTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcImludmFsaWQtYXBwLWNvbmZpZy1maWxlLXBhdGgtc2hvdWxkLWVycm9yXCIsICgpID0+IHtcbiAgICAgIGV4cGVjdCgoKSA9PiB7XG4gICAgICAgIEFwcENvbmZpZy5sb2FkQ29uZmlnKFwidGVzdC9jb25maWcvcWEtYXBwLWZpbGUueWFtbFwiLCB1bmRlZmluZWQpO1xuICAgICAgfSkudG9UaHJvdyhcIkVycm9yIHByb2Nlc3NpbmcgY29uZmlnIGZpbGVcIik7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJzaG91bGQtZXJyb3Itd2l0aC1taXNzaW5nLWJpbGxpbmctY29kZS10YWctZW5nXCIsICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbmZpZzogQXBwQ29uZmlnU2NoZW1hID0gQXBwQ29uZmlnLmxvYWRDb25maWcoXG4gICAgICAgIFwiXCIsXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB0YWdzOiB7IE93bmVyOiBcIkNlbnRyYWxcIiwgUHJvamVjdDogXCJGQ0VORzExNTcxXCIgfSxcbiAgICAgICAgICByb2xlczoge1xuICAgICAgICAgICAgY3VzdG9tZXI6IFwiQ2VudHJhbE9yY2hlc3RyYXRpb25CdWlsZGVyUm9sZVwiLFxuICAgICAgICAgICAgc291cmNlOiBcIklhQ0Nyb3NzQWNjb3VudENvZGVDb21taXRSb2xlXCIsXG4gICAgICAgICAgICB2ZW5kaW5nOiBcIkNlbnRyYWxPcmNoZXN0cmF0aW9uRGVwbG95ZXJcIixcbiAgICAgICAgICAgIHBlcm1pc3Npb25Cb3VuZGFyeTogXCJDZGtTY29wZWRQZXJtaXNzaW9uXCIsXG4gICAgICAgICAgICBjdXN0b21lclJlYWRPbmx5OiBcIkNlbnRyYWxPcmNoZXN0cmF0aW9uUmVhZE9ubHlSb2xlXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgY2hlY2tBbGxvd2VkWm9uZXM6IGZhbHNlLFxuICAgICAgICAgICAgcmVnaW9uOiBcImV1LXdlc3QtMVwiLFxuICAgICAgICAgICAgYWNjb3VudDogXCI5NTk5MDQzNDAwNzlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFydGlmYWN0czoge1xuICAgICAgICAgICAgY3VzdG9tZXJSZXBvUGF0aDogXCJjdXN0b21lci1jb25maWdcIixcbiAgICAgICAgICAgIHRydXN0ZWRBY2NvdW50OiBcIjAzOTk5MTg3ODk0OVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgb2JzZXJ2YWJpbGl0eTogeyBlbmRwb2ludDogXCJcIiwgem9uZXM6IFtcIlwiXSB9LFxuICAgICAgICAgIGNvZGVBcnRpZmFjdDogeyBhY2NvdW50OiBcIjE2NDI5MDEzMjc2OVwiLCByZWdpb246IFwiZXUtd2VzdC0xXCIgfSxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICBjb25zdCBhcHAgPSBuZXcgQXBwKHt9KTtcbiAgICAgIGNvbnN0IHByb3BzOiBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFja1Byb3BzID0ge1xuICAgICAgICBlbnY6IHtcbiAgICAgICAgICBhY2NvdW50OiBjb25maWcuZW52aXJvbm1lbnQuYWNjb3VudCxcbiAgICAgICAgICByZWdpb246IGNvbmZpZy5lbnZpcm9ubWVudC5yZWdpb24sXG4gICAgICAgIH0sXG4gICAgICAgIHZlcnNpb246IHBhY2thZ2VJbmZvLnZlcnNpb24sXG4gICAgICAgIG9ic2VydmFiaWxpdHk6IGNvbmZpZy5vYnNlcnZhYmlsaXR5LFxuICAgICAgICBlbnZpcm9ubWVudDogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgICByb2xlczogY29uZmlnLnJvbGVzLFxuICAgICAgICBpbnN0YW5jZU5hbWU6IFwidGVzdGluZ1wiLFxuICAgICAgICB6b25lOiBcIlRFU1RcIixcbiAgICAgICAgXG4gICAgICB9O1xuICAgICAgY29uc3Qgc3RhY2sgPSBuZXcgRmluZW9zQ2xvdWRDb250cm9sSHViU3RhY2soYXBwLCBcInRlc3Qtc3RhY2tcIiwgcHJvcHMpO1xuICAgICAgZXhwZWN0KCgpID0+IHtcbiAgICAgICAgQXBwQ29uZmlnLmFwcGx5QW5kVmFsaWRhdGVUYWdzKGNvbmZpZywgcGFja2FnZUluZm8sIFwiZW5nXCIsIHN0YWNrLCBcInRlc3RcIik7XG4gICAgICB9KS50b1Rocm93KFwiQmlsbGluZ0NvZGUgdGFnIGlzIHJlcXVpcmVkIGZvciBhbGwgZGVwbG95bWVudHNcIik7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJzaG91bGQtZXJyb3Itd2l0aC1taXNzaW5nLW93bmVyLWNvZGUtdGFnLWVuZ1wiLCAoKSA9PiB7XG4gICAgICBjb25zdCBjb25maWc6IEFwcENvbmZpZ1NjaGVtYSA9IEFwcENvbmZpZy5sb2FkQ29uZmlnKFxuICAgICAgICBcIlwiLFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdGFnczogeyBCaWxsaW5nQ29kZTogXCJDZW50cmFsXCIsIFByb2plY3Q6IFwiRkNFTkcxMTU3MVwiIH0sXG4gICAgICAgICAgcm9sZXM6IHtcbiAgICAgICAgICAgIGN1c3RvbWVyOiBcIkNlbnRyYWxPcmNoZXN0cmF0aW9uQnVpbGRlclJvbGVcIixcbiAgICAgICAgICAgIHNvdXJjZTogXCJJYUNDcm9zc0FjY291bnRDb2RlQ29tbWl0Um9sZVwiLFxuICAgICAgICAgICAgdmVuZGluZzogXCJDZW50cmFsT3JjaGVzdHJhdGlvbkRlcGxveWVyXCIsXG4gICAgICAgICAgICBwZXJtaXNzaW9uQm91bmRhcnk6IFwiQ2RrU2NvcGVkUGVybWlzc2lvblwiLFxuICAgICAgICAgICAgY3VzdG9tZXJSZWFkT25seTogXCJDZW50cmFsT3JjaGVzdHJhdGlvblJlYWRPbmx5Um9sZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgIGNoZWNrQWxsb3dlZFpvbmVzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ2lvbjogXCJldS13ZXN0LTFcIixcbiAgICAgICAgICAgIGFjY291bnQ6IFwiOTU5OTA0MzQwMDc5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcnRpZmFjdHM6IHtcbiAgICAgICAgICAgIGN1c3RvbWVyUmVwb1BhdGg6IFwiY3VzdG9tZXItY29uZmlnXCIsXG4gICAgICAgICAgICB0cnVzdGVkQWNjb3VudDogXCIwMzk5OTE4Nzg5NDlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9ic2VydmFiaWxpdHk6IHsgZW5kcG9pbnQ6IFwiXCIsIHpvbmVzOiBbXCJcIl0gfSxcbiAgICAgICAgICBjb2RlQXJ0aWZhY3Q6IHsgYWNjb3VudDogXCIxNjQyOTAxMzI3NjlcIiwgcmVnaW9uOiBcImV1LXdlc3QtMVwiIH0sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgY29uc3QgYXBwID0gbmV3IEFwcCh7fSk7XG4gICAgICBjb25zdCBwcm9wczogRmluZW9zQ2xvdWRDb250cm9sSHViU3RhY2tQcm9wcyA9IHtcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgYWNjb3VudDogY29uZmlnLmVudmlyb25tZW50LmFjY291bnQsXG4gICAgICAgICAgcmVnaW9uOiBjb25maWcuZW52aXJvbm1lbnQucmVnaW9uLFxuICAgICAgICB9LFxuICAgICAgICB2ZXJzaW9uOiBwYWNrYWdlSW5mby52ZXJzaW9uLFxuICAgICAgICBvYnNlcnZhYmlsaXR5OiBjb25maWcub2JzZXJ2YWJpbGl0eSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgICAgcm9sZXM6IGNvbmZpZy5yb2xlcyxcbiAgICAgICAgaW5zdGFuY2VOYW1lOiBcInRlc3RpbmdcIixcbiAgICAgICAgem9uZTogXCJURVNUXCIsICAgICAgICBcbiAgICAgIH07XG4gICAgICBjb25zdCBzdGFjayA9IG5ldyBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFjayhhcHAsIFwidGVzdC1zdGFja1wiLCBwcm9wcyk7XG4gICAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgICBBcHBDb25maWcuYXBwbHlBbmRWYWxpZGF0ZVRhZ3MoY29uZmlnLCBwYWNrYWdlSW5mbywgXCJlbmdcIiwgc3RhY2ssIFwidGVzdFwiKTtcbiAgICAgIH0pLnRvVGhyb3coXCJPd25lciB0YWcgaXMgcmVxdWlyZWQgZm9yIGFsbCBkZXBsb3ltZW50c1wiKTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcInNob3VsZC1lcnJvci13aXRoLW1pc3NpbmctcHJvamVjdC1jb2RlLXRhZy1lbmdcIiwgKCkgPT4ge1xuICAgICAgY29uc3QgY29uZmlnOiBBcHBDb25maWdTY2hlbWEgPSBBcHBDb25maWcubG9hZENvbmZpZyhcbiAgICAgICAgXCJcIixcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHRhZ3M6IHsgQmlsbGluZ0NvZGU6IFwiQ2VudHJhbFwiLCBPd25lcjogXCJDZW50cmFsXCIgfSxcbiAgICAgICAgICByb2xlczoge1xuICAgICAgICAgICAgY3VzdG9tZXI6IFwiQ2VudHJhbE9yY2hlc3RyYXRpb25CdWlsZGVyUm9sZVwiLFxuICAgICAgICAgICAgc291cmNlOiBcIklhQ0Nyb3NzQWNjb3VudENvZGVDb21taXRSb2xlXCIsXG4gICAgICAgICAgICB2ZW5kaW5nOiBcIkNlbnRyYWxPcmNoZXN0cmF0aW9uRGVwbG95ZXJcIixcbiAgICAgICAgICAgIHBlcm1pc3Npb25Cb3VuZGFyeTogXCJDZGtTY29wZWRQZXJtaXNzaW9uXCIsXG4gICAgICAgICAgICBjdXN0b21lclJlYWRPbmx5OiBcIkNlbnRyYWxPcmNoZXN0cmF0aW9uUmVhZE9ubHlSb2xlXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgY2hlY2tBbGxvd2VkWm9uZXM6IGZhbHNlLFxuICAgICAgICAgICAgcmVnaW9uOiBcImV1LXdlc3QtMVwiLFxuICAgICAgICAgICAgYWNjb3VudDogXCI5NTk5MDQzNDAwNzlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFydGlmYWN0czoge1xuICAgICAgICAgICAgY3VzdG9tZXJSZXBvUGF0aDogXCJjdXN0b21lci1jb25maWdcIixcbiAgICAgICAgICAgIHRydXN0ZWRBY2NvdW50OiBcIjAzOTk5MTg3ODk0OVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgb2JzZXJ2YWJpbGl0eTogeyBlbmRwb2ludDogXCJcIiwgem9uZXM6IFtcIlwiXSB9LFxuICAgICAgICAgIGNvZGVBcnRpZmFjdDogeyBhY2NvdW50OiBcIjE2NDI5MDEzMjc2OVwiLCByZWdpb246IFwiZXUtd2VzdC0xXCIgfSxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICBjb25zdCBhcHAgPSBuZXcgQXBwKHt9KTtcbiAgICAgIGNvbnN0IHByb3BzOiBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFja1Byb3BzID0ge1xuICAgICAgICBlbnY6IHtcbiAgICAgICAgICBhY2NvdW50OiBjb25maWcuZW52aXJvbm1lbnQuYWNjb3VudCxcbiAgICAgICAgICByZWdpb246IGNvbmZpZy5lbnZpcm9ubWVudC5yZWdpb24sXG4gICAgICAgIH0sXG4gICAgICAgIHZlcnNpb246IHBhY2thZ2VJbmZvLnZlcnNpb24sXG4gICAgICAgIG9ic2VydmFiaWxpdHk6IGNvbmZpZy5vYnNlcnZhYmlsaXR5LFxuICAgICAgICBlbnZpcm9ubWVudDogY29uZmlnLmVudmlyb25tZW50LFxuICAgICAgICByb2xlczogY29uZmlnLnJvbGVzLFxuICAgICAgICBpbnN0YW5jZU5hbWU6IFwidGVzdGluZ1wiLFxuICAgICAgICB6b25lOiBcIlRFU1RcIiwgICAgICAgIFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHN0YWNrID0gbmV3IEZpbmVvc0Nsb3VkQ29udHJvbEh1YlN0YWNrKGFwcCwgXCJ0ZXN0LXN0YWNrXCIsIHByb3BzKTtcbiAgICAgIGV4cGVjdCgoKSA9PiB7XG4gICAgICAgIEFwcENvbmZpZy5hcHBseUFuZFZhbGlkYXRlVGFncyhjb25maWcsIHBhY2thZ2VJbmZvLCBcImVuZ1wiLCBzdGFjaywgXCJ0ZXN0XCIpO1xuICAgICAgfSkudG9UaHJvdyhcIlByb2plY3QgdGFnIGlzIHJlcXVpcmVkIGluIHRoZSBlbmdpbmVlcmluZyBvcmdhbml6YXRpb25cIik7XG4gICAgfSk7XG4gIFxuICAgIHRlc3QoXCJzaG91bGQtZXJyb3Itd2l0aC1taXNzaW5nLWJpbGxpbmctY29kZS10YWctcWFcIiwgKCkgPT4ge1xuICAgICAgY29uc3QgY29uZmlnOiBBcHBDb25maWdTY2hlbWEgPSBBcHBDb25maWcubG9hZENvbmZpZyhcbiAgICAgICAgXCJcIixcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHRhZ3M6IHsgT3duZXI6IFwiQ2VudHJhbFwiLCBQcm9qZWN0OiBcIkZDRU5HMTE1NzFcIiB9LFxuICAgICAgICAgIHJvbGVzOiB7XG4gICAgICAgICAgICBjdXN0b21lcjogXCJDZW50cmFsT3JjaGVzdHJhdGlvbkJ1aWxkZXJSb2xlXCIsXG4gICAgICAgICAgICBzb3VyY2U6IFwiSWFDQ3Jvc3NBY2NvdW50Q29kZUNvbW1pdFJvbGVcIixcbiAgICAgICAgICAgIHZlbmRpbmc6IFwiQ2VudHJhbE9yY2hlc3RyYXRpb25EZXBsb3llclwiLFxuICAgICAgICAgICAgcGVybWlzc2lvbkJvdW5kYXJ5OiBcIkNka1Njb3BlZFBlcm1pc3Npb25cIixcbiAgICAgICAgICAgIGN1c3RvbWVyUmVhZE9ubHk6IFwiQ2VudHJhbE9yY2hlc3RyYXRpb25SZWFkT25seVJvbGVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICBjaGVja0FsbG93ZWRab25lczogZmFsc2UsXG4gICAgICAgICAgICByZWdpb246IFwiZXUtd2VzdC0xXCIsXG4gICAgICAgICAgICBhY2NvdW50OiBcIjk1OTkwNDM0MDA3OVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXJ0aWZhY3RzOiB7XG4gICAgICAgICAgICBjdXN0b21lclJlcG9QYXRoOiBcImN1c3RvbWVyLWNvbmZpZ1wiLFxuICAgICAgICAgICAgdHJ1c3RlZEFjY291bnQ6IFwiMDM5OTkxODc4OTQ5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBvYnNlcnZhYmlsaXR5OiB7IGVuZHBvaW50OiBcIlwiLCB6b25lczogW1wiXCJdIH0sXG4gICAgICAgICAgY29kZUFydGlmYWN0OiB7IGFjY291bnQ6IFwiMTY0MjkwMTMyNzY5XCIsIHJlZ2lvbjogXCJldS13ZXN0LTFcIiB9LFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAoe30pO1xuICAgICAgY29uc3QgcHJvcHM6IEZpbmVvc0Nsb3VkQ29udHJvbEh1YlN0YWNrUHJvcHMgPSB7XG4gICAgICAgIGVudjoge1xuICAgICAgICAgIGFjY291bnQ6IGNvbmZpZy5lbnZpcm9ubWVudC5hY2NvdW50LFxuICAgICAgICAgIHJlZ2lvbjogY29uZmlnLmVudmlyb25tZW50LnJlZ2lvbixcbiAgICAgICAgfSxcbiAgICAgICAgdmVyc2lvbjogcGFja2FnZUluZm8udmVyc2lvbixcbiAgICAgICAgb2JzZXJ2YWJpbGl0eTogY29uZmlnLm9ic2VydmFiaWxpdHksXG4gICAgICAgIGVudmlyb25tZW50OiBjb25maWcuZW52aXJvbm1lbnQsXG4gICAgICAgIHJvbGVzOiBjb25maWcucm9sZXMsXG4gICAgICAgIGluc3RhbmNlTmFtZTogXCJ0ZXN0aW5nXCIsXG4gICAgICAgIHpvbmU6IFwiVEVTVFwiLCAgICAgICBcbiAgICAgIH07XG4gICAgICBjb25zdCBzdGFjayA9IG5ldyBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFjayhhcHAsIFwidGVzdC1zdGFja1wiLCBwcm9wcyk7XG4gICAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgICBBcHBDb25maWcuYXBwbHlBbmRWYWxpZGF0ZVRhZ3MoY29uZmlnLCBwYWNrYWdlSW5mbywgXCJxYVwiLCBzdGFjaywgXCJ0ZXN0XCIpO1xuICAgICAgfSkudG9UaHJvdyhcIkJpbGxpbmdDb2RlIHRhZyBpcyByZXF1aXJlZCBmb3IgYWxsIGRlcGxveW1lbnRzXCIpO1xuICAgIH0pO1xuICBcbiAgICB0ZXN0KFwic2hvdWxkLWVycm9yLXdpdGgtbWlzc2luZy1vd25lci1jb2RlLXRhZy1xYVwiLCAoKSA9PiB7XG4gICAgICBjb25zdCBjb25maWc6IEFwcENvbmZpZ1NjaGVtYSA9IEFwcENvbmZpZy5sb2FkQ29uZmlnKFxuICAgICAgICBcIlwiLFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgdGFnczogeyBCaWxsaW5nQ29kZTogXCJDZW50cmFsXCIsIFByb2plY3Q6IFwiRkNFTkcxMTU3MVwiIH0sXG4gICAgICAgICAgcm9sZXM6IHtcbiAgICAgICAgICAgIGN1c3RvbWVyOiBcIkNlbnRyYWxPcmNoZXN0cmF0aW9uQnVpbGRlclJvbGVcIixcbiAgICAgICAgICAgIHNvdXJjZTogXCJJYUNDcm9zc0FjY291bnRDb2RlQ29tbWl0Um9sZVwiLFxuICAgICAgICAgICAgdmVuZGluZzogXCJDZW50cmFsT3JjaGVzdHJhdGlvbkRlcGxveWVyXCIsXG4gICAgICAgICAgICBwZXJtaXNzaW9uQm91bmRhcnk6IFwiQ2RrU2NvcGVkUGVybWlzc2lvblwiLFxuICAgICAgICAgICAgY3VzdG9tZXJSZWFkT25seTogXCJDZW50cmFsT3JjaGVzdHJhdGlvblJlYWRPbmx5Um9sZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgIGNoZWNrQWxsb3dlZFpvbmVzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ2lvbjogXCJldS13ZXN0LTFcIixcbiAgICAgICAgICAgIGFjY291bnQ6IFwiOTU5OTA0MzQwMDc5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcnRpZmFjdHM6IHtcbiAgICAgICAgICAgIGN1c3RvbWVyUmVwb1BhdGg6IFwiY3VzdG9tZXItY29uZmlnXCIsXG4gICAgICAgICAgICB0cnVzdGVkQWNjb3VudDogXCIwMzk5OTE4Nzg5NDlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9ic2VydmFiaWxpdHk6IHsgZW5kcG9pbnQ6IFwiXCIsIHpvbmVzOiBbXCJcIl0gfSxcbiAgICAgICAgICBjb2RlQXJ0aWZhY3Q6IHsgYWNjb3VudDogXCIxNjQyOTAxMzI3NjlcIiwgcmVnaW9uOiBcImV1LXdlc3QtMVwiIH0sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgY29uc3QgYXBwID0gbmV3IEFwcCh7fSk7XG4gICAgICBjb25zdCBwcm9wczogRmluZW9zQ2xvdWRDb250cm9sSHViU3RhY2tQcm9wcyA9IHtcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgYWNjb3VudDogY29uZmlnLmVudmlyb25tZW50LmFjY291bnQsXG4gICAgICAgICAgcmVnaW9uOiBjb25maWcuZW52aXJvbm1lbnQucmVnaW9uLFxuICAgICAgICB9LFxuICAgICAgICB2ZXJzaW9uOiBwYWNrYWdlSW5mby52ZXJzaW9uLFxuICAgICAgICBvYnNlcnZhYmlsaXR5OiBjb25maWcub2JzZXJ2YWJpbGl0eSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgICAgcm9sZXM6IGNvbmZpZy5yb2xlcyxcbiAgICAgICAgaW5zdGFuY2VOYW1lOiBcInRlc3RpbmdcIixcbiAgICAgICAgem9uZTogXCJURVNUXCIsICAgICAgICBcbiAgICAgIH07XG4gICAgICBjb25zdCBzdGFjayA9IG5ldyBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFjayhhcHAsIFwidGVzdC1zdGFja1wiLCBwcm9wcyk7XG4gICAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgICBBcHBDb25maWcuYXBwbHlBbmRWYWxpZGF0ZVRhZ3MoY29uZmlnLCBwYWNrYWdlSW5mbywgXCJxYVwiLCBzdGFjaywgXCJ0ZXN0XCIpO1xuICAgICAgfSkudG9UaHJvdyhcIk93bmVyIHRhZyBpcyByZXF1aXJlZCBmb3IgYWxsIGRlcGxveW1lbnRzXCIpO1xuICAgIH0pO1xuICBcbiAgICAvLyBPbmx5IGVuZyBmb3JjZXMgcHJvamVjdCB0YWcsIG5vdCBtYW5kYXRvcnkgaW4gRU5HL0NVU1QuXG4gICAgdGVzdChcInNob3VsZC1ub3QtZXJyb3Itd2l0aC1taXNzaW5nLXByb2plY3QtY29kZS10YWctcWFcIiwgKCkgPT4ge1xuICAgICAgY29uc3QgY29uZmlnOiBBcHBDb25maWdTY2hlbWEgPSBBcHBDb25maWcubG9hZENvbmZpZyhcbiAgICAgICAgXCJcIixcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHRhZ3M6IHtcbiAgICAgICAgICAgIFByb2plY3Q6IFwibXktcHJvamVjdFwiLFxuICAgICAgICAgICAgQmlsbGluZ0NvZGU6IFwiQ2VudHJhbFwiLFxuICAgICAgICAgICAgT3duZXI6IFwiQ2VudHJhbFwiLFxuICAgICAgICAgICAgXCJleHRyYS10YWdcIjogXCJ0YWctdmFsdWVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJvbGVzOiB7XG4gICAgICAgICAgICBjdXN0b21lcjogXCJDZW50cmFsT3JjaGVzdHJhdGlvbkJ1aWxkZXJSb2xlXCIsXG4gICAgICAgICAgICBzb3VyY2U6IFwiSWFDQ3Jvc3NBY2NvdW50Q29kZUNvbW1pdFJvbGVcIixcbiAgICAgICAgICAgIHZlbmRpbmc6IFwiQ2VudHJhbE9yY2hlc3RyYXRpb25EZXBsb3llclwiLFxuICAgICAgICAgICAgcGVybWlzc2lvbkJvdW5kYXJ5OiBcIkNka1Njb3BlZFBlcm1pc3Npb25cIixcbiAgICAgICAgICAgIGN1c3RvbWVyUmVhZE9ubHk6IFwiQ2VudHJhbE9yY2hlc3RyYXRpb25SZWFkT25seVJvbGVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICBjaGVja0FsbG93ZWRab25lczogZmFsc2UsXG4gICAgICAgICAgICByZWdpb246IFwiZXUtd2VzdC0xXCIsXG4gICAgICAgICAgICBhY2NvdW50OiBcIjk1OTkwNDM0MDA3OVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXJ0aWZhY3RzOiB7XG4gICAgICAgICAgICBjdXN0b21lclJlcG9QYXRoOiBcImN1c3RvbWVyLWNvbmZpZ1wiLFxuICAgICAgICAgICAgdHJ1c3RlZEFjY291bnQ6IFwiMDM5OTkxODc4OTQ5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBvYnNlcnZhYmlsaXR5OiB7IGVuZHBvaW50OiBcIlwiLCB6b25lczogW1wiXCJdIH0sXG4gICAgICAgICAgY29kZUFydGlmYWN0OiB7IGFjY291bnQ6IFwiMTY0MjkwMTMyNzY5XCIsIHJlZ2lvbjogXCJldS13ZXN0LTFcIiB9LFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAoe30pO1xuICAgICAgY29uc3QgcHJvcHM6IEZpbmVvc0Nsb3VkQ29udHJvbEh1YlN0YWNrUHJvcHMgPSB7XG4gICAgICAgIGVudjoge1xuICAgICAgICAgIGFjY291bnQ6IGNvbmZpZy5lbnZpcm9ubWVudC5hY2NvdW50LFxuICAgICAgICAgIHJlZ2lvbjogY29uZmlnLmVudmlyb25tZW50LnJlZ2lvbixcbiAgICAgICAgfSxcbiAgICAgICAgdmVyc2lvbjogcGFja2FnZUluZm8udmVyc2lvbixcbiAgICAgICAgb2JzZXJ2YWJpbGl0eTogY29uZmlnLm9ic2VydmFiaWxpdHksXG4gICAgICAgIGVudmlyb25tZW50OiBjb25maWcuZW52aXJvbm1lbnQsXG4gICAgICAgIHJvbGVzOiBjb25maWcucm9sZXMsXG4gICAgICAgIGluc3RhbmNlTmFtZTogXCJ0ZXN0aW5nXCIsXG4gICAgICAgIHpvbmU6IFwiVEVTVFwiLCAgICAgICAgXG4gICAgICB9O1xuICAgICAgY29uc3Qgc3RhY2sgPSBuZXcgRmluZW9zQ2xvdWRDb250cm9sSHViU3RhY2soYXBwLCBcInRlc3Qtc3RhY2tcIiwgcHJvcHMpO1xuICAgICAgQXBwQ29uZmlnLmFwcGx5QW5kVmFsaWRhdGVUYWdzKGNvbmZpZywgcGFja2FnZUluZm8sIFwiZW5nXCIsIHN0YWNrLCBcInRlc3RcIik7XG4gICAgICBleHBlY3QoY29uZmlnLnJvbGVzLmN1c3RvbWVyKS50b0VxdWFsKFwiQ2VudHJhbE9yY2hlc3RyYXRpb25CdWlsZGVyUm9sZVwiKTtcbiAgICB9KTtcbiAgXG4gICAgdGVzdChcInRhZ3MtYXJlLWFwcGxpZWQtZnJvbS1jb25maWdcIiwgKCkgPT4ge1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKFwiQVdTOjpTMzo6QnVja2V0XCIsIHtcbiAgICAgICAgVGFnczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEtleTogXCJhd3MtY2RrOmF1dG8tZGVsZXRlLW9iamVjdHNcIixcbiAgICAgICAgICAgIFZhbHVlOiBcInRydWVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEtleTogXCJhd3MtY2RrOmNyLW93bmVkOjJhZTU5YjJkXCIsXG4gICAgICAgICAgICBWYWx1ZTogXCJ0cnVlXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBLZXk6IFwiQmlsbGluZ0NvZGVcIixcbiAgICAgICAgICAgIFZhbHVlOiBcImVuZy1iaWxsaW5nLWNvZGVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEtleTogXCJFbnZpcm9ubWVudFwiLFxuICAgICAgICAgICAgVmFsdWU6IFwiQ2VudHJhbFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgS2V5OiBcIkV4dHJhVGFnXCIsXG4gICAgICAgICAgICBWYWx1ZTogXCJleHRyYS10YWctdmFsdWVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEtleTogXCJodWItdmVyc2lvblwiLFxuICAgICAgICAgICAgVmFsdWU6IFwiMS4zLjFcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEtleTogXCJJQUNDb21wb25lbnRcIixcbiAgICAgICAgICAgIFZhbHVlOiBcIkZDQ19DbG91ZF9Db250cm9sX0h1YlwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgS2V5OiBcIklBQ1ZlcnNpb25cIixcbiAgICAgICAgICAgIFZhbHVlOiBcIjEuMy4xXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBLZXk6IFwiT3JnYW5pc2F0aW9uVW5pdE5hbWVcIixcbiAgICAgICAgICAgIFZhbHVlOiBcImh1YjFcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIEtleTogXCJPd25lclwiLFxuICAgICAgICAgICAgVmFsdWU6IFwiZW5nLW93bmVyXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBLZXk6IFwiUHJvamVjdFwiLFxuICAgICAgICAgICAgVmFsdWU6IFwiZW5nLXByb2plY3RcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuICBcbiAgYXN5bmMgZnVuY3Rpb24gY3JlYXRlU3RhY2tUZW1wbGF0ZSgpOiBQcm9taXNlPFRlbXBsYXRlPiB7XG4gICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgIHpvbmU6IFwiRU5HXCIsXG4gICAgICBpbnN0YW5jZU5hbWU6IFwiaHViMVwiLFxuICAgIH07XG4gIFxuICAgIGNvbnN0IGFwcCA9IG5ldyBBcHAoe1xuICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICB9KTtcbiAgXG4gICAgLy9nZXQgZW52aXJvbm1lbnRcbiAgICBjb25zdCB6b25lID0gYXBwLm5vZGUudHJ5R2V0Q29udGV4dChcInpvbmVcIikgfHwgXCJRQVwiO1xuICAgIGlmICh6b25lID09PSB1bmRlZmluZWQgfHwgIVtcIlFBXCIsIFwiRU5HXCIsIFwiQ1VTVFwiXS5pbmNsdWRlcyh6b25lKSkge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJQbGVhc2UgcHJvdmlkZSBhIGNvbnRleHQgdmFyaWFibGUgZm9yIHpvbmUuIFRoaXMgbXVzdCBiZSBvbmUgb2YgUUEsIEVORyBvciBDVVNULlwiXG4gICAgICApO1xuICAgIH1cbiAgXG4gICAgLy9SZWFkIGNvbmZpZyBmaWxlXG4gICAgY29uc3QgY29uZmlnID0gQXBwQ29uZmlnLmxvYWRDb25maWcoXG4gICAgICBgdGVzdC9jb25maWcvJHt6b25lLnRvTG93ZXJDYXNlKCl9LWFwcC1jb25maWcueWFtbGAsXG4gICAgICB1bmRlZmluZWRcbiAgICApO1xuICBcbiAgICAvL0dldCBzdGFnZSBwcmVmaXguIFdpbGwgYmUgcHJlZml4ZWQgdG8gcmVzb3VyY2UgbmFtZXNcbiAgICBjb25zdCBpbnN0YW5jZU5hbWUgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KFwiaW5zdGFuY2VOYW1lXCIpIHx8IFwidGVzdGluZ1wiO1xuICBcbiAgICAvL0J1aWxkIHByb3BzIG9iamVjdFxuICAgIGNvbnN0IHByb3BzOiBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFja1Byb3BzID0ge1xuICAgICAgZW52OiB7XG4gICAgICAgIGFjY291bnQ6IGNvbmZpZy5lbnZpcm9ubWVudC5hY2NvdW50LFxuICAgICAgICByZWdpb246IGNvbmZpZy5lbnZpcm9ubWVudC5yZWdpb24sXG4gICAgICB9LFxuICAgICAgZW52aXJvbm1lbnQ6IGNvbmZpZy5lbnZpcm9ubWVudCxcbiAgICAgIHZlcnNpb246IHBhY2thZ2VJbmZvLnZlcnNpb24sXG4gICAgICBvYnNlcnZhYmlsaXR5OiBjb25maWcub2JzZXJ2YWJpbGl0eSxcbiAgICAgIHJvbGVzOiBjb25maWcucm9sZXMsXG4gICAgICBpbnN0YW5jZU5hbWU6IGluc3RhbmNlTmFtZSxcbiAgICAgIHpvbmU6IHpvbmUsICAgICAgXG4gICAgfTtcbiAgXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgRmluZW9zQ2xvdWRDb250cm9sSHViU3RhY2soXG4gICAgICBhcHAsXG4gICAgICBgJHtwcm9wcy5pbnN0YW5jZU5hbWV9LUZpbmVvc0Nsb3VkQ29udHJvbEh1YlN0YWNrYCxcbiAgICAgIHByb3BzXG4gICAgKTtcbiAgXG4gICAgQXBwQ29uZmlnLmFwcGx5QW5kVmFsaWRhdGVUYWdzKFxuICAgICAgY29uZmlnLFxuICAgICAgcGFja2FnZUluZm8sXG4gICAgICB6b25lLFxuICAgICAgc3RhY2ssXG4gICAgICBpbnN0YW5jZU5hbWVcbiAgICApO1xuICBcbiAgICBhcHAuc3ludGgoKTtcbiAgICByZXR1cm4gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcbiAgfVxuICBcbiJdfQ==