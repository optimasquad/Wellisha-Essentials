# Wellisha Essentials Code Notes

The application lives in `nextjs_space/`. Paths in these notes are relative to that directory unless stated otherwise.

## Reading Order

1. [Architecture](architecture.md): entry points, folders, and shared services.
2. [Routes](routes.md): storefront, account, admin, and API routes.
3. [Data and Flows](data-and-flows.md): database relationships, authentication, cart, and payments.
4. [Local Development](local-development.md): commands, configuration, and troubleshooting.

These notes describe the code inspected on October 3, 2026. Update them when behavior or structure changes. Dependencies listed in `package.json` are not necessarily used by the application.

## Guidance for Codex

- Run application commands from `nextjs_space/`.
- Read the relevant page, component, API handler, and Prisma model before changing a workflow.
- Use the existing `@/` import alias, shared Prisma instance, NextAuth configuration, and UI components.
- Check both session identity and resource ownership when modifying authenticated APIs; admin handlers also check the `ADMIN` role.
- Keep secrets out of documentation and logs.
- Database operations affect the database selected by `DATABASE_URL`; verify the target before seeding or changing its schema.
- Keep changes focused and preserve existing user edits.

This folder is a documentation reference. Codex repository instructions are conventionally placed in `AGENTS.md`; these files do not automatically replace that mechanism.
