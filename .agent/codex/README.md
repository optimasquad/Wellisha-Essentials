# Wellisha Essentials Code Notes

The application lives in `storefront/`. Paths in these notes are relative to that directory unless stated otherwise.

## Reading Order

1. [Architecture](architecture.md): entry points, folders, and shared services.
2. [Routes](routes.md): storefront, account, admin, and API routes.
3. [Data and Flows](data-and-flows.md): database relationships, authentication, cart, and payments.
4. [Local Development](local-development.md): commands, configuration, and troubleshooting.

The original storefront notes describe code inspected on October 3, 2026. For the Kotlin backend, Cognito integration, disabled checkout and current verification, read [execution status](../../docs/implementation/execution-status.md) and [backend instructions](../../backend/README.md) first. The source directory was renamed to `storefront`; residual `nextjs_space` folders are not the active application. Dependencies listed in `package.json` are not necessarily used by the application.

## Guidance for Codex

Pricing and offer guidance is also recorded in
[.agents/pricing-rules.md](../../.agents/pricing-rules.md), with API rules,
worked examples and an SVG diagram linked from that guide.

- Run application commands from `storefront/`.
- Read the relevant page, component, API handler, and Prisma model before changing a workflow.
- Use the existing `@/` import alias, shared Prisma instance, NextAuth configuration, and UI components.
- Check both session identity and resource ownership when modifying authenticated APIs; admin handlers also check the `ADMIN` role.
- Keep secrets out of documentation and logs.
- Database operations affect the database selected by `DATABASE_URL`; verify the target before seeding or changing its schema.
- Keep changes focused and preserve existing user edits.

This folder is a documentation reference. Codex repository instructions are conventionally placed in `AGENTS.md`; these files do not automatically replace that mechanism.
