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
    tags: Record<string, string>;
}
export declare abstract class AppConfig {
    /**
      * Reads the provided config file.
      * @param path The path to the config file
      * @param configOverride object containing config. If provided overrides config in file.
     */
    static loadConfig(path: string, configOverride: any | undefined): AppConfigSchema;
    /**
     * Validates stack tags and applies mandatory and custom tags to stack resources.
     * @param config config containing tag key pairs
     * @param packageInfo package json data to use in key values
     * @param envPrefix environment to determine which keys are mandatory
     * @param stack stack to apply tags to
     * @param stagePrefix stage name to apply to key value
     */
    static applyAndValidateTags(config: AppConfigSchema, packageInfo: any, envPrefix: string, stack: FineosCloudControlHubStack, stagePrefix: string): void;
}
