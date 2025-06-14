const {
    S3Client,
    GetObjectCommand,
    ListObjectsCommand
  } = require("@aws-sdk/client-s3");
  
import { CCHLambdaLogger } from "./cchLambdaLogger";

const s3Client = new S3Client({ region: process.env.REGION });

// File to string helper method
function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
  }

//function fetches the validation summary stored in S3 bucket through execution of template tasks in validation mode
async function getValidationErrorsFromS3(response, bucketPrefix){
    const data = await Promise.all(response.map(async (content) => {
      if (content.Key !== bucketPrefix) {
        let validationErrors = ""; 
        let params;
        params = {
            Bucket: process.env.CUSTOMER_REPO_BUCKET,
            Key: content.Key
          }; 
          cchLambdaLogger.log("content.Key: ", content.Key);
          var outputResponse = await s3Client.send(new GetObjectCommand(params));
          const bodyContents = await streamToString(outputResponse.Body);
          var executionName = JSON.parse(bodyContents).ExecutionName;
          var executionErrors  = JSON.parse(bodyContents).Errors;
          
          validationErrors = `---Execution Name: ${JSON.stringify(executionName)}---  `;
          validationErrors = validationErrors + `Validation Errors: \n${JSON.stringify(executionErrors)}`;
          validationErrors = `${JSON.stringify(validationErrors)}---`;
          validationErrors = validationErrors.replace(/\\/g, "");

          return validationErrors;
      }
    }));
    cchLambdaLogger.log("Data returned from S3: " , data);
    return data;
}

//function sets the bucket parameters to make a call to S3 bucket where the validation summary for template tasks is stored
//and also gets a list of objects from the same S3 bucket
async function getValidationErrors(bucketPrefix) {
  let truncated = true;
  let validationErrors = "";
    // Create the parameters for calling listObjects
    var bucketParams = {
      Bucket: process.env.CUSTOMER_REPO_BUCKET,
      Delimiter: '/',
      Prefix: bucketPrefix
  };
  cchLambdaLogger.log("S3 bucket call params: " , bucketParams);
  // Call S3 to obtain a list of the objects in the bucket
  while (truncated) {
    try {
          const response = await s3Client.send(new ListObjectsCommand(bucketParams));
          validationErrors = await getValidationErrorsFromS3(response.Contents, bucketPrefix);
          truncated = response.IsTruncated;
    }catch (err) {
          console.log("Error", err);
          truncated = false;
    }
  } 
   return validationErrors;
}


var cchLambdaLogger;
export const handler = async(event, context) => {
    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
        event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("logValidationSummary Lambda Started", event);
    let validationErrors = "";
    let cchExecutionId;
    let bucketPrefix;

    try{
        cchExecutionId = event.input.custom?.FCCH?.FCCH_Execution.split(/[:]+/).pop();
        bucketPrefix = `cch-tor-executions/${cchExecutionId}/`;
        validationErrors = await getValidationErrors(bucketPrefix);
        if (validationErrors === ""){
          validationErrors = "No Validation Errors Found.";
        }
        cchLambdaLogger.log("Validation Errors Summary: " , validationErrors);
    }catch(err){
        cchLambdaLogger.error(err);
        throw err;
    }

}