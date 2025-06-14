const AWS = require('aws-sdk');
const path = require('path');
import { CCHLambdaLogger } from "./cchLambdaLogger.js";
import { TemplateValidationError } from "./CCHErrors.js";

const s3 = new AWS.S3();

var cchLambdaLogger;

function getEnvPrefix(customerDefinition) { 
    return customerDefinition.envPrefix.S;
}

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}   

function getformattedDate(){
        let dateTimeNow = new Date();
        let formattedDate = padTo2Digits(dateTimeNow.getDate())
                            + '' + padTo2Digits((dateTimeNow.getMonth())+1)
                            + '-' + padTo2Digits(dateTimeNow.getHours())
                            + padTo2Digits(dateTimeNow.getMinutes())
                            + padTo2Digits(dateTimeNow.getSeconds());
        return formattedDate;
}   

function formatNoOpExecutionName(event, executionEnvPrefix, suffix){
    cchLambdaLogger.log("Inside formatNoOpExecutionName: ");
    var executionDateTime = getformattedDate();
    var fileName = path.parse(event.template.file).name;
    var executionName = `${event.input.customer.customerPrefix}-${executionEnvPrefix}-${executionDateTime}-${fileName}-${suffix}`;
    if(executionName.length > 80){
        executionName = executionName.slice(0,80);
    }
    
    return executionName;
}

exports.handler = async (event,context) => {

    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
        event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);
    
    cchLambdaLogger.log("Inside readS3 lambda", event);

    const s3key = event.template.folder + '/' + event.template.file;
    cchLambdaLogger.log("s3key", s3key);
    const bucketParams = {
        Bucket : event.template.bucket,
        Key: s3key
    };
    let errorMsg;
    try {
        errorMsg = `Couldn't read ${s3key} from ${event.template.bucket}`;
        const data = await s3.getObject(bucketParams).promise(); 

        const output = data.Body.toString();
        
        let myjson = JSON.parse(output);
        let templateParams;
        let tofParams;
        let myJsonParams;
        let appName;
        let appVersion;
        let executionDateTime;       
        let executionEnvPrefix;
        let executionName="";
        let skippedTasks = [];
        let tempObj = [];
        let taskCheckMap = new Map();
        let stageCheckMap = new Map();
        let envList = [];
        let inputEnvList = event.input.custom.FCCH.FCCH_Input?.envList; //Stores envList passed as an input to CCH.
        
        let stageLength = myjson.stages.length;

        //get db config data.
        const customerConfig = event.config.customer.Item.config.M;
        const validationMode = event.input.validationMode;
        const sendDeploymentReportMode = event.input.cchReportRequired;
        const params = JSON.parse(JSON.stringify(event.input));
        cchLambdaLogger.log("event.input.validationMode", validationMode);
        cchLambdaLogger.log("event.input.cchReportRequired", sendDeploymentReportMode);

        // Validate stages and tasks lists - cannot use both
        const stages = typeof params.custom.FCCH.FCCH_Input.stages !== 'undefined' ? params.custom.FCCH.FCCH_Input.stages : [];
        const tasks = typeof params.custom.FCCH.FCCH_Input.tasks !== 'undefined' ? params.custom.FCCH.FCCH_Input.tasks : [];

        cchLambdaLogger.log("stages", JSON.stringify(stages));
        cchLambdaLogger.log("tasks", JSON.stringify(tasks));
                       
        if (stages.length > 0 && tasks.length > 0) {
            errorMsg ="tasks and stages parameters both specified in payload, these are mutually exclusive options.";
            throw(errorMsg);
        }

        // Create map to track that task filter list items are present and enabled
        if (tasks.length > 0) {
            for (let thisTask = 0; thisTask < tasks.length; thisTask++) {
                taskCheckMap.set(tasks[thisTask], false);
            }
        }

        // Create map to track that stage filter list items are present
        if (stages.length > 0) {
            for (let thisStage = 0; thisStage < stages.length; thisStage++) {
                stageCheckMap.set(stages[thisStage], false);
            }
        }
        
        for (let i = 0; i < stageLength; i++){
            let taskLength = myjson.stages[i].tasks.length;
            // Check off that this stage is valid
            stageCheckMap.set(myjson.stages[i].stage, true);

            // Skip this stage by disabling its tasks if stage is NOT on the STAGES filter list
            if (stages.length > 0 && !stages.includes(myjson.stages[i].stage)) {
                    cchLambdaLogger.log("Skipping stage", myjson.stages[i].stage);
                    for (let thisTask = 0; thisTask < taskLength; thisTask++) {
                        cchLambdaLogger.log("Disabling task", myjson.stages[i].tasks[thisTask].taskname);
                        myjson.stages[i].tasks[thisTask].enabled = false; 
                    }
            }

            for (let j = 0; j < taskLength; j++){
                //condition to skip tasks with enabled flag set to false,
                //and no-op tasks when validationMode is true as no-op tasks wait for manual approval in TOF and it requires no stopping while running CCH in validation mode
                if (myjson.stages[i].tasks[j].enabled !== false 
                    && !(((myjson.stages[i].tasks[j]['params']['command']).toLowerCase()) === 'no-op' && params.validationMode === true)) {
                    cchLambdaLogger.log(`Stage index: ${i}, task index ${j}`);
                    templateParams = myjson.stages[i].tasks[j]['params'];
                    
                    cchLambdaLogger.log("TemplateParams", templateParams);
                    cchLambdaLogger.log("Params", params);  

                    // Add this task to skippedTasks if it is NOT on the TASKS filter list
                    if (tasks.length > 0 && !tasks.includes(myjson.stages[i].tasks[j].taskname)) {
                        cchLambdaLogger.log("Skipping task", myjson.stages[i].tasks[j].taskname);
                        tempObj = [i,j];
                        skippedTasks.push(tempObj);
                    } else {
                        cchLambdaLogger.log(`Stage index: ${i}, task index ${j}`, myjson.stages[i].tasks[j].taskname);
                        templateParams = myjson.stages[i].tasks[j]['params'];
                        
                        cchLambdaLogger.log("TemplateParams", templateParams);
                        cchLambdaLogger.log("Params", params);  

                        cchLambdaLogger.log("Merging any task and CCH custom inputs");
                        let custom = { ...params['custom'], ...templateParams['custom']};

                        params['custom'] = custom;
                        tofParams = { ...templateParams, ...params};

                        if(!(templateParams['custom'] && templateParams['custom']['emailContent'])){
                            //Remove emailContent block retained from previous objects
                            delete  tofParams['custom'].emailContent;
                        }
                        
                        cchLambdaLogger.log("Final TOF input is", tofParams);
                        myjson.stages[i].tasks[j]['params'] = tofParams;

                        //Set manualApproval to true for no-op tasks
                        if (((myjson.stages[i].tasks[j]['params']['command']).toLowerCase()) == 'no-op') {
                            myjson.stages[i].tasks[j]['params'].manualApprovalRequired = true;
                        }

                        myJsonParams = myjson.stages[i].tasks[j]['params'];
                        
                        //Getting app name and version from params
                        appName =  myJsonParams.app;
                        appVersion = myJsonParams.version;					  
                        
                        //Getting execution date-time
                        executionDateTime = getformattedDate();
                        
                        //Getting envPrefix and envList value
                        // Determine the execution environment prefix
                        let executionEnvPrefix = (myJsonParams.envList && myJsonParams.envList.length > 0)
                          ? "${envPrefix}"  // Placeholder for replacement in parallel map
                          : (myJsonParams.envPrefix ?? getEnvPrefix(customerConfig));
                        // Set the list of environments to iterate over
                        envList = (myJsonParams.envList && myJsonParams.envList.length > 0)
                        ? [...myJsonParams.envList]
                        : [executionEnvPrefix];

                        // Generate execution name
                        if (appName && appVersion) {
                            executionName = `s${i+1}t${j+1}-${myJsonParams.customer.customerPrefix}-${executionEnvPrefix}-${executionDateTime}-${myJsonParams.command}-${appName}-${appVersion}`;
                        } else {
                            executionName = `s${i+1}t${j+1}-${myJsonParams.customer.customerPrefix}-${executionEnvPrefix}-${executionDateTime}-${myJsonParams.command}`;
                        }

                        
                        if(executionName.length > 80){
                            executionName = executionName.slice(0,80);
                        }  
                        
                        cchLambdaLogger.log("TOF execution name: ", executionName);
                        myjson.stages[i].tasks[j]['params'].executionName = executionName;

                        // Set task map entry to true
                        taskCheckMap.set(myjson.stages[i].tasks[j].taskname, true);
                    }
                }
                else if (myjson.stages[i].tasks[j].enabled === false || (((myjson.stages[i].tasks[j]['params']['command']).toLowerCase()) === 'no-op' && params.validationMode === true)){
                    tempObj = [i,j];
                    skippedTasks.push(tempObj);
                }
            }
        }
        // Remove disabled tasks from TOF payload & no-op tasks when validation mode is true
        skippedTasks.reverse();
        skippedTasks.forEach(function (myObj) {
            myjson.stages[myObj[0]].tasks.splice(myObj[1], 1);
        });

        //Set execution names for no-ops
        if(validationMode) {
            executionName = formatNoOpExecutionName(event, executionEnvPrefix, 'validation-report');
            myjson = {...myjson, "NoOpExecutionName" : executionName};
        }else if(sendDeploymentReportMode) {
            executionName = formatNoOpExecutionName(event, executionEnvPrefix, 'deployment-report');
            myjson = {...myjson, "NoOpExecutionName" : executionName};
        }
        
        // Set execution name for package customer task
        let fileName = path.parse(event.template.file).name;
        executionDateTime = getformattedDate();
        executionName = `${event.input.customer.customerPrefix}-${event.input.customer.zone}-${executionDateTime}-${fileName}-package-customer-only`;
        if(executionName.length > 80){
            executionName = executionName.slice(0,80);
        }
        myjson = {...myjson, "PackageExecutionName" : executionName};
        //This will set envList to the returned object.
        myjson = {...myjson, "envList" : envList};
        cchLambdaLogger.log("final json- ", myjson);
        

        // Throw error if requested tasks or stages do not exist in template or are disabled
        // This will be anything which is still "false" in the relevant CheckMap
        let missingTasks = [];
        let missingStages = [];
        cchLambdaLogger.log("taskCheckMap ", ...taskCheckMap);

        for (const [key, value] of taskCheckMap) {
            if (value === false) {
                missingTasks.push(key);
            }
        }
        for (const [key, value] of stageCheckMap) {
            if (value === false) {
                missingStages.push(key);
            }
        }
        if (missingTasks.length > 0) {
            errorMsg = "Requested task(s) missing or disabled " + JSON.stringify(missingTasks);
            throw(errorMsg);
        }
        if (missingStages.length > 0) {
            errorMsg = "Requested Stage(s) missing " + JSON.stringify(missingStages);
            throw(errorMsg);
        }

        return myjson;
    }
    catch {
        cchLambdaLogger.error(errorMsg);
        throw new TemplateValidationError(errorMsg);
    }
}