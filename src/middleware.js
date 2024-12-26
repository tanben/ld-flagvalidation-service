function formatErrorMessage(error, details = {}) {
    if (!error?.details) {
        throw new Error("Invalid error object provided");
    }

    return {
        isValid: false,
        ...details,
        errors: error.details.map((err) => ({
            field: err.path.join("."),
            message: err.message,
        })),
    };
}

function errorFlagDetails(jsonBody) {
    if (!jsonBody) {
        return {};
    }

    const { currentVersion, title, titleVerb } = jsonBody;
    const { _maintainer, name, kind, key, creationDate } = currentVersion;
    const maintainer = { ..._maintainer };
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

function hasError(error) {
    return error?.details?.length > 0;
}

function validateSchema(schema) {
    if (!schema?.validate) {
        throw new Error("Invalid schema.");
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
                errors: [
                    {
                        field: "middleware",
                        message: "Internal validation error",
                    },
                ],
            });
        }
    };
}

function verifyWebhookSignature(headerAttr, secret) {
    if (!headerAttr || !secret) {
        throw new Error("Header attribute and secret are required");
    }

    return (req, res, next) => {
        try {
            const webhookSignature = req.get(headerAttr);
            const error = { details: [] };

            if (!webhookSignature) {
                error.details.push({
                    path: [headerAttr],
                    message: `Missing header: ${headerAttr}`,
                });
            } else if (webhookSignature !== secret) {
                error.details.push({
                    path: [headerAttr],
                    message: "Invalid signature",
                });
            }

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
                return res.status(401).json(errorPayload);
            }

            next();
        } catch (err) {
            console.error("Webhook verification error:", err);
            return res.status(500).json({
                isValid: false,
                errors: [
                    {
                        field: "middleware",
                        message: "Internal verification error",
                    },
                ],
            });
        }
    };
}

module.exports = {
    verifyWebhookSignature,
    validateSchema,
};
