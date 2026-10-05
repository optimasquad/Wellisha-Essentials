# Implementation status

Updated October 6, 2026. The implemented commerce scope is ready for review in
PR #1. Provider onboarding, environment configuration and external acceptance
remain open; this is not a production launch.

## Implemented

- Independent `wellisha-services` backend and `storefront` UI projects in one repo;
  API, schema initializer and worker build artifacts.
- Cognito token validation, owned addresses/carts/orders/tracking/inbox, scoped
  staff grants, safe errors, bounded bodies and redacted diagnostics.
- API-controlled percentage, fixed-amount, group-price and buy-X-get-Y offers;
  non-overlapping schedules, optimistic versions and audit history. Visible UI
  refreshes within 15 seconds and on focus/online without a UI release.
- Product families/variants and mixed-product prepacked kits with independent
  stock, declared contents and no nested/cross-SKU cart rules.
- Owned expiring quotes, explicit total confirmation, changed-version rejection,
  immutable orders, retry recovery, concurrent stock protection and timed expiry.
- Razorpay order adapter, signed raw-body durable webhook inbox, capture binding,
  late-payment review and GET reconciliation of uncertain outcomes.
- Staff parcel allocations/measurements, packed-ready confirmation, Amazon rates,
  single purchase attempt, private labels/document recovery and ordered tracking.
- Separate carrier cancellation and bounded full/partial refunds with staff
  reasons, durable attempts, provider reconciliation and audit records.
- Outbox/SQS consumers for payment, shipping, refund, SES email and SNS SMS;
  verified-contact opt-in, approved SMS text mapping and uncertain-send review.
- OpenAPI 0.3.0 and checked-in TypeScript DTO/transport generation, checkout,
  secure commerce sign-in/signup, staff operations and notification settings UI.
- ECS worker modes, queue routing, narrow optional provider-secret grants and
  private label access. Services remain at zero tasks and checkout disabled.

## Verification

Latest local checks: 49 backend unit/HTTP/provider tests, 36 real PostgreSQL 17.9
integration scenarios and all three boot JARs passed. Storefront: 23 tests,
TypeScript and generated DTO/client consistency checks passed. Ten headless
Chrome fixture tests passed, covering live price refresh, cart quantity retention,
quote confirmation/conflict, reload recovery, secure account screens, staff
packing/refund, notification opt-in and mobile layout. Six CDK tests passed.

PostgreSQL tests cover fresh/repeated schema initialization, unrelated-schema
preservation, restricted runtime permissions, staff scope plus database grants,
concurrency, quote ownership/expiry/address changes, uncertain/late payment,
webhook forgery/duplicates, refunds, parcels, label recovery/tracking, opt-out,
variants and prepacked kit stock/quote invalidation. Provider HTTP tests use
loopback fixtures; browser tests mock auth/BFF/provider SDK responses. Mobile and
staff screenshots and the lifecycle SVG/PNG were visually inspected. These are not live provider results.

## Remaining external work

Follow [provider signup and Secrets Manager setup](provider-setup.md) in parallel.
Razorpay/Amazon account approval, SES/SNS sandbox exits and India DLT approvals,
Cognito hosted login/staff scopes/MFA, real credentials, approved checkout policies,
RDS role grants/verified TLS, HTTPS/domain/web secret injection, alarms and recovery
sign-off are required before enabling checkout or starting services.

Real Cognito signup/login, provider sandbox capture/refund/reconciliation, approved
Amazon label printing and physical pickup/delivery/RTO, real notification delivery,
production secret rotation and deployment acceptance remain unverified. Cognito
refresh-token rotation/account linking, native mobile apps, media processing and
advanced cross-SKU cart promotions are outside this implemented scope. Amazon
rates requiring additional inputs/services are held for operator review.

Dependency release review remains open: the storefront install reported 28
advisories (including four critical); CDK has a bundled brace-expansion advisory.
Do not interpret passing tests as dependency-security clearance. No AWS deployment,
live payment, existing database modification or real customer send was performed.

See [lifecycle/runbook](commerce-lifecycle.md), [pricing rules](pricing-rules.md),
[lifecycle SVG](../architecture/commerce-lifecycle.svg) and
[agent guidance](../../.agents/commerce-lifecycle.md).
