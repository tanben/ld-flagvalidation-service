
function formatErrorMessage(error, details={}){
    
    return  {
        isValid: false,
        ...details,
        errors: error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }))
    };
}

function validateSchema(schema){
    return (req, res, next)=>{
        const jsonBody = req.body;
        const { error } = schema.validate(jsonBody ,{ 
            abortEarly: false 
         });

        if (typeof error !== 'undefined'){
            // Add your failure handler here:
            //   * Email notifications
            //   * Automatic flag deletion scheduling
            //   * Slack notifications
            //   * Audit logging 
            res.status(422).json(formatErrorMessage(error, errorFlagDetails(jsonBody)));
            
            return false;
        }
        next(); 
        
    }
}




function verifyWebhookSignature(headerAttr, secret){

    return (req, res, next)=>{
        const jsonBody = req.body;
        const error={details:[]};
        const webhookSignature = req.get(headerAttr);

        if (!webhookSignature){
            error.details=[ {path:[headerAttr], message:`Missing header:${headerAttr}`}];
        }else  if (webhookSignature && webhookSignature != secret) {
            error.details=[{path:[headerAttr], message:`Invalid signature`}];
        }

        if (error.details.length>0){
            // Add your failure handler here:
            //   * Email notifications
            //   * Automatic flag deletion scheduling
            //   * Slack notifications
            //   * Audit logging 

            res.status(401).json(formatErrorMessage(error, errorFlagDetails(jsonBody)));
            return false;
        }
        next();
    }   
    
}

function errorFlagDetails(jsonBody){
    if (!jsonBody){
        return {};
    }
    
    const {currentVersion,  title, titleVerb} = jsonBody;
    const {_maintainer:maintainer, name, kind,key, creationDate} = currentVersion;
    delete maintainer._links;
    
    return {
        maintainer, 
        flag:{
            name, kind, key, title, titleVerb, creationDate
        }
    };
}
module.exports ={
    verifyWebhookSignature,
    validateSchema
};