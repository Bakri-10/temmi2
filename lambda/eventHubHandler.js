import { EventHubFrameworkClient } from "@fineos-sdk/event-hub-framework";
import {
  GetAccountIdFromContext,
  GetRegionFromContext,
} from "@fineos-lambda-tools/helpers";
export const handler = async (event, context) => {
  console.log(`Received Event is:  ${JSON.stringify(event)}`);
  try {
    if (event.executionInput?.params?.custom?.eventData?.detail) {
      // validate and parse event
      let validatedEventData = await ValidateEvent(event);

      // get account details
      const accountId = GetAccountIdFromContext(context);
      const region = GetRegionFromContext(context);

      const instanceName = process.env.STAGE_PREFIX;

      // init EventHub client
      const eventHubClient = await EventHubFrameworkClient.init({
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
    } else {
      console.log("Not an EventHub execution event. Skipping...");
      return {
        statusCode: 200,
        body: "Not an EventHub execution event. Skipping...",
      };
    }
  } catch (err) {
    console.error(`Failed to send event: ${err}`);
    throw err;
  }
};

/**
 * Method to validate event.
 *
 * @param {any} event AWS Lambda Function event object
 */
export const ValidateEvent = async (event) => {
  const errorList = [];

  // Helper to get nested value safely
  const get = (path, obj) =>
    path.split(".").reduce((acc, key) => acc && acc[key], obj);

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
    throw new Error(
      `[Error] Event Validation Failed. Missing fields: ${errorList.join(
        ", "
      )}.`
    );
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
    let errorString =
      event.errorInfo?.error?.Cause ??
      event.errorInfo?.env_output?.[0]?.error?.Cause ??
      "";
    let truncatedErrorString = truncateByBytes(errorString, 350 * 1024); // 350 KB max
    data.error = {};
    data.error.Error =
      event.errorInfo?.error?.Error ??
      event.errorInfo?.env_output?.[0]?.error?.Error ??
      "";
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
