const AWS = require("aws-sdk");
const s3 = new AWS.S3();
import {
    S3Client,
    GetObjectCommand
  } from "@aws-sdk/client-s3"
 const dynamodb = new AWS.DynamoDB();
 const s3Client = new S3Client();
const unzipper = require("unzipper");
import { satisfies } from "compare-versions";
import { CCHLambdaLogger } from "./cchLambdaLogger.js";

async function getTemplate(event) {
    const s3key = event.template.folder + '/' + event.template.file;
    const bucketParams = {
        Bucket : event.template.bucket,
        Key: s3key
    };
    cchLambdaLogger.log('Calling get template')
    const data = await s3.getObject(bucketParams).promise(); 
    const output = data.Body.toString();
    return JSON.parse(output);
}



async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
  }

async function getAppPackage(appSourceLocations){
    let firstIndex = appSourceLocations.indexOf("/");
    let s3Params = {
        Key: appSourceLocations.slice(firstIndex + 1),
        Bucket: appSourceLocations.slice(0, firstIndex)
    }
    const getObjectResponse = await s3Client.send(new GetObjectCommand(s3Params));
    const file_stream = getObjectResponse.Body;
    file_stream.on("error", (e) => {
        cchLambdaLogger.error(e);
        throw e;
    })
    let _package;
    try {
        const packagejson = file_stream.pipe(unzipper.ParseOne("^package.json", {forceStream: true,}));
        const result = await streamToString(packagejson);
        cchLambdaLogger.log('getAppPackage success')
        _package = JSON.parse(result);
      }
      catch {
        //CCHLambdaLogger.log("Couldn't open package.json");
        throw new Error("Couldn't open package.json")
      }

      return new Promise ((resolve, reject) => {
        if (_package !== undefined){
          resolve(_package)
        }
        else {
          reject("Couldn't open package.json")
        }
      })
}

var cchLambdaLogger;
exports.handler = async (event, context) => {

    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
        event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);
    
    cchLambdaLogger.log("Inside validateTemplateDependency lambda", event);

    const _data = await getTemplate(event) 
    //get the number of stages to be iterated through later
    const numOfStages = _data.stages.length;
    let appSourceLocations = [];
    //number of tasks per stage
    let appsFromTemplate = [];
    let taskApp;
    let version;
    let taskCommand;
    let sourceLocation;
    
    //loop through each stage to get the tasks
    for (let i = 0; i < numOfStages; i++) {
        let taskPerStage = _data.stages[i].tasks.length
        
        //loop through each task to get get its dependencies
        for (let j = 0; j < taskPerStage; j++) {
            try{
                let task = _data.stages[i].tasks[j]
                taskApp = task.params.app;
                version = task.params.version;
                taskCommand = task.params.command;
                
                
                appsFromTemplate.push({[taskApp]: version})
                //build a composite key of app and command

                let compositeKey = taskApp.concat("#", taskCommand);
                cchLambdaLogger.log('compositeKey', compositeKey)

                let dbparams = {
                    Key: {
                        pk: {
                            S: "TASK"
                        },
                        sk: {
                            S: compositeKey
                        }
                    },
                    //Change tableName to a variable
                    TableName: process.env.STAGE_PREFIX + "-fcn-vending-task-definition"
                };
                let dynamoOutput = await dynamodb.getItem(dbparams).promise()
            
                sourceLocation = dynamoOutput.Item.appDefinition.M.execution.M.sourceLocation.S;
                appSourceLocations.push(sourceLocation.replace("${version}", version))
            }catch(error){
                cchLambdaLogger.error(error);
                cchLambdaLogger.error(`sourceLocation lookup for ${taskApp} in db table failed.`);
            }
        }   
    }

    
    let templateValidation =[];
    let dependencyList;
    //check dependencies from each apps package.json against the apps in the template
    cchLambdaLogger.log('Source locations to be called', appSourceLocations)
    //for each sourcelocation get the package.json
    for(let i = 0; i < appSourceLocations.length; i++){
        let packagejson = await getAppPackage(appSourceLocations[i]);
        dependencyList = [];
        //check package.json has fineos.dependencies
        if ('dependencies' in packagejson.fineos) {
            let installerDependency = packagejson.fineos.dependencies
            for (const key in installerDependency) {
                //if dependency is not in template add it to the missing list
                let checkKeyExists = key => appsFromTemplate.some(obj => Object.keys(obj).includes(key))
                let findIndexOfKey = key => appsFromTemplate.findIndex(obj => Object.keys(obj) == key)
                //if dependency from package.json is NOT in apps from template
                if(!(checkKeyExists(key))) {
                    cchLambdaLogger.log('Dependency not found in template', key, installerDependency[key])
                    dependencyList.push({"name": key, "version": installerDependency[key], "template": "-", "result": "missing"});
                } else if (checkKeyExists(key)) {
                    //if dependency from package.json is in template 
                    //index is the position of the dependency from package.json in the apps from template 
                    let index = findIndexOfKey(key);
                    //if position of index is after position of app in template count as missing dependency
                    if (!(index < i)) {
                        cchLambdaLogger.log(appsFromTemplate[index][key],' appears in template after', key)
                        dependencyList.push({"name": key, "version": installerDependency[key], "template": appsFromTemplate[index][key], "result": "order error"});
                    } else {
                    //if dependency is in template and appears before app in template check for semantic versioning 
                        if (satisfies(appsFromTemplate[index][key], installerDependency[key]) === false) {
                            cchLambdaLogger.log('dependency is in template and does not satisfy semantic versioning', key, appsFromTemplate[index][key])
                            dependencyList.push({"name": key, "version": installerDependency[key], "template": appsFromTemplate[index][key], "result": "version error"})
                        } 
                        else if (satisfies(appsFromTemplate[index][key], installerDependency[key]) === true) {
                            cchLambdaLogger.log('dependency exists and satisfies semver', appsFromTemplate[index][key], installerDependency[key]);
                            dependencyList.push({"name": key, "version": installerDependency[key], "template": appsFromTemplate[index][key], "result": "pass"});
                        }
                    }
                }               
            }
        
        }

        let appFromTemplate = Object.keys(appsFromTemplate[i])
        templateValidation.push({"name" : appFromTemplate[0], "dependencies": dependencyList})
        // Needs to be in the following format to be processed by TOF correctly:
        // [
        //     {
        //         "name": "sample-app",
        //         "dependencies": dependencyList
        //     },
        //     {
        //         "name": "sample-app2",
        //         "dependencies": dependencyList
        //     }
        // ]
        
    } 
    cchLambdaLogger.log('Missing dependencies are', templateValidation)   
    return templateValidation
}