# Architecture

## Stack

The package declares Next.js 14.2.28, React 18.2, TypeScript 5.2, Tailwind CSS 3.3, Prisma 6.7, NextAuth 4.24, and Razorpay. UI primitives use Radix packages; icons use Lucide.

## Source Map

| Path | Responsibility |
| --- | --- |
| `app/` | App Router pages, root layout, global CSS, and server API handlers |
| `components/home/` | Homepage hero, categories, featured products, and promotional sections |
| `components/products/` | Product filters, grid, and product detail interactions |
| `components/layout/` | Shared header and footer |
| `components/ui/` | Reusable UI primitives and supporting components |
| `components/providers.tsx` | Client session provider, theme provider, and toast notifications |
| `lib/auth.ts` | NextAuth providers, JWT/session callbacks, and session type extensions |
| `lib/db.ts` | Shared Prisma client, cached globally during development |
| `lib/types.ts` | Frontend interfaces for products, carts, addresses, orders, and discounts |
| `lib/utils.ts` | Shared utility functions |
| `prisma/schema.prisma` | PostgreSQL models, enums, and client generation settings |
| `scripts/` | Seed data and a seed wrapper that checks for Prisma deletion calls |
| `public/` | Static assets served from the site root |

## Rendering

`app/layout.tsx` imports global styles and the Inter font, supplies site metadata, and wraps pages with providers, header, footer, and a discount popup. It also loads an external Abacus script. The layout declares `force-dynamic` rendering.

`app/page.tsx` reads active products and categories directly through Prisma in parallel. It passes the results to homepage components. Query failures are logged and return empty arrays, so a rendered homepage does not prove database connectivity.

`app/products/page.tsx` reads products on the server using category, search, and sort query parameters. Interactive product and checkout components use API requests for mutations.

## Configuration

- `tsconfig.json` enables strict TypeScript and maps `@/*` to the application root.
- `tailwind.config.ts`, `postcss.config.js`, and `app/globals.css` define styling.
- `next.config.js` supports `NEXT_DIST_DIR` and `NEXT_OUTPUT_MODE`, disables image optimization, and skips ESLint during builds. TypeScript build errors remain enabled.
- The committed Prisma schema specifies an absolute Linux client output path. Local setup removed that override to use Prisma's default location, but that schema change is separate from these documentation files. The `native` engine target supports the local operating system.
