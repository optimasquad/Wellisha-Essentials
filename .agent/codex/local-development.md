# Local Development

## Start the App

From the repository root in PowerShell:

```powershell
Set-Location nextjs_space
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`. Choose a free port if 3000 is occupied. Keep the process running while using the app.

If dependencies are absent, run `npm install` in `nextjs_space/`. The repository currently has no tracked npm lockfile in the inspected source listing, so dependency resolution may change over time.

## Environment

Next.js loads local environment files from `nextjs_space/`. Do not include their values in documentation.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by Prisma |
| `NEXTAUTH_URL` | NextAuth base URL; also used for metadata |
| `NEXTAUTH_SECRET` | NextAuth signing/encryption secret |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Server-side payment credentials |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Browser-side Razorpay key |
| `NEXT_DIST_DIR` | Optional Next.js build output folder |
| `NEXT_OUTPUT_MODE` | Optional Next.js output mode |

Use local callback URLs for local authentication and Razorpay test credentials for payment testing.

## Commands

```powershell
npm run build
npm run start
npm run lint
npx tsc --noEmit
```

`start` requires a successful build. The lint script runs `next lint`; package.json combines Next.js 14 with ESLint 9 and eslint-config-next 15, so lint compatibility must be verified. No automated test script is declared.

## Prisma

Generate the client after installing dependencies or changing the schema:

```powershell
npx prisma generate
```

The committed schema specifies an absolute Linux output path under `/home/ubuntu/wellisha_ecommerce/`. Before generation on Windows, remove that override to use Prisma's default client location or set a suitable project-relative path. Local setup already removed the override, but that schema change is separate from these documentation files. The schema includes the `native` engine target for the local operating system. Generation does not apply schema changes to the database.

The configured seed command is `npx prisma db seed`, which invokes `scripts/safe-seed.ts`. That wrapper checks `scripts/seed.ts` for direct Prisma deletion calls before executing it. Seeding still writes data and creates an admin account. Inspect the target database and seed contents before using it. A running local server may still connect to a remote database.

## Troubleshooting

- A homepage can render with no products when PostgreSQL is unavailable; inspect server errors and the configured database.
- Prisma initialization failures can indicate an absent generated client, an incompatible engine, or the generator output path.
- The layout uses `next/font/google`; an uncached font may need network access during compilation.
- Google login requires provider configuration matching the local callback URL.
- Checkout depends on database records and working Razorpay configuration.
- When launched in the background during this session, server output goes to `nextjs_space/dev-server.log` and `nextjs_space/dev-server-error.log`.
