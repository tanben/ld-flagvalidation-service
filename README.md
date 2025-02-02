# Feature Flag Validation Service

A sample webhook service that validates feature flag configurations against organization standards when flags are created in LaunchDarkly. This service acts as a complementary solution to LaunchDarkly's flag templates, helping teams enforce advanced validation rules and standards that may not be available through the native flag template features. 

## Features

* Enforces flag naming conventions (e.g., check for flag prefix)
* Validates required metadata (maintainer, description, tags)
* Provides extensible framework for custom actions on validation failures:
  * Email notifications
  * Automatic flag deletion scheduling
  * Slack notifications
  * Audit logging

## Architecture

The service implements a validation pipeline that processes incoming webhook events from LaunchDarkly:

![image](./img/components.png)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/validate-flag` | Validates feature flag configuration against defined rules |

## Getting Started

### Prerequisites

* [LaunchDarkly Account](https://launchdarkly.com/) with admin access
* [LaunchDarkly Webhook Integration](https://docs.launchdarkly.com/home/infrastructure/webhooks) configured
* Node.js 16.x or higher
* [Insomnia](https://insomnia.rest/) (optional, for API testing)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your webhook secret:
   ```bash
   WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
   ```
5. Start the service:
   ```bash
   npm start
   ```

### LaunchDarkly Webhook Configuration

1. Create a new webhook in LaunchDarkly (Settings > Integrations > Webhooks)
2. Configure the webhook policy to receive flag creation events:
   ```json
   [
     {
       "effect": "allow",
       "actions": ["createFlag"],
       "resources": ["proj/sandbox:env/*:flag/*"]
     }
   ]
   ```
3. Copy the webhook secret and update your `.env` file

## Testing

### Using Insomnia

1. Set `WEBHOOK_SECRET=test` in your `.env` file
2. Import the test collection:
   * Import `insomnia-api-tests.json` for local testing
   * Import `insomnia-api-azure-tests.json` for Azure deployment testing
3. Read [Insomnia Docs: Import and Export Data](https://docs.insomnia.rest/insomnia/import-export-data) for detailed instructions

> Note: The `x-ld-signature` header is the HMAC SHA256 hex digest of the webhook payload using the secret as the key.

## Sample Validation Rules

This service demonstrates how to use the Joi validation library to implement custom validation rules for LaunchDarkly feature flags. The example below shows some basic validation rules you could implement:

* **Action Type**: Validates the webhook action is `createFlag`
* **Flag Name**: Shows how to enforce naming conventions (e.g., requiring `ff_` prefix)
* **Flag Kind**: Demonstrates validating against an enum of allowed flag types
* **Description**: Shows required field validation
* **Tags**: Demonstrates array validation (requiring at least one tag)
* **Maintainer**: Shows nested object validation

You can extend or modify these validation rules by updating the Joi schema to match your organization's requirements.

### Example Payload

```json
{
  "accesses": [
    {
      "action": "createFlag",
      "resource": "proj/project-key:env/env-key:flag/flag-key"
    }
  ],
  "currentVersion": {
    "name": "ff_flag",
    "kind": "boolean",
    "description": "sample description",
    "key": "ff_flag_key",
    "tags": ["sampleTag001"],
    "_maintainer": {
      "_id": "1234567890",
      "firstName": "Ray",
      "lastName": "Banister",
      "role": "owner",
      "email": "rbanister@examples.com"
    }
  }
}
```

For complete webhook payload documentation, see [LaunchDarkly Webhook API Documentation](https://apidocs.launchdarkly.com/tag/Webhooks#section/Designating-the-payload).

