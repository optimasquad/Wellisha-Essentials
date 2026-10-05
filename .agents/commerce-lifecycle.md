# Commerce implementation guidance

Read [lifecycle](../docs/implementation/commerce-lifecycle.md),
[provider setup](../docs/implementation/provider-setup.md) and
[execution status](../docs/implementation/execution-status.md) before continuing.

- Keep backend `wellisha-services` and `storefront` independent projects in this repo.
- A quote is customer-owned and must be explicitly confirmed; reject changed
  versions instead of silently repricing an accepted total.
- Prepacked mixed-product kits have independent stock. Do not reserve components
  again at sale. No nested kit recipes or cross-SKU promotion rule engine.
- Only verified capture of the stored provider order/amount/currency permits packing.
- External POST/send attempts enter durable CALLING first. UNKNOWN is not retryable
  without evidence. Preserve reconciliation, leases, deduplication and audit trails.
- Refunds, carrier cancellation and physical inventory returns are separate actions.
- Staff writes require OAuth scope and database permission grants. Runtime roles
  cannot provision staff permissions or run schema DDL.
- Generate checked-in DTOs and transport client from OpenAPI after wire changes.
- Keep provider accounts/secrets outside the repo. AWS signup/configuration proceeds
  in parallel using the guide; fixture acceptance does not prove live integrations.
- Checkout stays disabled and ECS desired counts stay zero until external acceptance.
