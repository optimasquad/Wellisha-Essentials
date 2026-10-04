# Data and Application Flows

## Database

`prisma/schema.prisma` uses PostgreSQL through `DATABASE_URL`.

| Models | Relationship / purpose |
| --- | --- |
| `User`, `Account`, `Session`, `VerificationToken` | Customer identity and NextAuth adapter records |
| `Address` | Belongs to a user; may be linked to orders |
| `Category`, `Product`, `ProductVariant` | Categories contain products; variants hold SKU, price, sale price, and stock |
| `Cart`, `CartItem` | One cart per user; items reference products and variants |
| `Order`, `OrderItem` | Orders belong to users; items store quantity, price, and total |
| `DiscountCode` | Percentage or fixed discounts, limits, dates, and usage count |
| `NewsletterSubscription`, `ContactSubmission` | Subscription and contact form records |

Roles are `USER` and `ADMIN`. Order status and payment status are separate enums. Monetary fields use `Float`; Razorpay receives amounts in paise.

## Authentication

`app/login/page.tsx` calls NextAuth `signIn` for credentials or Google. `lib/auth.ts` uses the Prisma adapter, bcrypt password checks, and JWT sessions. JWT callbacks add user ID, role, and profile completion; session callbacks expose these to callers. `components/providers.tsx` supplies the client session context.

The separate `/api/auth/login` endpoint validates credentials and returns user information. It does not establish the NextAuth session used by authenticated handlers.

## Shopping and Checkout

1. Server pages read products and categories through the shared client in `lib/db.ts`.
2. Product detail interactions POST product ID, variant ID, and quantity to `/api/cart`.
3. The cart API creates a user cart if necessary, then creates an item or increases an existing quantity.
4. Checkout fetches cart and addresses, creates an address if needed, and calls `/api/discount/validate` for a discount.
5. `/api/orders/create` reads cart prices, computes totals, creates a Razorpay order, and writes a pending database order with items.
6. The browser opens Razorpay using `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
7. `/api/orders/verify` checks an HMAC signature, marks the database order paid and confirmed, and clears the user's cart.

Current order creation charges shipping of 49 when subtotal is at most 499, otherwise zero. It receives `discount` and `discountId` from the request and increments discount usage during order creation.

## Implementation Details to Remember

- The catalog's `price-asc` and `price-desc` branches currently order by product `createdAt`, not variant price.
- Homepage and catalog reads catch database errors and show empty results.
- Cart GET returns an empty list to unauthenticated callers and also on errors.
- Before changing checkout, inspect server-side discount validation, address/order ownership, stock handling, and the consistency of payment and database operations. The flow above describes current behavior, not a guarantee that every business rule is enforced.
