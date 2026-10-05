# Commerce wire contract

`openapi.json` describes the implemented HTTP foundation using
[OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html). Future catalog detail,
cart, quote, payment, shipping intake and staff endpoints remain in the code plan.
The contract does not enable checkout or imply provider acceptance.

Update the contract with each controller/DTO change. From `storefront/`, run:

```powershell
npm run contracts:generate
npm run contracts:check
npm test
npm run typecheck
```

Commit `storefront/lib/generated/commerce-types.ts` with the contract. The local
generator supports this contract's schema subset and rejects unsupported type
constructs. It generates DTO types, not a transport client or runtime validators.
Keep runtime checks for untrusted JSON. Kotlin int64 fields map to TypeScript
numbers; consumers must check safe integer ranges before arithmetic.

`CommerceContractHttpTest` checks route coverage and actual MVC response shapes,
including nullable shipment fields, bodyless 204s, errors and disabled checkout.
Run `gradlew.bat --offline :apps:api:test` from `backend/` with Java 21 configured.
These checks cover the current wire subset; they are not a general OpenAPI
validation suite or proof of database/provider/browser acceptance.

Bearer authentication applies to all customer endpoints. Only GET /v1/products
is public. Missing/invalid bearer authentication can have an empty 401 body;
checkout disabled returns an empty 503. Address version conflicts return 404.
Lists currently have fixed limits without pagination. The Next.js BFF has its
own local error shapes and exposes a subset of these routes.
