import { CCHLambdaLogger } from "./cchLambdaLogger";
import { SNSClient, GetTopicAttributesCommand } from "@aws-sdk/client-sns";
import { EmailValidationError } from "./CCHErrors";

//get snsclient
const snsClient = new SNSClient();

//Funtion checks if atleast one email id is subscribed for given customer
async function validate_email_topic(event) {
    cchLambdaLogger.log("validate email topic for: ", event);
    let check = false;
    const input = {
        TopicArn: process.env.SNS_TOPIC_ARN + "-" + event.input.customer.customerPrefix
    }
    const command = new GetTopicAttributesCommand(input);
    const response = await snsClient.send(command);
    if (response.Attributes.SubscriptionsConfirmed < 1) {
        throw new EmailValidationError("At least one email for manual approval should be subscribed for customer prefix " + event.input.customer.customerPrefix);
    } else {
        cchLambdaLogger.log("Subscriptions Confirmed: ", response.Attributes.SubscriptionsConfirmed);
    }
    check = true;

    return new Promise ((resolve, reject) => {
        if (check === true){
        resolve(true)
        }
        else {
        reject(false)
        }
    })
}

//Function checks if atleast one email id is registered for given customer
async function validate_emails(event){
    
    cchLambdaLogger.log("Inside validate emails for: ", event);

    //validate emails
    if (!('emails' in event.config.customer.Item.config.M)) {
        throw new EmailValidationError("Email required to send the validation errors was not found in customer-account-config for customer prefix " + event.input.customer.customerPrefix);
    }
    else{
            const emails = event.config.customer.Item.config.M.emails
            if (!('L' in emails)) {
                throw new EmailValidationError("Email for customer prefix " + event.input.customer.customerPrefix + " should be an array in customer-account-config");
            }
            else {
                const emailsArray = event.config.customer.Item.config.M.emails.L
                if (emailsArray.length === 0) {
                throw new EmailValidationError("At least one email should be specified for customer prefix " + event.input.customer.customerPrefix + " in customer-account-config");
                }
            }
    }

    await validate_email_topic(event);    
}
 
var cchLambdaLogger;    
export const handler = async ( event,context ) => {

    cchLambdaLogger = new CCHLambdaLogger(process.env.STAGE_PREFIX, process.env.REGION, process.env.ACCOUNT, 
        process.env.CCH_VERSION, context, process.env.KINESIS_ENABLED, event.input.customer.customerPrefix, 
        event.input.customer.zone, '', '', event.input.custom.FCCH.FCCH_Execution, event.input.custom.FCCH.FCCH_Input['producer-id']);

    cchLambdaLogger.log("validateEmails lambda started", event);

    try{       
       
        await validate_emails(event);
    } catch (err) {
        cchLambdaLogger.error(err);
        throw err;
    }
}