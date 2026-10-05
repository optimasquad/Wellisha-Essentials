# Wellisha test-case specification

Status: 78 planned acceptance cases; a subset has executable coverage. See [execution status](execution-status.md) for verified results and open gates. Link each endpoint/business invariant to work package, test name, owner and CI evidence. Add cases for changed requirements and discovered bugs; coverage percentages alone do not prove completeness.

October 5 resumed verification: all nine `CustomerOrderPostgresTest` scenarios
passed on isolated PostgreSQL 17.9, including owned resources, address versions,
order idempotency and concurrent stock writes. Three `CommerceContractHttpTest`
tests passed for route parity, successful response serialization and error/empty
response shapes. These results cover a foundation subset, not all planned cases.

Use Kotlin/JUnit, Spring HTTP/security, real PostgreSQL Testcontainers with Flyway, WireMock provider HTTP stubs, Playwright, approved native device tooling and isolated AWS staging. Integration tests must inspect both HTTP results and database state. Seed two customers and separate staff identities. SQL injection tests exercise the real repository/database path, rather than mocking SQL away.

## Unit tests

| ID | Suggested suite | Scenario | Expected result |
| --- | --- | --- | --- |
| U01 | MoneyTest | Rounding and Long overflow | Exact minor units; overflow rejected |
| U02 | QuotePolicyTest | Expired/changed quote and invalid promo | New accepted quote required; browser cannot override totals |
| U03 | ReservationPolicyTest | Expiry and negative/oversized quantities | Defined expiry; invalid quantity rejected |
| U04 | OrderStateTest | Every allowed/forbidden transition | Legal transitions with expected version only |
| U05 | RefundPolicyTest | Completed and pending refunds | Available amount never exceeds captured money |
| U06 | PermissionPolicyTest | Customer/support/refund/catalog permissions | Explicit matrix; deny by default |
| U07 | QueryOptionTest | SQL fragments and unknown sort/filter options | Reject before query execution |
| U08 | RetryPolicyTest | Known failure versus ambiguous provider outcome | Reconcile unknown outcome; bounded retry |
| U09 | SecretRedactionTest | Secrets in exceptions and logs | Redacted values and safe correlation IDs |
| U10 | PayloadSchemaTest | JSONB size/type/unknown fields/version | Validated bounded extension metadata |

## HTTP, PostgreSQL and security integration

| ID | Suggested suite | Scenario | Expected result |
| --- | --- | --- | --- |
| I01 | MigrationIT | Clean install and repeat Flyway run | Expected tables/constraints/indexes; repeat safe |
| I02 | SchemaIsolationIT | Initialize the fresh commerce namespace alongside unrelated tables | Unrelated schemas/data remain unchanged; no legacy data import |
| I03 | SchemaCompatibilityIT | Old readers with expanded schema | Rolling deploy/rollback remains compatible |
| I04 | RuntimePrivilegesIT | DDL/grant/unrelated schema access attempts | Denied; no superuser/schema ownership |
| I05 | TokenValidationIT | Wrong issuer/signature/client/token type or expiry | 401 and no protected mutation |
| I06 | OwnershipIT | User A reads/writes B address/cart/order/shipment/case/refund | Every endpoint rejects without leaking data |
| I07 | StaffAuthorizationIT | Customer/unprivileged/stale staff executes operations | Current permissions and MFA enforced |
| I08 | RequestValidationIT | Mass assignment and excessive/negative input | Safe rejection; bounded work |
| I09 | SqlInjectionIT | Quoted, boolean/comment, UNION and stacked query payloads | Bound literals or safe errors; no broadened reads/writes |
| I10 | SqlInjectionIT | Malicious sort/column/JSONB path/LIKE/cursor | Allowlisted structure and bound values |
| I11 | SqlInjectionIT | Valid apostrophes and Unicode | Legitimate input works under documented search policy |
| I12 | SqlInjectionIT | Inspect database after attack requests | Tables/counts/grants and customer isolation unchanged |
| I13 | QuoteIT | Fake browser discount/price/address/stale quote | Server pricing and ownership prevail |
| I14 | StockConcurrencyIT | Concurrent checkouts for last unit | At most one reservation; no negative inventory |
| I15 | OrderIdempotencyIT | Same key replay and changed payload | Stable result; changed request conflicts |
| I16 | PaymentBindingIT | Wrong owner/order/amount/currency | No paid transition, OrderPaid or dispatch |
| I17 | BrowserReturnIT | Return callback without captured verification | Pending/rejected; never dispatch based on browser alone |
| I18 | WebhookInboxIT | Bad raw-body signature and DB failure | No success acknowledgement without valid durable inbox |
| I19 | PaymentEventIT | Duplicate/out-of-order captures | One legal transition and durable outbox |
| I20 | LateCaptureIT | Capture after reservation expiry | Fresh stock check or compensating refund |
| I21 | RefundConcurrencyIT | Concurrent refund intents | Completed + in-flight intents bounded by captured money |
| I22 | CancelDispatchRaceIT | Cancellation races provider submission | Serialize intent; reconcile possible acceptance |
| I23 | SupportCaseIT | Customer opens cancellation-related case | Case saved; order/payment unchanged |
| I24 | OutboxCrashIT | Crash before/after publish/dispatch marker | Recoverable event; duplicate-safe local processing |
| I25 | ConsumerReceiptIT | Duplicate/order changes/crash near commit/ack | Durable receipts/versions before acknowledgement |
| I26 | WorkerLeaseIT | Slow job visibility/lease expiry | Controlled recovery; stable external reference |
| I27 | DlqReplayIT | Denied/authorized replay | Permission enforced; replay audited and idempotent |
| I28 | AsyncOrderResponseIT | Commit failure/success with slow provider | Failure not accepted; successful commit returns owned 202/status URL |
| I29 | AsyncPaymentSetupIT | Pending/ready/failed/unknown/repeated click | Binding before checkout; honest status; no blind duplicate |
| I30 | TrackingIT | Split/stale/out-of-order events | Separate timelines; freshness label; no state regression |
| I31 | CatalogCacheIT | Invalidation/cache miss/outage/stampede | Versioned release and bounded fallback; checkout revalidates |
| I32 | PrivateCacheIT | Two customers and personalized response headers | No shared/private-data caching or leakage |
| I33 | MediaApprovalIT | Unapproved media/private invoice/recursive event | Approved public assets only; private access; no processing loop |

## WireMock and provider integration

| ID | Suggested suite | Scenario | Expected result |
| --- | --- | --- | --- |
| W01 | PaymentAdapterIT | Provider order creation | Exact amount/currency/reference; stored binding |
| W02 | PaymentAdapterIT | Connection loss after possible acceptance | Unknown attempt retained; reconcile before retry |
| W03 | ProviderRetryIT | 401/429/5xx and Retry-After | Bounded status-specific retries/auth failure |
| W04 | ProviderPayloadIT | Malformed/missing/unexpected provider response | No false paid/shipped/refunded state |
| W05 | FulfillmentAdapterIT | Duplicate job/lost response | Stable merchant reference; no uncontrolled duplicate shipment |
| W06 | RefundAdapterIT | Ambiguity and repeated refund outcome | One bounded intent; reconciled result |
| W07 | TrackingAdapterIT | Split/partial/late shipments | Normalization matches approved fixtures |
| W08 | NotificationAdapterIT | Failed/delayed notification | Independent retry; order remains committed |
| W09 | ProviderContractIT | Real sandbox versus fixture assumptions | Endpoint/auth/idempotency contract verified |

## AWS, secrets and deployment

| ID | Suggested suite | Scenario | Expected result |
| --- | --- | --- | --- |
| A01 | SecretsManagerStagingIT | Missing/denied/malformed/wrong-environment secret | Fail safely; exact IAM/KMS scope |
| A02 | SecretRotationIT | Rotation under concurrent traffic | Validated refresh/pool recycling or injected-secret redeploy |
| A03 | SecretLeakCheck | Bundles/images/logs/actuator/CI artifacts | No credentials; roles/OIDC for AWS |
| A04 | QueueStagingIT | Real SQS redrive/visibility/IAM behavior | Recovery and permissions verified in staging |
| A05 | ScalingLoadIT | Independent service scaling/catalog bursts/backlog | DB/provider concurrency budgets and measured latency respected |
| A06 | RestoreCutoverIT | PITR/migration interruption/canary rollback | Reconciled orders/jobs; one side-effecting writer |
| A07 | SecurityReview | Auth/query/upload/SSRF/abuse/penetration testing | No unresolved critical/high/payment-integrity blockers |

## UI and end-to-end

| ID | Suggested suite | Scenario | Expected result |
| --- | --- | --- | --- |
| E01 | ShoppingE2E | Collection/product/cart desktop and narrow screens | Approved media; accessible empty/sold-out and pricing states |
| E02 | CheckoutE2E | Pending setup/verification/failure/reload | Honest status; stable order; no fulfillment wait |
| E03 | TrackingSupportE2E | Owned split/stale tracking and support | Ownership; no customer cancellation execution |
| E04 | StaffOperationsE2E | MFA/permission/cancel race/refund limits | Restricted audited workflow |
| E05 | SessionE2E | Redirect/logout/CSRF/refresh/expiry | No token exposure; valid session required |
| E06 | NativeDeviceE2E | Proposed mobile payment/deep-link/offline/restart | Secure storage; stable recovery; release builds verified |
| E07 | AccessibilityE2E | Keyboard/focus/errors/screen reader/touch | Critical journeys usable and understandable |

## Execution and release gates

Unit tests use deterministic clocks/IDs. Integration tests run clean migrations and concurrent transactions on disposable real PostgreSQL. WireMock exercises adapter requests, delays, connection faults and response validation; verify stable provider references and absence of unsafe retries. Provider sandbox tests prove that mocks match real contracts. AWS staging covers real IAM, Cognito, SQS and Secrets Manager behavior and rotation.

Suggested Gradle tasks: test, integrationTest and contractTest. PRs gate unit/integration/contract/migration/security checks; releases add sandbox/device/load/recovery/security evidence. Store reports and endpoint traceability. Treat flaky tests as tracked defects rather than silently ignoring them. Mark cases implemented/passed only when executable tests and results exist.

References: [OWASP SQL injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html), [Testcontainers](https://java.testcontainers.org/), [WireMock](https://wiremock.org/docs/request-matching/), [ECS secret rotation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html).

## Amazon Shipping tests S01-S12

Twelve additional planned cases are specified in [Amazon Shipping integration and architecture](amazon-shipping-integration.md#additional-planned-tests), covering store packing gates, measurements, expired rates, split shipments, ambiguous purchases, private labels, credentials, tracking, cancellation, pickup/RTO and physical launch validation. These tests are not implemented or run.
