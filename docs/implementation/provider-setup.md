# Provider signup and configuration checklist

Use this guide in parallel with implementation. Keep separate staging and production
accounts/configuration. Do not send secret values in chat, commit them, or put them
in browser environment variables. This guide is being maintained with the code;
local integration tests do not replace the sandbox and operational checks below.

## Decisions to record before enabling checkout

| Setting | Development baseline | Required owner decision |
| --- | --- | --- |
| Shipping fee | 4900 paise | Approve fee, tax treatment and serviceability policy |
| Free shipping | subtotal strictly above 49900 paise | Approve threshold and whether equality qualifies |
| Quote validity | 300 seconds | Approve customer confirmation window |
| Stock reservation | 900 seconds | Approve payment window and late-payment handling |
| Refunds | staff authorized, total bounded by captured money | Approve cancellation, returns and partial-refund policy |
| Email/SMS | AWS SES / SNS | Confirm providers, sender identity and approved templates |

These are development settings, not approved commercial terms. Expired paid orders
go to manual review without automatic fulfillment. A refund never implies that a
shipment was cancelled or stock returned.

## Razorpay

1. Create the Wellisha merchant account, complete the dashboard's business/KYC and
   bank onboarding, and enable test mode before live activation.
2. Generate test API keys. Keep the key secret in the staging Secrets Manager entry;
   the public key ID reaches the customer only with an owned, stored provider order.
3. Configure automatic capture as agreed with Razorpay. Only captured funds authorize
   packing; a browser success callback or an authorized payment does not.
4. Configure the staging HTTPS webhook `/v1/webhooks/razorpay`, subscribe to
   `payment.captured`, and choose an independent webhook secret. Record the merchant
   `account_id` from an authentic test event. Intake verifies the exact raw bytes;
   worker processing also checks the account and stored provider order/amount/currency.
5. Exercise captured, failed, delayed and duplicate events, lost create responses,
   refund processing and reconciliation. Check receipts against the dashboard.
6. Repeat with separate live keys/webhook configuration only after launch review.

Secrets Manager name suggestion: `/wellisha/staging/razorpay`.

```json
{
  "keyId": "REPLACE_WITH_TEST_KEY_ID",
  "keySecret": "REPLACE_IN_SECRETS_MANAGER",
  "webhookSecret": "REPLACE_IN_SECRETS_MANAGER",
  "accountId": "REPLACE_WITH_MERCHANT_ACCOUNT_ID"
}
```

For controlled rotation, optionally add `previousWebhookSecret` while old deliveries
remain possible, then remove it after the approved retry overlap. Runtime caches
provider secrets for at most 60 seconds. Never overwrite staging with live values.
Set only `RAZORPAY_SECRET_ARN` on API/payment/refund tasks and grant those task roles
read access to that exact secret and its KMS key. Missing configuration fails safely.

References: [order creation](https://razorpay.com/docs/api/orders/create/),
[webhook verification](https://razorpay.com/docs/webhooks/validate-test/),
[normal refunds](https://razorpay.com/docs/api/refunds/create-normal/).

## Amazon Shipping India

1. Contact Amazon Shipping for Wellisha enrollment, registered store pickup/return
   addresses, serviceable postcodes, collection process and test-label approval.
2. For off-Amazon sales, follow the direct integration guide: create/register a
   Solution Provider Portal developer account, complete identity verification,
   request Amazon Logistics access, and register/authorize the application.
3. Obtain Login with Amazon client ID, client secret and authorized refresh token.
   Record the merchant/account identifier and approved pickup address separately.
4. Configure India business `AmazonShipping_IN` and the EU API endpoint. Test actual
   parcel dimensions/weight, rates, purchase, label retrieval and tracking with Amazon.
5. Confirm tracking-push authentication with the account manager before enabling
   intake. Do not assume it uses Razorpay's HMAC scheme. Polling is the fallback.
6. Perform label printing, physical pickup, tracking and delivery/RTO acceptance.
   A mocked shipment or label is not evidence of onboarding or real delivery.

Secrets Manager suggestion: `/wellisha/staging/amazon-shipping`:

```json
{
  "clientId": "REPLACE_WITH_LWA_CLIENT_ID",
  "clientSecret": "REPLACE_IN_SECRETS_MANAGER",
  "refreshToken": "REPLACE_IN_SECRETS_MANAGER"
}
```

Set `AMAZON_SHIPPING_SECRET_ARN` only for the shipping task. Pickup address,
business ID, carrier/service preferences, document bucket and region are configuration,
not secret credentials. Store private labels in encrypted S3 and authorize staff
downloads. Never repurchase an UNKNOWN booking automatically.

References: [direct signup](https://developer-docs.shipping.amazon.com/apis/docs/off-amazon-guide),
[rate and purchase](https://developer-docs.shipping.amazon.com/apis/docs/tutorial-purchase-a-shipment-from-a-rate),
[tracking](https://developer-docs.shipping.amazon.com/apis/docs/tutorial-track-a-shipment).

## AWS email and SMS

SES and SNS use ECS task roles; no SMTP password or long-lived AWS access key is
needed for SDK integration. Configure separate sender/template settings per environment.

1. In the intended AWS region, verify the Wellisha email domain, add required DNS
   records, configure the sender address and bounce/complaint handling. Test SES
   sandbox recipients and request production access for transactional mail.
2. In SNS SMS sandbox, verify test destination numbers. Configure sender identity,
   spending limits and delivery-status logging; request production access.
3. For India, complete the applicable company/sender/template registration with
   AWS End User Messaging and the approved DLT process before sending real messages.
   Record entity/template identifiers and approved message text; do not improvise
   transactional templates at runtime.
4. Grant notification tasks only the required SES/SNS actions. Test opt-out, bounce,
   throttling, failure and unknown outcomes. Notifications must not block shipping.

References: [SES production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html),
[SNS SMS sandbox](https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox.html),
[AWS India registration](https://docs.aws.amazon.com/sms-voice/latest/userguide/registrations-sms-senderid-india.html).

## Identity, database and storefront

- Configure separate Cognito user pools/app clients, issuer, redirect/sign-out URLs
  and access-token audience. Use staff MFA and narrow pricing/refund/packing scopes;
  server-owned issuer/subject permission grants are required in addition to scopes.
- Store distinct API/worker/schema database credentials as Secrets Manager JSON
  `{ "username": "...", "password": "..." }`. Schema credentials own DDL;
  runtime roles receive only necessary DML and no unrelated-schema privileges.
- The API uses `COGNITO_ISSUER`, `COGNITO_CLIENT_ID`, `DATABASE_JDBC_URL` with verified
  TLS, and `DATABASE_SECRET_ARN`. Public configuration is not stored as a password.
- Store NextAuth session encryption secret and any confidential OAuth client secret
  in a separate web secret. The web task must not receive commerce DB/provider secrets.
  `COMMERCE_API_URL` is the HTTPS backend URL; configure exact browser origins.
- Configure `CHECKOUT_SHIPPING_MINOR`, `CHECKOUT_FREE_SHIPPING_ABOVE_MINOR`,
  `CHECKOUT_QUOTE_SECONDS` and `CHECKOUT_RESERVATION_SECONDS` with approved values.
  Leave `CHECKOUT_ENABLED=false` until provider, browser and recovery acceptance pass.

## Exact nonsecret task settings

Secret ARNs and public identifiers are safe configuration; secret **values** belong
only in Secrets Manager. Replace placeholders there, not in committed examples.

| Task | Configuration |
| --- | --- |
| API | `COGNITO_ISSUER`, `COGNITO_CLIENT_ID`, `DATABASE_JDBC_URL`, `DATABASE_SECRET_ARN`, `RAZORPAY_SECRET_ARN`, `SHIPMENT_DOCUMENT_BUCKET`, exact allowed origins |
| Payment/refund workers | restricted DB settings, `WORKER_MODE`, own `QUEUE_URL_PAYMENT` / `QUEUE_URL_REFUND`, `RAZORPAY_SECRET_ARN` |
| Shipping worker | restricted DB settings, `WORKER_MODE=shipping`, `QUEUE_URL_SHIPPING`, `AMAZON_SHIPPING_SECRET_ARN`, `SHIPPING_ORIGIN_JSON`, `SHIPPING_MAX_CHARGE_MINOR`, optional `SHIPPING_GST_NUMBER`, `SHIPMENT_DOCUMENT_BUCKET` |
| Email worker | restricted DB settings, `WORKER_MODE=email`, `QUEUE_URL_EMAIL`, `EMAIL_FROM`, AWS region and SES task role |
| SMS worker | restricted DB settings, `WORKER_MODE=sms`, `QUEUE_URL_SMS`, `SMS_SENDER_ID`, `SMS_ENTITY_ID`, `SMS_TEMPLATES_JSON`, AWS region and SNS task role |
| Web | `COMMERCE_API_URL`, `COGNITO_ISSUER`, `COGNITO_CLIENT_ID`, `COGNITO_SCOPES`, `NEXTAUTH_URL`; inject `NEXTAUTH_SECRET` and `COGNITO_CLIENT_SECRET` from the web secret |

`SHIPPING_ORIGIN_JSON` is Amazon's address shape, for example:

```json
{"name":"Wellisha warehouse","addressLine1":"REPLACE","city":"REPLACE","stateOrRegion":"REPLACE","postalCode":"REPLACE","countryCode":"IN","phoneNumber":"REPLACE"}
```

`SHIPPING_MAX_CHARGE_MINOR` is a positive, approved carrier-cost cap in INR paise;
it is distinct from the customer shipping fee. `CHECKOUT_MAX_TOTAL_MINOR` defaults
to 10000000 paise; Razorpay payable orders must be at least 100 paise. Shipping fee,
free-shipping threshold, quote and reservation settings must match API and workers.

`SMS_TEMPLATES_JSON` maps **exact approved message text** to DLT template IDs. Add
all capture, refund and tracking texts from the repositories only after approval;
unmapped text is held rather than sent. Example structure (not approved content):

```json
{"Your refund has been processed.":"REPLACE_WITH_APPROVED_TEMPLATE_ID"}
```

### Cognito signup and staff configuration

1. Create the pool, a confidential web app client with a client secret, and hosted
   login domain. This NextAuth configuration requires `COGNITO_CLIENT_SECRET`.
   Enable self-service signup
   and password recovery as approved; configure email/phone verification. Add exact
   HTTPS NextAuth callback `/api/auth/callback/cognito` and sign-out URLs.
2. Enable authorization-code flow and scopes `openid email profile
   aws.cognito.signin.user.admin`. Set `COGNITO_SCOPES` accordingly. The last scope
   lets the server call Cognito GetUser for verified notification contacts; access
   tokens are not assumed to contain email/phone profile claims.
3. Create resource-server identifier `wellisha` with scopes `pricing.write`,
   `catalog.write`, `operations.read`, `packing.write`, `refund.write`,
   `shipping.cancel`. Enable only assigned staff scopes; require staff MFA and
   verify staff-specific access-token issuance with the deployment owner.
4. Provision issuer/subject grants using the controlled database administration
   role: `catalog.pricing.write`, `catalog.bundle.write`, `orders.operations.read`,
   `fulfillment.pack.write`, `orders.refund.write`, `fulfillment.cancel.write`.
   Runtime credentials cannot grant these. Test each permission independently.
5. Verify real signup, confirmation, login, recovery, sign-out, expiry and contact
   opt-in in staging. Refresh-token rotation/account linking are not implemented;
   expired sessions require signing in again.

### Secrets Manager inventory and CDK handoff

Create separate staging/production entries for Razorpay, Amazon Shipping, web
authentication and each schema/API/worker database role. SES/SNS need no API key
secret when using task roles. The web JSON contains `NEXTAUTH_SECRET` and, for a
confidential Cognito client, `COGNITO_CLIENT_SECRET`; inject fields as task secrets.
Do not grant the web task commerce database or provider-secret access.

Pass provider secret ARNs through CDK contexts `razorpaySecretArn` and
`amazonShippingSecretArn`. The stack grants only consuming roles access. Nonsecret
sender/origin/policy settings still need environment-specific task configuration;
the foundation does not invent account values. Provision least-privilege database
roles (including SELECT on `commerce.order_fulfillment_progress` and read-only
staff permission lookup), verified RDS TLS/CA, web secret injection, HTTPS/domain/Cognito settings,
alarms and operational access before increasing any service's desired count.

## Handoff record

Record account owner, environment, secret ARN (never value), configured nonsecret
settings, test evidence and approval date for each provider. Enable no live sends,
charges or AWS deployment as part of local integration verification. The deployment
guide and execution status track remaining infrastructure and acceptance work.
