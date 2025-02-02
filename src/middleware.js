const crypto = require('crypto');

/**
 * Formats an error message with standardized structure
 * @param {Object} error - Error object containing details array
 * @param {Object} [details={}] - Additional details to include in the response
 * @returns {Object} Formatted error response
 * @throws {Error} If invalid error object is provided
 */
function formatErrorMessage(error, details = {}) {
    if (!error?.details?.length) {
        throw new Error("Invalid error object: must contain details array");
    }

    return {
        isValid: false,
        ...details,
        errors: error.details.map((err) => ({
            field: Array.isArray(err.path) ? err.path.join(".") : err.path,
            message: err.message,
        })),
    };
}

/**
 * Extracts relevant flag details from the request body
 * @param {Object} jsonBody - Request body containing flag information
 * @returns {Object} Extracted flag details
 */
function errorFlagDetails(jsonBody) {
    if (!jsonBody) {
        return {};
    }

    const { currentVersion, title, titleVerb } = jsonBody;
    if (!currentVersion) {
        return {};
    }

    const { _maintainer, name, kind, key, creationDate } = currentVersion;
    const maintainer = _maintainer ? { ..._maintainer } : {};
    delete maintainer._links;

    return {
        maintainer,
        flag: {
            name,
            kind,
            key,
            title,
            titleVerb,
            creationDate,
        },
    };
}

/**
 * Computes HMAC signature for webhook verification
 * @param {Object} jsonBody - Request body to sign
 * @param {string} secret - Secret key for signing
 * @returns {string} Computed signature
 * @throws {Error} If invalid parameters are provided
 */
function computeSignature(jsonBody, secret) {
    if (!jsonBody || !secret) {
        throw new Error("Both jsonBody and secret are required for signature computation");
    }

    return crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(jsonBody), "utf-8")
        .digest("hex");
}

/**
 * Checks if an error object contains any error details
 * @param {Object} error - Error object to check
 * @returns {boolean} True if error details exist
 */
function hasError(error) {
    return Boolean(error?.details?.length);
}

/**
 * Middleware to validate request body against a schema
 * @param {Object} schema - Joi schema object
 * @returns {Function} Express middleware function
 * @throws {Error} If invalid schema is provided
 */
function validateSchema(schema) {
    if (!schema?.validate) {
        throw new Error("Invalid schema: must have validate method");
    }

    return (req, res, next) => {
        try {
            const { error } = schema.validate(req.body, {
                abortEarly: false,
            });

            if (hasError(error)) {
                const errorPayload = formatErrorMessage(
                    error,
                    errorFlagDetails(req.body)
                );
                // TODO: Implement your failure handlers here:
                //   * Email notifications
                //   * Automatic flag deletion scheduling
                //   * Slack notifications
                //   * Audit logging
                return res.status(422).json(errorPayload);
            }

            next();
        } catch (err) {
            console.error("Schema validation error:", err);
            return res.status(500).json({
                isValid: false,
                errors: [{
                    field: "middleware",
                    message: "Internal validation error"
                }]
            });
        }
    };
}

/**
 * Middleware to verify webhook signatures
 * @param {string} headerAttr - Header attribute containing the signature
 * @param {string} secret - Secret key for signature verification
 * @returns {Function} Express middleware function
 * @throws {Error} If required parameters are missing
 */
function verifyWebhookSignature(headerAttr, secret) {
    if (!headerAttr || !secret) {
        throw new Error("Header attribute and secret are required");
    }

    return (req, res, next) => {
        try {
            const signature = req.get(headerAttr);
            
            if (!signature) {
                return res.status(401).json(formatErrorMessage({
                    details: [{
                        path: [headerAttr],
                        message: `Missing header: ${headerAttr}`
                    }]
                }, errorFlagDetails(req.body)));
            }

            const expectedSignature = computeSignature(req.body, secret);
            
            try {
                const isValidSignature = crypto.timingSafeEqual(
                    Buffer.from(signature, 'hex'),
                    Buffer.from(expectedSignature, 'hex')
                );

                if (!isValidSignature) {
                    return res.status(401).json(formatErrorMessage({
                        details: [{
                            path: [headerAttr],
                            message: "Invalid signature"
                        }]
                    }, errorFlagDetails(req.body)));
                }

                next();
            } catch (signatureError) {
                // Handle invalid hex encoding in signatures
                return res.status(401).json(formatErrorMessage({
                    details: [{
                        path: [headerAttr],
                        message: "Malformed signature"
                    }]
                }, errorFlagDetails(req.body)));
            }
        } catch (err) {
            console.error("Webhook verification error:", err);
            return res.status(500).json({
                isValid: false,
                errors: [{
                    field: "middleware",
                    message: "Internal verification error"
                }]
            });
        }
    };
}

module.exports = {
    verifyWebhookSignature,
    validateSchema,
    computeSignature
};
