import { CCHLambdaLogger } from "./cchLambdaLogger.js";

var cchLambdaLogger;
exports.handler = function getSize (event, context, callback) {

    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
        event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("Inside getSize lambda", event);

    const _data = event.data;
   
    const _count = _data.stages.length;
    cchLambdaLogger.log("count", _count);
    const _message = `Stage 1 of ${_count}. Stage: ${_data.stages[0].stage}`

    callback(null, {
        current_stage: _message,
        count: _count,
        index: 0,
        step: 1
    })
  }