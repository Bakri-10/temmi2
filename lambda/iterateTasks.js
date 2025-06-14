import { CCHLambdaLogger } from "./cchLambdaLogger.js";

var cchLambdaLogger;
exports.handler = function iteratateTasks (event, context, callback) {

  cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
    process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
    event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("Inside iterateTasks lambda", event);

    let _index = event.index;
    const _step = event.step;
    const _count = event.count;
    const _stages = event.data.stages[_index];
    let _message = "";
    if (_index < _count){
      _index = _index + _step;
      _message = `Stage ${_index} of ${_count}. Stage: ${_stages.stage}`
    }
    else {
      _index = _index + _step;
      _message = "All stages complete"
      cchLambdaLogger.log("All stages complete");
    }
    
    callback(null, {
      current_stage: _message,
      count: _count,
      index: _index,
      step: _step,
      stages: _stages,
      continue: _index <= _count,
    })
  }