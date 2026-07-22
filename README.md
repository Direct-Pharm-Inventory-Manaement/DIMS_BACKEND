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
npm run dev
```

The server starts on `http://localhost:4000` by default. `GET /health` returns a status
check.

## Scripts

- `npm run dev` — start the dev server with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server
- `npm run lint` — lint the codebase

## Status

Scaffolded and running (`/health` only). Domain routes above are being built out against
the project proposal as UI designs and data model decisions land — treat this list as the
target shape, not what's implemented yet.
