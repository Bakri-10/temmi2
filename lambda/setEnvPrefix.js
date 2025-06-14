/**
 * This class will set envPrefix to each task present in template.
 * This will also replace the '${envPrefix}' which set from ReadS3
 * lambda function for both task execution name and noOP execution name.
 */
import { CCHLambdaLogger } from "./cchLambdaLogger.js";

var cchLambdaLogger;
exports.handler = async (event, context) => {

  cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
    process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
    event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("Inside iterateTasks lambda", event);

    let stages = event.data.stages; // Stores stages in template.
    let environment = event.environment; // Stores environment.
    let NoOpExecutionName = event.data?.NoOpExecutionName; // Stores noOp execution name if present.

      for(let i = 0; i < stages.length; i++) {
        let tasks = stages[i].tasks;
        for(let j = 0; j < tasks.length; j++) {
            let task = tasks[j];
            let executionName = task.params.executionName;
            task.params["envPrefix"] = environment;
            task.params["usePackaged"] = true; // Set to 'true' to ignore package customer task in TOF. 
            task.params.executionName = executionName.replace("${envPrefix}", environment);
            if(NoOpExecutionName) {
              event.data.NoOpExecutionName = event.data.NoOpExecutionName.replace("${envPrefix}", environment);
            }
          }
      }
    cchLambdaLogger.log("event.data", event.data);
    return event.data;  

  }