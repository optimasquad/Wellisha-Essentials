# Route Reference

## Pages

| URL | Source / purpose |
| --- | --- |
| `/` | `app/page.tsx`: storefront homepage |
| `/products` | Product catalog; accepts `category`, `search`, and `sort` query parameters |
| `/products/[slug]` | Product detail page |
| `/cart` | Shopping cart |
| `/checkout` | Address, discount, and Razorpay checkout |
| `/order-success` | Post-checkout confirmation |
| `/login`, `/register` | Customer authentication |
| `/complete-profile` | Profile completion |
| `/account/orders` | Customer order history |
| `/about`, `/blog`, `/contact` | Informational pages |
| `/admin` | Admin dashboard |
| `/admin/products` | Product management |
| `/admin/products/new`, `/admin/products/[id]` | Create or edit products |
| `/admin/orders` | Order management |
| `/admin/discounts`, `/admin/discounts/new` | Discount management |

Page implementations are located at `app/<URL>/page.tsx`.

## APIs

Handlers are located at `app/api/<URL>/route.ts`.

| API URL | Methods / purpose |
| --- | --- |
| `/api/auth/[...nextauth]` | NextAuth authentication endpoints |
| `/api/auth/login` | POST: checks credentials and returns user details; does not create a NextAuth session |
| `/api/signup` | POST: registration |
| `/api/user/profile` | GET, PUT: profile access and updates |
| `/api/categories` | GET: category listing |
| `/api/cart` | GET, POST, PUT, DELETE: read, add, change quantity, remove |
| `/api/addresses` | GET, POST: addresses |
| `/api/discount/validate` | POST: discount validation |
| `/api/orders` | GET: customer orders |
| `/api/orders/[id]` | GET: individual order |
| `/api/orders/create` | POST: create Razorpay and database orders |
| `/api/orders/verify` | POST: verify payment and confirm order |
| `/api/newsletter` | POST: subscription |
| `/api/contact` | POST: contact submission |
| `/api/admin/stats` | GET: dashboard statistics |
| `/api/admin/products` | GET, POST: list or create products |
| `/api/admin/products/[id]` | GET, PUT, DELETE: individual product management |
| `/api/admin/orders` | GET: admin order list |
| `/api/admin/orders/[id]` | PUT: update order |
| `/api/admin/discounts` | GET, POST: list or create discounts |
| `/api/admin/discounts/[id]` | DELETE: remove discount |

Admin API handlers check the authenticated session and `ADMIN` role. Check each customer handler for its resource ownership rules before extending it.
