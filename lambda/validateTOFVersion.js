"using strict";
const AWS = require("aws-sdk");
const compareVersions = require("compare-versions");
const sfn = new AWS.StepFunctions();
import { CCHLambdaLogger } from "./cchLambdaLogger.js";

var cchLambdaLogger;
exports.handler = (event, context) => {

    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
        event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("Inside validateTOFVersion lambda", event);

    const params = {
        resourceArn: event.arn
    } 
    let actualVersion;
    const minimumVersion = ">=2.1.0";

    sfn.listTagsForResource(params, function(err, data){
        cchLambdaLogger.log("Listing tags")
        if (err) {
            cchLambdaLogger.error(err);
            throw new Error(`task-orchestration version tag not found in ${event.arn}`)
        }
        else {
            data.tags.forEach(element => {
                if (element.key === 'task-orchestration-version'){
                    cchLambdaLogger.log(element.value)
                    actualVersion = element.value
                    
                    if (compareVersions.satisfies(actualVersion, minimumVersion)){
                        cchLambdaLogger.log ("version is ok");
                        return JSON.stringify(actualVersion);
                    }
                    else {
                        cchLambdaLogger.log(`TOF version should be ${minimumVersion}`);
                        const errorMessage = `TOF version should be ${minimumVersion}`
                        cchLambdaLogger.error(errorMessage);
                        throw new Error(errorMessage)
                    }
                }
            });
        }
    })
}

