"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateEvent = exports.handler = void 0;
const event_hub_framework_1 = require("@fineos-sdk/event-hub-framework");
const helpers_1 = require("@fineos-lambda-tools/helpers");
const handler = async (event, context) => {
    var _a, _b, _c, _d;
    console.log(`Received Event is:  ${JSON.stringify(event)}`);
    try {
        if ((_d = (_c = (_b = (_a = event.executionInput) === null || _a === void 0 ? void 0 : _a.params) === null || _b === void 0 ? void 0 : _b.custom) === null || _c === void 0 ? void 0 : _c.eventData) === null || _d === void 0 ? void 0 : _d.detail) {
            // validate and parse event
            let validatedEventData = await (0, exports.ValidateEvent)(event);
            // get account details
            const accountId = (0, helpers_1.GetAccountIdFromContext)(context);
            const region = (0, helpers_1.GetRegionFromContext)(context);
            const instanceName = process.env.STAGE_PREFIX;
            // init EventHub client
            const eventHubClient = await event_hub_framework_1.EventHubFrameworkClient.init({
                accountId: accountId,
                region: region,
                instanceName: instanceName,
            });
            await eventHubClient.publishFineosOrchestrationEvent({
                event: {
                    name: validatedEventData.detailType,
                    source: `event.${instanceName}.${event.component.toLowerCase()}`,
                    data: JSON.stringify(validatedEventData.data, null, 4),
                    envPrefix: validatedEventData.sourceCustomer.env,
                    sourceCustomer: validatedEventData.sourceCustomer,
                    targetCustomer: validatedEventData.targetCustomer,
                },
                producerEvent: {
                    id: validatedEventData.producerId,
                },
                orchestrationEvent: true,
            });
            return {
                statusCode: 200,
                body: "Event response sent",
            };
        }
        else {
            console.log("Not an EventHub execution event. Skipping...");
            return {
                statusCode: 200,
                body: "Not an EventHub execution event. Skipping...",
            };
        }
    }
    catch (err) {
        console.error(`Failed to send event: ${err}`);
        throw err;
    }
};
exports.handler = handler;
/**
 * Method to validate event.
 *
 * @param {any} event AWS Lambda Function event object
 */
const ValidateEvent = async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const errorList = [];
    // Helper to get nested value safely
    const get = (path, obj) => path.split(".").reduce((acc, key) => acc && acc[key], obj);
    // Helper to check for required fields
    const checkRequired = (path) => {
        if (get(path, event) === undefined || get(path, event) === null) {
            errorList.push(path);
        }
    };
    // Top-level checks
    checkRequired("status");
    checkRequired("component");
    const base = "executionInput.params.custom.eventData";
    // Validate required fields under eventData
    [
        "account",
        "source",
        "detail-type",
        "region",
        "resources",
        "detail.data",
        "detail.metadata.producer-id",
        "detail.metadata.target.customerPrefix",
        "detail.metadata.target.zone",
        "detail.metadata.target.type",
        "detail.metadata.source.customerPrefix",
        "detail.metadata.source.zone",
        "detail.metadata.source.type",
    ].forEach((field) => checkRequired(`${base}.${field}`));
    // Check for presence of entire metadata.source / metadata.target objects
    if (!get(`${base}.detail.metadata.target`, event)) {
        errorList.push(`${base}.detail.metadata.target`);
    }
    if (!get(`${base}.detail.metadata.source`, event)) {
        errorList.push(`${base}.detail.metadata.source`);
    }
    if (errorList.length > 0) {
        throw new Error(`[Error] Event Validation Failed. Missing fields: ${errorList.join(", ")}.`);
    }
    // All required fields are validated, safely extract return payload
    const metadata = get(`${base}.detail.metadata`, event);
    const source = metadata.source;
    const target = metadata.target;
    let data = {};
    data.arn = event.executionId;
    data.template = event.executionInput.template;
    data.customerPrefix = event.executionInput.params.customer.customerPrefix;
    data.zone = event.executionInput.params.customer.zone;
    data.envPrefix = event.executionInput.params.envPrefix;
    if (event.status === "CCH_EXECUTION_FAILED") {
        let errorString = (_h = (_c = (_b = (_a = event.errorInfo) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.Cause) !== null && _c !== void 0 ? _c : (_g = (_f = (_e = (_d = event.errorInfo) === null || _d === void 0 ? void 0 : _d.env_output) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.error) === null || _g === void 0 ? void 0 : _g.Cause) !== null && _h !== void 0 ? _h : "";
        let truncatedErrorString = truncateByBytes(errorString, 350 * 1024); // 350 KB max
        data.error = {};
        data.error.Error =
            (_r = (_l = (_k = (_j = event.errorInfo) === null || _j === void 0 ? void 0 : _j.error) === null || _k === void 0 ? void 0 : _k.Error) !== null && _l !== void 0 ? _l : (_q = (_p = (_o = (_m = event.errorInfo) === null || _m === void 0 ? void 0 : _m.env_output) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.error) === null || _q === void 0 ? void 0 : _q.Error) !== null && _r !== void 0 ? _r : "";
        data.error.Cause = truncatedErrorString;
    }
    return {
        producerId: metadata["producer-id"],
        data: data,
        component: event.component,
        sourceCustomer: {
            customerPrefix: source.customerPrefix,
            env: source.env,
            zone: source.zone,
            type: source.type,
        },
        targetCustomer: {
            customerPrefix: target.customerPrefix,
            env: target.env,
            zone: target.zone,
            type: target.type,
        },
        source: get(`${base}.source`, event),
        sourceAccount: get(`${base}.account`, event),
        sourceRegion: get(`${base}.region`, event),
        detailType: event.status,
        resources: get(`${base}.resources`, event),
    };
};
exports.ValidateEvent = ValidateEvent;
function truncateByBytes(str, maxBytes) {
    let encoder = new TextEncoder(); // standard API
    let encoded = encoder.encode(str);
    if (encoded.length <= maxBytes) {
        return str; // already within limit
    }
    // Truncate
    let truncated = encoded.slice(0, maxBytes);
    // Decode back to string safely
    let decoder = new TextDecoder();
    return decoder.decode(truncated);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRIdWJIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGFtYmRhL2V2ZW50SHViSGFuZGxlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5RUFBMEU7QUFDMUUsMERBR3NDO0FBQy9CLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7O0lBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVELElBQUk7UUFDRixJQUFJLE1BQUEsTUFBQSxNQUFBLE1BQUEsS0FBSyxDQUFDLGNBQWMsMENBQUUsTUFBTSwwQ0FBRSxNQUFNLDBDQUFFLFNBQVMsMENBQUUsTUFBTSxFQUFFO1lBQzNELDJCQUEyQjtZQUMzQixJQUFJLGtCQUFrQixHQUFHLE1BQU0sSUFBQSxxQkFBYSxFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXBELHNCQUFzQjtZQUN0QixNQUFNLFNBQVMsR0FBRyxJQUFBLGlDQUF1QixFQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25ELE1BQU0sTUFBTSxHQUFHLElBQUEsOEJBQW9CLEVBQUMsT0FBTyxDQUFDLENBQUM7WUFFN0MsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7WUFFOUMsdUJBQXVCO1lBQ3ZCLE1BQU0sY0FBYyxHQUFHLE1BQU0sNkNBQXVCLENBQUMsSUFBSSxDQUFDO2dCQUN4RCxTQUFTLEVBQUUsU0FBUztnQkFDcEIsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsWUFBWSxFQUFFLFlBQVk7YUFDM0IsQ0FBQyxDQUFDO1lBRUgsTUFBTSxjQUFjLENBQUMsK0JBQStCLENBQUM7Z0JBQ25ELEtBQUssRUFBRTtvQkFDTCxJQUFJLEVBQUUsa0JBQWtCLENBQUMsVUFBVTtvQkFDbkMsTUFBTSxFQUFFLFNBQVMsWUFBWSxJQUFJLEtBQUssQ0FB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eEIsU0FBUyxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksWUFBWSxFQUFFLEtBQUssQ0FBQztLQUMzQyxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBcEdXLFFBQUEsYUFBYSxpQkFvR3hCO0FBRUYsU0FBUyxlQUFlLENBQUMsR0FBRyxFQUFFLFFBQVE7SUFDcEMsSUFBSSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDLGVBQWU7SUFDaEQsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVsQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksUUFBUSxFQUFFO1FBQzlCLE9BQU8sR0FBRyxDQUFDLENBQUMsdUJBQXVCO0tBQ3BDO0lBRUQsV0FBVztJQUNYLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRTNDLCtCQUErQjtJQUMvQixJQUFJLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0lBQ2hDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNuQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXZlbnRIdWJGcmFtZXdvcmtDbGllbnQgfSBmcm9tIFwiQGZpbmVvcy1zZGsvZXZlbnQtaHViLWZyYW1ld29ya1wiO1xuaW1wb3J0IHtcbiAgR2V0QWNjb3VudElkRnJvbUNvbnRleHQsXG4gIEdldFJlZ2lvbkZyb21Db250ZXh0LFxufSBmcm9tIFwiQGZpbmVvcy1sYW1iZGEtdG9vbHMvaGVscGVyc1wiO1xuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQsIGNvbnRleHQpID0+IHtcbiAgY29uc29sZS5sb2coYFJlY2VpdmVkIEV2ZW50IGlzOiAgJHtKU09OLnN0cmluZ2lmeShldmVudCl9YCk7XG4gIHRyeSB7XG4gICAgaWYgKGV2ZW50LmV4ZWN1dGlvbklucHV0Py5wYXJhbXM/LmN1c3RvbT8uZXZlbnREYXRhPy5kZXRhaWwpIHtcbiAgICAgIC8vIHZhbGlkYXRlIGFuZCBwYXJzZSBldmVudFxuICAgICAgbGV0IHZhbGlkYXRlZEV2ZW50RGF0YSA9IGF3YWl0IFZhbGlkYXRlRXZlbnQoZXZlbnQpO1xuXG4gICAgICAvLyBnZXQgYWNjb3VudCBkZXRhaWxzXG4gICAgICBjb25zdCBhY2NvdW50SWQgPSBHZXRBY2NvdW50SWRGcm9tQ29udGV4dChjb250ZXh0KTtcbiAgICAgIGNvbnN0IHJlZ2lvbiA9IEdldFJlZ2lvbkZyb21Db250ZXh0KGNvbnRleHQpO1xuXG4gICAgICBjb25zdCBpbnN0YW5jZU5hbWUgPSBwcm9jZXNzLmVudi5TVEFHRV9QUkVGSVg7XG5cbiAgICAgIC8vIGluaXQgRXZlbnRIdWIgY2xpZW50XG4gICAgICBjb25zdCBldmVudEh1YkNsaWVudCA9IGF3YWl0IEV2ZW50SHViRnJhbWV3b3JrQ2xpZW50LmluaXQoe1xuICAgICAgICBhY2NvdW50SWQ6IGFjY291bnRJZCxcbiAgICAgICAgcmVnaW9uOiByZWdpb24sXG4gICAgICAgIGluc3RhbmNlTmFtZTogaW5zdGFuY2VOYW1lLFxuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGV2ZW50SHViQ2xpZW50LnB1Ymxpc2hGaW5lb3NPcmNoZXN0cmF0aW9uRXZlbnQoe1xuICAgICAgICBldmVudDoge1xuICAgICAgICAgIG5hbWU6IHZhbGlkYXRlZEV2ZW50RGF0YS5kZXRhaWxUeXBlLFxuICAgICAgICAgIHNvdXJjZTogYGV2ZW50LiR7aW5zdGFuY2VOYW1lfS4ke2V2ZW50LmNvbXBvbmVudC50b0xvd2VyQ2FzZSgpfWAsXG4gICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkodmFsaWRhdGVkRXZlbnREYXRhLmRhdGEsIG51bGwsIDQpLFxuICAgICAgICAgIGVudlByZWZpeDogdmFsaWRhdGVkRXZlbnREYXRhLnNvdXJjZUN1c3RvbWVyLmVudixcbiAgICAgICAgICBzb3VyY2VDdXN0b21lcjogdmFsaWRhdGVkRXZlbnREYXRhLnNvdXJjZUN1c3RvbWVyLFxuICAgICAgICAgIHRhcmdldEN1c3RvbWVyOiB2YWxpZGF0ZWRFdmVudERhdGEudGFyZ2V0Q3VzdG9tZXIsXG4gICAgICAgIH0sXG4gICAgICAgIHByb2R1Y2VyRXZlbnQ6IHtcbiAgICAgICAgICBpZDogdmFsaWRhdGVkRXZlbnREYXRhLnByb2R1Y2VySWQsXG4gICAgICAgIH0sXG4gICAgICAgIG9yY2hlc3RyYXRpb25FdmVudDogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAgIGJvZHk6IFwiRXZlbnQgcmVzcG9uc2Ugc2VudFwiLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJOb3QgYW4gRXZlbnRIdWIgZXhlY3V0aW9uIGV2ZW50LiBTa2lwcGluZy4uLlwiKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgICAgYm9keTogXCJOb3QgYW4gRXZlbnRIdWIgZXhlY3V0aW9uIGV2ZW50LiBTa2lwcGluZy4uLlwiLFxuICAgICAgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBzZW5kIGV2ZW50OiAke2Vycn1gKTtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5cbi8qKlxuICogTWV0aG9kIHRvIHZhbGlkYXRlIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7YW55fSBldmVudCBBV1MgTGFtYmRhIEZ1bmN0aW9uIGV2ZW50IG9iamVjdFxuICovXG5leHBvcnQgY29uc3QgVmFsaWRhdGVFdmVudCA9IGFzeW5jIChldmVudCkgPT4ge1xuICBjb25zdCBlcnJvckxpc3QgPSBbXTtcblxuICAvLyBIZWxwZXIgdG8gZ2V0IG5lc3RlZCB2YWx1ZSBzYWZlbHlcbiAgY29uc3QgZ2V0ID0gKHBhdGgsIG9iaikgPT5cbiAgICBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoKGFjYywga2V5KSA9PiBhY2MgJiYgYWNjW2tleV0sIG9iaik7XG5cbiAgLy8gSGVscGVyIHRvIGNoZWNrIGZvciByZXF1aXJlZCBmaWVsZHNcbiAgY29uc3QgY2hlY2tSZXF1aXJlZCA9IChwYXRoKSA9PiB7XG4gICAgaWYgKGdldChwYXRoLCBldmVudCkgPT09IHVuZGVmaW5lZCB8fCBnZXQocGF0aCwgZXZlbnQpID09PSBudWxsKSB7XG4gICAgICBlcnJvckxpc3QucHVzaChwYXRoKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gVG9wLWxldmVsIGNoZWNrc1xuICBjaGVja1JlcXVpcmVkKFwic3RhdHVzXCIpO1xuICBjaGVja1JlcXVpcmVkKFwiY29tcG9uZW50XCIpO1xuXG4gIGNvbnN0IGJhc2UgPSBcImV4ZWN1dGlvbklucHV0LnBhcmFtcy5jdXN0b20uZXZlbnREYXRhXCI7XG5cbiAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzIHVuZGVyIGV2ZW50RGF0YVxuICBbXG4gICAgXCJhY2NvdW50XCIsXG4gICAgXCJzb3VyY2VcIixcbiAgICBcImRldGFpbC10eXBlXCIsXG4gICAgXCJyZWdpb25cIixcbiAgICBcInJlc291cmNlc1wiLFxuICAgIFwiZGV0YWlsLmRhdGFcIixcbiAgICBcImRldGFpbC5tZXRhZGF0YS5wcm9kdWNlci1pZFwiLFxuICAgIFwiZGV0YWlsLm1ldGFkYXRhLnRhcmdldC5jdXN0b21lclByZWZpeFwiLFxuICAgIFwiZGV0YWlsLm1ldGFkYXRhLnRhcmdldC56b25lXCIsXG4gICAgXCJkZXRhaWwubWV0YWRhdGEudGFyZ2V0LnR5cGVcIixcbiAgICBcImRldGFpbC5tZXRhZGF0YS5zb3VyY2UuY3VzdG9tZXJQcmVmaXhcIixcbiAgICBcImRldGFpbC5tZXRhZGF0YS5zb3VyY2Uuem9uZVwiLFxuICAgIFwiZGV0YWlsLm1ldGFkYXRhLnNvdXJjZS50eXBlXCIsXG4gIF0uZm9yRWFjaCgoZmllbGQpID0+IGNoZWNrUmVxdWlyZWQoYCR7YmFzZX0uJHtmaWVsZH1gKSk7XG5cbiAgLy8gQ2hlY2sgZm9yIHByZXNlbmNlIG9mIGVudGlyZSBtZXRhZGF0YS5zb3VyY2UgLyBtZXRhZGF0YS50YXJnZXQgb2JqZWN0c1xuICBpZiAoIWdldChgJHtiYXNlfS5kZXRhaWwubWV0YWRhdGEudGFyZ2V0YCwgZXZlbnQpKSB7XG4gICAgZXJyb3JMaXN0LnB1c2goYCR7YmFzZX0uZGV0YWlsLm1ldGFkYXRhLnRhcmdldGApO1xuICB9XG4gIGlmICghZ2V0KGAke2Jhc2V9LmRldGFpbC5tZXRhZGF0YS5zb3VyY2VgLCBldmVudCkpIHtcbiAgICBlcnJvckxpc3QucHVzaChgJHtiYXNlfS5kZXRhaWwubWV0YWRhdGEuc291cmNlYCk7XG4gIH1cblxuICBpZiAoZXJyb3JMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgW0Vycm9yXSBFdmVudCBWYWxpZGF0aW9uIEZhaWxlZC4gTWlzc2luZyBmaWVsZHM6ICR7ZXJyb3JMaXN0LmpvaW4oXG4gICAgICAgIFwiLCBcIlxuICAgICAgKX0uYFxuICAgICk7XG4gIH1cbiAgLy8gQWxsIHJlcXVpcmVkIGZpZWxkcyBhcmUgdmFsaWRhdGVkLCBzYWZlbHkgZXh0cmFjdCByZXR1cm4gcGF5bG9hZFxuICBjb25zdCBtZXRhZGF0YSA9IGdldChgJHtiYXNlfS5kZXRhaWwubWV0YWRhdGFgLCBldmVudCk7XG4gIGNvbnN0IHNvdXJjZSA9IG1ldGFkYXRhLnNvdXJjZTtcbiAgY29uc3QgdGFyZ2V0ID0gbWV0YWRhdGEudGFyZ2V0O1xuXG4gIGxldCBkYXRhID0ge307XG4gIGRhdGEuYXJuID0gZXZlbnQuZXhlY3V0aW9uSWQ7XG4gIGRhdGEudGVtcGxhdGUgPSBldmVudC5leGVjdXRpb25JbnB1dC50ZW1wbGF0ZTtcbiAgZGF0YS5jdXN0b21lclByZWZpeCA9IGV2ZW50LmV4ZWN1dGlvbklucHV0LnBhcmFtcy5jdXN0b21lci5jdXN0b21lclByZWZpeDtcbiAgZGF0YS56b25lID0gZXZlbnQuZXhlY3V0aW9uSW5wdXQucGFyYW1zLmN1c3RvbWVyLnpvbmU7XG4gIGRhdGEuZW52UHJlZml4ID0gZXZlbnQuZXhlY3V0aW9uSW5wdXQucGFyYW1zLmVudlByZWZpeDtcblxuICBpZiAoZXZlbnQuc3RhdHVzID09PSBcIkNDSF9FWEVDVVRJT05fRkFJTEVEXCIpIHtcbiAgICBsZXQgZXJyb3JTdHJpbmcgPVxuICAgICAgZXZlbnQuZXJyb3JJbmZvPy5lcnJvcj8uQ2F1c2UgPz9cbiAgICAgIGV2ZW50LmVycm9ySW5mbz8uZW52X291dHB1dD8uWzBdPy5lcnJvcj8uQ2F1c2UgPz9cbiAgICAgIFwiXCI7XG4gICAgbGV0IHRydW5jYXRlZEVycm9yU3RyaW5nID0gdHJ1bmNhdGVCeUJ5dGVzKGVycm9yU3RyaW5nLCAzNTAgKiAxMDI0KTsgLy8gMzUwIEtCIG1heFxuICAgIGRhdGEuZXJyb3IgPSB7fTtcbiAgICBkYXRhLmVycm9yLkVycm9yID1cbiAgICAgIGV2ZW50LmVycm9ySW5mbz8uZXJyb3I/LkVycm9yID8/XG4gICAgICBldmVudC5lcnJvckluZm8/LmVudl9vdXRwdXQ/LlswXT8uZXJyb3I/LkVycm9yID8/XG4gICAgICBcIlwiO1xuICAgIGRhdGEuZXJyb3IuQ2F1c2UgPSB0cnVuY2F0ZWRFcnJvclN0cmluZztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcHJvZHVjZXJJZDogbWV0YWRhdGFbXCJwcm9kdWNlci1pZFwiXSxcbiAgICBkYXRhOiBkYXRhLFxuICAgIGNvbXBvbmVudDogZXZlbnQuY29tcG9uZW50LFxuICAgIHNvdXJjZUN1c3RvbWVyOiB7XG4gICAgICBjdXN0b21lclByZWZpeDogc291cmNlLmN1c3RvbWVyUHJlZml4LFxuICAgICAgZW52OiBzb3VyY2UuZW52LFxuICAgICAgem9uZTogc291cmNlLnpvbmUsXG4gICAgICB0eXBlOiBzb3VyY2UudHlwZSxcbiAgICB9LFxuICAgIHRhcmdldEN1c3RvbWVyOiB7XG4gICAgICBjdXN0b21lclByZWZpeDogdGFyZ2V0LmN1c3RvbWVyUHJlZml4LFxuICAgICAgZW52OiB0YXJnZXQuZW52LFxuICAgICAgem9uZTogdGFyZ2V0LnpvbmUsXG4gICAgICB0eXBlOiB0YXJnZXQudHlwZSxcbiAgICB9LFxuICAgIHNvdXJjZTogZ2V0KGAke2Jhc2V9LnNvdXJjZWAsIGV2ZW50KSxcbiAgICBzb3VyY2VBY2NvdW50OiBnZXQoYCR7YmFzZX0uYWNjb3VudGAsIGV2ZW50KSxcbiAgICBzb3VyY2VSZWdpb246IGdldChgJHtiYXNlfS5yZWdpb25gLCBldmVudCksXG4gICAgZGV0YWlsVHlwZTogZXZlbnQuc3RhdHVzLFxuICAgIHJlc291cmNlczogZ2V0KGAke2Jhc2V9LnJlc291cmNlc2AsIGV2ZW50KSxcbiAgfTtcbn07XG5cbmZ1bmN0aW9uIHRydW5jYXRlQnlCeXRlcyhzdHIsIG1heEJ5dGVzKSB7XG4gIGxldCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7IC8vIHN0YW5kYXJkIEFQSVxuICBsZXQgZW5jb2RlZCA9IGVuY29kZXIuZW5jb2RlKHN0cik7XG5cbiAgaWYgKGVuY29kZWQubGVuZ3RoIDw9IG1heEJ5dGVzKSB7XG4gICAgcmV0dXJuIHN0cjsgLy8gYWxyZWFkeSB3aXRoaW4gbGltaXRcbiAgfVxuXG4gIC8vIFRydW5jYXRlXG4gIGxldCB0cnVuY2F0ZWQgPSBlbmNvZGVkLnNsaWNlKDAsIG1heEJ5dGVzKTtcblxuICAvLyBEZWNvZGUgYmFjayB0byBzdHJpbmcgc2FmZWx5XG4gIGxldCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKCk7XG4gIHJldHVybiBkZWNvZGVyLmRlY29kZSh0cnVuY2F0ZWQpO1xufVxuIl19