"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
/**
 * This class is used to send execution status of each
 * environment to New Relic. Also this class will return
 * the overall CCH execution status based on each environments
 * execution output.
 */
const cchLambdaLogger_1 = require("./cchLambdaLogger");
var cchLambdaLogger;
const handler = async (event, context) => {
    var _a;
    cchLambdaLogger = new cchLambdaLogger_1.CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);
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
    for (let i = 0; i < envOutput.length; i++) {
        let environment = envOutput[i].environment;
        if ((_a = envOutput[i]) === null || _a === void 0 ? void 0 : _a.error) {
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
            };
            executionStatus.push(logMessage);
            cchStatus = "FAILED";
        }
        else {
            logMessage = {
                "environment": environment,
                "message": "All apps deployed successfully"
            };
            executionStatus.push(logMessage);
        }
    }
    cchLambdaLogger.log("App deployment status in environments: ", executionStatus);
    cchLambdaLogger.log("OverAll CCH Status: ", cchStatus);
    return cchStatus;
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nRW52RXhlY3V0aW9uU3RhdHVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGFtYmRhL2xvZ0VudkV4ZWN1dGlvblN0YXR1cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7Ozs7R0FLRztBQUNILHVEQUFvRDtBQUVwRCxJQUFJLGVBQWUsQ0FBQztBQUNiLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7O0lBQzNDLGVBQWUsR0FBRyxJQUFJLGlDQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQ25HLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQ2xHLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBRWxJLGVBQWUsQ0FBQyxHQUFHLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFbkUsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLDBEQUEwRDtJQUMzRixJQUFJLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQyxzREFBc0Q7SUFDaEYsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDLENBQUMsNkNBQTZDO0lBQ2xFLElBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFDLHVDQUF1QztJQUVsRSxnRUFBZ0U7SUFDaEUsZ0VBQWdFO0lBQ2hFLGlFQUFpRTtJQUNqRSxvRUFBb0U7SUFDcEUseUJBQXlCO0lBQ3pCLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ25DLElBQUksV0FBVyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFDM0MsSUFBRyxNQUFBLFNBQVMsQ0FBQyxDQUFDLENBQUMsMENBQUUsS0FBSyxFQUFFO1lBQ3BCLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDL0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEMsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUNwQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwQyxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNsQyxVQUFVLEdBQUc7Z0JBQ1QsYUFBYSxFQUFFLFdBQVc7Z0JBQzFCLEtBQUssRUFBRSxHQUFHO2dCQUNWLGtCQUFrQixFQUFFLGdCQUFnQjtnQkFDcEMsVUFBVSxFQUFFLFNBQVM7Z0JBQ3JCLE9BQU8sRUFBRSxLQUFLO2FBQ2pCLENBQUE7WUFDRCxlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pDLFNBQVMsR0FBRyxRQUFRLENBQUM7U0FDeEI7YUFBTTtZQUNILFVBQVUsR0FBRztnQkFDVCxhQUFhLEVBQUUsV0FBVztnQkFDMUIsU0FBUyxFQUFFLGdDQUFnQzthQUM5QyxDQUFBO1lBQ0QsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNwQztLQUVKO0lBQ0QsZUFBZSxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNoRixlQUFlLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRXZELE9BQU8sU0FBUyxDQUFDO0FBQ3JCLENBQUMsQ0FBQTtBQWhEWSxRQUFBLE9BQU8sV0FnRG5CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRoaXMgY2xhc3MgaXMgdXNlZCB0byBzZW5kIGV4ZWN1dGlvbiBzdGF0dXMgb2YgZWFjaCBcclxuICogZW52aXJvbm1lbnQgdG8gTmV3IFJlbGljLiBBbHNvIHRoaXMgY2xhc3Mgd2lsbCByZXR1cm5cclxuICogdGhlIG92ZXJhbGwgQ0NIIGV4ZWN1dGlvbiBzdGF0dXMgYmFzZWQgb24gZWFjaCBlbnZpcm9ubWVudHNcclxuICogZXhlY3V0aW9uIG91dHB1dC5cclxuICovXHJcbmltcG9ydCB7IENDSExhbWJkYUxvZ2dlciB9IGZyb20gXCIuL2NjaExhbWJkYUxvZ2dlclwiO1xyXG5cclxudmFyIGNjaExhbWJkYUxvZ2dlcjtcclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyhldmVudCwgY29udGV4dCkgPT4ge1xyXG4gICAgY2NoTGFtYmRhTG9nZ2VyID0gbmV3IENDSExhbWJkYUxvZ2dlcihwcm9jZXNzLmVudi5TVEFHRV9QUkVGSVgsIHByb2Nlc3MuZW52LlJFR0lPTiwgcHJvY2Vzcy5lbnYuQUNDT1VOVCwgXHJcbiAgICAgICAgcHJvY2Vzcy5lbnYuQ0NIX1ZFUlNJT04sIGNvbnRleHQsIHByb2Nlc3MuZW52LktJTkVTSVNfRU5BQkxFRCwgZXZlbnQuaW5wdXQuY3VzdG9tZXIuY3VzdG9tZXJQcmVmaXgsIFxyXG4gICAgICAgIGV2ZW50LmlucHV0LmN1c3RvbWVyLnpvbmUsICcnLCAnJywgZXZlbnQuaW5wdXQuY3VzdG9tLkZDQ0guRkNDSF9FeGVjdXRpb24sIGV2ZW50LmlucHV0LmN1c3RvbS5GQ0NILkZDQ0hfSW5wdXRbJ3Byb2R1Y2VyLWlkJ10pO1xyXG5cclxuICAgIGNjaExhbWJkYUxvZ2dlci5sb2coXCJsb2dFbnZFeGVjdXRpb25TdGF0dXMgTGFtYmRhIFN0YXJ0ZWRcIiwgZXZlbnQpO1xyXG5cclxuICAgIGxldCBlbnZPdXRwdXQgPSBldmVudC5lbnZPdXRwdXQ7IC8vIFN0b3JlcyBhcnJheSBvZiBleGVjdXRpb24gb3V0cHV0IGZyb20gZWFjaCBlbnZpcm9ubWVudC5cclxuICAgIGxldCBleGVjdXRpb25TdGF0dXMgPSBbXTsgLy8gU3RvcmVzIGZvcm1hdHRlZCBsb2cgbWVzc2FnZXMgZm9yIGVhY2ggZW52aXJvbm1lbnQuXHJcbiAgICBsZXQgbG9nTWVzc2FnZSA9IFwiXCI7IC8vIFN0b3JlcyBsb2cgbWVzc2FnZSBmb3Igc2luZ2xlIGVudmlyb25tZW50LlxyXG4gICAgbGV0IGNjaFN0YXR1cyA9IFwiU1VDQ0VTU1wiOyAvLyBTdG9yZXMgb3ZlcmFsbCBDQ0ggZXhlY3V0aW9uIHN0YXR1cy5cclxuXHJcbiAgICAvLyBUaGlzIGxvb3Agd2lsbCBpdGVyYXRlIG92ZXIgZW52T3V0cHV0IGFuZCBjb25zdHJ1Y3QgZm9ybWF0dGVkXHJcbiAgICAvLyBsb2cgbWVzc2FnZSBmb3IgTmV3IFJlbGljLiBPdmVyYWxsIHN0YXR1cyAnY2NoU3RhdHVzJyB3aWxsIGJlXHJcbiAgICAvLyAnRkFJTEVEJyBpZiBhbnkgb2YgdGhlIGVudmlyb25tZW50cyBoYXMgZmFpbGVkIHRhc2sgZXhlY3V0aW9uLlxyXG4gICAgLy8gY2NoU3RhdHVzIHdpbGwgYmUgJ1NVQ0NFU1MnIG9ubHkgaWYgYWxsIHRhc2tzIGluIGFsbCBlbnZpcm9ubWVudHNcclxuICAgIC8vIGRlcGxveWVkIHN1Y2Nlc3NmdWxseS5cclxuICAgIGZvcihsZXQgaT0wO2kgPCBlbnZPdXRwdXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBsZXQgZW52aXJvbm1lbnQgPSBlbnZPdXRwdXRbaV0uZW52aXJvbm1lbnQ7XHJcbiAgICAgICAgaWYoZW52T3V0cHV0W2ldPy5lcnJvcikge1xyXG4gICAgICAgICAgICBsZXQgZXJyb3IgPSBlbnZPdXRwdXRbaV0uZXJyb3I7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dCA9IEpTT04ucGFyc2UoZXJyb3IuSW5wdXQpO1xyXG4gICAgICAgICAgICBsZXQgYXBwID0gaW5wdXQuYXBwO1xyXG4gICAgICAgICAgICBsZXQgY2F1c2UgPSBKU09OLnBhcnNlKGVycm9yLkNhdXNlKTtcclxuICAgICAgICAgICAgbGV0IHRvZlN0YXR1cyA9IGVycm9yLlN0YXR1cztcclxuICAgICAgICAgICAgbGV0IHRvZkV4ZWN1dGlvbk5hbWUgPSBlcnJvci5OYW1lO1xyXG4gICAgICAgICAgICBsb2dNZXNzYWdlID0ge1xyXG4gICAgICAgICAgICAgICAgXCJlbnZpcm9ubWVudFwiOiBlbnZpcm9ubWVudCxcclxuICAgICAgICAgICAgICAgIFwiYXBwXCI6IGFwcCxcclxuICAgICAgICAgICAgICAgIFwidG9mRXhlY3V0aW9uTmFtZVwiOiB0b2ZFeGVjdXRpb25OYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJ0b2ZTYXR1c1wiOiB0b2ZTdGF0dXMsXHJcbiAgICAgICAgICAgICAgICBcImNhdXNlXCI6IGNhdXNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZXhlY3V0aW9uU3RhdHVzLnB1c2gobG9nTWVzc2FnZSk7XHJcbiAgICAgICAgICAgIGNjaFN0YXR1cyA9IFwiRkFJTEVEXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbG9nTWVzc2FnZSA9IHtcclxuICAgICAgICAgICAgICAgIFwiZW52aXJvbm1lbnRcIjogZW52aXJvbm1lbnQsXHJcbiAgICAgICAgICAgICAgICBcIm1lc3NhZ2VcIjogXCJBbGwgYXBwcyBkZXBsb3llZCBzdWNjZXNzZnVsbHlcIlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGV4ZWN1dGlvblN0YXR1cy5wdXNoKGxvZ01lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBjY2hMYW1iZGFMb2dnZXIubG9nKFwiQXBwIGRlcGxveW1lbnQgc3RhdHVzIGluIGVudmlyb25tZW50czogXCIsIGV4ZWN1dGlvblN0YXR1cyk7XHJcbiAgICBjY2hMYW1iZGFMb2dnZXIubG9nKFwiT3ZlckFsbCBDQ0ggU3RhdHVzOiBcIiwgY2NoU3RhdHVzKTtcclxuXHJcbiAgICByZXR1cm4gY2NoU3RhdHVzO1xyXG59Il19