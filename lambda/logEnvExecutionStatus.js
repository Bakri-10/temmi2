/**
 * This class is used to send execution status of each 
 * environment to New Relic. Also this class will return
 * the overall CCH execution status based on each environments
 * execution output.
 */
import { CCHLambdaLogger } from "./cchLambdaLogger";

var cchLambdaLogger;
export const handler = async(event, context) => {
    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
        event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("logEnvExecutionStatus Lambda Started", event);

    let envOutput = event.envOutput; // Stores array of execution output from each environment.
    let executionStatus = []; // Stores formatted log messages for each environment.
    let logMessage = ""; // Stores log message for single environment.
    let cchStatus = "SUCCESS"; // Stores overall CCH execution status.

    // This loop will iterate over envOutput and construct formatted
    // log message for New Relic. Overall status 'cchStatus' will be
    // 'FAILED' if any of the environments has failed task execution.
    // cchStatus will be 'SUCCESS' only if all tasks in all environments
    // deployed successfully.
    for(let i=0;i < envOutput.length; i++) {
        let environment = envOutput[i].environment;
        if(envOutput[i]?.error) {
            let error = envOutput[i].error;
            let input = JSON.parse(error.Input);
            let app = input.app;
            let cause = JSON.parse(error.Cause);
            let tofStatus = error.Status;
            let tofExecutionName = error.Name;
            logMessage = {
                "environment": environment,
                "app": app,
                "tofExecutionName": tofExecutionName,
                "tofSatus": tofStatus,
                "cause": cause
            }
            executionStatus.push(logMessage);
            cchStatus = "FAILED";
        } else {
            logMessage = {
                "environment": environment,
                "message": "All apps deployed successfully"
            }
            executionStatus.push(logMessage);
        }

    }
    cchLambdaLogger.log("App deployment status in environments: ", executionStatus);
    cchLambdaLogger.log("OverAll CCH Status: ", cchStatus);

    return cchStatus;
}