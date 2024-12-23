function formatErrorMessage(maintainer, error){

    return  {
        isValid: false,
        maintainer,
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
            const {_maintainer:maintainer} = jsonBody.currentVersion;
            delete maintainer._links;

            res.status(422).json(formatErrorMessage(maintainer, error));
            return false;
        }
        next(); 
        
    }
}


function verifyWebhookSignature(headerAttr, secret){

    return (req, res, next)=>{
        const error={details:[]};
        const webhookSignature = req.get(headerAttr);

        if (!webhookSignature){
            error.details=[ {path:[headerAttr], message:`Missing header:${headerAttr}`}];
        }else  if (webhookSignature && webhookSignature != secret) {
            error.details=[{path:[headerAttr], message:`Invalid signature`}];
        }

        if (error.details.length>0){
            res.status(401).json(formatErrorMessage(error));
            return false;
        }
        next();
    }   
    
}

module.exports = {
    validateSchema,
    verifyWebhookSignature
};