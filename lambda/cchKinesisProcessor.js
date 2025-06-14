const zlib = require('zlib');
const AWS = require('aws-sdk');
const { get } = require('https');
const cloudwatchlogs = new AWS.CloudWatchLogs({apiVersion: '2014-03-28'});
var stepfunctions = new AWS.StepFunctions();

function formatAWSServiceURL(logGroupName, logStreamName){
  const generatedURL = `https://${process.env.REGION}.console.aws.amazon.com/cloudwatch/home?region=${process.env.REGION}#logsV2:log-groups/log-group/` + 
    `${logGroupName.replace(/\//ig, "$252F")}` + 
    `/log-events/` +
    `${logStreamName.replace(/\//ig, "$252F")}`

  return generatedURL;
}

function buildMessage(sfLogevent, executionDetails, sfLogDetails, executionLog, subOrderId, subTaskArn,  subLogGroupName, subLogStreamName) {

  let stepFunctionInput=JSON.parse(executionDetails.input);

  let parentId = sfLogevent.execution_arn;
  let event_timestamp = sfLogevent.event_timestamp
  let _executionId = sfLogevent.execution_arn;
  let transactionId;

  if (
    !stepFunctionInput['producer-id'] ||
    stepFunctionInput['producer-id'] === undefined ||
    stepFunctionInput['producer-id'] === ''
  ) {
    transactionId = _executionId;
  } else {
    transactionId = stepFunctionInput['producer-id'];
  }

  let eventLogDetail = sfLogevent.details.resourceType ? `(${sfLogevent.details.resourceType})` : "";

  return JSON.stringify({
    "dataType": "INTERNAL",
    "orderId": subOrderId ? "" : sfLogevent.id,
    "spanName": subOrderId ? JSON.parse(sfLogevent.details.output).Build.ProjectName : sfLogevent.execution_arn.split("execution:").pop(),
    "parentId": parentId,
    "sourceDetail": "step function",
    "source": "FCCH",
    "userIdentifier": "fcch-operator",
    "time": parseInt(event_timestamp),
    "transactionId": transactionId,
    "schemaVersion": "1.0.0",
    "zoneType": "INTERNAL",
    "additionalData": {
      "zone": stepFunctionInput.params.customer.zone,
      "accountIdentifier": process.env.ACCOUNT,
      "awsRegion": process.env.REGION,
      "environment": process.env.STAGE,
      "softwareVersion": process.env.CCH_VERSION,
      "log": executionLog == null ? `${sfLogevent.type} ${eventLogDetail}` : executionLog.message,
      "exception": "",
      "awsService": executionLog == null ? "step function" : "codebuild",
      "customer": stepFunctionInput.params.customer.customerPrefix,
      "tofExecutionId": "",
      "fcchExecutionId": _executionId,
      "startTime": event_timestamp,
      "executionContext": "TASK",
      "logGroup": executionLog == null ? sfLogDetails.logGroup : subLogGroupName,
      "logStream": executionLog == null ? sfLogDetails.logStream :subLogStreamName,
      "awsServiceURL": executionLog == null ? 
        formatAWSServiceURL(sfLogDetails.logGroup, sfLogDetails.logStream) : 
        formatAWSServiceURL(subLogGroupName, subLogStreamName),
      "subOrderId": subOrderId
    }
  });
}

exports.handler = async (event, context) => {
  try {
    if (event.awslogs && event.awslogs.data) {
      const payload = Buffer.from(event.awslogs.data, "base64");
      const logDetails = JSON.parse(zlib.unzipSync(payload).toString())
      const logevents = JSON.parse(zlib.unzipSync(payload).toString()).logEvents;

      let executionARN = JSON.parse(logevents[0].message).execution_arn;
      const executionParams = {
        executionArn: executionARN
      }

      let executionDetails = await stepfunctions.describeExecution(executionParams, function(err, data) {
        if (err) console.log('error : ', err, err.stack); // an error occurred
        else {
         return data;
         //console.log('successful response : ', data);           // successful response
        }
      }).promise(); 
      
      for (const logevent of logevents) {
        const log = JSON.parse(logevent.message);

          let logGroupName;
          let logStreamName;
          let codebuildArn;
          let getCodeBuildLogs
          if (log.details.resourceType == 'codebuild' && log.type == "TaskFailed") {
            logGroupName = JSON.parse(log.details.cause).Build.Logs.GroupName
            logStreamName = JSON.parse(log.details.cause).Build.Logs.StreamName
            codebuildArn = JSON.parse(log.details.cause).Build.Arn;
            getCodeBuildLogs = await cloudwatchlogs.getLogEvents({
              logGroupName: logGroupName,
              logStreamName: logStreamName
            }).promise()

            let subOrderId = 0;
            for (const codebuildLogEvent of getCodeBuildLogs.events) {
              subOrderId++
              const message2 = buildMessage(log, executionDetails, logDetails, codebuildLogEvent, subOrderId, codebuildArn, logGroupName, logStreamName);
              console.log(message2);
            }
          }else if (log.details.resourceType == 'codebuild' && log.type == "TaskSucceeded") {
            logGroupName = JSON.parse(log.details.output).Build.Logs.GroupName
            logStreamName = JSON.parse(log.details.output).Build.Logs.StreamName
            codebuildArn = JSON.parse(log.details.output).Build.Arn;
            getCodeBuildLogs = await cloudwatchlogs.getLogEvents({
              logGroupName: logGroupName,
              logStreamName: logStreamName
            }).promise()

            let subOrderId = 0;
            for (const codebuildLogEvent of getCodeBuildLogs.events) {
              subOrderId++
              const message2 = buildMessage(log, executionDetails, logDetails, codebuildLogEvent, subOrderId, codebuildArn, logGroupName, logStreamName);
              console.log(message2);
            }
          }
        const message = buildMessage(log, executionDetails, logDetails);
        console.log(message);
      }
    }
  } catch (err) {
    console.log(err + err.stack);
  }
};