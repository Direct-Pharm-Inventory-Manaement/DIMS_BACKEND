# DIMS Backend

Backend API for the Direct Pharm Inventory Management System (DIMS). Built with Express and TypeScript.

Paired frontend repo: [DIMS_PROJECT](https://github.com/Direct-Pharm-Inventory-Manaement/DIMS_PROJECT).

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

The server starts on `http://localhost:4000` by default. `GET /health` returns a status check.

## Scripts

- `npm run dev` — start the dev server with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server
- `npm run lint` — lint the codebase
