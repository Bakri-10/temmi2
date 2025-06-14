import {
    Match,
    Template,
    Capture as AssertCapture,
  } from "aws-cdk-lib/assertions";
  import {
    FineosCloudControlHubStack,
    FineosCloudControlHubStackProps,
  } from "../lib/fineos-cloud-control-hub-stack";
  import { App } from "aws-cdk-lib";
  import { AppConfig, AppConfigSchema } from "../lib/app-config/app-config";
  import * as packageInfo from "./config/test-package.json";
  
  const iamRoleCount = 7;
  const iamPolicyCount = 6;
  const lambdaCount = 16;
  const stepFunctionCount = 1;
  
  describe("Stack Tests", () => {
    let template: Template;
  
    beforeAll(async () => {
      template = await createStackTemplate();
    });
  
    test("Role Count", () => {
      template.findResources("AWS::Lambda::Function");
      const functionNameCapture = new AssertCapture();
  
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
        FunctionName: Match.stringLikeRegexp("hub1-*"),
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
      template.resourceCountIs(
        "AWS::StepFunctions::StateMachine",
        stepFunctionCount
      );
    });
  
    test("stage prefix present in statemachine name", () => {
      template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
        StateMachineName: Match.stringLikeRegexp("hub1-*"),
      });
    });
  
    test("invalid-app-config-overrides-should-error", () => {
      expect(() => {
        AppConfig.loadConfig("", { "my-config": "empty-config" });
      }).toThrow("JSON Syntax Error in configOverride");
    });
  
    test("valid-app-config-overrides-should-not-error", () => {
      let overrides: AppConfigSchema = AppConfig.loadConfig(
        "",
        JSON.stringify({
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
        })
      );
      // Overrides should pass through with no error and be returned as config
      expect(overrides.roles.customer).toEqual("CentralOrchestrationBuilderRole");
    });
  
    test("app-config-is-used-from-file", () => {
      let config: AppConfigSchema = AppConfig.loadConfig(
        "test/config/qa-app-config.yaml",
        undefined
      );
      expect(config.roles.customer).toEqual("CentralOrchestrationBuilderRole");
    });
  
    test("invalid-app-config-file-path-should-error", () => {
      expect(() => {
        AppConfig.loadConfig("test/config/qa-app-file.yaml", undefined);
      }).toThrow("Error processing config file");
    });
  
    test("should-error-with-missing-billing-code-tag-eng", () => {
      const config: AppConfigSchema = AppConfig.loadConfig(
        "",
        JSON.stringify({
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
        })
      );
      const app = new App({});
      const props: FineosCloudControlHubStackProps = {
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
      const stack = new FineosCloudControlHubStack(app, "test-stack", props);
      expect(() => {
        AppConfig.applyAndValidateTags(config, packageInfo, "eng", stack, "test");
      }).toThrow("BillingCode tag is required for all deployments");
    });
  
    test("should-error-with-missing-owner-code-tag-eng", () => {
      const config: AppConfigSchema = AppConfig.loadConfig(
        "",
        JSON.stringify({
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
        })
      );
      const app = new App({});
      const props: FineosCloudControlHubStackProps = {
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
      const stack = new FineosCloudControlHubStack(app, "test-stack", props);
      expect(() => {
        AppConfig.applyAndValidateTags(config, packageInfo, "eng", stack, "test");
      }).toThrow("Owner tag is required for all deployments");
    });
  
    test("should-error-with-missing-project-code-tag-eng", () => {
      const config: AppConfigSchema = AppConfig.loadConfig(
        "",
        JSON.stringify({
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
        })
      );
      const app = new App({});
      const props: FineosCloudControlHubStackProps = {
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
      const stack = new FineosCloudControlHubStack(app, "test-stack", props);
      expect(() => {
        AppConfig.applyAndValidateTags(config, packageInfo, "eng", stack, "test");
      }).toThrow("Project tag is required in the engineering organization");
    });
  
    test("should-error-with-missing-billing-code-tag-qa", () => {
      const config: AppConfigSchema = AppConfig.loadConfig(
        "",
        JSON.stringify({
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
        })
      );
      const app = new App({});
      const props: FineosCloudControlHubStackProps = {
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
      const stack = new FineosCloudControlHubStack(app, "test-stack", props);
      expect(() => {
        AppConfig.applyAndValidateTags(config, packageInfo, "qa", stack, "test");
      }).toThrow("BillingCode tag is required for all deployments");
    });
  
    test("should-error-with-missing-owner-code-tag-qa", () => {
      const config: AppConfigSchema = AppConfig.loadConfig(
        "",
        JSON.stringify({
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
        })
      );
      const app = new App({});
      const props: FineosCloudControlHubStackProps = {
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
      const stack = new FineosCloudControlHubStack(app, "test-stack", props);
      expect(() => {
        AppConfig.applyAndValidateTags(config, packageInfo, "qa", stack, "test");
      }).toThrow("Owner tag is required for all deployments");
    });
  
    // Only eng forces project tag, not mandatory in ENG/CUST.
    test("should-not-error-with-missing-project-code-tag-qa", () => {
      const config: AppConfigSchema = AppConfig.loadConfig(
        "",
        JSON.stringify({
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
        })
      );
      const app = new App({});
      const props: FineosCloudControlHubStackProps = {
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
      const stack = new FineosCloudControlHubStack(app, "test-stack", props);
      AppConfig.applyAndValidateTags(config, packageInfo, "eng", stack, "test");
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
  
  async function createStackTemplate(): Promise<Template> {
    const context = {
      zone: "ENG",
      instanceName: "hub1",
    };
  
    const app = new App({
      context: context,
    });
  
    //get environment
    const zone = app.node.tryGetContext("zone") || "QA";
    if (zone === undefined || !["QA", "ENG", "CUST"].includes(zone)) {
      console.error(
        "Please provide a context variable for zone. This must be one of QA, ENG or CUST."
      );
    }
  
    //Read config file
    const config = AppConfig.loadConfig(
      `test/config/${zone.toLowerCase()}-app-config.yaml`,
      undefined
    );
  
    //Get stage prefix. Will be prefixed to resource names
    const instanceName = app.node.tryGetContext("instanceName") || "testing";
  
    //Build props object
    const props: FineosCloudControlHubStackProps = {
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
  
    const stack = new FineosCloudControlHubStack(
      app,
      `${props.instanceName}-FineosCloudControlHubStack`,
      props
    );
  
    AppConfig.applyAndValidateTags(
      config,
      packageInfo,
      zone,
      stack,
      instanceName
    );
  
    app.synth();
    return Template.fromStack(stack);
  }
  
