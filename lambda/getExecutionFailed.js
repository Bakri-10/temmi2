"using strict";
/** Lambda function to retrieve the error from the ExecutionFailed event in a failed execution */
const AWS = require("aws-sdk");
const sfn = new AWS.StepFunctions();
import { CCHLambdaLogger } from "./cchLambdaLogger.js";

var cchLambdaLogger;
exports.handler = async ( event, context ) => {
    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.payload.params.customer.customerPrefix, 
        event.payload.params.customer.zone, '', '', event.payload.params.custom.FCCH.FCCH_Execution, event.payload.params.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("Inside getExecutionFailed lambda", event);

    try {
        // Get execution from DescribeExecution output that StepFunctionStartExecution returns on error
        const errorCause = JSON.parse(event.payload.error.Cause)
        cchLambdaLogger.log("Error Cause from StartExecution: ", errorCause);
        const executionArn = errorCause.ExecutionArn

        let executionEvent
        // Execution history is eventually consistent, loop until get ExecutionFailed event (30 tries)
        for (let i = 1; i <= 30; i++) {
            let executions = await sfn.getExecutionHistory({
                executionArn: executionArn,
                maxResults: 1,
                reverseOrder: true
            }).promise();
            cchLambdaLogger.log("Execution history response:", executions);

            if (executions.events[0].type == "ExecutionFailed") {
                executionEvent = executions.events[0]
                break
            } else {
                // Pause for 1 sec
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        // Extract error and cause, put into $.error - also keep execution details
        const errorDetails = executionEvent.executionFailedEventDetails
        event.payload.error.Error = errorDetails.error
        event.payload.error.Cause = errorDetails.cause
        event.payload.error.ExecutionDetails = errorCause

        return event.payload

    } catch (err) {
        cchLambdaLogger.error(err);
        throw err;
    }
};