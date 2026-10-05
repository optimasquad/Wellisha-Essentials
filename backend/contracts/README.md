# Commerce wire contract

`openapi.json` describes the implemented HTTP foundation using
[OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html). Version 0.3.0 includes
quotes, owned payment details, signed webhook intake, staff packing/refund/cancel,
private document links, preferences, variants and prepacked kit configuration.
The contract does not enable checkout or imply provider acceptance. Version
0.2.0 adds paged catalog/category/detail, owned carts and pricing configuration
read/write operations. The product list changed from an array to a page envelope.
Advanced cross-SKU cart promotions and broader staff administration remain outside
this simple lifecycle scope; mixed-product bundles are stocked prepacked kits.

Update the contract with each controller/DTO change. From `storefront/`, run:

```powershell
npm run contracts:generate
npm run contracts:check
npm test
npm run typecheck
```

Commit `storefront/lib/generated/commerce-types.ts` and `commerce-client.ts` with the contract. The local
generator supports this contract's schema subset and rejects unsupported type
constructs. It generates DTOs and a fetch transport with encoded paths, retry-key
headers, no-store and safe status errors. It does not generate runtime validators.
Keep runtime checks for untrusted JSON. Kotlin int64 fields map to TypeScript
numbers; consumers must check safe integer ranges before arithmetic.

`CommerceContractHttpTest` checks route coverage and actual MVC response shapes,
including nullable shipment fields, bodyless 204s, errors and disabled checkout.
Run `gradlew.bat --offline :apps:api:test` from `backend/` with Java 21 configured.
These checks cover the current wire subset; they are not a general OpenAPI
validation suite or proof of database/provider/browser acceptance.

Bearer authentication applies to all customer endpoints. Category, product list
and product detail reads are public. Pricing configuration requires both a
custom Cognito scope and a server-owned database permission. Missing/invalid
bearer authentication can have an empty 401 body;
checkout disabled returns an empty 503. Address version conflicts return 404.
Catalog lists now support bounded pagination; account lists still have fixed
limits. The Next.js BFF has its
own local error shapes and exposes a subset of these routes.
