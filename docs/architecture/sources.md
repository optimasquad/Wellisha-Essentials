# Official Sources and Integration Evidence

Reviewed October 4, 2026. Architecture choices and numerical targets are recommendations; documentation links establish product capabilities, not access for Wellisha's accounts.

| Source | Supports |
| --- | --- |
| [Amazon Shipping onboarding](https://developer-docs.shipping.amazon.com/apis/docs/off-amazon-guide) | Selected off-Amazon Shipping integration and role/label approval |
| [Amazon Shipping rate/purchase workflow](https://developer-docs.shipping.amazon.com/apis/docs/tutorial-purchase-a-shipment-from-a-rate) | India header, rates, pickup windows, purchase and labels |
| [Amazon Shipping cancellation API](https://developer-docs.shipping.amazon.com/apis/reference/cancelshipment) | Shipment cancellation separate from payment refund |
| [Amazon Shipping tracking push](https://developer-docs.shipping.amazon.com/apis/docs/track-a-shipment-push-notifications) | Manual webhook onboarding and authenticated HTTPS |
| [Flipkart seller API](https://seller.flipkart.com/api-docs/FMSAPI.html) | Seller account and API access requirements |
| [Flipkart order management](https://seller.flipkart.com/api-docs/order-api-docs/OMAPIOverview.html) | Marketplace fulfillment lifecycle |
| [Meesho disclosure](https://investor.meesho.com/investor-web/_next/docs/ipo/meesho-udhrp1.pdf) | Describes logistics for Meesho-origin orders; does not establish an external-order API |
| [Cognito federation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html) | Federated identity options |
| [Cognito OIDC](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html) | External OIDC setup |
| [Microsoft OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc) | Personal and organization account audiences |
| [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/) | Native login and account-deletion considerations |
| [Transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) | Reliable event publication and idempotent consumption |
| [S3 notifications](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html) | Event-driven import triggers |
| [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/) | Signature and duplicate handling |
| [SES production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html) | Email sending readiness |
| [AWS India sender registration](https://docs.aws.amazon.com/sms-voice/latest/userguide/registrations-sms-senderid-india-support.html) | Local-route sender configuration |
| [India SMS identifiers](https://docs.aws.amazon.com/sms-voice/latest/userguide/registrations-sms-senderid-india-specify-ids.html) | Entity and template parameters |
| [Pinpoint transition](https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html) | SES and AWS End User Messaging service direction |
| [ECS scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html) | Serving-service scaling |
| [RDS Multi-AZ](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html) | Availability-zone redundancy |
| [ElastiCache overview](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html) | Managed Valkey cache |
| [AWS MediaConvert](https://docs.aws.amazon.com/mediaconvert/latest/ug/what-is.html) | File-based video processing and delivery renditions |
