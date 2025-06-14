"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubWorkflow = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const aws_stepfunctions_1 = require("aws-cdk-lib/aws-stepfunctions");
class HubWorkflow extends aws_cdk_lib_1.aws_stepfunctions.StateMachine {
    constructor(scope, id, props) {
        //Define task to add S3 bucket details to state machine json
        const bucketFolder = "fcch_template";
        const setBucketInfo = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, 'AddBucketInfoToPayload', {
            inputPath: "$.template",
            parameters: {
                'bucket': props.artifactBucket.bucketName,
                'folder': bucketFolder,
                'file': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$")
            },
            comment: "Add bucket and folder details into payload",
            resultPath: '$.template'
        });
        // FCENG-12662: CCH_EXECUTION_FAILED
        const cchExecutionFailed = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, "ExecutionFailed", {
            lambdaFunction: props.eventBusHandler,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                status: "CCH_EXECUTION_FAILED",
                component: "CCH",
                payload: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$"),
                sfnInstance: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.StateMachine"),
                executionId: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Id"),
                executionInput: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Input"),
                errorInfo: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$")
            }),
            resultPath: "$.efh.cch.executions.failed",
        });
        //Define Workflow Failure
        const failureTask = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'WorkflowFailure', {
            lambdaFunction: props.fail,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                payload: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$'),
            }),
            payloadResponseOnly: true,
            resultPath: '$.Error',
        });
        cchExecutionFailed.next(failureTask);
        // FCENG-12662: CCH_EXECUTION_STARTED
        const cchExecutionStarted = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, "ExecutionStarted", {
            lambdaFunction: props.eventBusHandler,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                status: "CCH_EXECUTION_STARTED",
                component: "CCH",
                payload: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$"),
                sfnInstance: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.StateMachine"),
                executionId: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Id"),
                executionInput: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Input"),
            }),
            payloadResponseOnly: true,
            resultPath: "$.efh.cch.executions.started",
        });
        cchExecutionStarted.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        // FCENG-12662: CCH_TEMPLATE_RETRIEVED
        const cchTemplateRetrieved = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, "TemplateRetrieved", {
            lambdaFunction: props.eventBusHandler,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                status: "CCH_TEMPLATE_RETRIEVED",
                component: "CCH",
                payload: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$"),
                sfnInstance: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.StateMachine"),
                executionId: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Id"),
                executionInput: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Input"),
            }),
            payloadResponseOnly: true,
            resultPath: "$.efh.cch.executions.templateRetrieved",
        });
        cchTemplateRetrieved.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        // FCENG-12662: CCH_EXECUTION_COMPLETED
        const cchExecutionCompleted = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, "ExecutionCompleted", {
            lambdaFunction: props.eventBusHandler,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                status: "CCH_EXECUTION_COMPLETED",
                component: "CCH",
                payload: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$"),
                sfnInstance: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.StateMachine"),
                executionId: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Id"),
                executionInput: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Input"),
            }),
            resultPath: "$.efh.cch.executions.completed",
        });
        cchExecutionCompleted.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        //Define task to add FCCH_Instance, for TOF manual approval email, and FCCH_Execution, for New Relic logging
        const setFCCH = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, 'AddCustomFCCHToPayload', {
            parameters: {
                "FCCH_Instance": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.StateMachine"),
                "FCCH_Execution": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Id"),
                "FCCH_Input": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Input"),
            },
            comment: "Add custom FCCH_Instance to payload",
            resultPath: '$.params.custom.FCCH'
        });
        //Define task to get customer account configuration
        const GetCustomerConfigFromDB = new aws_cdk_lib_2.aws_stepfunctions_tasks.DynamoGetItem(scope, 'GetCustomerConfigFromDB', {
            key: {
                pk: aws_cdk_lib_2.aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.customer.zone')),
                sk: aws_cdk_lib_2.aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.customer.customerPrefix')),
            },
            table: props.customerConfigTable,
            comment: "Retrieve customer account configuration from TOF Dynamo DB table",
            resultPath: '$.config.customer',
        });
        GetCustomerConfigFromDB.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        // Check for custom error thrown from WriteTemplateToS3 codebuild project.  Currently only
        // handle 101 for a template file not found error.
        const raiseWriteTemplateToS3Error = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, 'RaiseWriteTemplateToS3Error', {
            parameters: { "Error": "CCHError", "Cause": "Could not retrieve template file from CodeCommit" },
            resultPath: '$.error',
        }).next(cchExecutionFailed);
        const checkWriteTemplateToS3ExitCode = new aws_cdk_lib_1.aws_stepfunctions.Choice(scope, 'checkWriteTemplateToS3ExitCode')
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.stringMatches('$.error.Cause', '*Reason: exit status 101*'), raiseWriteTemplateToS3Error)
            .otherwise(cchExecutionFailed);
        //Define read S3 function
        const readS3 = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'ReadTemplateFileFromS3', {
            lambdaFunction: props.readS3,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params'),
                template: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.template'),
                config: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.config')
            }),
            payloadResponseOnly: true,
            resultPath: '$.data'
        });
        readS3.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        //Define validate template dependencies function
        const validateTemplateDependencies = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'validateTemplateDependencies', {
            lambdaFunction: props.validateTemplateDependencies,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params'),
                template: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.template'),
                config: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.config')
            }),
            payloadResponseOnly: true,
            resultPath: '$.params.custom.FCCH.FCCH_dependencies'
        });
        validateTemplateDependencies.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        validateTemplateDependencies.next(readS3);
        //Define SetEnvPrefix
        const setEnvPrefix = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'SetEnvPrefix', {
            lambdaFunction: props.setEnvPrefix,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params'),
                data: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.data'),
                environment: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.environment')
            }),
            payloadResponseOnly: true,
            resultPath: '$.data'
        });
        readS3.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        //Define GetSize
        const getSize = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'GetNumberOfStages', {
            lambdaFunction: props.getSize,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params'),
                data: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.data')
            }),
            payloadResponseOnly: true,
            resultPath: '$.iterator',
        });
        //Define iterator
        const iterateCount = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'IterateStages', {
            lambdaFunction: props.iterate,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                index: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.iterator.index'),
                step: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.iterator.step'),
                count: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.iterator.count'),
                data: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.data'),
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params')
            }),
            payloadResponseOnly: true,
            resultPath: '$.iterator'
        });
        //Define execution failed task
        const executionFailedTask = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'ExecutionFailure', {
            lambdaFunction: props.executionFailed,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                payload: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$'),
            }),
            payloadResponseOnly: true,
            resultPath: '$',
        }).next(cchExecutionFailed);
        //Validate template function
        const validateTemplate = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'ValidateTemplate', {
            lambdaFunction: props.validateTemplate,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params'),
                template: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.template')
            }),
            payloadResponseOnly: true,
            resultPath: '$.template',
        });
        validateTemplate.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        //Define a task to run Customer Account CodeBuild retrieval project
        const WriteTemplateToS3 = new aws_cdk_lib_2.aws_stepfunctions_tasks.CodeBuildStartBuild(scope, "WriteTemplateToS3", {
            project: props.codeBuildPackageCustomer,
            comment: "Starts the CodeBuild project retrieve the template file from the customer repo and write it to S3",
            integrationPattern: aws_cdk_lib_1.aws_stepfunctions.IntegrationPattern.RUN_JOB,
            environmentVariablesOverride: {
                CODE_BRANCH: {
                    value: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$.config.customer.Item.config.M.configBranch.S")
                },
                CODE_REPOSITORY: {
                    value: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$.config.customer.Item.config.M.configRepo.S")
                },
                CODE_ACCOUNT: {
                    value: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$.config.customer.Item.config.M.configAccount.S")
                },
                CODE_REGION: {
                    value: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$.config.customer.Item.config.M.configRegion.S")
                },
                CUSTOMER_NAME: {
                    value: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$.config.customer.Item.config.M.customerPrefix.S")
                },
                CUSTOMER_CONFIG_FILE: {
                    value: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$.template.file")
                },
                ARTIFACT_BUCKET_NAME: {
                    value: props.artifactBucket.bucketName
                },
                BUCKET_PATH: {
                    value: bucketFolder
                },
                CODE_ROLE: {
                    value: props.repoRoleName
                },
                TARGET_ACCOUNT: {
                    value: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$.config.customer.Item.config.M.account.S")
                },
                TARGET_ROLE: {
                    value: props.deployRoleName
                },
            },
            // None of this is currently used in flow, so discard results.
            resultPath: aws_cdk_lib_1.aws_stepfunctions.JsonPath.DISCARD
        });
        WriteTemplateToS3.addCatch(checkWriteTemplateToS3ExitCode, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        // have a NEXT for FCENG-12660
        WriteTemplateToS3.next(validateTemplate);
        //Define Done
        const done = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, "Done");
        //Define Success
        const success = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, "Success");
        //Define Failure
        const failure = new aws_cdk_lib_1.aws_stepfunctions.Fail(scope, "Failure");
        success.next(cchExecutionCompleted);
        // If template was copied to S3 prior to CCH execution, skip WriteTemplateToS3 task. (FCENG-12660)        
        const RetrieveFCRConfig = new aws_cdk_lib_1.aws_stepfunctions.Choice(scope, 'RetrieveTemplateFromRepository')
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.isPresent("$.params.custom.eventData"), validateTemplate)
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.isNotPresent("$.params.custom.eventData"), WriteTemplateToS3)
            .otherwise(failure);
        //Get TOF state machine reference
        const TOFarn = `arn:aws:states:${props.region}:${props.customerAccount}:stateMachine:${props.instanceName}-CentralOrchestrationWorkflow`;
        const TOF = aws_cdk_lib_1.aws_stepfunctions.StateMachine.fromStateMachineArn(scope, 'TOFInstance', TOFarn);
        //Validate TOF version function
        const validateTOF = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'ValidateTOFVersion', {
            lambdaFunction: props.validateTOF,
            payloadResponseOnly: true,
            resultPath: '$.tof',
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                arn: TOFarn,
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params'),
            })
        });
        validateTOF.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        const validateEmails = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'validateEmails', {
            lambdaFunction: props.validateEmails,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params'),
                config: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.config')
            }),
            payloadResponseOnly: true,
            resultPath: '$.output',
        });
        validateEmails.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        // When we run CCH in validationMode=true, this task will be used to set no-op
        // params. This will be used to get validation error summary from TOF.
        const setNoOpParams = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, 'SetNoOpParams', {
            inputPath: "$",
            parameters: {
                'app': "",
                'command': "no-op",
                'version': "",
                'usePackaged': true,
                'manualApprovalRequired': true,
                'validationMode': true,
                'executionName': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.data.NoOpExecutionName'),
                'custom': {
                    "emailContent": {
                        "message.$": "States.Format('Please find the TOF validation errors of CCH Execution Name: {} with Template: {}', States.ArrayGetItem(States.StringSplit($.params.custom.FCCH.FCCH_Execution, ':'), 7), $.params.custom.FCCH.FCCH_Input.template)",
                        "app": "",
                        "version": ""
                    },
                    "FCCH": {
                        "FCCH_Instance": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.StateMachine"),
                        "FCCH_Execution": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Id"),
                        "FCCH_Input": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Input"),
                        "FCCH_Final_Execution": true
                    }
                },
                'customer': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.customer')
            },
            comment: "Add no-op params into payload",
            resultPath: '$.noOp'
        });
        // const checkEnvListOrPrefix = new sfn.Choice(scope, 'CheckEnvListOrPrefix');
        // This task will be used to set no-op
        // params. This will be used to package customer configuration.
        const setNoOpParamsEnvList = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, 'SetNoOpParams-EnvList', {
            parameters: {
                'app': "",
                'command': "no-op",
                'version': "",
                'packageOnly': true,
                'executionName': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.data.PackageExecutionName'),
                'customer': {
                    'customerPrefix': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.customer.customerPrefix'),
                    'zone': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.customer.zone'),
                },
                'envList': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.envList'),
            },
            resultPath: '$.packageCustomer'
        });
        const setPackageNoOpParams = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, 'setPackageNoOpParams', {
            parameters: {
                'app': "",
                'command': "no-op",
                'version': "",
                'packageOnly': true,
                'executionName': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.data.PackageExecutionName'),
                'customer': {
                    'customerPrefix': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.customer.customerPrefix'),
                    'zone': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.customer.zone'),
                }
            },
            resultPath: '$.packageCustomer'
        });
        // This task will be used to invoke TOF only for packge customer config.
        // This task will submit no-op params set by 'setPackageNoOpParams' to TOF.
        const packageCustomerTaskList = new aws_cdk_lib_2.aws_stepfunctions_tasks.StepFunctionsStartExecution(scope, 'PackageCustomerTaskWithEnvList', {
            stateMachine: TOF,
            inputPath: '$.packageCustomer',
            name: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.executionName'),
            integrationPattern: aws_cdk_lib_1.aws_stepfunctions.IntegrationPattern.RUN_JOB,
            resultPath: '$.output',
        });
        // This task will be used to invoke TOF only for packge customer config.
        // This task will submit no-op params set by 'setPackageNoOpParams' to TOF.
        const packageCustomerTask = new aws_cdk_lib_2.aws_stepfunctions_tasks.StepFunctionsStartExecution(scope, 'PackageCustomerTask', {
            stateMachine: TOF,
            inputPath: '$.packageCustomer',
            name: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.executionName'),
            integrationPattern: aws_cdk_lib_1.aws_stepfunctions.IntegrationPattern.RUN_JOB,
            resultPath: '$.output',
        });
        // .otherwise(setNoOpParams_EnvPrefix.next(packageCustomerTask)); // or handle differently
        packageCustomerTask.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        //Define task to handle handle serial and parallel tasks failures.
        const handleFailure = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, 'HandleFailure', {
            parameters: {
                "environment": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$.environment"),
                "error.$": "States.StringToJson($.error.Cause)"
            },
            comment: "Add custom FCCH_Instance to payload",
            resultPath: '$.failedTask',
            outputPath: '$.failedTask'
        });
        //Define ExecuteTOF
        const ExecuteTOF = new aws_cdk_lib_1.aws_stepfunctions.Map(scope, 'executeTOFMap', {
            inputPath: '$.iterator.stages.tasks',
            resultPath: '$.output',
            maxConcurrency: 1
        });
        ExecuteTOF.addCatch(handleFailure, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        ExecuteTOF.iterator(new aws_cdk_lib_2.aws_stepfunctions_tasks.StepFunctionsStartExecution(scope, 'executeTOF', {
            stateMachine: TOF,
            inputPath: '$.params',
            name: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.executionName'),
            integrationPattern: aws_cdk_lib_1.aws_stepfunctions.IntegrationPattern.RUN_JOB
        })).next(iterateCount);
        //Define ExecuteTOF in parallel
        const ExecuteTOFParallel = new aws_cdk_lib_1.aws_stepfunctions.Map(scope, 'executeTOFMapParallel', {
            inputPath: '$.iterator.stages.tasks',
            resultPath: '$.output',
            maxConcurrency: props.maxConcurrency
        });
        ExecuteTOFParallel.addCatch(handleFailure, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        handleFailure.next(done);
        ExecuteTOFParallel.iterator(new aws_cdk_lib_2.aws_stepfunctions_tasks.StepFunctionsStartExecution(scope, 'executeTOFParallel', {
            stateMachine: TOF,
            inputPath: '$.params',
            name: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.executionName'),
            integrationPattern: aws_cdk_lib_1.aws_stepfunctions.IntegrationPattern.RUN_JOB
        })).next(iterateCount);
        const isParallel = new aws_cdk_lib_1.aws_stepfunctions.Choice(scope, "IsStageParallel")
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.booleanEquals('$.iterator.stages.parallel', true), ExecuteTOFParallel)
            .otherwise(ExecuteTOF);
        //check if validationMode flag is true and run validateDependencies if true
        const CheckValidationMode = new aws_cdk_lib_1.aws_stepfunctions.Choice(scope, "CheckValidationMode")
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.and(aws_cdk_lib_1.aws_stepfunctions.Condition.isPresent('$.params.validationMode'), aws_cdk_lib_1.aws_stepfunctions.Condition.booleanEquals('$.params.validationMode', true)), validateTemplateDependencies)
            .otherwise(readS3);
        // When we run CCH in validationMode=true, this task will be used to get
        // validation error summary from TOF. This task will submit no-op params set by 'setNoOpParams' to TOF.
        const getTOFValidationReport = new aws_cdk_lib_2.aws_stepfunctions_tasks.StepFunctionsStartExecution(scope, 'GetTOFValidationReport', {
            stateMachine: TOF,
            inputPath: '$.noOp',
            name: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.executionName'),
            integrationPattern: aws_cdk_lib_1.aws_stepfunctions.IntegrationPattern.RUN_JOB
        });
        const GetTOFDeploymentReport = new aws_cdk_lib_2.aws_stepfunctions_tasks.StepFunctionsStartExecution(scope, 'GetTOFDeploymentReport', {
            stateMachine: TOF,
            inputPath: '$.noOp',
            name: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.executionName'),
            integrationPattern: aws_cdk_lib_1.aws_stepfunctions.IntegrationPattern.RUN_JOB
        });
        const logReports = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'logReports', {
            lambdaFunction: props.logValidationSummary,
            inputPath: '$',
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.Input')
            }),
            payloadResponseOnly: true,
            resultPath: '$.output',
        });
        setNoOpParams.next(getTOFValidationReport).next(logReports).next(done);
        const setNoOpParamsReport = new aws_cdk_lib_1.aws_stepfunctions.Pass(scope, 'SetNoOpParamsReport', {
            inputPath: "$",
            parameters: {
                'app': "",
                'command': "no-op",
                'version': "",
                'manualApprovalRequired': true,
                'executionName': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.data.NoOpExecutionName'),
                'custom': {
                    "emailContent": {
                        "message.$": "States.Format('Please find the CCH deployment report of {} with Template {}', States.ArrayGetItem(States.StringSplit($.params.custom.FCCH.FCCH_Execution, ':'), 7), $.params.custom.FCCH.FCCH_Input.template)",
                        "app": "",
                        "version": ""
                    },
                    "FCCH": {
                        "FCCH_Instance": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.StateMachine"),
                        "FCCH_Execution": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Id"),
                        "FCCH_Input": aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt("$$.Execution.Input"),
                        "FCCH_Final_Execution": true
                    }
                },
                'customer': aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params.customer')
            },
            comment: "Add no-op params into payload",
            resultPath: '$.noOp'
        });
        setNoOpParamsReport.next(GetTOFDeploymentReport).next(logReports);
        // This will decide whether TOF has to send validation 
        // and report summaries for CCH executions.
        const runOptions = new aws_cdk_lib_1.aws_stepfunctions.Choice(scope, "RunOptions")
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.and(aws_cdk_lib_1.aws_stepfunctions.Condition.isPresent("$.params.validationMode"), aws_cdk_lib_1.aws_stepfunctions.Condition.booleanEquals('$.params.validationMode', true)), setNoOpParams)
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.and(aws_cdk_lib_1.aws_stepfunctions.Condition.isPresent("$.params.cchReportRequired"), aws_cdk_lib_1.aws_stepfunctions.Condition.booleanEquals('$.params.cchReportRequired', true)), setNoOpParamsReport)
            .otherwise(done);
        //Define IsCountReached
        const IsCountReached = new aws_cdk_lib_1.aws_stepfunctions.Choice(scope, "IsStageCountReached")
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.booleanEquals('$.iterator.continue', true), isParallel)
            .otherwise(runOptions);
        //Define execution failed task
        const logEnvExecutionStatus = new aws_cdk_lib_2.aws_stepfunctions_tasks.LambdaInvoke(scope, 'LogEnvExecutionStatus', {
            lambdaFunction: props.logEnvStatus,
            payload: aws_cdk_lib_1.aws_stepfunctions.TaskInput.fromObject({
                input: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.params'),
                envOutput: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.env_output')
            }),
            payloadResponseOnly: true,
            resultPath: '$.cchStatus',
        });
        logEnvExecutionStatus.addCatch(cchExecutionFailed, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        //Define CheckOverAllExecutionStatus. This will decide whether CCH execution has to fail.
        const checkCCHStatus = new aws_cdk_lib_1.aws_stepfunctions.Choice(scope, "CheckOverAllExecutionStatus")
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.and(aws_cdk_lib_1.aws_stepfunctions.Condition.isPresent("$.cchStatus"), aws_cdk_lib_1.aws_stepfunctions.Condition.stringEquals('$.cchStatus', "SUCCESS")), success)
            .otherwise(cchExecutionFailed);
        const envMap = new aws_cdk_lib_1.aws_stepfunctions.Map(scope, 'Deploy-Env-Parallel', {
            itemsPath: aws_cdk_lib_1.aws_stepfunctions.JsonPath.stringAt('$.data.envList'),
            parameters: {
                "params.$": "$.params",
                "data.$": "$.data",
                "environment.$": "$$.Map.Item.Value",
            },
            resultPath: '$.env_output',
            maxConcurrency: props.envConcurrency
        });
        envMap.addCatch(executionFailedTask, {
            errors: [aws_cdk_lib_1.aws_stepfunctions.Errors.TASKS_FAILED, aws_cdk_lib_1.aws_stepfunctions.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        envMap.iterator(setEnvPrefix.next(getSize).next(iterateCount).next(IsCountReached));
        const envFlow = envMap
            .next(logEnvExecutionStatus)
            .next(checkCCHStatus);
        const EnvListCheck = new aws_cdk_lib_1.aws_stepfunctions.Choice(scope, 'EnvListCheck')
            .when(aws_cdk_lib_1.aws_stepfunctions.Condition.isPresent('$.params.envList'), setNoOpParamsEnvList.next(packageCustomerTaskList).next(envFlow))
            .otherwise(setPackageNoOpParams.next(packageCustomerTask).next(envFlow));
        //Set the task flow
        const definition = cchExecutionStarted
            .next(setBucketInfo)
            .next(setFCCH)
            .next(validateTOF)
            .next(GetCustomerConfigFromDB)
            .next(RetrieveFCRConfig);
        validateTemplate
            .next(validateEmails)
            .next(CheckValidationMode);
        readS3.next(cchTemplateRetrieved)
            .next(EnvListCheck);
        // setup base step function class
        super(scope, id, {
            definitionBody: aws_stepfunctions_1.DefinitionBody.fromChainable(definition),
            stateMachineName: props.name,
            role: props.sfnRole,
            tracingEnabled: props.logging.trace,
            logs: props.logging.cloudwatch
        });
    }
}
exports.HubWorkflow = HubWorkflow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHViLXdvcmtmbG93LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL3N0ZXAtZnVuY3Rpb24vaHViLXdvcmtmbG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUF1RDtBQUN2RCw2Q0FBK0Q7QUFRL0QscUVBQStEO0FBZ0MvRCxNQUFhLFdBQVksU0FBUSwrQkFBRyxDQUFDLFlBQVk7SUFFN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUU3RCw0REFBNEQ7UUFDNUQsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLElBQUksK0JBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLHdCQUF3QixFQUFFO1lBQ2hFLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLFVBQVUsRUFBRTtnQkFDUixRQUFRLEVBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVO2dCQUMxQyxRQUFRLEVBQUcsWUFBWTtnQkFDdkIsTUFBTSxFQUFHLCtCQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7YUFDdEM7WUFDRCxPQUFPLEVBQUUsNENBQTRDO1lBQ3JELFVBQVUsRUFBRSxZQUFZO1NBQzNCLENBQUMsQ0FBQTtRQUVGLG9DQUFvQztRQUNwQyxNQUFNLGtCQUFrQixHQUFHLElBQUkscUNBQUssQ0FBQyxZQUFZLENBQzdDLEtBQUssRUFDTCxpQkFBaUIsRUFDakI7WUFDSSxjQUFjLEVBQUUsS0FBSyxDQUFDLGVBQWU7WUFDckMsT0FBTyxFQUFFLCtCQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQztnQkFDbEMsTUFBTSxFQUFFLHNCQUFzQjtnQkFDOUIsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE9BQU8sRUFBRSwrQkFBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNwQyxXQUFXLEVBQUUsK0JBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFD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O2FBQ2pCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQzthQUM3QixJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV6QixnQkFBZ0I7YUFDWCxJQUFJLENBQUMsY0FBYyxDQUFDO2FBQ3BCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRS9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUM7YUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBR25CLGlDQUFpQztRQUNqQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUNiLGNBQWMsRUFBRSxrQ0FBYyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUM7WUFDeEQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDNUIsSUFBSSxFQUFFLEtBQUssQ0FBQyxPQUFPO1lBQ25CLGNBQWMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUs7WUFDbkMsSUFBSSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVTtTQUNqQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0o7QUEzcEJELGtDQTJwQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBhd3Nfc3RlcGZ1bmN0aW9ucyBhcyBzZm4gfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBhd3Nfc3RlcGZ1bmN0aW9uc190YXNrcyBhcyB0YXNrcyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IGF3c19sYW1iZGEgYXMgbGFtYmRhIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgYXdzX2R5bmFtb2RiIGFzIGR5bmFtb2RiIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgYXdzX2NvZGVidWlsZCBhcyBjb2RlYnVpbGQgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBhd3NfczMgYXMgczMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBJUm9sZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBTdGF0ZU1hY2hpbmVMb2dzRFRPIH0gZnJvbSAnLi4vZmluZW9zLWNsb3VkLWNvbnRyb2wtaHViLWxvZ2dpbmcnO1xuaW1wb3J0IHsgRGVmaW5pdGlvbkJvZHkgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9ucyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSHViV29ya2Zsb3dQcm9wcyB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGluc3RhbmNlTmFtZTogc3RyaW5nO1xuICAgIHpvbmU6IHN0cmluZztcbiAgICByZWdpb246IHN0cmluZztcbiAgICBjdXN0b21lckFjY291bnQ6IHN0cmluZztcbiAgICBjdXN0b21lckNvbmZpZ1RhYmxlOiBkeW5hbW9kYi5JVGFibGU7XG4gICAgaXRlcmF0ZTogbGFtYmRhLklGdW5jdGlvbjtcbiAgICBnZXRTaXplOiBsYW1iZGEuSUZ1bmN0aW9uO1xuICAgIHJlYWRTMzogbGFtYmRhLklGdW5jdGlvbjtcbiAgICBldmVudEJ1c0hhbmRsZXI6IGxhbWJkYS5JRnVuY3Rpb247XG4gICAgdmFsaWRhdGVUZW1wbGF0ZURlcGVuZGVuY2llczogbGFtYmRhLklGdW5jdGlvbjtcbiAgICB2YWxpZGF0ZVRlbXBsYXRlOiBsYW1iZGEuSUZ1bmN0aW9uO1xuICAgIHZhbGlkYXRlVE9GOiBsYW1iZGEuSUZ1bmN0aW9uO1xuICAgIHZhbGlkYXRlRW1haWxzOiBsYW1iZGEuSUZ1bmN0aW9uLFxuICAgIGxvZ1ZhbGlkYXRpb25TdW1tYXJ5OiBsYW1iZGEuSUZ1bmN0aW9uLFxuICAgIGRlcGxveVJvbGVOYW1lOiBzdHJpbmc7XG4gICAgcmVwb1JvbGVOYW1lOiBzdHJpbmc7XG4gICAgY29kZUJ1aWxkUGFja2FnZUN1c3RvbWVyOiBjb2RlYnVpbGQuSVByb2plY3Q7XG4gICAgYXJ0aWZhY3RCdWNrZXQ6IHMzLklCdWNrZXQ7XG4gICAgZmFpbDogbGFtYmRhLklGdW5jdGlvbjtcbiAgICBleGVjdXRpb25GYWlsZWQ6IGxhbWJkYS5JRnVuY3Rpb247XG4gICAgbWF4Q29uY3VycmVuY3k6IG51bWJlcjtcbiAgICBzZm5Sb2xlOiBJUm9sZTtcbiAgICBsb2dnaW5nOiBTdGF0ZU1hY2hpbmVMb2dzRFRPO1xuICAgIHNldEVudlByZWZpeDpsYW1iZGEuSUZ1bmN0aW9uO1xuICAgIGxvZ0VudlN0YXR1czogbGFtYmRhLklGdW5jdGlvbjtcbiAgICBlbnZDb25jdXJyZW5jeTogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgSHViV29ya2Zsb3cgZXh0ZW5kcyBzZm4uU3RhdGVNYWNoaW5lIHtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBIdWJXb3JrZmxvd1Byb3BzKSB7XG4gICAgICAgICAgIFxuICAgICAgICAvL0RlZmluZSB0YXNrIHRvIGFkZCBTMyBidWNrZXQgZGV0YWlscyB0byBzdGF0ZSBtYWNoaW5lIGpzb25cbiAgICAgICAgY29uc3QgYnVja2V0Rm9sZGVyID0gXCJmY2NoX3RlbXBsYXRlXCI7XG4gICAgICAgIGNvbnN0IHNldEJ1Y2tldEluZm8gPSBuZXcgc2ZuLlBhc3Moc2NvcGUsICdBZGRCdWNrZXRJbmZvVG9QYXlsb2FkJywge1xuICAgICAgICAgICAgaW5wdXRQYXRoOiBcIiQudGVtcGxhdGVcIixcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICAnYnVja2V0JyA6IHByb3BzLmFydGlmYWN0QnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgICAgICAgJ2ZvbGRlcicgOiBidWNrZXRGb2xkZXIsXG4gICAgICAgICAgICAgICAgJ2ZpbGUnIDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJFwiKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbW1lbnQ6IFwiQWRkIGJ1Y2tldCBhbmQgZm9sZGVyIGRldGFpbHMgaW50byBwYXlsb2FkXCIsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC50ZW1wbGF0ZSdcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBGQ0VORy0xMjY2MjogQ0NIX0VYRUNVVElPTl9GQUlMRURcbiAgICAgICAgY29uc3QgY2NoRXhlY3V0aW9uRmFpbGVkID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZShcbiAgICAgICAgICAgIHNjb3BlLFxuICAgICAgICAgICAgXCJFeGVjdXRpb25GYWlsZWRcIixcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMuZXZlbnRCdXNIYW5kbGVyLFxuICAgICAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcIkNDSF9FWEVDVVRJT05fRkFJTEVEXCIsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50OiBcIkNDSFwiLFxuICAgICAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkXCIpLFxuICAgICAgICAgICAgICAgIHNmbkluc3RhbmNlOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkJC5TdGF0ZU1hY2hpbmVcIiksXG4gICAgICAgICAgICAgICAgZXhlY3V0aW9uSWQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLkV4ZWN1dGlvbi5JZFwiKSxcbiAgICAgICAgICAgICAgICBleGVjdXRpb25JbnB1dDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCQuRXhlY3V0aW9uLklucHV0XCIpLFxuICAgICAgICAgICAgICAgIGVycm9ySW5mbzogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJFwiKVxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIHJlc3VsdFBhdGg6IFwiJC5lZmguY2NoLmV4ZWN1dGlvbnMuZmFpbGVkXCIsXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgLy9EZWZpbmUgV29ya2Zsb3cgRmFpbHVyZVxuICAgICAgICBjb25zdCBmYWlsdXJlVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2Uoc2NvcGUsICdXb3JrZmxvd0ZhaWx1cmUnLCB7XG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMuZmFpbCxcbiAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAgICAgcGF5bG9hZDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckJyksXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHBheWxvYWRSZXNwb25zZU9ubHk6IHRydWUsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5FcnJvcicsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNjaEV4ZWN1dGlvbkZhaWxlZC5uZXh0KGZhaWx1cmVUYXNrKSBcblxuICAgICAgICAvLyBGQ0VORy0xMjY2MjogQ0NIX0VYRUNVVElPTl9TVEFSVEVEXG4gICAgICAgIGNvbnN0IGNjaEV4ZWN1dGlvblN0YXJ0ZWQgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKFxuICAgICAgICAgICAgc2NvcGUsXG4gICAgICAgICAgICBcIkV4ZWN1dGlvblN0YXJ0ZWRcIixcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiBwcm9wcy5ldmVudEJ1c0hhbmRsZXIsXG4gICAgICAgICAgICBwYXlsb2FkOiBzZm4uVGFza0lucHV0LmZyb21PYmplY3Qoe1xuICAgICAgICAgICAgICAgIHN0YXR1czogXCJDQ0hfRVhFQ1VUSU9OX1NUQVJURURcIixcbiAgICAgICAgICAgICAgICBjb21wb25lbnQ6IFwiQ0NIXCIsXG4gICAgICAgICAgICAgICAgcGF5bG9hZDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCRcIiksXG4gICAgICAgICAgICAgICAgc2ZuSW5zdGFuY2U6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLlN0YXRlTWFjaGluZVwiKSxcbiAgICAgICAgICAgICAgICBleGVjdXRpb25JZDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCQuRXhlY3V0aW9uLklkXCIpLFxuICAgICAgICAgICAgICAgIGV4ZWN1dGlvbklucHV0OiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkJC5FeGVjdXRpb24uSW5wdXRcIiksXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHBheWxvYWRSZXNwb25zZU9ubHk6IHRydWUsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiBcIiQuZWZoLmNjaC5leGVjdXRpb25zLnN0YXJ0ZWRcIixcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBjY2hFeGVjdXRpb25TdGFydGVkLmFkZENhdGNoKGNjaEV4ZWN1dGlvbkZhaWxlZCwge1xuICAgICAgICAgICAgZXJyb3JzOiBbc2ZuLkVycm9ycy5UQVNLU19GQUlMRUQsIHNmbi5FcnJvcnMuVElNRU9VVF0sXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5lcnJvcidcbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIC8vIEZDRU5HLTEyNjYyOiBDQ0hfVEVNUExBVEVfUkVUUklFVkVEXG4gICAgICAgIGNvbnN0IGNjaFRlbXBsYXRlUmV0cmlldmVkID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZShcbiAgICAgICAgICAgIHNjb3BlLFxuICAgICAgICAgICAgXCJUZW1wbGF0ZVJldHJpZXZlZFwiLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgbGFtYmRhRnVuY3Rpb246IHByb3BzLmV2ZW50QnVzSGFuZGxlcixcbiAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcIkNDSF9URU1QTEFURV9SRVRSSUVWRURcIixcbiAgICAgICAgICAgICAgICBjb21wb25lbnQ6IFwiQ0NIXCIsXG4gICAgICAgICAgICAgICAgcGF5bG9hZDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCRcIiksXG4gICAgICAgICAgICAgICAgc2ZuSW5zdGFuY2U6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLlN0YXRlTWFjaGluZVwiKSxcbiAgICAgICAgICAgICAgICBleGVjdXRpb25JZDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCQuRXhlY3V0aW9uLklkXCIpLFxuICAgICAgICAgICAgICAgIGV4ZWN1dGlvbklucHV0OiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkJC5FeGVjdXRpb24uSW5wdXRcIiksXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHBheWxvYWRSZXNwb25zZU9ubHk6IHRydWUsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiBcIiQuZWZoLmNjaC5leGVjdXRpb25zLnRlbXBsYXRlUmV0cmlldmVkXCIsXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgY2NoVGVtcGxhdGVSZXRyaWV2ZWQuYWRkQ2F0Y2goY2NoRXhlY3V0aW9uRmFpbGVkLCB7XG4gICAgICAgICAgICBlcnJvcnM6IFtzZm4uRXJyb3JzLlRBU0tTX0ZBSUxFRCwgc2ZuLkVycm9ycy5USU1FT1VUXSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLmVycm9yJ1xuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgLy8gRkNFTkctMTI2NjI6IENDSF9FWEVDVVRJT05fQ09NUExFVEVEXG4gICAgICAgIGNvbnN0IGNjaEV4ZWN1dGlvbkNvbXBsZXRlZCA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UoXG4gICAgICAgICAgICBzY29wZSxcbiAgICAgICAgICAgIFwiRXhlY3V0aW9uQ29tcGxldGVkXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMuZXZlbnRCdXNIYW5kbGVyLFxuICAgICAgICAgICAgcGF5bG9hZDogc2ZuLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFwiQ0NIX0VYRUNVVElPTl9DT01QTEVURURcIixcbiAgICAgICAgICAgICAgICBjb21wb25lbnQ6IFwiQ0NIXCIsXG4gICAgICAgICAgICAgICAgcGF5bG9hZDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCRcIiksXG4gICAgICAgICAgICAgICAgc2ZuSW5zdGFuY2U6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLlN0YXRlTWFjaGluZVwiKSxcbiAgICAgICAgICAgICAgICBleGVjdXRpb25JZDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCQuRXhlY3V0aW9uLklkXCIpLFxuICAgICAgICAgICAgICAgIGV4ZWN1dGlvbklucHV0OiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkJC5FeGVjdXRpb24uSW5wdXRcIiksXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6IFwiJC5lZmguY2NoLmV4ZWN1dGlvbnMuY29tcGxldGVkXCIsXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgXG4gICAgICAgIGNjaEV4ZWN1dGlvbkNvbXBsZXRlZC5hZGRDYXRjaChjY2hFeGVjdXRpb25GYWlsZWQsIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vRGVmaW5lIHRhc2sgdG8gYWRkIEZDQ0hfSW5zdGFuY2UsIGZvciBUT0YgbWFudWFsIGFwcHJvdmFsIGVtYWlsLCBhbmQgRkNDSF9FeGVjdXRpb24sIGZvciBOZXcgUmVsaWMgbG9nZ2luZ1xuICAgICAgICBjb25zdCBzZXRGQ0NIID0gbmV3IHNmbi5QYXNzKHNjb3BlLCAnQWRkQ3VzdG9tRkNDSFRvUGF5bG9hZCcsIHtcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6ICB7XG4gICAgICAgICAgICAgICAgXCJGQ0NIX0luc3RhbmNlXCI6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLlN0YXRlTWFjaGluZVwiKSxcbiAgICAgICAgICAgICAgICBcIkZDQ0hfRXhlY3V0aW9uXCI6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLkV4ZWN1dGlvbi5JZFwiKSxcbiAgICAgICAgICAgICAgICBcIkZDQ0hfSW5wdXRcIjogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCQuRXhlY3V0aW9uLklucHV0XCIpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbW1lbnQ6IFwiQWRkIGN1c3RvbSBGQ0NIX0luc3RhbmNlIHRvIHBheWxvYWRcIixcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLnBhcmFtcy5jdXN0b20uRkNDSCdcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgICAgIC8vRGVmaW5lIHRhc2sgdG8gZ2V0IGN1c3RvbWVyIGFjY291bnQgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBHZXRDdXN0b21lckNvbmZpZ0Zyb21EQiA9IG5ldyB0YXNrcy5EeW5hbW9HZXRJdGVtKHNjb3BlLCAnR2V0Q3VzdG9tZXJDb25maWdGcm9tREInLCB7XG4gICAgICAgICAgICBrZXk6IHtcbiAgICAgICAgICAgIHBrOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5wYXJhbXMuY3VzdG9tZXIuem9uZScpKSxcbiAgICAgICAgICAgIHNrOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5wYXJhbXMuY3VzdG9tZXIuY3VzdG9tZXJQcmVmaXgnKSksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGFibGU6IHByb3BzLmN1c3RvbWVyQ29uZmlnVGFibGUsXG4gICAgICAgICAgICBjb21tZW50OiBcIlJldHJpZXZlIGN1c3RvbWVyIGFjY291bnQgY29uZmlndXJhdGlvbiBmcm9tIFRPRiBEeW5hbW8gREIgdGFibGVcIixcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLmNvbmZpZy5jdXN0b21lcicsXG4gICAgICAgIH0pO1xuICAgICAgICBHZXRDdXN0b21lckNvbmZpZ0Zyb21EQi5hZGRDYXRjaChjY2hFeGVjdXRpb25GYWlsZWQsIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBjdXN0b20gZXJyb3IgdGhyb3duIGZyb20gV3JpdGVUZW1wbGF0ZVRvUzMgY29kZWJ1aWxkIHByb2plY3QuICBDdXJyZW50bHkgb25seVxuICAgICAgICAvLyBoYW5kbGUgMTAxIGZvciBhIHRlbXBsYXRlIGZpbGUgbm90IGZvdW5kIGVycm9yLlxuICAgICAgICBjb25zdCByYWlzZVdyaXRlVGVtcGxhdGVUb1MzRXJyb3IgPSBuZXcgc2ZuLlBhc3Moc2NvcGUsICdSYWlzZVdyaXRlVGVtcGxhdGVUb1MzRXJyb3InLCB7XG4gICAgICAgICAgICBwYXJhbWV0ZXJzOiB7IFwiRXJyb3JcIjogXCJDQ0hFcnJvclwiLCBcIkNhdXNlXCIgOiBcIkNvdWxkIG5vdCByZXRyaWV2ZSB0ZW1wbGF0ZSBmaWxlIGZyb20gQ29kZUNvbW1pdFwiIH0gLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InLFxuICAgICAgICAgIH0pLm5leHQoY2NoRXhlY3V0aW9uRmFpbGVkKVxuXG4gICAgICAgIGNvbnN0IGNoZWNrV3JpdGVUZW1wbGF0ZVRvUzNFeGl0Q29kZSA9IG5ldyBzZm4uQ2hvaWNlKHNjb3BlLCAnY2hlY2tXcml0ZVRlbXBsYXRlVG9TM0V4aXRDb2RlJylcbiAgICAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5zdHJpbmdNYXRjaGVzKCckLmVycm9yLkNhdXNlJywgJypSZWFzb246IGV4aXQgc3RhdHVzIDEwMSonKSwgcmFpc2VXcml0ZVRlbXBsYXRlVG9TM0Vycm9yKVxuICAgICAgICAub3RoZXJ3aXNlKGNjaEV4ZWN1dGlvbkZhaWxlZClcblxuICAgICAgICAvL0RlZmluZSByZWFkIFMzIGZ1bmN0aW9uXG4gICAgICAgIGNvbnN0IHJlYWRTMyA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2Uoc2NvcGUsICdSZWFkVGVtcGxhdGVGaWxlRnJvbVMzJywge1xuICAgICAgICAgICAgbGFtYmRhRnVuY3Rpb246IHByb3BzLnJlYWRTMyxcbiAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAgICAgaW5wdXQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5wYXJhbXMnKSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnRlbXBsYXRlJyksXG4gICAgICAgICAgICAgICAgY29uZmlnOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQuY29uZmlnJylcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgcGF5bG9hZFJlc3BvbnNlT25seTogdHJ1ZSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLmRhdGEnXG4gICAgICAgIH0pXG4gICAgICAgIHJlYWRTMy5hZGRDYXRjaChjY2hFeGVjdXRpb25GYWlsZWQsIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy9EZWZpbmUgdmFsaWRhdGUgdGVtcGxhdGUgZGVwZW5kZW5jaWVzIGZ1bmN0aW9uXG4gICAgICAgIGNvbnN0IHZhbGlkYXRlVGVtcGxhdGVEZXBlbmRlbmNpZXMgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHNjb3BlLCAndmFsaWRhdGVUZW1wbGF0ZURlcGVuZGVuY2llcycsIHtcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiBwcm9wcy52YWxpZGF0ZVRlbXBsYXRlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgICAgcGF5bG9hZDogc2ZuLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgICAgICAgICBpbnB1dDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnBhcmFtcycpLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQudGVtcGxhdGUnKSxcbiAgICAgICAgICAgICAgICBjb25maWc6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5jb25maWcnKVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBwYXlsb2FkUmVzcG9uc2VPbmx5OiB0cnVlLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQucGFyYW1zLmN1c3RvbS5GQ0NILkZDQ0hfZGVwZW5kZW5jaWVzJ1xuICAgICAgICB9KVxuICAgICAgICB2YWxpZGF0ZVRlbXBsYXRlRGVwZW5kZW5jaWVzLmFkZENhdGNoKGNjaEV4ZWN1dGlvbkZhaWxlZCwge1xuICAgICAgICAgICAgZXJyb3JzOiBbc2ZuLkVycm9ycy5UQVNLU19GQUlMRUQsIHNmbi5FcnJvcnMuVElNRU9VVF0sXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5lcnJvcidcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFsaWRhdGVUZW1wbGF0ZURlcGVuZGVuY2llcy5uZXh0KHJlYWRTMyk7XG4gICAgICAgIFxuICAgICAgICAvL0RlZmluZSBTZXRFbnZQcmVmaXhcbiAgICAgICAgY29uc3Qgc2V0RW52UHJlZml4ID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZShzY29wZSwgJ1NldEVudlByZWZpeCcsIHtcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiBwcm9wcy5zZXRFbnZQcmVmaXgsXG4gICAgICAgICAgICBwYXlsb2FkOiBzZm4uVGFza0lucHV0LmZyb21PYmplY3Qoe1xuICAgICAgICAgICAgICAgIGlucHV0OiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQucGFyYW1zJyksXG4gICAgICAgICAgICAgICAgZGF0YTogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLmRhdGEnKSxcbiAgICAgICAgICAgICAgICBlbnZpcm9ubWVudDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLmVudmlyb25tZW50JylcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgcGF5bG9hZFJlc3BvbnNlT25seTogdHJ1ZSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLmRhdGEnXG4gICAgICAgIH0pXG4gICAgICAgIHJlYWRTMy5hZGRDYXRjaChjY2hFeGVjdXRpb25GYWlsZWQsIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vRGVmaW5lIEdldFNpemVcbiAgICAgICAgY29uc3QgZ2V0U2l6ZSA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2Uoc2NvcGUsICdHZXROdW1iZXJPZlN0YWdlcycsIHtcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiBwcm9wcy5nZXRTaXplLFxuICAgICAgICAgICAgcGF5bG9hZDogc2ZuLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgICAgICAgICBpbnB1dDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnBhcmFtcycpLFxuICAgICAgICAgICAgICAgIGRhdGE6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5kYXRhJylcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgcGF5bG9hZFJlc3BvbnNlT25seTogdHJ1ZSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLml0ZXJhdG9yJyxcbiAgICAgICAgfSkgICAgIFxuICAgICAgICBcbiAgICAgICAgLy9EZWZpbmUgaXRlcmF0b3JcbiAgICAgICAgY29uc3QgaXRlcmF0ZUNvdW50ID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZShzY29wZSwgJ0l0ZXJhdGVTdGFnZXMnLCB7XG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMuaXRlcmF0ZSxcbiAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAgICAgaW5kZXg6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5pdGVyYXRvci5pbmRleCcpLFxuICAgICAgICAgICAgICAgIHN0ZXA6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5pdGVyYXRvci5zdGVwJyksXG4gICAgICAgICAgICAgICAgY291bnQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5pdGVyYXRvci5jb3VudCcpLFxuICAgICAgICAgICAgICAgIGRhdGE6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5kYXRhJyksXG4gICAgICAgICAgICAgICAgaW5wdXQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5wYXJhbXMnKVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBwYXlsb2FkUmVzcG9uc2VPbmx5OiB0cnVlLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuaXRlcmF0b3InXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy9EZWZpbmUgZXhlY3V0aW9uIGZhaWxlZCB0YXNrXG4gICAgICAgIGNvbnN0IGV4ZWN1dGlvbkZhaWxlZFRhc2sgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHNjb3BlLCAnRXhlY3V0aW9uRmFpbHVyZScsIHtcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiBwcm9wcy5leGVjdXRpb25GYWlsZWQsXG4gICAgICAgICAgICBwYXlsb2FkOiBzZm4uVGFza0lucHV0LmZyb21PYmplY3Qoe1xuICAgICAgICAgICAgICBwYXlsb2FkOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQnKSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgcGF5bG9hZFJlc3BvbnNlT25seTogdHJ1ZSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckJyxcbiAgICAgICAgfSkubmV4dChjY2hFeGVjdXRpb25GYWlsZWQpO1xuXG4gICAgICAgIC8vVmFsaWRhdGUgdGVtcGxhdGUgZnVuY3Rpb25cbiAgICAgICAgY29uc3QgdmFsaWRhdGVUZW1wbGF0ZSA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2Uoc2NvcGUsICdWYWxpZGF0ZVRlbXBsYXRlJywge1xuICAgICAgICAgICAgbGFtYmRhRnVuY3Rpb246IHByb3BzLnZhbGlkYXRlVGVtcGxhdGUsXG4gICAgICAgICAgICBwYXlsb2FkOiBzZm4uVGFza0lucHV0LmZyb21PYmplY3Qoe1xuICAgICAgICAgICAgICAgIGlucHV0OiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQucGFyYW1zJyksXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC50ZW1wbGF0ZScpXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHBheWxvYWRSZXNwb25zZU9ubHk6IHRydWUsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC50ZW1wbGF0ZScsXG4gICAgICAgIH0pXG4gICAgICAgIHZhbGlkYXRlVGVtcGxhdGUuYWRkQ2F0Y2goY2NoRXhlY3V0aW9uRmFpbGVkLCB7XG4gICAgICAgICAgICBlcnJvcnM6IFtzZm4uRXJyb3JzLlRBU0tTX0ZBSUxFRCwgc2ZuLkVycm9ycy5USU1FT1VUXSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLmVycm9yJ1xuICAgICAgICB9KTtcblxuICAgICAgICAvL0RlZmluZSBhIHRhc2sgdG8gcnVuIEN1c3RvbWVyIEFjY291bnQgQ29kZUJ1aWxkIHJldHJpZXZhbCBwcm9qZWN0XG4gICAgICAgIGNvbnN0IFdyaXRlVGVtcGxhdGVUb1MzID0gbmV3IHRhc2tzLkNvZGVCdWlsZFN0YXJ0QnVpbGQoc2NvcGUsIFwiV3JpdGVUZW1wbGF0ZVRvUzNcIiwge1xuICAgICAgICAgICAgcHJvamVjdDogcHJvcHMuY29kZUJ1aWxkUGFja2FnZUN1c3RvbWVyLFxuICAgICAgICAgICAgY29tbWVudDogXCJTdGFydHMgdGhlIENvZGVCdWlsZCBwcm9qZWN0IHJldHJpZXZlIHRoZSB0ZW1wbGF0ZSBmaWxlIGZyb20gdGhlIGN1c3RvbWVyIHJlcG8gYW5kIHdyaXRlIGl0IHRvIFMzXCIsXG4gICAgICAgICAgICBpbnRlZ3JhdGlvblBhdHRlcm46IHNmbi5JbnRlZ3JhdGlvblBhdHRlcm4uUlVOX0pPQixcbiAgICAgICAgICAgIGVudmlyb25tZW50VmFyaWFibGVzT3ZlcnJpZGU6IHtcbiAgICAgICAgICAgIENPREVfQlJBTkNIOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQuY29uZmlnLmN1c3RvbWVyLkl0ZW0uY29uZmlnLk0uY29uZmlnQnJhbmNoLlNcIilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBDT0RFX1JFUE9TSVRPUlk6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC5jb25maWcuY3VzdG9tZXIuSXRlbS5jb25maWcuTS5jb25maWdSZXBvLlNcIilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBDT0RFX0FDQ09VTlQ6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC5jb25maWcuY3VzdG9tZXIuSXRlbS5jb25maWcuTS5jb25maWdBY2NvdW50LlNcIilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBDT0RFX1JFR0lPTjoge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkLmNvbmZpZy5jdXN0b21lci5JdGVtLmNvbmZpZy5NLmNvbmZpZ1JlZ2lvbi5TXCIpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgQ1VTVE9NRVJfTkFNRToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkLmNvbmZpZy5jdXN0b21lci5JdGVtLmNvbmZpZy5NLmN1c3RvbWVyUHJlZml4LlNcIilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBDVVNUT01FUl9DT05GSUdfRklMRToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkLnRlbXBsYXRlLmZpbGVcIilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBBUlRJRkFDVF9CVUNLRVRfTkFNRToge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9wcy5hcnRpZmFjdEJ1Y2tldC5idWNrZXROYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgQlVDS0VUX1BBVEg6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogYnVja2V0Rm9sZGVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgQ09ERV9ST0xFOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHByb3BzLnJlcG9Sb2xlTmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFRBUkdFVF9BQ0NPVU5UOiB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQuY29uZmlnLmN1c3RvbWVyLkl0ZW0uY29uZmlnLk0uYWNjb3VudC5TXCIpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgVEFSR0VUX1JPTEU6IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogcHJvcHMuZGVwbG95Um9sZU5hbWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gTm9uZSBvZiB0aGlzIGlzIGN1cnJlbnRseSB1c2VkIGluIGZsb3csIHNvIGRpc2NhcmQgcmVzdWx0cy5cbiAgICAgICAgICAgIHJlc3VsdFBhdGg6IHNmbi5Kc29uUGF0aC5ESVNDQVJEXG4gICAgICAgIH0pO1xuXG4gICAgICAgIFdyaXRlVGVtcGxhdGVUb1MzLmFkZENhdGNoKGNoZWNrV3JpdGVUZW1wbGF0ZVRvUzNFeGl0Q29kZSAsIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGhhdmUgYSBORVhUIGZvciBGQ0VORy0xMjY2MFxuICAgICAgICBXcml0ZVRlbXBsYXRlVG9TMy5uZXh0KHZhbGlkYXRlVGVtcGxhdGUpO1xuXG4gICAgICAgIC8vRGVmaW5lIERvbmVcbiAgICAgICAgY29uc3QgZG9uZSA9IG5ldyBzZm4uUGFzcyhzY29wZSwgXCJEb25lXCIpXG5cbiAgICAgICAgLy9EZWZpbmUgU3VjY2Vzc1xuICAgICAgICBjb25zdCBzdWNjZXNzID0gbmV3IHNmbi5QYXNzKHNjb3BlLCBcIlN1Y2Nlc3NcIilcblxuICAgICAgICAvL0RlZmluZSBGYWlsdXJlXG4gICAgICAgIGNvbnN0IGZhaWx1cmUgPSBuZXcgc2ZuLkZhaWwoc2NvcGUsIFwiRmFpbHVyZVwiKVxuICAgICAgICBzdWNjZXNzLm5leHQoY2NoRXhlY3V0aW9uQ29tcGxldGVkKVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgdGVtcGxhdGUgd2FzIGNvcGllZCB0byBTMyBwcmlvciB0byBDQ0ggZXhlY3V0aW9uLCBza2lwIFdyaXRlVGVtcGxhdGVUb1MzIHRhc2suIChGQ0VORy0xMjY2MCkgICAgICAgIFxuICAgICAgICBjb25zdCBSZXRyaWV2ZUZDUkNvbmZpZyA9IG5ldyBzZm4uQ2hvaWNlKHNjb3BlLCAnUmV0cmlldmVUZW1wbGF0ZUZyb21SZXBvc2l0b3J5JylcbiAgICAgICAgLndoZW4oXG4gICAgICAgICAgICBzZm4uQ29uZGl0aW9uLmlzUHJlc2VudChcIiQucGFyYW1zLmN1c3RvbS5ldmVudERhdGFcIiksXG4gICAgICAgICAgICB2YWxpZGF0ZVRlbXBsYXRlXG4gICAgICAgICAgKVxuICAgICAgICAgIC53aGVuKFxuICAgICAgICAgICAgc2ZuLkNvbmRpdGlvbi5pc05vdFByZXNlbnQoXCIkLnBhcmFtcy5jdXN0b20uZXZlbnREYXRhXCIpLFxuICAgICAgICAgICAgV3JpdGVUZW1wbGF0ZVRvUzNcbiAgICAgICAgICApXG4gICAgICAgICAgLm90aGVyd2lzZShmYWlsdXJlKTtcbiBcbiAgICAgICAgLy9HZXQgVE9GIHN0YXRlIG1hY2hpbmUgcmVmZXJlbmNlXG4gICAgICAgIGNvbnN0IFRPRmFybiA9IGBhcm46YXdzOnN0YXRlczoke3Byb3BzLnJlZ2lvbn06JHtwcm9wcy5jdXN0b21lckFjY291bnR9OnN0YXRlTWFjaGluZToke3Byb3BzLmluc3RhbmNlTmFtZX0tQ2VudHJhbE9yY2hlc3RyYXRpb25Xb3JrZmxvd2BcbiAgICAgICAgY29uc3QgVE9GID0gc2ZuLlN0YXRlTWFjaGluZS5mcm9tU3RhdGVNYWNoaW5lQXJuKHNjb3BlLCAnVE9GSW5zdGFuY2UnLCBUT0Zhcm4pXG5cbiAgICAgICAgLy9WYWxpZGF0ZSBUT0YgdmVyc2lvbiBmdW5jdGlvblxuICAgICAgICBjb25zdCB2YWxpZGF0ZVRPRiA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2Uoc2NvcGUsICdWYWxpZGF0ZVRPRlZlcnNpb24nLCB7XG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMudmFsaWRhdGVUT0YsXG4gICAgICAgICAgICBwYXlsb2FkUmVzcG9uc2VPbmx5OiB0cnVlLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQudG9mJyxcbiAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAgICAgYXJuOiBUT0Zhcm4sXG4gICAgICAgICAgICAgICAgaW5wdXQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5wYXJhbXMnKSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIHZhbGlkYXRlVE9GLmFkZENhdGNoKGNjaEV4ZWN1dGlvbkZhaWxlZCwge1xuICAgICAgICAgICAgZXJyb3JzOiBbc2ZuLkVycm9ycy5UQVNLU19GQUlMRUQsIHNmbi5FcnJvcnMuVElNRU9VVF0sXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5lcnJvcidcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgdmFsaWRhdGVFbWFpbHMgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHNjb3BlLCAndmFsaWRhdGVFbWFpbHMnLCB7XG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMudmFsaWRhdGVFbWFpbHMsXG4gICAgICAgICAgICBwYXlsb2FkOiBzZm4uVGFza0lucHV0LmZyb21PYmplY3Qoe1xuICAgICAgICAgICAgICAgIGlucHV0OiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQucGFyYW1zJyksXG4gICAgICAgICAgICAgICAgY29uZmlnOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQuY29uZmlnJylcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgcGF5bG9hZFJlc3BvbnNlT25seTogdHJ1ZSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLm91dHB1dCcsXG4gICAgICAgIH0pXG4gICAgICAgIHZhbGlkYXRlRW1haWxzLmFkZENhdGNoKGNjaEV4ZWN1dGlvbkZhaWxlZCwge1xuICAgICAgICAgICAgZXJyb3JzOiBbc2ZuLkVycm9ycy5UQVNLU19GQUlMRUQsIHNmbi5FcnJvcnMuVElNRU9VVF0sXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5lcnJvcidcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gV2hlbiB3ZSBydW4gQ0NIIGluIHZhbGlkYXRpb25Nb2RlPXRydWUsIHRoaXMgdGFzayB3aWxsIGJlIHVzZWQgdG8gc2V0IG5vLW9wXG4gICAgICAgIC8vIHBhcmFtcy4gVGhpcyB3aWxsIGJlIHVzZWQgdG8gZ2V0IHZhbGlkYXRpb24gZXJyb3Igc3VtbWFyeSBmcm9tIFRPRi5cbiAgICAgICAgY29uc3Qgc2V0Tm9PcFBhcmFtcyA9IG5ldyBzZm4uUGFzcyhzY29wZSwgJ1NldE5vT3BQYXJhbXMnLCB7XG4gICAgICAgICAgICBpbnB1dFBhdGg6IFwiJFwiLFxuICAgICAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICdhcHAnIDogXCJcIixcbiAgICAgICAgICAgICAgICAnY29tbWFuZCcgOiBcIm5vLW9wXCIsXG4gICAgICAgICAgICAgICAgJ3ZlcnNpb24nIDogXCJcIixcbiAgICAgICAgICAgICAgICAndXNlUGFja2FnZWQnOiB0cnVlLFxuICAgICAgICAgICAgICAgICdtYW51YWxBcHByb3ZhbFJlcXVpcmVkJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAndmFsaWRhdGlvbk1vZGUnOiB0cnVlLFxuICAgICAgICAgICAgICAgICdleGVjdXRpb25OYW1lJyA6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5kYXRhLk5vT3BFeGVjdXRpb25OYW1lJyksXG4gICAgICAgICAgICAgICAgJ2N1c3RvbScgOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZW1haWxDb250ZW50XCIgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1lc3NhZ2UuJFwiOiBcIlN0YXRlcy5Gb3JtYXQoJ1BsZWFzZSBmaW5kIHRoZSBUT0YgdmFsaWRhdGlvbiBlcnJvcnMgb2YgQ0NIIEV4ZWN1dGlvbiBOYW1lOiB7fSB3aXRoIFRlbXBsYXRlOiB7fScsIFN0YXRlcy5BcnJheUdldEl0ZW0oU3RhdGVzLlN0cmluZ1NwbGl0KCQucGFyYW1zLmN1c3RvbS5GQ0NILkZDQ0hfRXhlY3V0aW9uLCAnOicpLCA3KSwgJC5wYXJhbXMuY3VzdG9tLkZDQ0guRkNDSF9JbnB1dC50ZW1wbGF0ZSlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXBwXCI6IFwiXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZlcnNpb25cIjogXCJcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIkZDQ0hcIiA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiRkNDSF9JbnN0YW5jZVwiOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkJC5TdGF0ZU1hY2hpbmVcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICBcIkZDQ0hfRXhlY3V0aW9uXCI6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLkV4ZWN1dGlvbi5JZFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiRkNDSF9JbnB1dFwiOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkJC5FeGVjdXRpb24uSW5wdXRcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICBcIkZDQ0hfRmluYWxfRXhlY3V0aW9uXCI6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJ2N1c3RvbWVyJyA6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5wYXJhbXMuY3VzdG9tZXInKVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbW1lbnQ6IFwiQWRkIG5vLW9wIHBhcmFtcyBpbnRvIHBheWxvYWRcIixcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLm5vT3AnXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gY29uc3QgY2hlY2tFbnZMaXN0T3JQcmVmaXggPSBuZXcgc2ZuLkNob2ljZShzY29wZSwgJ0NoZWNrRW52TGlzdE9yUHJlZml4Jyk7XG5cbiAgICAgICAgLy8gVGhpcyB0YXNrIHdpbGwgYmUgdXNlZCB0byBzZXQgbm8tb3BcbiAgICAgICAgLy8gcGFyYW1zLiBUaGlzIHdpbGwgYmUgdXNlZCB0byBwYWNrYWdlIGN1c3RvbWVyIGNvbmZpZ3VyYXRpb24uXG4gICAgICAgIGNvbnN0IHNldE5vT3BQYXJhbXNFbnZMaXN0ID0gbmV3IHNmbi5QYXNzKHNjb3BlLCAnU2V0Tm9PcFBhcmFtcy1FbnZMaXN0Jywge1xuICAgICAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAnYXBwJzogXCJcIixcbiAgICAgICAgICAgICAgJ2NvbW1hbmQnOiBcIm5vLW9wXCIsXG4gICAgICAgICAgICAgICd2ZXJzaW9uJzogXCJcIixcbiAgICAgICAgICAgICAgJ3BhY2thZ2VPbmx5JzogdHJ1ZSxcbiAgICAgICAgICAgICAgJ2V4ZWN1dGlvbk5hbWUnOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQuZGF0YS5QYWNrYWdlRXhlY3V0aW9uTmFtZScpLFxuICAgICAgICAgICAgICAnY3VzdG9tZXInOiB7XG4gICAgICAgICAgICAgICAgJ2N1c3RvbWVyUHJlZml4Jzogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnBhcmFtcy5jdXN0b21lci5jdXN0b21lclByZWZpeCcpLFxuICAgICAgICAgICAgICAgICd6b25lJzogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnBhcmFtcy5jdXN0b21lci56b25lJyksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICdlbnZMaXN0Jzogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnBhcmFtcy5lbnZMaXN0JyksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQucGFja2FnZUN1c3RvbWVyJ1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IHNldFBhY2thZ2VOb09wUGFyYW1zID0gbmV3IHNmbi5QYXNzKHNjb3BlLCAnc2V0UGFja2FnZU5vT3BQYXJhbXMnLCB7XG4gICAgICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICdhcHAnOiBcIlwiLFxuICAgICAgICAgICAgICAnY29tbWFuZCc6IFwibm8tb3BcIixcbiAgICAgICAgICAgICAgJ3ZlcnNpb24nOiBcIlwiLFxuICAgICAgICAgICAgICAncGFja2FnZU9ubHknOiB0cnVlLFxuICAgICAgICAgICAgICAnZXhlY3V0aW9uTmFtZSc6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5kYXRhLlBhY2thZ2VFeGVjdXRpb25OYW1lJyksXG4gICAgICAgICAgICAgICdjdXN0b21lcic6IHtcbiAgICAgICAgICAgICAgICAnY3VzdG9tZXJQcmVmaXgnOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQucGFyYW1zLmN1c3RvbWVyLmN1c3RvbWVyUHJlZml4JyksXG4gICAgICAgICAgICAgICAgJ3pvbmUnOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQucGFyYW1zLmN1c3RvbWVyLnpvbmUnKSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLnBhY2thZ2VDdXN0b21lcidcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIFRoaXMgdGFzayB3aWxsIGJlIHVzZWQgdG8gaW52b2tlIFRPRiBvbmx5IGZvciBwYWNrZ2UgY3VzdG9tZXIgY29uZmlnLlxuICAgICAgICAvLyBUaGlzIHRhc2sgd2lsbCBzdWJtaXQgbm8tb3AgcGFyYW1zIHNldCBieSAnc2V0UGFja2FnZU5vT3BQYXJhbXMnIHRvIFRPRi5cbiAgICAgICAgY29uc3QgcGFja2FnZUN1c3RvbWVyVGFza0xpc3QgPSBuZXcgdGFza3MuU3RlcEZ1bmN0aW9uc1N0YXJ0RXhlY3V0aW9uKHNjb3BlLCAnUGFja2FnZUN1c3RvbWVyVGFza1dpdGhFbnZMaXN0Jywge1xuICAgICAgICAgICAgc3RhdGVNYWNoaW5lOiBUT0YsXG4gICAgICAgICAgICBpbnB1dFBhdGg6ICckLnBhY2thZ2VDdXN0b21lcicsXG4gICAgICAgICAgICBuYW1lOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQuZXhlY3V0aW9uTmFtZScpLFxuICAgICAgICAgICAgaW50ZWdyYXRpb25QYXR0ZXJuOiBzZm4uSW50ZWdyYXRpb25QYXR0ZXJuLlJVTl9KT0IsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5vdXRwdXQnLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAvLyBUaGlzIHRhc2sgd2lsbCBiZSB1c2VkIHRvIGludm9rZSBUT0Ygb25seSBmb3IgcGFja2dlIGN1c3RvbWVyIGNvbmZpZy5cbiAgICAgICAgLy8gVGhpcyB0YXNrIHdpbGwgc3VibWl0IG5vLW9wIHBhcmFtcyBzZXQgYnkgJ3NldFBhY2thZ2VOb09wUGFyYW1zJyB0byBUT0YuXG4gICAgICAgICAgY29uc3QgcGFja2FnZUN1c3RvbWVyVGFzayA9IG5ldyB0YXNrcy5TdGVwRnVuY3Rpb25zU3RhcnRFeGVjdXRpb24oc2NvcGUsICdQYWNrYWdlQ3VzdG9tZXJUYXNrJywge1xuICAgICAgICAgICAgc3RhdGVNYWNoaW5lOiBUT0YsXG4gICAgICAgICAgICBpbnB1dFBhdGg6ICckLnBhY2thZ2VDdXN0b21lcicsXG4gICAgICAgICAgICBuYW1lOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQuZXhlY3V0aW9uTmFtZScpLFxuICAgICAgICAgICAgaW50ZWdyYXRpb25QYXR0ZXJuOiBzZm4uSW50ZWdyYXRpb25QYXR0ZXJuLlJVTl9KT0IsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5vdXRwdXQnLFxuICAgICAgICAgIH0pO1xuXG4gICAgICBcbiAgICAgICAgLy8gLm90aGVyd2lzZShzZXROb09wUGFyYW1zX0VudlByZWZpeC5uZXh0KHBhY2thZ2VDdXN0b21lclRhc2spKTsgLy8gb3IgaGFuZGxlIGRpZmZlcmVudGx5XG5cbiAgICAgICAgcGFja2FnZUN1c3RvbWVyVGFzay5hZGRDYXRjaChjY2hFeGVjdXRpb25GYWlsZWQsIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pOyAgICAgIFxuXG4gICAgICAgIC8vRGVmaW5lIHRhc2sgdG8gaGFuZGxlIGhhbmRsZSBzZXJpYWwgYW5kIHBhcmFsbGVsIHRhc2tzIGZhaWx1cmVzLlxuICAgICAgICBjb25zdCBoYW5kbGVGYWlsdXJlID0gbmV3IHNmbi5QYXNzKHNjb3BlLCAnSGFuZGxlRmFpbHVyZScsIHtcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6ICB7XG4gICAgICAgICAgICAgICAgXCJlbnZpcm9ubWVudFwiOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkLmVudmlyb25tZW50XCIpLFxuICAgICAgICAgICAgICAgIFwiZXJyb3IuJFwiOiBcIlN0YXRlcy5TdHJpbmdUb0pzb24oJC5lcnJvci5DYXVzZSlcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbW1lbnQ6IFwiQWRkIGN1c3RvbSBGQ0NIX0luc3RhbmNlIHRvIHBheWxvYWRcIixcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLmZhaWxlZFRhc2snLFxuICAgICAgICAgICAgb3V0cHV0UGF0aDogJyQuZmFpbGVkVGFzaydcbiAgICAgICAgfSlcblxuICAgICAgICAvL0RlZmluZSBFeGVjdXRlVE9GXG4gICAgICAgIGNvbnN0IEV4ZWN1dGVUT0YgPSBuZXcgc2ZuLk1hcChzY29wZSwgJ2V4ZWN1dGVUT0ZNYXAnLCB7XG4gICAgICAgICAgICBpbnB1dFBhdGg6ICckLml0ZXJhdG9yLnN0YWdlcy50YXNrcycsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5vdXRwdXQnLFxuICAgICAgICAgICAgbWF4Q29uY3VycmVuY3k6IDFcbiAgICAgICAgfSlcblxuICAgICAgICBFeGVjdXRlVE9GLmFkZENhdGNoKGhhbmRsZUZhaWx1cmUsIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pO1xuXG4gICAgICAgIEV4ZWN1dGVUT0YuaXRlcmF0b3IobmV3IHRhc2tzLlN0ZXBGdW5jdGlvbnNTdGFydEV4ZWN1dGlvbihzY29wZSwgJ2V4ZWN1dGVUT0YnLCB7XG4gICAgICAgICAgICBzdGF0ZU1hY2hpbmU6IFRPRixcbiAgICAgICAgICAgIGlucHV0UGF0aDogJyQucGFyYW1zJyxcbiAgICAgICAgICAgIG5hbWUgOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQuZXhlY3V0aW9uTmFtZScpLFxuICAgICAgICAgICAgaW50ZWdyYXRpb25QYXR0ZXJuOiBzZm4uSW50ZWdyYXRpb25QYXR0ZXJuLlJVTl9KT0JcbiAgICAgICAgfSkpLm5leHQoaXRlcmF0ZUNvdW50KVxuXG4gICAgICAgICAvL0RlZmluZSBFeGVjdXRlVE9GIGluIHBhcmFsbGVsXG4gICAgICAgICBjb25zdCBFeGVjdXRlVE9GUGFyYWxsZWwgPSBuZXcgc2ZuLk1hcChzY29wZSwgJ2V4ZWN1dGVUT0ZNYXBQYXJhbGxlbCcsIHtcbiAgICAgICAgICAgIGlucHV0UGF0aDogJyQuaXRlcmF0b3Iuc3RhZ2VzLnRhc2tzJyxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLm91dHB1dCcsXG4gICAgICAgICAgICBtYXhDb25jdXJyZW5jeTogcHJvcHMubWF4Q29uY3VycmVuY3lcbiAgICAgICAgfSlcbiAgICAgICAgRXhlY3V0ZVRPRlBhcmFsbGVsLmFkZENhdGNoKGhhbmRsZUZhaWx1cmUsIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pO1xuICAgICAgICBoYW5kbGVGYWlsdXJlLm5leHQoZG9uZSk7XG4gICAgICAgIEV4ZWN1dGVUT0ZQYXJhbGxlbC5pdGVyYXRvcihuZXcgdGFza3MuU3RlcEZ1bmN0aW9uc1N0YXJ0RXhlY3V0aW9uKHNjb3BlLCAnZXhlY3V0ZVRPRlBhcmFsbGVsJywge1xuICAgICAgICAgICAgc3RhdGVNYWNoaW5lOiBUT0YsXG4gICAgICAgICAgICBpbnB1dFBhdGg6ICckLnBhcmFtcycsXG4gICAgICAgICAgICBuYW1lIDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLmV4ZWN1dGlvbk5hbWUnKSxcbiAgICAgICAgICAgIGludGVncmF0aW9uUGF0dGVybjogc2ZuLkludGVncmF0aW9uUGF0dGVybi5SVU5fSk9CXG4gICAgICAgIH0pKS5uZXh0KGl0ZXJhdGVDb3VudClcblxuICAgICAgICBjb25zdCBpc1BhcmFsbGVsID0gbmV3IHNmbi5DaG9pY2Uoc2NvcGUsIFwiSXNTdGFnZVBhcmFsbGVsXCIgKVxuICAgICAgICAud2hlbihzZm4uQ29uZGl0aW9uLmJvb2xlYW5FcXVhbHMoJyQuaXRlcmF0b3Iuc3RhZ2VzLnBhcmFsbGVsJywgdHJ1ZSksIEV4ZWN1dGVUT0ZQYXJhbGxlbClcbiAgICAgICAgLm90aGVyd2lzZShFeGVjdXRlVE9GKVxuXG4gICAgICAgIC8vY2hlY2sgaWYgdmFsaWRhdGlvbk1vZGUgZmxhZyBpcyB0cnVlIGFuZCBydW4gdmFsaWRhdGVEZXBlbmRlbmNpZXMgaWYgdHJ1ZVxuICAgICAgICBjb25zdCBDaGVja1ZhbGlkYXRpb25Nb2RlID0gbmV3IHNmbi5DaG9pY2Uoc2NvcGUsIFwiQ2hlY2tWYWxpZGF0aW9uTW9kZVwiKVxuICAgICAgICAud2hlbihzZm4uQ29uZGl0aW9uLmFuZChcbiAgICAgICAgICAgIHNmbi5Db25kaXRpb24uaXNQcmVzZW50KCckLnBhcmFtcy52YWxpZGF0aW9uTW9kZScpLCBcbiAgICAgICAgICAgIHNmbi5Db25kaXRpb24uYm9vbGVhbkVxdWFscygnJC5wYXJhbXMudmFsaWRhdGlvbk1vZGUnLCB0cnVlKSksIHZhbGlkYXRlVGVtcGxhdGVEZXBlbmRlbmNpZXMpXG4gICAgICAgIC5vdGhlcndpc2UocmVhZFMzKVxuXG4gICAgICAgIC8vIFdoZW4gd2UgcnVuIENDSCBpbiB2YWxpZGF0aW9uTW9kZT10cnVlLCB0aGlzIHRhc2sgd2lsbCBiZSB1c2VkIHRvIGdldFxuICAgICAgICAvLyB2YWxpZGF0aW9uIGVycm9yIHN1bW1hcnkgZnJvbSBUT0YuIFRoaXMgdGFzayB3aWxsIHN1Ym1pdCBuby1vcCBwYXJhbXMgc2V0IGJ5ICdzZXROb09wUGFyYW1zJyB0byBUT0YuXG4gICAgICAgIGNvbnN0IGdldFRPRlZhbGlkYXRpb25SZXBvcnQgPSBuZXcgdGFza3MuU3RlcEZ1bmN0aW9uc1N0YXJ0RXhlY3V0aW9uKHNjb3BlLCAnR2V0VE9GVmFsaWRhdGlvblJlcG9ydCcsIHtcbiAgICAgICAgICAgIHN0YXRlTWFjaGluZTogVE9GLFxuICAgICAgICAgICAgaW5wdXRQYXRoOiAnJC5ub09wJyxcbiAgICAgICAgICAgIG5hbWUgOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQuZXhlY3V0aW9uTmFtZScpLFxuICAgICAgICAgICAgaW50ZWdyYXRpb25QYXR0ZXJuOiBzZm4uSW50ZWdyYXRpb25QYXR0ZXJuLlJVTl9KT0JcbiAgICAgICAgfSlcblxuICAgICAgICBjb25zdCBHZXRUT0ZEZXBsb3ltZW50UmVwb3J0ID0gbmV3IHRhc2tzLlN0ZXBGdW5jdGlvbnNTdGFydEV4ZWN1dGlvbihzY29wZSwgJ0dldFRPRkRlcGxveW1lbnRSZXBvcnQnLCB7XG4gICAgICAgICAgICBzdGF0ZU1hY2hpbmU6IFRPRixcbiAgICAgICAgICAgIGlucHV0UGF0aDogJyQubm9PcCcsXG4gICAgICAgICAgICBuYW1lIDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLmV4ZWN1dGlvbk5hbWUnKSxcbiAgICAgICAgICAgIGludGVncmF0aW9uUGF0dGVybjogc2ZuLkludGVncmF0aW9uUGF0dGVybi5SVU5fSk9CXG4gICAgICAgIH0pXG5cbiAgICAgICAgY29uc3QgbG9nUmVwb3J0cyA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2Uoc2NvcGUsICdsb2dSZXBvcnRzJyx7XG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMubG9nVmFsaWRhdGlvblN1bW1hcnksXG4gICAgICAgICAgICBpbnB1dFBhdGg6ICckJyxcbiAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAgICAgaW5wdXQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5JbnB1dCcpXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHBheWxvYWRSZXNwb25zZU9ubHk6IHRydWUsXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5vdXRwdXQnLFxuICAgICAgICB9KVxuXG4gICAgICAgIHNldE5vT3BQYXJhbXMubmV4dChnZXRUT0ZWYWxpZGF0aW9uUmVwb3J0KS5uZXh0KGxvZ1JlcG9ydHMpLm5leHQoZG9uZSk7XG5cbiAgICAgICAgY29uc3Qgc2V0Tm9PcFBhcmFtc1JlcG9ydCA9IG5ldyBzZm4uUGFzcyhzY29wZSwgJ1NldE5vT3BQYXJhbXNSZXBvcnQnLCB7XG4gICAgICAgICAgICBpbnB1dFBhdGg6IFwiJFwiLFxuICAgICAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICdhcHAnIDogXCJcIixcbiAgICAgICAgICAgICAgICAnY29tbWFuZCcgOiBcIm5vLW9wXCIsXG4gICAgICAgICAgICAgICAgJ3ZlcnNpb24nIDogXCJcIixcbiAgICAgICAgICAgICAgICAnbWFudWFsQXBwcm92YWxSZXF1aXJlZCc6IHRydWUsXG4gICAgICAgICAgICAgICAgJ2V4ZWN1dGlvbk5hbWUnIDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLmRhdGEuTm9PcEV4ZWN1dGlvbk5hbWUnKSxcbiAgICAgICAgICAgICAgICAnY3VzdG9tJyA6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJlbWFpbENvbnRlbnRcIiA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWVzc2FnZS4kXCI6IFwiU3RhdGVzLkZvcm1hdCgnUGxlYXNlIGZpbmQgdGhlIENDSCBkZXBsb3ltZW50IHJlcG9ydCBvZiB7fSB3aXRoIFRlbXBsYXRlIHt9JywgU3RhdGVzLkFycmF5R2V0SXRlbShTdGF0ZXMuU3RyaW5nU3BsaXQoJC5wYXJhbXMuY3VzdG9tLkZDQ0guRkNDSF9FeGVjdXRpb24sICc6JyksIDcpLCAkLnBhcmFtcy5jdXN0b20uRkNDSC5GQ0NIX0lucHV0LnRlbXBsYXRlKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhcHBcIjogXCJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmVyc2lvblwiOiBcIlwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwiRkNDSFwiIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJGQ0NIX0luc3RhbmNlXCI6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLlN0YXRlTWFjaGluZVwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiRkNDSF9FeGVjdXRpb25cIjogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJCQuRXhlY3V0aW9uLklkXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJGQ0NIX0lucHV0XCI6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQkLkV4ZWN1dGlvbi5JbnB1dFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiRkNDSF9GaW5hbF9FeGVjdXRpb25cIjogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnY3VzdG9tZXInIDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnBhcmFtcy5jdXN0b21lcicpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29tbWVudDogXCJBZGQgbm8tb3AgcGFyYW1zIGludG8gcGF5bG9hZFwiLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQubm9PcCdcbiAgICAgICAgfSlcblxuICAgICAgICBzZXROb09wUGFyYW1zUmVwb3J0Lm5leHQoR2V0VE9GRGVwbG95bWVudFJlcG9ydCkubmV4dChsb2dSZXBvcnRzKTtcblxuXG4gICAgICAgIC8vIFRoaXMgd2lsbCBkZWNpZGUgd2hldGhlciBUT0YgaGFzIHRvIHNlbmQgdmFsaWRhdGlvbiBcbiAgICAgICAgLy8gYW5kIHJlcG9ydCBzdW1tYXJpZXMgZm9yIENDSCBleGVjdXRpb25zLlxuICAgICAgICBjb25zdCBydW5PcHRpb25zID0gbmV3IHNmbi5DaG9pY2Uoc2NvcGUsIFwiUnVuT3B0aW9uc1wiKVxuICAgICAgICAgICAgLndoZW4oc2ZuLkNvbmRpdGlvbi5hbmQoc2ZuLkNvbmRpdGlvbi5pc1ByZXNlbnQoXCIkLnBhcmFtcy52YWxpZGF0aW9uTW9kZVwiKSxcbiAgICAgICAgICAgICAgICAgIHNmbi5Db25kaXRpb24uYm9vbGVhbkVxdWFscygnJC5wYXJhbXMudmFsaWRhdGlvbk1vZGUnLCB0cnVlKSksIHNldE5vT3BQYXJhbXMpXG4gICAgICAgICAgICAud2hlbihzZm4uQ29uZGl0aW9uLmFuZChzZm4uQ29uZGl0aW9uLmlzUHJlc2VudChcIiQucGFyYW1zLmNjaFJlcG9ydFJlcXVpcmVkXCIpLFxuICAgICAgICAgICAgICAgICAgc2ZuLkNvbmRpdGlvbi5ib29sZWFuRXF1YWxzKCckLnBhcmFtcy5jY2hSZXBvcnRSZXF1aXJlZCcsIHRydWUpKSwgc2V0Tm9PcFBhcmFtc1JlcG9ydClcbiAgICAgICAgICAgIC5vdGhlcndpc2UoZG9uZSlcblxuICAgICAgICAvL0RlZmluZSBJc0NvdW50UmVhY2hlZFxuICAgICAgICBjb25zdCBJc0NvdW50UmVhY2hlZCA9IG5ldyBzZm4uQ2hvaWNlKHNjb3BlLCBcIklzU3RhZ2VDb3VudFJlYWNoZWRcIilcbiAgICAgICAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uYm9vbGVhbkVxdWFscygnJC5pdGVyYXRvci5jb250aW51ZScsIHRydWUpLCBpc1BhcmFsbGVsKVxuICAgICAgICAgICAgLm90aGVyd2lzZShydW5PcHRpb25zKVxuXG4gICAgICAgIC8vRGVmaW5lIGV4ZWN1dGlvbiBmYWlsZWQgdGFza1xuICAgICAgICBjb25zdCBsb2dFbnZFeGVjdXRpb25TdGF0dXMgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHNjb3BlLCAnTG9nRW52RXhlY3V0aW9uU3RhdHVzJywge1xuICAgICAgICAgICAgbGFtYmRhRnVuY3Rpb246IHByb3BzLmxvZ0VudlN0YXR1cyxcbiAgICAgICAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XG4gICAgICAgICAgICAgICAgaW5wdXQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5wYXJhbXMnKSxcbiAgICAgICAgICAgICAgICBlbnZPdXRwdXQ6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5lbnZfb3V0cHV0JylcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgcGF5bG9hZFJlc3BvbnNlT25seTogdHJ1ZSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLmNjaFN0YXR1cycsXG4gICAgICAgIH0pXG5cbiAgICAgICAgbG9nRW52RXhlY3V0aW9uU3RhdHVzLmFkZENhdGNoKGNjaEV4ZWN1dGlvbkZhaWxlZCwge1xuICAgICAgICAgICAgZXJyb3JzOiBbc2ZuLkVycm9ycy5UQVNLU19GQUlMRUQsIHNmbi5FcnJvcnMuVElNRU9VVF0sXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5lcnJvcidcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9EZWZpbmUgQ2hlY2tPdmVyQWxsRXhlY3V0aW9uU3RhdHVzLiBUaGlzIHdpbGwgZGVjaWRlIHdoZXRoZXIgQ0NIIGV4ZWN1dGlvbiBoYXMgdG8gZmFpbC5cbiAgICAgICAgY29uc3QgY2hlY2tDQ0hTdGF0dXMgPSBuZXcgc2ZuLkNob2ljZShzY29wZSwgXCJDaGVja092ZXJBbGxFeGVjdXRpb25TdGF0dXNcIilcbiAgICAgICAgICAgIC53aGVuKHNmbi5Db25kaXRpb24uYW5kKHNmbi5Db25kaXRpb24uaXNQcmVzZW50KFwiJC5jY2hTdGF0dXNcIiksXG4gICAgICAgICAgICAgICAgICBzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5jY2hTdGF0dXMnLCBcIlNVQ0NFU1NcIikpLCBzdWNjZXNzKVxuICAgICAgICAgICAgLm90aGVyd2lzZShjY2hFeGVjdXRpb25GYWlsZWQpXG5cbiAgICAgICAgY29uc3QgZW52TWFwID0gbmV3IHNmbi5NYXAoc2NvcGUsJ0RlcGxveS1FbnYtUGFyYWxsZWwnLCB7XG4gICAgICAgICAgICBpdGVtc1BhdGg6IHNmbi5Kc29uUGF0aC5zdHJpbmdBdCgnJC5kYXRhLmVudkxpc3QnKSxcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICBcInBhcmFtcy4kXCI6IFwiJC5wYXJhbXNcIixcbiAgICAgICAgICAgICAgICBcImRhdGEuJFwiOiBcIiQuZGF0YVwiLFxuICAgICAgICAgICAgICAgIFwiZW52aXJvbm1lbnQuJFwiOiBcIiQkLk1hcC5JdGVtLlZhbHVlXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZW52X291dHB1dCcsXG4gICAgICAgICAgICBtYXhDb25jdXJyZW5jeTogcHJvcHMuZW52Q29uY3VycmVuY3lcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZW52TWFwLmFkZENhdGNoKGV4ZWN1dGlvbkZhaWxlZFRhc2ssIHtcbiAgICAgICAgICAgIGVycm9yczogW3Nmbi5FcnJvcnMuVEFTS1NfRkFJTEVELCBzZm4uRXJyb3JzLlRJTUVPVVRdLFxuICAgICAgICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGVudk1hcC5pdGVyYXRvcihzZXRFbnZQcmVmaXgubmV4dChnZXRTaXplKS5uZXh0KGl0ZXJhdGVDb3VudCkubmV4dChJc0NvdW50UmVhY2hlZCkpXG5cbiAgICAgICAgY29uc3QgZW52RmxvdyA9IGVudk1hcFxuICAgICAgICAubmV4dChsb2dFbnZFeGVjdXRpb25TdGF0dXMpXG4gICAgICAgIC5uZXh0KGNoZWNrQ0NIU3RhdHVzKTtcbiAgICAgIFxuICAgICAgY29uc3QgRW52TGlzdENoZWNrID0gbmV3IHNmbi5DaG9pY2Uoc2NvcGUsICdFbnZMaXN0Q2hlY2snKVxuICAgICAgICAud2hlbihcbiAgICAgICAgICBzZm4uQ29uZGl0aW9uLmlzUHJlc2VudCgnJC5wYXJhbXMuZW52TGlzdCcpLFxuICAgICAgICAgIHNldE5vT3BQYXJhbXNFbnZMaXN0Lm5leHQocGFja2FnZUN1c3RvbWVyVGFza0xpc3QpLm5leHQoZW52RmxvdylcbiAgICAgICAgKVxuICAgICAgICAub3RoZXJ3aXNlKFxuICAgICAgICAgIHNldFBhY2thZ2VOb09wUGFyYW1zLm5leHQocGFja2FnZUN1c3RvbWVyVGFzaykubmV4dChlbnZGbG93KVxuICAgICAgICApXG4gICAgICAgIFxuICAgICAgICAvL1NldCB0aGUgdGFzayBmbG93XG4gICAgICAgIGNvbnN0IGRlZmluaXRpb24gPSBjY2hFeGVjdXRpb25TdGFydGVkXG4gICAgICAgIC5uZXh0KHNldEJ1Y2tldEluZm8pXG4gICAgICAgIC5uZXh0KHNldEZDQ0gpXG4gICAgICAgIC5uZXh0KHZhbGlkYXRlVE9GKVxuICAgICAgICAubmV4dChHZXRDdXN0b21lckNvbmZpZ0Zyb21EQilcbiAgICAgICAgLm5leHQoUmV0cmlldmVGQ1JDb25maWcpO1xuICAgICAgXG4gICAgICAgIHZhbGlkYXRlVGVtcGxhdGVcbiAgICAgICAgICAgIC5uZXh0KHZhbGlkYXRlRW1haWxzKVxuICAgICAgICAgICAgLm5leHQoQ2hlY2tWYWxpZGF0aW9uTW9kZSk7XG4gICAgICAgIFxuICAgICAgICByZWFkUzMubmV4dChjY2hUZW1wbGF0ZVJldHJpZXZlZClcbiAgICAgICAgLm5leHQoRW52TGlzdENoZWNrKSAgICAgXG4gICAgICBcbiAgICAgICAgICAgICBcbiAgICAgICAgLy8gc2V0dXAgYmFzZSBzdGVwIGZ1bmN0aW9uIGNsYXNzXG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwge1xuICAgICAgICAgICAgZGVmaW5pdGlvbkJvZHk6IERlZmluaXRpb25Cb2R5LmZyb21DaGFpbmFibGUoZGVmaW5pdGlvbiksXG4gICAgICAgICAgICBzdGF0ZU1hY2hpbmVOYW1lOiBwcm9wcy5uYW1lLFxuICAgICAgICAgICAgcm9sZTogcHJvcHMuc2ZuUm9sZSxcbiAgICAgICAgICAgIHRyYWNpbmdFbmFibGVkOiBwcm9wcy5sb2dnaW5nLnRyYWNlLFxuICAgICAgICAgICAgbG9nczogcHJvcHMubG9nZ2luZy5jbG91ZHdhdGNoXG4gICAgICAgIH0pOyAgICBcbiAgICB9XG59Il19