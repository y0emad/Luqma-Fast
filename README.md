# Luqma Fast API

**Luqma Fast** is a food delivery REST API (Swiggy-style): users sign up, find restaurants near them, browse menus, place orders and follow them until delivery. Restaurants run their own dashboard (orders, menu, daily stats), and admins manage cities, restaurants and banners.

## Tech stack

- **Node.js 24, Express 5, TypeScript** (strict mode)
- **MongoDB + Mongoose**: geo queries (`2dsphere`) for nearby restaurants, aggregation pipelines for stats
- **Luxon** for opening hours and daily stats in Cairo time
- **Redis**: refresh tokens (one active session per user, revocable)
- **JWT** access tokens (1 day) + refresh tokens (1 year, rotated on every use)
- **express-validator**, **helmet**, **express-rate-limit**, **multer** (image uploads)
- **Paymob** (Intention API + Unified Checkout) for online card / wallet payments in EGP
- **Nodemailer (SMTP) or Brevo HTTP API** for emails
- **Vitest + Supertest** for tests, **Docker** + **GitHub Actions** for CI

## Features

- Sign up with email verification (6-digit code), login, refresh, logout, forgot / reset password
- Profile: name, photo, email change (needs the current password and a new verification)
- Nearby restaurants within a radius, sorted by distance, with name search and pagination
- Restaurant menu by category, admin tools for cities, restaurants, categories, items and banners
- Orders: the server prices every order from the database and emails a receipt
- Online payment with Paymob: the customer pays on Paymob's page, a signed webhook confirms it, then the order goes to the restaurant; automatic refunds when a paid order is cancelled
- Order lifecycle: pending → accepted → preparing → on the way → delivered (or cancelled), with a history of who changed what, and an email on every change
- Opening hours: no orders while a restaurant is closed, `is_open` on every restaurant in the API
- Restaurant dashboard: its orders by status, menu and categories, opening hours, and daily stats (revenue, average order, best sellers)
- Saved delivery addresses, private to each user

## Design decisions

### 1. The client never decides the price
An order request only says *which* items and *how many*. The server loads the items from the database, checks they're active and belong to that restaurant, sums the prices, adds the restaurant's delivery fee, and stores a snapshot of each item's name and price. So a changed menu price never changes an old order, and a tampered request can't order food for 1 EGP.

### 2. Auth & security
- Passwords and OTP codes are stored **hashed** (bcrypt). An OTP expires after 10 minutes and **locks after 5 wrong tries**, even if the right code comes next.
- Login is generic: a wrong password and an unknown email get the same answer. "Forgot password" and "resend code" answer the same for registered and unknown emails, so they can't be used to find accounts.
- You can't log in before verifying your email, and you can't sign up as an admin (the role is never taken from the request).
- Refresh tokens live in Redis: logging in again, refreshing, resetting the password or logging out replaces or deletes the stored token, so an old refresh token stops working.
- Every user-owned resource is looked up by **id + owner**, so another user's address answers 404 (it doesn't even reveal that it exists).
- Rate limits on login, signup and OTP routes, `helmet` headers, CORS limited to `FRONTEND_URL`, regex-escaped search, 5 MB JPEG/PNG uploads with random file names. Files from a rejected request are deleted.
- The server refuses to start without both JWT secrets (32+ characters, different from each other).

### 3. The order lifecycle is a state machine
The restaurant can only move an order one step forward (`pending → accepted → preparing → on_the_way → delivered`) or cancel it before it is being prepared; a customer can only cancel while it is still `pending`. Each change is one atomic `findOneAndUpdate` that also checks the current status. So if the customer cancels at the same moment the restaurant accepts, exactly one of them wins and the other gets a 409 (there is a test that fires both at once). Every change is added to `status_history` with who made it, and cash orders are marked paid on delivery.

### 4. Opening hours and timezones
Restaurants keep their hours as `HH:mm` in the app timezone (`APP_TZ`, Cairo by default). "Is it open now?" is computed in that timezone with Luxon, so it is right whatever timezone the server runs in, follows Egypt's summer time, and supports hours past midnight (`18:00 → 02:00`). Daily stats use the same rule: "today" is a Cairo day, not a UTC day.

### 5. Online payment: only the signed webhook says "paid"
A card order starts as `awaiting_payment`: the restaurant doesn't see it and can't accept it. The API creates a Paymob *intention* from the order's own server-side prices (item by item, plus delivery, so Paymob's "items add up to the amount" check holds) and returns the checkout link. When the customer pays, Paymob calls the webhook:

- the body must match its **HMAC-SHA512** (Paymob's 20 fields, our secret, compared in constant time), so nobody can mark an order paid by calling the webhook themselves; the amount and currency must match the payment too;
- it is **idempotent**: Paymob retries webhooks and the browser redirect carries the same result, but only the first "paid" write wins;
- the order moves `awaiting_payment → pending` with the same atomic transition as the rest of the lifecycle, so a payment that lands after the customer cancelled (or after the 30-minute window expired) is **refunded automatically**;
- cancelling a paid order refunds it; if Paymob refuses the refund, the cancellation still stands and the payment is marked `refund_failed` for a manual refund.

A declined card leaves the order waiting: `POST /orders/:id/pay` makes a new link. Unpaid orders are cancelled after 30 minutes by a timer.

### 6. Nearby search
Restaurants store a GeoJSON point with a `2dsphere` index. The list uses `$nearSphere` (sorted by distance). The total for pagination uses `$geoWithin` with the same circle, because `$nearSphere` can't be counted.

### 7. One error format
Every error is `{ "message": "...", "status": <code> }`. Validation errors are 422, duplicates (e.g. a registered email) 409, bad JSON 400, and anything unexpected is logged on the server and answered with a generic 500 message.

## Getting started

Needs Node.js 22+ and Docker (for Redis; MongoDB can be local or in Docker).

```bash
cp .env.example .env          # then fill in the JWT secrets, email and admin values
npm install
docker compose up -d redis    # add "mongo" if you don't have MongoDB installed (it's on port 27018)
npm run db:seed -- --demo     # admin account + a demo restaurant in Cairo
npm run dev                   # http://localhost:3000
```

### Run everything with Docker

```bash
docker compose up -d --build  # API + MongoDB + Redis, uploads kept in a volume
```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | API with reload on change (tsx + nodemon) |
| `npm run build` / `npm start` | Compile to `dist/` / run the compiled API |
| `npm test` | All tests (needs MongoDB and Redis running) |
| `npm run typecheck` | TypeScript check, no output |
| `npm run db:seed` | Create the admin from `.env` (`-- --demo` adds demo data) |
| `npm run lock:linux` | After adding a package on Windows: rebuilds `package-lock.json` in Linux, so `npm ci` works in Docker and CI |

## API

All routes are under `/api`. Send `Authorization: Bearer <token>` for the ones marked 🔒 (👑 = admins only, 🍽️ = restaurant accounts). A ready-to-use Postman collection is in [`postman/`](postman/LuqmaFast.postman_collection.json): run *Login* first and it saves the token for the others.

### Users `/api/users`
| Method | Route | |
|---|---|---|
| POST | `/signup` | `{ name, email, password }` → emails a 6-digit code |
| POST | `/verifyEmail` | `{ email, otp }` → tokens |
| POST | `/resendVerifyEmail` | `{ email }` |
| POST | `/login` | `{ email, password }` → `{ token, refreshToken, user }` |
| POST | `/newToken` | `{ refreshToken }` → new pair (the old refresh token stops working) |
| POST | `/logout` 🔒 | revokes the refresh token |
| GET | `/me` 🔒 | the logged-in user |
| POST | `/sendOtpResetPass` | `{ email }` |
| POST | `/checkOtpResetPass` | `{ email, otp }` |
| PATCH | `/resetpassword` | `{ email, otp, newPassword }` |
| PATCH | `/updateName` 🔒 | `{ name }` |
| PATCH | `/updateProfile` 🔒 | `{ name, email, password }` |
| PUT | `/updatePhoto` 🔒 | multipart, field `photoUser` |

### Restaurants, menu, categories
| Method | Route | |
|---|---|---|
| GET | `/api/restaurants/getNearbyRestaurants` 🔒 | `?latitude&longitude&radius(km)&page` |
| GET | `/api/restaurants/searchNearbyRestaurants` 🔒 | same + `&name` |
| GET | `/api/restaurants/getRestaurants` 👑 | all restaurants, paginated |
| POST | `/api/restaurants/createRestaurant` 👑 | owner `email`/`password` + restaurant fields, `location` as GeoJSON point, optional image `restaurantImg` |
| GET | `/api/items/getMenu/:restaurantId` 🔒 | restaurant, categories and active items |
| GET | `/api/items/getItems` | active items, paginated |
| POST | `/api/items/createItems` 👑 | multipart, image field `ItemsImg` |
| GET | `/api/categories/getCategories/:restaurant_id` 👑 | |
| POST | `/api/categories/createCategory` 👑 | `{ restaurant_id, name }` |

### Orders `/api/orders`
| Method | Route | |
|---|---|---|
| POST | `/createOrder` 🔒 | `{ restaurant_id, address, payment_method: "cash" \| "card", phone (required for card: 01XXXXXXXXX), instructions?, items: [{ item_id, quantity }] }`. A card order also returns `payment.checkout_url` |
| GET | `/getOrders` 🔒 | your orders, newest first, `?page&status` |
| GET | `/:id` 🔒 | one order: its customer, its restaurant or an admin (anyone else gets 404) |
| POST | `/:id/pay` 🔒 | a new Paymob checkout link for an unpaid card order. `{ phone? }` |
| GET | `/:id/payments` 🔒 | the payment attempts of your order |
| PATCH | `/:id/cancel` 🔒 | the customer, while it's `awaiting_payment` or `pending` (refunded if it was paid). `{ reason? }` |
| PATCH | `/:id/status` 🍽️ / 👑 | `{ status: "accepted" \| "preparing" \| "on_the_way" \| "delivered" \| "cancelled", reason? }`, one step at a time |

### Restaurant dashboard `/api/my-restaurant` 🍽️
For restaurant accounts (created by an admin with `createRestaurant`). Everything is scoped to the restaurant the account owns.

| Method | Route | |
|---|---|---|
| GET | `/` | the restaurant, with `is_open` |
| PATCH | `/` | `name, description, address, opening_time, closing_time, delivery_time, delivery_fee, isClosed` |
| PUT | `/image` | multipart, field `restaurantImg` |
| GET | `/orders` | its orders, newest first, `?status&page` |
| GET | `/stats` | `?day=YYYY-MM-DD` (default today, Cairo time): orders per status, revenue, average order, top 5 items |
| GET / POST | `/categories` | list / `{ name }` |
| DELETE | `/categories/:id` | only when it has no items |
| GET / POST | `/items` | `?category_id&status` / multipart `category_id, name, price, vegetarian, status?` + image `ItemsImg` |
| PATCH | `/items/:id` | `name, price, vegetarian, status, category_id` (`status: "inactive"` hides it from the menu) |
| PUT | `/items/:id/image` | multipart, field `ItemsImg` |
| DELETE | `/items/:id` | past orders keep their own copy of the item |

### Payments `/api/payments` (called by Paymob)
| Method | Route | |
|---|---|---|
| POST | `/paymob/webhook?hmac=…` | Paymob's "transaction processed" callback. Sent per payment as `notification_url`; you can also set it as the callback URL of your integration |
| GET | `/paymob/return` | where Paymob sends the customer after paying; redirects to `FRONTEND_URL/orders/:id?payment=success\|failed\|pending` |

### Addresses `/api/addresses` 🔒
`POST /createAddress`, `GET /getAddresses?page`, `GET /getAddressesLimit?limit&offset`, `GET /getAddress/:id`, `GET /checkAddress?lat&lon`, `PATCH /updateAddress/:id`, `DELETE /deleteAddress/:id`

### Cities and banners
`GET /api/city/getCities`, `POST /api/city/createCity` 👑, `GET /api/banner/getBanners`, `POST /api/banner/addOneBanner` 👑, `POST /api/banner/addManyBanner` 👑

### Example: place an order

```bash
curl -X POST http://localhost:3000/api/orders/createOrder \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "restaurant_id": "…", "address": "12 Nile St", "payment_method": "cash",
        "items": [{ "item_id": "…", "quantity": 2 }] }'
```

```json
{ "status": 201, "data": { "items": [{ "name": "Koshary", "price": 55, "quantity": 2 }],
  "total": 110, "delivery_charge": 15, "grand_total": 125, "payment_status": false, "status": "pending" } }
```

## Online payment setup (Paymob test mode)

1. Create a Paymob account and switch the dashboard to **Test mode**.
2. **Developers → Payment Integrations**: note the id of the *Online Card* test integration (and *Mobile Wallet* if you want it).
3. **Settings → Account Info**: copy the secret key, public key and HMAC secret into `.env` (`PAYMOB_*`, see `.env.example`).
4. Paymob has to reach the API: deploy it, or run a tunnel locally (`cloudflared tunnel --url http://localhost:3000`) and set `PUBLIC_URL` to its https address.
5. Restart the API (it logs `Online payment: Paymob enabled`), place an order with `payment_method: "card"`, open `payment.checkout_url` and pay with one of the test cards from Paymob's docs.
6. The webhook marks the order paid, and it shows up in the restaurant's `/my-restaurant/orders`.

Without `PAYMOB_*` the API runs cash-only and answers card orders with 503.

## Testing

```bash
docker compose up -d redis   # and MongoDB on 127.0.0.1:27017
npm test
```

The tests run against their own database (`luqma_test`) and Redis db 1 (see `.env.test`). Emails are mocked, and the tests read the OTP from the mock. They cover:

- signup → verify → login, no signup as admin, hashed OTPs, the OTP lock after 5 tries, generic login errors
- forgot / reset password, refresh token rotation, logout, email change
- order pricing on the server, items from another restaurant, inactive items, closed restaurants, pagination
- address ownership, nearby search radius, regex-safe search, upload validation, admin-only routes
- the order state machine: every allowed step, no skipping or going back, who may change what, and **a customer cancelling while the restaurant accepts at the same moment: exactly one wins**
- opening hours in Cairo time (past midnight, summer time, the closing minute), orders refused while closed
- payments (Paymob mocked): the request sent to Paymob, signed and forged webhooks, a tampered body, duplicate webhooks, wrong amounts, a declined card and a retry, automatic refunds (paid after cancelling, cancelled after paying, refund refused), the signed return URL, the 30-minute expiry
- the dashboard: only its own orders and items, uploads cleaned up on refusal, and the daily stats aggregation

CI (GitHub Actions) runs the typecheck, build and tests against MongoDB and Redis services, then builds the Docker image.

## Project structure

```
src/
  app.ts              Express app (no listen), used by the server and the tests
  index.ts            Startup: env checks, MongoDB + Redis, graceful shutdown
  seed.ts             Admin account (+ demo data)
  controllers/        Route handlers
  routers/            Routes + middleware per resource
  validators/         express-validator rules
  models/             Mongoose schemas
  middleware/         Error handler, validation check, rate limits
  services/           Order transitions, payments (Paymob flow, refunds, expiry)
  Utilis/             JWT, Redis, OTP, email, uploads, AppError, opening hours, order statuses, Paymob client
  types/express.d.ts  req.user typing
tests/                Vitest + Supertest
postman/              Postman collection
```

## Roadmap

- Real-time order tracking with Socket.io
- Reviews and ratings
- React frontend
