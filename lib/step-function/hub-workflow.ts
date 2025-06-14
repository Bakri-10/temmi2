import { aws_stepfunctions as sfn } from 'aws-cdk-lib';
import { aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { aws_codebuild as codebuild } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StateMachineLogsDTO } from '../fineos-cloud-control-hub-logging';
import { DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions';

export interface HubWorkflowProps {
    name: string;
    instanceName: string;
    zone: string;
    region: string;
    customerAccount: string;
    customerConfigTable: dynamodb.ITable;
    iterate: lambda.IFunction;
    getSize: lambda.IFunction;
    readS3: lambda.IFunction;
    eventBusHandler: lambda.IFunction;
    validateTemplateDependencies: lambda.IFunction;
    validateTemplate: lambda.IFunction;
    validateTOF: lambda.IFunction;
    validateEmails: lambda.IFunction,
    logValidationSummary: lambda.IFunction,
    deployRoleName: string;
    repoRoleName: string;
    codeBuildPackageCustomer: codebuild.IProject;
    artifactBucket: s3.IBucket;
    fail: lambda.IFunction;
    executionFailed: lambda.IFunction;
    maxConcurrency: number;
    sfnRole: IRole;
    logging: StateMachineLogsDTO;
    setEnvPrefix:lambda.IFunction;
    logEnvStatus: lambda.IFunction;
    envConcurrency: number;
}

export class HubWorkflow extends sfn.StateMachine {

    constructor(scope: Construct, id: string, props: HubWorkflowProps) {
           
        //Define task to add S3 bucket details to state machine json
        const bucketFolder = "fcch_template";
        const setBucketInfo = new sfn.Pass(scope, 'AddBucketInfoToPayload', {
            inputPath: "$.template",
            parameters: {
                'bucket' : props.artifactBucket.bucketName,
                'folder' : bucketFolder,
                'file' : sfn.JsonPath.stringAt("$")
            },
            comment: "Add bucket and folder details into payload",
            resultPath: '$.template'
        })

        // FCENG-12662: CCH_EXECUTION_FAILED
        const cchExecutionFailed = new tasks.LambdaInvoke(
            scope,
            "ExecutionFailed",
            {
                lambdaFunction: props.eventBusHandler,
                payload: sfn.TaskInput.fromObject({
                status: "CCH_EXECUTION_FAILED",
                component: "CCH",
                payload: sfn.JsonPath.stringAt("$$"),
                sfnInstance: sfn.JsonPath.stringAt("$$.StateMachine"),
                executionId: sfn.JsonPath.stringAt("$$.Execution.Id"),
                executionInput: sfn.JsonPath.stringAt("$$.Execution.Input"),
                errorInfo: sfn.JsonPath.stringAt("$")
                }),
                resultPath: "$.efh.cch.executions.failed",
            }
        );

        //Define Workflow Failure
        const failureTask = new tasks.LambdaInvoke(scope, 'WorkflowFailure', {
            lambdaFunction: props.fail,
            payload: sfn.TaskInput.fromObject({
                payload: sfn.JsonPath.stringAt('$'),
            }),
            payloadResponseOnly: true,
            resultPath: '$.Error',
        });

        cchExecutionFailed.next(failureTask) 

        // FCENG-12662: CCH_EXECUTION_STARTED
        const cchExecutionStarted = new tasks.LambdaInvoke(
            scope,
            "ExecutionStarted",
            {
            lambdaFunction: props.eventBusHandler,
            payload: sfn.TaskInput.fromObject({
                status: "CCH_EXECUTION_STARTED",
                component: "CCH",
                payload: sfn.JsonPath.stringAt("$$"),
                sfnInstance: sfn.JsonPath.stringAt("$$.StateMachine"),
                executionId: sfn.JsonPath.stringAt("$$.Execution.Id"),
                executionInput: sfn.JsonPath.stringAt("$$.Execution.Input"),
            }),
            payloadResponseOnly: true,
            resultPath: "$.efh.cch.executions.started",
            }
        );

        cchExecutionStarted.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });
    
        // FCENG-12662: CCH_TEMPLATE_RETRIEVED
        const cchTemplateRetrieved = new tasks.LambdaInvoke(
            scope,
            "TemplateRetrieved",
            {
            lambdaFunction: props.eventBusHandler,
            payload: sfn.TaskInput.fromObject({
                status: "CCH_TEMPLATE_RETRIEVED",
                component: "CCH",
                payload: sfn.JsonPath.stringAt("$$"),
                sfnInstance: sfn.JsonPath.stringAt("$$.StateMachine"),
                executionId: sfn.JsonPath.stringAt("$$.Execution.Id"),
                executionInput: sfn.JsonPath.stringAt("$$.Execution.Input"),
            }),
            payloadResponseOnly: true,
            resultPath: "$.efh.cch.executions.templateRetrieved",
            }
        );

        cchTemplateRetrieved.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });
    
        // FCENG-12662: CCH_EXECUTION_COMPLETED
        const cchExecutionCompleted = new tasks.LambdaInvoke(
            scope,
            "ExecutionCompleted",
            {
            lambdaFunction: props.eventBusHandler,
            payload: sfn.TaskInput.fromObject({
                status: "CCH_EXECUTION_COMPLETED",
                component: "CCH",
                payload: sfn.JsonPath.stringAt("$$"),
                sfnInstance: sfn.JsonPath.stringAt("$$.StateMachine"),
                executionId: sfn.JsonPath.stringAt("$$.Execution.Id"),
                executionInput: sfn.JsonPath.stringAt("$$.Execution.Input"),
            }),
            resultPath: "$.efh.cch.executions.completed",
            }
        );
    
        cchExecutionCompleted.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        //Define task to add FCCH_Instance, for TOF manual approval email, and FCCH_Execution, for New Relic logging
        const setFCCH = new sfn.Pass(scope, 'AddCustomFCCHToPayload', {
            parameters:  {
                "FCCH_Instance": sfn.JsonPath.stringAt("$$.StateMachine"),
                "FCCH_Execution": sfn.JsonPath.stringAt("$$.Execution.Id"),
                "FCCH_Input": sfn.JsonPath.stringAt("$$.Execution.Input"),
            },
            comment: "Add custom FCCH_Instance to payload",
            resultPath: '$.params.custom.FCCH'
        })
        
        //Define task to get customer account configuration
        const GetCustomerConfigFromDB = new tasks.DynamoGetItem(scope, 'GetCustomerConfigFromDB', {
            key: {
            pk: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.params.customer.zone')),
            sk: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.params.customer.customerPrefix')),
            },
            table: props.customerConfigTable,
            comment: "Retrieve customer account configuration from TOF Dynamo DB table",
            resultPath: '$.config.customer',
        });
        GetCustomerConfigFromDB.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        // Check for custom error thrown from WriteTemplateToS3 codebuild project.  Currently only
        // handle 101 for a template file not found error.
        const raiseWriteTemplateToS3Error = new sfn.Pass(scope, 'RaiseWriteTemplateToS3Error', {
            parameters: { "Error": "CCHError", "Cause" : "Could not retrieve template file from CodeCommit" } ,
            resultPath: '$.error',
          }).next(cchExecutionFailed)

        const checkWriteTemplateToS3ExitCode = new sfn.Choice(scope, 'checkWriteTemplateToS3ExitCode')
        .when(sfn.Condition.stringMatches('$.error.Cause', '*Reason: exit status 101*'), raiseWriteTemplateToS3Error)
        .otherwise(cchExecutionFailed)

        //Define read S3 function
        const readS3 = new tasks.LambdaInvoke(scope, 'ReadTemplateFileFromS3', {
            lambdaFunction: props.readS3,
            payload: sfn.TaskInput.fromObject({
                input: sfn.JsonPath.stringAt('$.params'),
                template: sfn.JsonPath.stringAt('$.template'),
                config: sfn.JsonPath.stringAt('$.config')
            }),
            payloadResponseOnly: true,
            resultPath: '$.data'
        })
        readS3.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        
        //Define validate template dependencies function
        const validateTemplateDependencies = new tasks.LambdaInvoke(scope, 'validateTemplateDependencies', {
            lambdaFunction: props.validateTemplateDependencies,
            payload: sfn.TaskInput.fromObject({
                input: sfn.JsonPath.stringAt('$.params'),
                template: sfn.JsonPath.stringAt('$.template'),
                config: sfn.JsonPath.stringAt('$.config')
            }),
            payloadResponseOnly: true,
            resultPath: '$.params.custom.FCCH.FCCH_dependencies'
        })
        validateTemplateDependencies.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        validateTemplateDependencies.next(readS3);
        
        //Define SetEnvPrefix
        const setEnvPrefix = new tasks.LambdaInvoke(scope, 'SetEnvPrefix', {
            lambdaFunction: props.setEnvPrefix,
            payload: sfn.TaskInput.fromObject({
                input: sfn.JsonPath.stringAt('$.params'),
                data: sfn.JsonPath.stringAt('$.data'),
                environment: sfn.JsonPath.stringAt('$.environment')
            }),
            payloadResponseOnly: true,
            resultPath: '$.data'
        })
        readS3.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        //Define GetSize
        const getSize = new tasks.LambdaInvoke(scope, 'GetNumberOfStages', {
            lambdaFunction: props.getSize,
            payload: sfn.TaskInput.fromObject({
                input: sfn.JsonPath.stringAt('$.params'),
                data: sfn.JsonPath.stringAt('$.data')
            }),
            payloadResponseOnly: true,
            resultPath: '$.iterator',
        })     
        
        //Define iterator
        const iterateCount = new tasks.LambdaInvoke(scope, 'IterateStages', {
            lambdaFunction: props.iterate,
            payload: sfn.TaskInput.fromObject({
                index: sfn.JsonPath.stringAt('$.iterator.index'),
                step: sfn.JsonPath.stringAt('$.iterator.step'),
                count: sfn.JsonPath.stringAt('$.iterator.count'),
                data: sfn.JsonPath.stringAt('$.data'),
                input: sfn.JsonPath.stringAt('$.params')
            }),
            payloadResponseOnly: true,
            resultPath: '$.iterator'
        })

        //Define execution failed task
        const executionFailedTask = new tasks.LambdaInvoke(scope, 'ExecutionFailure', {
            lambdaFunction: props.executionFailed,
            payload: sfn.TaskInput.fromObject({
              payload: sfn.JsonPath.stringAt('$'),
            }),
            payloadResponseOnly: true,
            resultPath: '$',
        }).next(cchExecutionFailed);

        //Validate template function
        const validateTemplate = new tasks.LambdaInvoke(scope, 'ValidateTemplate', {
            lambdaFunction: props.validateTemplate,
            payload: sfn.TaskInput.fromObject({
                input: sfn.JsonPath.stringAt('$.params'),
                template: sfn.JsonPath.stringAt('$.template')
            }),
            payloadResponseOnly: true,
            resultPath: '$.template',
        })
        validateTemplate.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        //Define a task to run Customer Account CodeBuild retrieval project
        const WriteTemplateToS3 = new tasks.CodeBuildStartBuild(scope, "WriteTemplateToS3", {
            project: props.codeBuildPackageCustomer,
            comment: "Starts the CodeBuild project retrieve the template file from the customer repo and write it to S3",
            integrationPattern: sfn.IntegrationPattern.RUN_JOB,
            environmentVariablesOverride: {
            CODE_BRANCH: {
                value: sfn.JsonPath.stringAt("$.config.customer.Item.config.M.configBranch.S")
            },
            CODE_REPOSITORY: {
                value: sfn.JsonPath.stringAt("$.config.customer.Item.config.M.configRepo.S")
            },
            CODE_ACCOUNT: {
                value: sfn.JsonPath.stringAt("$.config.customer.Item.config.M.configAccount.S")
            },
            CODE_REGION: {
                value: sfn.JsonPath.stringAt("$.config.customer.Item.config.M.configRegion.S")
            },
            CUSTOMER_NAME: {
                value: sfn.JsonPath.stringAt("$.config.customer.Item.config.M.customerPrefix.S")
            },
            CUSTOMER_CONFIG_FILE: {
                value: sfn.JsonPath.stringAt("$.template.file")
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
                value: sfn.JsonPath.stringAt("$.config.customer.Item.config.M.account.S")
            },
            TARGET_ROLE: {
                value: props.deployRoleName
            },
            },
            // None of this is currently used in flow, so discard results.
            resultPath: sfn.JsonPath.DISCARD
        });

        WriteTemplateToS3.addCatch(checkWriteTemplateToS3ExitCode , {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        // have a NEXT for FCENG-12660
        WriteTemplateToS3.next(validateTemplate);

        //Define Done
        const done = new sfn.Pass(scope, "Done")

        //Define Success
        const success = new sfn.Pass(scope, "Success")

        //Define Failure
        const failure = new sfn.Fail(scope, "Failure")
        success.next(cchExecutionCompleted)
        
        // If template was copied to S3 prior to CCH execution, skip WriteTemplateToS3 task. (FCENG-12660)        
        const RetrieveFCRConfig = new sfn.Choice(scope, 'RetrieveTemplateFromRepository')
        .when(
            sfn.Condition.isPresent("$.params.custom.eventData"),
            validateTemplate
          )
          .when(
            sfn.Condition.isNotPresent("$.params.custom.eventData"),
            WriteTemplateToS3
          )
          .otherwise(failure);
 
        //Get TOF state machine reference
        const TOFarn = `arn:aws:states:${props.region}:${props.customerAccount}:stateMachine:${props.instanceName}-CentralOrchestrationWorkflow`
        const TOF = sfn.StateMachine.fromStateMachineArn(scope, 'TOFInstance', TOFarn)

        //Validate TOF version function
        const validateTOF = new tasks.LambdaInvoke(scope, 'ValidateTOFVersion', {
            lambdaFunction: props.validateTOF,
            payloadResponseOnly: true,
            resultPath: '$.tof',
            payload: sfn.TaskInput.fromObject({
                arn: TOFarn,
                input: sfn.JsonPath.stringAt('$.params'),
            })
        })
        validateTOF.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        const validateEmails = new tasks.LambdaInvoke(scope, 'validateEmails', {
            lambdaFunction: props.validateEmails,
            payload: sfn.TaskInput.fromObject({
                input: sfn.JsonPath.stringAt('$.params'),
                config: sfn.JsonPath.stringAt('$.config')
            }),
            payloadResponseOnly: true,
            resultPath: '$.output',
        })
        validateEmails.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        // When we run CCH in validationMode=true, this task will be used to set no-op
        // params. This will be used to get validation error summary from TOF.
        const setNoOpParams = new sfn.Pass(scope, 'SetNoOpParams', {
            inputPath: "$",
            parameters: {
                'app' : "",
                'command' : "no-op",
                'version' : "",
                'usePackaged': true,
                'manualApprovalRequired': true,
                'validationMode': true,
                'executionName' : sfn.JsonPath.stringAt('$.data.NoOpExecutionName'),
                'custom' : {
                    "emailContent" : {
                        "message.$": "States.Format('Please find the TOF validation errors of CCH Execution Name: {} with Template: {}', States.ArrayGetItem(States.StringSplit($.params.custom.FCCH.FCCH_Execution, ':'), 7), $.params.custom.FCCH.FCCH_Input.template)",
                        "app": "",
                        "version": ""
                    },
                    "FCCH" : {
                        "FCCH_Instance": sfn.JsonPath.stringAt("$$.StateMachine"),
                        "FCCH_Execution": sfn.JsonPath.stringAt("$$.Execution.Id"),
                        "FCCH_Input": sfn.JsonPath.stringAt("$$.Execution.Input"),
                        "FCCH_Final_Execution": true
                    }
                },
                'customer' : sfn.JsonPath.stringAt('$.params.customer')
            },
            comment: "Add no-op params into payload",
            resultPath: '$.noOp'
        })

        // const checkEnvListOrPrefix = new sfn.Choice(scope, 'CheckEnvListOrPrefix');

        // This task will be used to set no-op
        // params. This will be used to package customer configuration.
        const setNoOpParamsEnvList = new sfn.Pass(scope, 'SetNoOpParams-EnvList', {
            parameters: {
              'app': "",
              'command': "no-op",
              'version': "",
              'packageOnly': true,
              'executionName': sfn.JsonPath.stringAt('$.data.PackageExecutionName'),
              'customer': {
                'customerPrefix': sfn.JsonPath.stringAt('$.params.customer.customerPrefix'),
                'zone': sfn.JsonPath.stringAt('$.params.customer.zone'),
              },
              'envList': sfn.JsonPath.stringAt('$.params.envList'),
            },
            resultPath: '$.packageCustomer'
          });
          
          const setPackageNoOpParams = new sfn.Pass(scope, 'setPackageNoOpParams', {
            parameters: {
              'app': "",
              'command': "no-op",
              'version': "",
              'packageOnly': true,
              'executionName': sfn.JsonPath.stringAt('$.data.PackageExecutionName'),
              'customer': {
                'customerPrefix': sfn.JsonPath.stringAt('$.params.customer.customerPrefix'),
                'zone': sfn.JsonPath.stringAt('$.params.customer.zone'),
              }
            },
            resultPath: '$.packageCustomer'
          });
                   
        
        // This task will be used to invoke TOF only for packge customer config.
        // This task will submit no-op params set by 'setPackageNoOpParams' to TOF.
        const packageCustomerTaskList = new tasks.StepFunctionsStartExecution(scope, 'PackageCustomerTaskWithEnvList', {
            stateMachine: TOF,
            inputPath: '$.packageCustomer',
            name: sfn.JsonPath.stringAt('$.executionName'),
            integrationPattern: sfn.IntegrationPattern.RUN_JOB,
            resultPath: '$.output',
          });
          
        // This task will be used to invoke TOF only for packge customer config.
        // This task will submit no-op params set by 'setPackageNoOpParams' to TOF.
          const packageCustomerTask = new tasks.StepFunctionsStartExecution(scope, 'PackageCustomerTask', {
            stateMachine: TOF,
            inputPath: '$.packageCustomer',
            name: sfn.JsonPath.stringAt('$.executionName'),
            integrationPattern: sfn.IntegrationPattern.RUN_JOB,
            resultPath: '$.output',
          });

      
        // .otherwise(setNoOpParams_EnvPrefix.next(packageCustomerTask)); // or handle differently

        packageCustomerTask.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });      

        //Define task to handle handle serial and parallel tasks failures.
        const handleFailure = new sfn.Pass(scope, 'HandleFailure', {
            parameters:  {
                "environment": sfn.JsonPath.stringAt("$.environment"),
                "error.$": "States.StringToJson($.error.Cause)"
            },
            comment: "Add custom FCCH_Instance to payload",
            resultPath: '$.failedTask',
            outputPath: '$.failedTask'
        })

        //Define ExecuteTOF
        const ExecuteTOF = new sfn.Map(scope, 'executeTOFMap', {
            inputPath: '$.iterator.stages.tasks',
            resultPath: '$.output',
            maxConcurrency: 1
        })

        ExecuteTOF.addCatch(handleFailure, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        ExecuteTOF.iterator(new tasks.StepFunctionsStartExecution(scope, 'executeTOF', {
            stateMachine: TOF,
            inputPath: '$.params',
            name : sfn.JsonPath.stringAt('$.executionName'),
            integrationPattern: sfn.IntegrationPattern.RUN_JOB
        })).next(iterateCount)

         //Define ExecuteTOF in parallel
         const ExecuteTOFParallel = new sfn.Map(scope, 'executeTOFMapParallel', {
            inputPath: '$.iterator.stages.tasks',
            resultPath: '$.output',
            maxConcurrency: props.maxConcurrency
        })
        ExecuteTOFParallel.addCatch(handleFailure, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });
        handleFailure.next(done);
        ExecuteTOFParallel.iterator(new tasks.StepFunctionsStartExecution(scope, 'executeTOFParallel', {
            stateMachine: TOF,
            inputPath: '$.params',
            name : sfn.JsonPath.stringAt('$.executionName'),
            integrationPattern: sfn.IntegrationPattern.RUN_JOB
        })).next(iterateCount)

        const isParallel = new sfn.Choice(scope, "IsStageParallel" )
        .when(sfn.Condition.booleanEquals('$.iterator.stages.parallel', true), ExecuteTOFParallel)
        .otherwise(ExecuteTOF)

        //check if validationMode flag is true and run validateDependencies if true
        const CheckValidationMode = new sfn.Choice(scope, "CheckValidationMode")
        .when(sfn.Condition.and(
            sfn.Condition.isPresent('$.params.validationMode'), 
            sfn.Condition.booleanEquals('$.params.validationMode', true)), validateTemplateDependencies)
        .otherwise(readS3)

        // When we run CCH in validationMode=true, this task will be used to get
        // validation error summary from TOF. This task will submit no-op params set by 'setNoOpParams' to TOF.
        const getTOFValidationReport = new tasks.StepFunctionsStartExecution(scope, 'GetTOFValidationReport', {
            stateMachine: TOF,
            inputPath: '$.noOp',
            name : sfn.JsonPath.stringAt('$.executionName'),
            integrationPattern: sfn.IntegrationPattern.RUN_JOB
        })

        const GetTOFDeploymentReport = new tasks.StepFunctionsStartExecution(scope, 'GetTOFDeploymentReport', {
            stateMachine: TOF,
            inputPath: '$.noOp',
            name : sfn.JsonPath.stringAt('$.executionName'),
            integrationPattern: sfn.IntegrationPattern.RUN_JOB
        })

        const logReports = new tasks.LambdaInvoke(scope, 'logReports',{
            lambdaFunction: props.logValidationSummary,
            inputPath: '$',
            payload: sfn.TaskInput.fromObject({
                input: sfn.JsonPath.stringAt('$.Input')
            }),
            payloadResponseOnly: true,
            resultPath: '$.output',
        })

        setNoOpParams.next(getTOFValidationReport).next(logReports).next(done);

        const setNoOpParamsReport = new sfn.Pass(scope, 'SetNoOpParamsReport', {
            inputPath: "$",
            parameters: {
                'app' : "",
                'command' : "no-op",
                'version' : "",
                'manualApprovalRequired': true,
                'executionName' : sfn.JsonPath.stringAt('$.data.NoOpExecutionName'),
                'custom' : {
                    "emailContent" : {
                        "message.$": "States.Format('Please find the CCH deployment report of {} with Template {}', States.ArrayGetItem(States.StringSplit($.params.custom.FCCH.FCCH_Execution, ':'), 7), $.params.custom.FCCH.FCCH_Input.template)",
                        "app": "",
                        "version": ""
                    },
                    "FCCH" : {
                        "FCCH_Instance": sfn.JsonPath.stringAt("$$.StateMachine"),
                        "FCCH_Execution": sfn.JsonPath.stringAt("$$.Execution.Id"),
                        "FCCH_Input": sfn.JsonPath.stringAt("$$.Execution.Input"),
                        "FCCH_Final_Execution": true
                    }
                },
                'customer' : sfn.JsonPath.stringAt('$.params.customer')
            },
            comment: "Add no-op params into payload",
            resultPath: '$.noOp'
        })

        setNoOpParamsReport.next(GetTOFDeploymentReport).next(logReports);


        // This will decide whether TOF has to send validation 
        // and report summaries for CCH executions.
        const runOptions = new sfn.Choice(scope, "RunOptions")
            .when(sfn.Condition.and(sfn.Condition.isPresent("$.params.validationMode"),
                  sfn.Condition.booleanEquals('$.params.validationMode', true)), setNoOpParams)
            .when(sfn.Condition.and(sfn.Condition.isPresent("$.params.cchReportRequired"),
                  sfn.Condition.booleanEquals('$.params.cchReportRequired', true)), setNoOpParamsReport)
            .otherwise(done)

        //Define IsCountReached
        const IsCountReached = new sfn.Choice(scope, "IsStageCountReached")
            .when(sfn.Condition.booleanEquals('$.iterator.continue', true), isParallel)
            .otherwise(runOptions)

        //Define execution failed task
        const logEnvExecutionStatus = new tasks.LambdaInvoke(scope, 'LogEnvExecutionStatus', {
            lambdaFunction: props.logEnvStatus,
            payload: sfn.TaskInput.fromObject({
                input: sfn.JsonPath.stringAt('$.params'),
                envOutput: sfn.JsonPath.stringAt('$.env_output')
            }),
            payloadResponseOnly: true,
            resultPath: '$.cchStatus',
        })

        logEnvExecutionStatus.addCatch(cchExecutionFailed, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        //Define CheckOverAllExecutionStatus. This will decide whether CCH execution has to fail.
        const checkCCHStatus = new sfn.Choice(scope, "CheckOverAllExecutionStatus")
            .when(sfn.Condition.and(sfn.Condition.isPresent("$.cchStatus"),
                  sfn.Condition.stringEquals('$.cchStatus', "SUCCESS")), success)
            .otherwise(cchExecutionFailed)

        const envMap = new sfn.Map(scope,'Deploy-Env-Parallel', {
            itemsPath: sfn.JsonPath.stringAt('$.data.envList'),
            parameters: {
                "params.$": "$.params",
                "data.$": "$.data",
                "environment.$": "$$.Map.Item.Value",
            },
            resultPath: '$.env_output',
            maxConcurrency: props.envConcurrency
        });

        envMap.addCatch(executionFailedTask, {
            errors: [sfn.Errors.TASKS_FAILED, sfn.Errors.TIMEOUT],
            resultPath: '$.error'
        });

        envMap.iterator(setEnvPrefix.next(getSize).next(iterateCount).next(IsCountReached))

        const envFlow = envMap
        .next(logEnvExecutionStatus)
        .next(checkCCHStatus);
      
      const EnvListCheck = new sfn.Choice(scope, 'EnvListCheck')
        .when(
          sfn.Condition.isPresent('$.params.envList'),
          setNoOpParamsEnvList.next(packageCustomerTaskList).next(envFlow)
        )
        .otherwise(
          setPackageNoOpParams.next(packageCustomerTask).next(envFlow)
        )
        
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
        .next(EnvListCheck)     
      
             
        // setup base step function class
        super(scope, id, {
            definitionBody: DefinitionBody.fromChainable(definition),
            stateMachineName: props.name,
            role: props.sfnRole,
            tracingEnabled: props.logging.trace,
            logs: props.logging.cloudwatch
        });    
    }
}