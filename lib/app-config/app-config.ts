
import { load } from "js-yaml";
import { readFileSync } from "fs";
import { Tags } from "aws-cdk-lib";
import { FineosCloudControlHubStack } from "../fineos-cloud-control-hub-stack";

export interface RolesSchema {
    customer: string;
    source: string;
    vending: string;
}

export interface ObservabilitySchema {
    endpoint: string;
    zones: string[];
}

export interface EnvironmentSchema {
    account: string;
    region: string;
    maxConcurrency: number;
    envConcurrency: number;
}

export interface AppConfigSchema {
    environment: EnvironmentSchema;
    observability: ObservabilitySchema;
    roles: RolesSchema;
    tags: Record<string,string>;
}

export abstract class AppConfig {
   /**
     * Reads the provided config file.
     * @param path The path to the config file
     * @param configOverride object containing config. If provided overrides config in file.
    */
    public static loadConfig(path: string, configOverride:any|undefined): AppConfigSchema {
        let config:AppConfigSchema;
        if (configOverride !== undefined) {
            // use config overrides context argument
            console.log("configOverride has been provided, attempting to parse for config")
            try {
                config = JSON.parse(configOverride);
            }
            catch (e) {
                console.error("JSON Syntax Error in configOverride");
                throw new Error("JSON Syntax Error in configOverride");
            }
        }else{
            // read config file
            console.log("No configOverride has been provided, attempting to parse yaml file config")
            try{
                config = load(readFileSync(path).toString()) as AppConfigSchema;
            }
            catch (e) {
                console.error("Error processing config file");
                throw new Error("Error processing config file");
            }
        }
        console.log("App config: ", config)
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
    public static applyAndValidateTags(config:AppConfigSchema, packageInfo:any, envPrefix:string, stack:FineosCloudControlHubStack, stagePrefix:string): void {
        if(!config.tags?.BillingCode) {
            throw new Error("BillingCode tag is required for all deployments");
        } else if(!config.tags?.Owner) {
            throw new Error("Owner tag is required for all deployments");``
        } else if (envPrefix == 'eng' && (!config.tags?.Project)) {
            throw new Error("Project tag is required in the engineering organization");
        }

        Tags.of(stack).add("hub-version", packageInfo.version);
        Tags.of(stack).add("Environment", "Central");
        Tags.of(stack).add("IACVersion",  packageInfo.version ? packageInfo.version : 'Not Provided');
        Tags.of(stack).add("IACComponent", packageInfo.iacComponent ? packageInfo.iacComponent : packageInfo.name);
        Tags.of(stack).add("OrganisationUnitName", stagePrefix);

        if(config.tags) {
            const tagEntries = Object.entries(config.tags);
            tagEntries.map(([key, val]) => {
                Tags.of(stack).add(key, String(val));
            });
        }
    }
}
