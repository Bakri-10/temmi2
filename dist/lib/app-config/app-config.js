"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfig = void 0;
const js_yaml_1 = require("js-yaml");
const fs_1 = require("fs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class AppConfig {
    /**
      * Reads the provided config file.
      * @param path The path to the config file
      * @param configOverride object containing config. If provided overrides config in file.
     */
    static loadConfig(path, configOverride) {
        let config;
        if (configOverride !== undefined) {
            // use config overrides context argument
            console.log("configOverride has been provided, attempting to parse for config");
            try {
                config = JSON.parse(configOverride);
            }
            catch (e) {
                console.error("JSON Syntax Error in configOverride");
                throw new Error("JSON Syntax Error in configOverride");
            }
        }
        else {
            // read config file
            console.log("No configOverride has been provided, attempting to parse yaml file config");
            try {
                config = (0, js_yaml_1.load)((0, fs_1.readFileSync)(path).toString());
            }
            catch (e) {
                console.error("Error processing config file");
                throw new Error("Error processing config file");
            }
        }
        console.log("App config: ", config);
        return config;
    }
    /**
     * Validates stack tags and applies mandatory and custom tags to stack resources.
     * @param config config containing tag key pairs
     * @param packageInfo package json data to use in key values
     * @param envPrefix environment to determine which keys are mandatory
     * @param stack stack to apply tags to
     * @param stagePrefix stage name to apply to key value
     */
    static applyAndValidateTags(config, packageInfo, envPrefix, stack, stagePrefix) {
        var _a, _b, _c;
        if (!((_a = config.tags) === null || _a === void 0 ? void 0 : _a.BillingCode)) {
            throw new Error("BillingCode tag is required for all deployments");
        }
        else if (!((_b = config.tags) === null || _b === void 0 ? void 0 : _b.Owner)) {
            throw new Error("Owner tag is required for all deployments");
            ``;
        }
        else if (envPrefix == 'eng' && (!((_c = config.tags) === null || _c === void 0 ? void 0 : _c.Project))) {
            throw new Error("Project tag is required in the engineering organization");
        }
        aws_cdk_lib_1.Tags.of(stack).add("hub-version", packageInfo.version);
        aws_cdk_lib_1.Tags.of(stack).add("Environment", "Central");
        aws_cdk_lib_1.Tags.of(stack).add("IACVersion", packageInfo.version ? packageInfo.version : 'Not Provided');
        aws_cdk_lib_1.Tags.of(stack).add("IACComponent", packageInfo.iacComponent ? packageInfo.iacComponent : packageInfo.name);
        aws_cdk_lib_1.Tags.of(stack).add("OrganisationUnitName", stagePrefix);
        if (config.tags) {
            const tagEntries = Object.entries(config.tags);
            tagEntries.map(([key, val]) => {
                aws_cdk_lib_1.Tags.of(stack).add(key, String(val));
            });
        }
    }
}
exports.AppConfig = AppConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9hcHAtY29uZmlnL2FwcC1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EscUNBQStCO0FBQy9CLDJCQUFrQztBQUNsQyw2Q0FBbUM7QUE0Qm5DLE1BQXNCLFNBQVM7SUFDNUI7Ozs7T0FJRztJQUNLLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBWSxFQUFFLGNBQTRCO1FBQy9ELElBQUksTUFBc0IsQ0FBQztRQUMzQixJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUU7WUFDOUIsd0NBQXdDO1lBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0VBQWtFLENBQUMsQ0FBQTtZQUMvRSxJQUFJO2dCQUNBLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2FBQ3ZDO1lBQ0QsT0FBTyxDQUFDLEVBQUU7Z0JBQ04sT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7YUFDMUQ7U0FDSjthQUFJO1lBQ0QsbUJBQW1CO1lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkVBQTJFLENBQUMsQ0FBQTtZQUN4RixJQUFHO2dCQUNDLE1BQU0sR0FBRyxJQUFBLGNBQUksRUFBQyxJQUFBLGlCQUFZLEVBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQW9CLENBQUM7YUFDbkU7WUFDRCxPQUFPLENBQUMsRUFBRTtnQkFDTixPQUFPLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7Z0JBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQzthQUNuRDtTQUNKO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbkMsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSSxNQUFNLENBQUMsb0JBQW9CLENBQUMsTUFBc0IsRUFBRSxXQUFlLEVBQUUsU0FBZ0IsRUFBRSxLQUFnQyxFQUFFLFdBQWtCOztRQUM5SSxJQUFHLENBQUMsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxJQUFJLDBDQUFFLFdBQVcsQ0FBQSxFQUFFO1lBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQztTQUN0RTthQUFNLElBQUcsQ0FBQyxDQUFBLE1BQUEsTUFBTSxDQUFDLElBQUksMENBQUUsS0FBSyxDQUFBLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1lBQUEsRUFBRSxDQUFBO1NBQ2xFO2FBQU0sSUFBSSxTQUFTLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFBLE1BQUEsTUFBTSxDQUFDLElBQUksMENBQUUsT0FBTyxDQUFBLENBQUMsRUFBRTtZQUN0RCxNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7U0FDOUU7UUFFRCxrQkFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2RCxrQkFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLGtCQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDOUYsa0JBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0csa0JBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRXhELElBQUcsTUFBTSxDQUFDLElBQUksRUFBRTtZQUNaLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9DLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFO2dCQUMxQixrQkFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxDQUFDO1NBQ047SUFDTCxDQUFDO0NBQ0o7QUEvREQsOEJBK0RDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgeyBsb2FkIH0gZnJvbSBcImpzLXlhbWxcIjtcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgVGFncyB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgRmluZW9zQ2xvdWRDb250cm9sSHViU3RhY2sgfSBmcm9tIFwiLi4vZmluZW9zLWNsb3VkLWNvbnRyb2wtaHViLXN0YWNrXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sZXNTY2hlbWEge1xuICAgIGN1c3RvbWVyOiBzdHJpbmc7XG4gICAgc291cmNlOiBzdHJpbmc7XG4gICAgdmVuZGluZzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9ic2VydmFiaWxpdHlTY2hlbWEge1xuICAgIGVuZHBvaW50OiBzdHJpbmc7XG4gICAgem9uZXM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVudmlyb25tZW50U2NoZW1hIHtcbiAgICBhY2NvdW50OiBzdHJpbmc7XG4gICAgcmVnaW9uOiBzdHJpbmc7XG4gICAgbWF4Q29uY3VycmVuY3k6IG51bWJlcjtcbiAgICBlbnZDb25jdXJyZW5jeTogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFwcENvbmZpZ1NjaGVtYSB7XG4gICAgZW52aXJvbm1lbnQ6IEVudmlyb25tZW50U2NoZW1hO1xuICAgIG9ic2VydmFiaWxpdHk6IE9ic2VydmFiaWxpdHlTY2hlbWE7XG4gICAgcm9sZXM6IFJvbGVzU2NoZW1hO1xuICAgIHRhZ3M6IFJlY29yZDxzdHJpbmcsc3RyaW5nPjtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFwcENvbmZpZyB7XG4gICAvKipcbiAgICAgKiBSZWFkcyB0aGUgcHJvdmlkZWQgY29uZmlnIGZpbGUuXG4gICAgICogQHBhcmFtIHBhdGggVGhlIHBhdGggdG8gdGhlIGNvbmZpZyBmaWxlXG4gICAgICogQHBhcmFtIGNvbmZpZ092ZXJyaWRlIG9iamVjdCBjb250YWluaW5nIGNvbmZpZy4gSWYgcHJvdmlkZWQgb3ZlcnJpZGVzIGNvbmZpZyBpbiBmaWxlLlxuICAgICovXG4gICAgcHVibGljIHN0YXRpYyBsb2FkQ29uZmlnKHBhdGg6IHN0cmluZywgY29uZmlnT3ZlcnJpZGU6YW55fHVuZGVmaW5lZCk6IEFwcENvbmZpZ1NjaGVtYSB7XG4gICAgICAgIGxldCBjb25maWc6QXBwQ29uZmlnU2NoZW1hO1xuICAgICAgICBpZiAoY29uZmlnT3ZlcnJpZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gdXNlIGNvbmZpZyBvdmVycmlkZXMgY29udGV4dCBhcmd1bWVudFxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb25maWdPdmVycmlkZSBoYXMgYmVlbiBwcm92aWRlZCwgYXR0ZW1wdGluZyB0byBwYXJzZSBmb3IgY29uZmlnXCIpXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnT3ZlcnJpZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiSlNPTiBTeW50YXggRXJyb3IgaW4gY29uZmlnT3ZlcnJpZGVcIik7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSlNPTiBTeW50YXggRXJyb3IgaW4gY29uZmlnT3ZlcnJpZGVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgLy8gcmVhZCBjb25maWcgZmlsZVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJObyBjb25maWdPdmVycmlkZSBoYXMgYmVlbiBwcm92aWRlZCwgYXR0ZW1wdGluZyB0byBwYXJzZSB5YW1sIGZpbGUgY29uZmlnXCIpXG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgY29uZmlnID0gbG9hZChyZWFkRmlsZVN5bmMocGF0aCkudG9TdHJpbmcoKSkgYXMgQXBwQ29uZmlnU2NoZW1hO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgcHJvY2Vzc2luZyBjb25maWcgZmlsZVwiKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBwcm9jZXNzaW5nIGNvbmZpZyBmaWxlXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXBwIGNvbmZpZzogXCIsIGNvbmZpZylcbiAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZXMgc3RhY2sgdGFncyBhbmQgYXBwbGllcyBtYW5kYXRvcnkgYW5kIGN1c3RvbSB0YWdzIHRvIHN0YWNrIHJlc291cmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIGNvbmZpZyBjb250YWluaW5nIHRhZyBrZXkgcGFpcnNcbiAgICAgKiBAcGFyYW0gcGFja2FnZUluZm8gcGFja2FnZSBqc29uIGRhdGEgdG8gdXNlIGluIGtleSB2YWx1ZXNcbiAgICAgKiBAcGFyYW0gZW52UHJlZml4IGVudmlyb25tZW50IHRvIGRldGVybWluZSB3aGljaCBrZXlzIGFyZSBtYW5kYXRvcnlcbiAgICAgKiBAcGFyYW0gc3RhY2sgc3RhY2sgdG8gYXBwbHkgdGFncyB0b1xuICAgICAqIEBwYXJhbSBzdGFnZVByZWZpeCBzdGFnZSBuYW1lIHRvIGFwcGx5IHRvIGtleSB2YWx1ZVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgYXBwbHlBbmRWYWxpZGF0ZVRhZ3MoY29uZmlnOkFwcENvbmZpZ1NjaGVtYSwgcGFja2FnZUluZm86YW55LCBlbnZQcmVmaXg6c3RyaW5nLCBzdGFjazpGaW5lb3NDbG91ZENvbnRyb2xIdWJTdGFjaywgc3RhZ2VQcmVmaXg6c3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGlmKCFjb25maWcudGFncz8uQmlsbGluZ0NvZGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJpbGxpbmdDb2RlIHRhZyBpcyByZXF1aXJlZCBmb3IgYWxsIGRlcGxveW1lbnRzXCIpO1xuICAgICAgICB9IGVsc2UgaWYoIWNvbmZpZy50YWdzPy5Pd25lcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3duZXIgdGFnIGlzIHJlcXVpcmVkIGZvciBhbGwgZGVwbG95bWVudHNcIik7YGBcbiAgICAgICAgfSBlbHNlIGlmIChlbnZQcmVmaXggPT0gJ2VuZycgJiYgKCFjb25maWcudGFncz8uUHJvamVjdCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb2plY3QgdGFnIGlzIHJlcXVpcmVkIGluIHRoZSBlbmdpbmVlcmluZyBvcmdhbml6YXRpb25cIik7XG4gICAgICAgIH1cblxuICAgICAgICBUYWdzLm9mKHN0YWNrKS5hZGQoXCJodWItdmVyc2lvblwiLCBwYWNrYWdlSW5mby52ZXJzaW9uKTtcbiAgICAgICAgVGFncy5vZihzdGFjaykuYWRkKFwiRW52aXJvbm1lbnRcIiwgXCJDZW50cmFsXCIpO1xuICAgICAgICBUYWdzLm9mKHN0YWNrKS5hZGQoXCJJQUNWZXJzaW9uXCIsICBwYWNrYWdlSW5mby52ZXJzaW9uID8gcGFja2FnZUluZm8udmVyc2lvbiA6ICdOb3QgUHJvdmlkZWQnKTtcbiAgICAgICAgVGFncy5vZihzdGFjaykuYWRkKFwiSUFDQ29tcG9uZW50XCIsIHBhY2thZ2VJbmZvLmlhY0NvbXBvbmVudCA/IHBhY2thZ2VJbmZvLmlhY0NvbXBvbmVudCA6IHBhY2thZ2VJbmZvLm5hbWUpO1xuICAgICAgICBUYWdzLm9mKHN0YWNrKS5hZGQoXCJPcmdhbmlzYXRpb25Vbml0TmFtZVwiLCBzdGFnZVByZWZpeCk7XG5cbiAgICAgICAgaWYoY29uZmlnLnRhZ3MpIHtcbiAgICAgICAgICAgIGNvbnN0IHRhZ0VudHJpZXMgPSBPYmplY3QuZW50cmllcyhjb25maWcudGFncyk7XG4gICAgICAgICAgICB0YWdFbnRyaWVzLm1hcCgoW2tleSwgdmFsXSkgPT4ge1xuICAgICAgICAgICAgICAgIFRhZ3Mub2Yoc3RhY2spLmFkZChrZXksIFN0cmluZyh2YWwpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19