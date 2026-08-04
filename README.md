# Madal ICT Solutions — Finance Management System

Production-oriented finance platform for Madal ICT Solutions.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query/Table, Axios
- **Backend:** Node.js 20+, Express, MySQL (`mysql2`), JWT + refresh tokens, Socket.IO, node-cron

## Quick start

### 1. Database

```bash
cd backend
cp .env.example .env
# Edit DB_* and ACCESS_TOKEN_SECRET (required, ≥16 chars)
npm install
npm run db:init
```

### 2. Backend API

```bash
cd backend
npm run dev
# http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173  (proxies /api → :4000)
```

Optional: set `VITE_API_URL` if the API is not proxied.

## Seed users (development)

| Username | Password     | Role          |
|----------|--------------|---------------|
| admin    | password123  | Super Admin   |
| finance  | password123  | Finance Admin |
| ahmed    | password123  | Member        |
| hawa     | password123  | Member        |

Change these passwords before any real deployment.

## Scripts

**Backend**

| Script | Description |
|--------|-------------|
| `npm run dev` | Nodemon API server |
| `npm start` | Production start |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:init` | Migrate + seed |
| `npm run check` | Syntax check |

**Frontend**

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview build |

## Architecture

```
frontend/src
  components/  layouts, tables, ui kit
  features/    domain modals
  hooks/       React Query hooks
  pages/       route screens
  services/    Axios + finance API
  context/     auth, theme, settings

backend/src
  controllers/ → services/ → repositories/
  middleware/  auth, rbac, validate, upload, rate limits
  routes/      REST API under /api
  database/    migrations + seeders
```

## Security notes

- Access tokens: short-lived JWT (`Authorization: Bearer`)
- Refresh tokens: opaque, hashed in DB, rotated on refresh
- Uploads and generated reports are served only via authenticated `GET /api/files/:type/:filename`
- Passwords hashed with bcrypt (cost 12)
- Rate limits on API, login, refresh, and uploads
- Helmet, CORS, compression, express-validator, parameterized SQL

## Ledger rule

Cash-book transactions are **append-only**. They are created automatically by payments, expenses, other income, and member due receipts. There is no API to edit ledger rows manually.
