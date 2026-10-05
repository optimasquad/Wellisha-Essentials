# Wellisha pricing guidance

This is a reference guide requested for `.agents/`. Existing project notes remain
under `.agent/codex/`. Read [pricing rules](../docs/implementation/pricing-rules.md)
and [execution status](../docs/implementation/execution-status.md) before changes.

- `backend/` is the `wellisha-services` Gradle project. The independent UI is
  `storefront/`; API rules belong in the backend, not Next.js components.
- Use only PERCENTAGE, FIXED_AMOUNT, BUNDLE_PRICE and BUY_X_GET_Y in the first
  pricing slice. Same-SKU eligibility, one active schedule, no stacking and no
  nested/custom rule language keep operator changes predictable.
- Percentages use basis points, money uses integer paise, and scheduled boundaries
  use database time with inclusive start/exclusive end. Stock counts free units.
- Keep single-unit display prices separate from authoritative cart line totals.
  Do not derive bundle/free-unit amounts from a product card's displayed price.
- Price writes require both Cognito scope and server-owned permission; preserve
  optimistic versions, atomic audit history and immutable historical order lines.
- Preserve API `no-store`, bounded visible-tab refresh, focus/online refresh,
  customer isolation, and honest stale/error states. Avoid hard-coded promotions.
- Update OpenAPI and regenerate checked-in TypeScript DTO types with every wire
  change. Document any additional rule as an explicit commercial decision.
- Run pricing domain tests, real PostgreSQL acceptance, storefront validators and
  TypeScript checks. Keep checkout disabled until quotes/reservations/providers
  satisfy the existing release gates. Never seed or alter an existing database
  without verifying its intended target.

Diagram: [SVG](../docs/architecture/pricing-rules.svg).
