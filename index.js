require('dotenv').config()
const express = require('express') 
const cors = require('cors'); 

const app = express() 
const port = 3000 
const schemas = require("./src/utils/schemas.js");

const {validateSchema, verifyWebhookSignature}=require('./src/middleware.js');
const WEBHOOK_SECRET=  process.env.WEBHOOK_SECRET;
const X_LD_HEADER=  process.env.X_LD_HEADER;

app.use(cors()); 
app.use(express.json()); // To parse JSON request
const router = express.Router();

router.get('/', (req, res) => res.send('Hello World!')) 


router.post('/validate-flag', verifyWebhookSignature(X_LD_HEADER, WEBHOOK_SECRET),  
            validateSchema(schemas.flagAction), 
            validateSchema(schemas.flagConfig),
            (req, res) => { 
                
                // Add your success handler here:
                //   * Email notifications
                //   * Automatic flag deletion scheduling
                //   * Slack notifications
                //   * Audit logging 


                res.json({isValid:true})
            });


app.use('/', router);
app.listen(port, () => console.log(`Example app listening on port ${port}!`))


 