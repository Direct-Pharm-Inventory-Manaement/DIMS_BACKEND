# Direct Inventory Manager (DIM) — Backend

API for **Direct Inventory Manager (DIM)**, a web-based pharmacy inventory, expiry risk,
and stock transfer management system built for Direct Pharmacy's Adenta and Haatso
branches. Built with Express and TypeScript.

Paired frontend repo: [DIMS_PROJECT](https://github.com/Direct-Pharm-Inventory-Manaement/DIMS_PROJECT).

## What this service owns

The backend is the source of truth for inventory data, branch stock, transfers, and
users — the frontend is a consumer, not the owner of business logic.

| Domain | Responsibility |
|---|---|
| **Inventory** | Medicine records, stock quantities per branch, CRUD |
| **Expiry monitoring** | Expiry dates, at-risk queries, alert thresholds |
| **Stock transfers** | Transfer requests between Adenta and Haatso, approval/rejection, stock reconciliation on confirmation |
| **Transfer history** | Immutable log of transfer activity — source, destination, quantities, actor, timestamp |
| **Low-stock prediction** | Usage-based estimate of when a product runs out |
| **Reporting** | Aggregate views: total stock, low-stock, expiring, pending transfers |
| **Users & auth** | Administrator and pharmacy staff accounts, role-based access control |

Explicitly out of scope: online sales, payment processing, external pharmacy/supplier
system integration.

## Getting started

```bash
npm install
cp .env.example .env
npx prisma migrate dev   # create the SQLite database
npm run seed             # create default users
npm run dev
```

The server starts on `http://localhost:4000` by default (set `PORT` to change).
`GET /health` returns a status check.

Seeded development accounts (password `ChangeMe123!`):

| Username | Email | Role | Branch |
|---|---|---|---|
| `admin` | admin@directpharmacy.com | administrator | Adenta |
| `adenta-staff` | adenta.staff@directpharmacy.com | staff | Adenta |
| `haatso-staff` | haatso.staff@directpharmacy.com | staff | Haatso |

## Implemented endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service status check |
| POST | `/auth/login` | Password login (`identifier` = username or email); returns JWT + user |
| POST | `/auth/forgot-password` | Emails a 6-digit OTP (responds identically for unknown emails) |
| POST | `/auth/verify-otp` | Verifies the OTP; returns a short-lived temporary session JWT |

Auth details: bcrypt password hashes; OTPs are stored hashed, expire after 10 minutes,
allow 5 attempts, and are single-use; auth routes are rate-limited (20 requests / 15 min);
temporary OTP sessions expire after 15 minutes, password sessions after 8 hours.

Without SMTP settings in `.env`, OTP emails are logged to the server console — check the
terminal running `npm run dev` for `[mailer] OTP for <email>: <code>`.

## Scripts

- `npm run dev` — start the dev server with hot reload
- `npm run seed` — upsert the default users
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server
- `npm run lint` — lint the codebase

## Stack

Express 4, TypeScript, Prisma 6 + SQLite (swap the datasource provider for Postgres at
deploy time), zod validation, JWT sessions, nodemailer.
