#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const process_1 = require("process");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const fineos_cloud_control_hub_stack_1 = require("../lib/fineos-cloud-control-hub-stack");
const app_config_1 = require("../lib/app-config/app-config");
const packageInfo = __importStar(require("../package.json"));
const app = new aws_cdk_lib_1.App();
//get environment
const instanceName = app.node.tryGetContext("instanceName") || "staging";
const ctOrganization = app.node.tryGetContext("ct-organization") || "ENG";
if (instanceName === undefined) {
    console.error("Please provide a context variable for instanceName... For example -c instanceName=engineering ");
    (0, process_1.exit)(-1);
}
if (ctOrganization === undefined || !["QA", "ENG", "CUST"].includes(ctOrganization)) {
    console.error("Please provide a context variable for ct-organization... For example -c ct-organization=ENG  NOTE: must be one of QA, ENG or CUST.");
    (0, process_1.exit)(-1);
}
let config = app_config_1.AppConfig.loadConfig(`config/${ctOrganization.toLowerCase()}-app-config.yaml`, app.node.tryGetContext("configOverride"));
// Build props object
const props = {
    env: {
        account: config.environment.account,
        region: config.environment.region,
    },
    version: packageInfo.version,
    observability: config.observability,
    environment: config.environment,
    roles: config.roles,
    instanceName: instanceName,
    zone: ctOrganization,
};
// create stack
const stack = new fineos_cloud_control_hub_stack_1.FineosCloudControlHubStack(app, `${props.instanceName}-FineosCloudControlHubStack`, props);
app_config_1.AppConfig.applyAndValidateTags(config, packageInfo, ctOrganization, stack, instanceName);
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZW9zLWNsb3VkLWNvbnRyb2wtaHViLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL2ZpbmVvcy1jbG91ZC1jb250cm9sLWh1Yi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxxQ0FBK0I7QUFDL0IsNkNBQWtDO0FBQ2xDLDBGQUcrQztBQUMvQyw2REFBMEU7QUFDMUUsNkRBQStDO0FBRS9DLE1BQU0sR0FBRyxHQUFHLElBQUksaUJBQUcsRUFBRSxDQUFDO0FBRXRCLGlCQUFpQjtBQUNqQixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxTQUFTLENBQUM7QUFDekUsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsSUFBSSxLQUFLLENBQUM7QUFFMUUsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO0lBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQ1gsZ0dBQWdHLENBQ2pHLENBQUM7SUFDRixJQUFBLGNBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ1Y7QUFDRCxJQUFJLGNBQWMsS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFO0lBQ25GLE9BQU8sQ0FBQyxLQUFLLENBQ1gsb0lBQW9JLENBQ3JJLENBQUM7SUFDRixJQUFBLGNBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ1Y7QUFFRCxJQUFJLE1BQU0sR0FBb0Isc0JBQVMsQ0FBQyxVQUFVLENBQ2hELFVBQVUsY0FBYyxDQUFDLFdBQVcsRUFBRSxrQkFBa0IsRUFDeEQsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FDekMsQ0FBQztBQUVGLHFCQUFxQjtBQUNyQixNQUFNLEtBQUssR0FBb0M7SUFDN0MsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTztRQUNuQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNO0tBQ2xDO0lBQ0QsT0FBTyxFQUFFLFdBQVcsQ0FBQyxPQUFPO0lBQzVCLGFBQWEsRUFBRSxNQUFNLENBQUMsYUFBYTtJQUNuQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7SUFDL0IsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO0lBQ25CLFlBQVksRUFBRSxZQUFZO0lBQzFCLElBQUksRUFBRSxjQUFjO0NBQ3JCLENBQUM7QUFFRixlQUFlO0FBQ2YsTUFBTSxLQUFLLEdBQStCLElBQUksMkRBQTBCLENBQ3RFLEdBQUcsRUFDSCxHQUFHLEtBQUssQ0FBQyxZQUFZLDZCQUE2QixFQUNsRCxLQUFLLENBQ04sQ0FBQztBQUNGLHNCQUFTLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ3pGLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCBcInNvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlclwiO1xuaW1wb3J0IHsgZXhpdCB9IGZyb20gXCJwcm9jZXNzXCI7XG5pbXBvcnQgeyBBcHAgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7XG4gIEZpbmVvc0Nsb3VkQ29udHJvbEh1YlN0YWNrLFxuICBGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFja1Byb3BzLFxufSBmcm9tIFwiLi4vbGliL2ZpbmVvcy1jbG91ZC1jb250cm9sLWh1Yi1zdGFja1wiO1xuaW1wb3J0IHsgQXBwQ29uZmlnLCBBcHBDb25maWdTY2hlbWEgfSBmcm9tIFwiLi4vbGliL2FwcC1jb25maWcvYXBwLWNvbmZpZ1wiO1xuaW1wb3J0ICogYXMgcGFja2FnZUluZm8gZnJvbSBcIi4uL3BhY2thZ2UuanNvblwiO1xuXG5jb25zdCBhcHAgPSBuZXcgQXBwKCk7XG5cbi8vZ2V0IGVudmlyb25tZW50XG5jb25zdCBpbnN0YW5jZU5hbWUgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KFwiaW5zdGFuY2VOYW1lXCIpIHx8IFwic3RhZ2luZ1wiO1xuY29uc3QgY3RPcmdhbml6YXRpb24gPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KFwiY3Qtb3JnYW5pemF0aW9uXCIpIHx8IFwiRU5HXCI7XG5cbmlmIChpbnN0YW5jZU5hbWUgPT09IHVuZGVmaW5lZCkge1xuICBjb25zb2xlLmVycm9yKFxuICAgIFwiUGxlYXNlIHByb3ZpZGUgYSBjb250ZXh0IHZhcmlhYmxlIGZvciBpbnN0YW5jZU5hbWUuLi4gRm9yIGV4YW1wbGUgLWMgaW5zdGFuY2VOYW1lPWVuZ2luZWVyaW5nIFwiXG4gICk7XG4gIGV4aXQoLTEpO1xufVxuaWYgKGN0T3JnYW5pemF0aW9uID09PSB1bmRlZmluZWQgfHwgIVtcIlFBXCIsIFwiRU5HXCIsIFwiQ1VTVFwiXS5pbmNsdWRlcyhjdE9yZ2FuaXphdGlvbikpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICBcIlBsZWFzZSBwcm92aWRlIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgY3Qtb3JnYW5pemF0aW9uLi4uIEZvciBleGFtcGxlIC1jIGN0LW9yZ2FuaXphdGlvbj1FTkcgIE5PVEU6IG11c3QgYmUgb25lIG9mIFFBLCBFTkcgb3IgQ1VTVC5cIlxuICApO1xuICBleGl0KC0xKTtcbn1cblxubGV0IGNvbmZpZzogQXBwQ29uZmlnU2NoZW1hID0gQXBwQ29uZmlnLmxvYWRDb25maWcoXG4gIGBjb25maWcvJHtjdE9yZ2FuaXphdGlvbi50b0xvd2VyQ2FzZSgpfS1hcHAtY29uZmlnLnlhbWxgLFxuICBhcHAubm9kZS50cnlHZXRDb250ZXh0KFwiY29uZmlnT3ZlcnJpZGVcIilcbik7XG5cbi8vIEJ1aWxkIHByb3BzIG9iamVjdFxuY29uc3QgcHJvcHM6IEZpbmVvc0Nsb3VkQ29udHJvbEh1YlN0YWNrUHJvcHMgPSB7XG4gIGVudjoge1xuICAgIGFjY291bnQ6IGNvbmZpZy5lbnZpcm9ubWVudC5hY2NvdW50LFxuICAgIHJlZ2lvbjogY29uZmlnLmVudmlyb25tZW50LnJlZ2lvbixcbiAgfSxcbiAgdmVyc2lvbjogcGFja2FnZUluZm8udmVyc2lvbixcbiAgb2JzZXJ2YWJpbGl0eTogY29uZmlnLm9ic2VydmFiaWxpdHksXG4gIGVudmlyb25tZW50OiBjb25maWcuZW52aXJvbm1lbnQsXG4gIHJvbGVzOiBjb25maWcucm9sZXMsXG4gIGluc3RhbmNlTmFtZTogaW5zdGFuY2VOYW1lLFxuICB6b25lOiBjdE9yZ2FuaXphdGlvbixcbn07XG5cbi8vIGNyZWF0ZSBzdGFja1xuY29uc3Qgc3RhY2s6IEZpbmVvc0Nsb3VkQ29udHJvbEh1YlN0YWNrID0gbmV3IEZpbmVvc0Nsb3VkQ29udHJvbEh1YlN0YWNrKFxuICBhcHAsXG4gIGAke3Byb3BzLmluc3RhbmNlTmFtZX0tRmluZW9zQ2xvdWRDb250cm9sSHViU3RhY2tgLFxuICBwcm9wc1xuKTtcbkFwcENvbmZpZy5hcHBseUFuZFZhbGlkYXRlVGFncyhjb25maWcsIHBhY2thZ2VJbmZvLCBjdE9yZ2FuaXphdGlvbiwgc3RhY2ssIGluc3RhbmNlTmFtZSk7XG5hcHAuc3ludGgoKTtcbiJdfQ==