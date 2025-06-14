 export class CCHLambdaLogger {
    constructor(stagePrefix, region, account, cchVersion, context, kinesisEnabled,
            customerPrefix, customerZone, executionId, subflowExecutionId, fcchExecutionId, producerId) {
        this.counter = 0;
        this.stagePrefix = stagePrefix;
        this.region = region;
        this.account = account;
        this.cchVersion = cchVersion;
        this.customerPrefix = customerPrefix;
        this.customerZone = customerZone;
        this.executionId = executionId;
        this.context = context;
        this.kinesisEnabled = kinesisEnabled;
        this.subflowExecutionId = subflowExecutionId;
        this.fcchExecutionId = fcchExecutionId;
        this.producerId = producerId;
        
        console.log(`CCHLambdaLogger initialised with counter: ${this.counter}, stageprefix: ${this.stagePrefix}, region: ${this.region}, `,
            `account: ${this.account}, cchVersion: ${this.cchVersion}, customerPrefix: ${this.customerPrefix}, customerZone: ${customerZone}, executionId: ${this.executionId} `, 
            `context: ${JSON.stringify(this.context,undefined,2)}, kinesisEnabled: ${this.kinesisEnabled}, subflowExecutionId: ${this.subflowExecutionId}, fcchExecutionId: ${this.fcchExecutionId}, producerId: ${this.producerId}`);
    }

    error(errorOutput=""){
        let errorPrefix = "ERROR";
        if(this.kinesisEnabled === "true"){
            this.kinesisOut("", `ERROR - ${JSON.stringify(errorOutput)}`);          
        }else{
            console.error(errorPrefix, JSON.stringify(errorOutput, undefined, 2));
        }
    }

    log(logPrefix, logOutput){
        if(this.kinesisEnabled === "true"){
            if( typeof logOutput === 'undefined' || logOutput === null ) {
                this.kinesisOut(`${logPrefix}`, "");
            }
            else {
                this.kinesisOut(`${logPrefix} - ${JSON.stringify(logOutput)}`, "");
            }           
        }else{
            console.log(logPrefix, JSON.stringify(logOutput, undefined, 2));
        }
    }

    formatAWSServiceURL(){
        const generatedURL = `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/` + 
        `${this.context.logGroupName.replace(/\//ig, "$252F")}` +
        `/log-events/` + 
        `${this.context.logStreamName.replace("$", "").replace(/\//ig, "$252F").replace("[", "$255B$2524").replace("]", "$255D")}`

        return generatedURL;
    }

    kinesisOut(logOutput, errorOutput){
        let transactionId;

        if (
            !this.producerId ||
            this.producerId === undefined ||
            this.producerId === ''
        ) {
            transactionId = `${this.context.invokedFunctionArn}:${this.context.awsRequestId}`;
        } else {
            transactionId = this.producerId;
        }

        try{         
            console.log(JSON.stringify({
            "dataType": "INTERNAL",
            "spanName": this.context.functionName,
            "parentId": this.subflowExecutionId ? this.subflowExecutionId : this.fcchExecutionId,
            "sourceDetail": "lambda",
            "source": "FCCH",
            "userIdentifier": "fcch-operator",
            "time": Date.parse(new Date()),
            "transactionId": transactionId,
            "schemaVersion": "1.0.0",
            "zoneType": "INTERNAL",
            "additionalData": {
                "zone": this.customerZone ? this.customerZone : "",
                "accountIdentifier": this.account,
                "awsRegion": this.region,
                "environment": this.stagePrefix,
                "softwareVersion": this.cchVersion,
                "log": logOutput.replace(/\\"/g, ""),
                "exception": errorOutput,
                "logGroup": this.context.logGroupName,
                "logStream": this.context.logStreamName,
                "awsServiceURL": this.formatAWSServiceURL(),
                "awsService": "lambda",
                "customer": this.customerPrefix,
                "fcchExecutionId": this.fcchExecutionId,
                "startTime": Date.parse(new Date()),
                "executionContext": "TASK",
                "subOrderId": this.counter
            }
            }));
            this.counter++;
        }catch(err){
            console.error(err);
        }
    }
}


  
  