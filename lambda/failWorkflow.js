import { CCHLambdaLogger } from "./cchLambdaLogger.js";

var cchLambdaLogger;
exports.handler = (event, context, callback) => {

    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.payload.params.customer.customerPrefix, 
        event.payload.params.customer.zone, '', '', event.payload.params.custom.FCCH.FCCH_Execution, event.payload.params.custom.FCCH.FCCH_Input['producer-id']);
    
    cchLambdaLogger.log("Inside failWorkflow lambda", event);
    function TORError(event) {
        this.name = event.payload.error.Error;
        this.message = event.payload.error.Cause;
    }
    TORError.prototype = new Error();
    const error = new TORError(event);
    cchLambdaLogger.error(error);
    callback(error);
};