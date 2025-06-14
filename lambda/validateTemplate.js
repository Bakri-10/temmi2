const AWS = require('aws-sdk');
const Ajv = require("ajv")
const s3 = new AWS.S3();
const ajv = new Ajv();
import { CCHLambdaLogger } from "./cchLambdaLogger.js";
import { TemplateValidationError } from "./CCHErrors.js";

async function getS3file(bucket, folder, file) {
    let s3key;
    if (folder === null) {
        s3key =  file
    }
    else {
        s3key = folder + '/' + file
    }
    const bucketParams = {
        Bucket : bucket,
        Key: s3key
    };
    const data = await s3.getObject(bucketParams).promise(); 
    const output = data.Body.toString();
    const jsonData = JSON.parse(output);

    return jsonData;
}

/*  checkDuplicateTasks
        Check for duplicate task names in the JSON template
        Arguments:
            the JSON template string
        Returns:
            list of duplicate task names or an empty array if there are no duplicates
*/
function checkDuplicateTasks(jsonData) {
    let taskList = [];
    let duplicateTasks = [];
    let stageLength = jsonData.stages.length;
    for (let i = 0; i < stageLength; i++){
        let taskLength = jsonData.stages[i].tasks.length;
        for (let j = 0; j < taskLength; j++){
            if (taskList.includes(jsonData.stages[i].tasks[j].taskname)) {
                let stageTask = "Stage: " + jsonData.stages[i].stage + " Task: " + jsonData.stages[i].tasks[j].taskname;
                duplicateTasks.push(stageTask);
            } else {
                taskList.push(jsonData.stages[i].tasks[j].taskname);
            }
        }
    }
    return duplicateTasks;
}

var cchLambdaLogger;
exports.handler = async (event, context) => {

    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
        event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("Inside validateTemplate lambda", event);

    const jsonTemplate = await getS3file(event.template.bucket, event.template.folder, event.template.file);
    const jsonSchema = await getS3file(event.template.bucket, null, 'schema_template.json');

    const validate = ajv.compile(jsonSchema);
    const valid = validate(jsonTemplate);

    if (valid) {
        const duplicateTasks = checkDuplicateTasks(jsonTemplate);
        if (duplicateTasks.length > 0) {
            cchLambdaLogger.log("Duplicate Tasks in template", JSON.stringify(duplicateTasks))
        }
        return event.template;
    }
    else {
        const errorMessage = `${validate.errors[0].instancePath} - ${validate.errors[0].message} - ${JSON.stringify(validate.errors[0].params)}`;
        cchLambdaLogger.error(errorMessage);
        throw new TemplateValidationError(errorMessage);
    }
}