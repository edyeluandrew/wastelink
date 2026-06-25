# WasteLink Uganda

Digital platform for **verified waste collection**, **picker livelihoods**, and **city / partner reporting** — built for municipal pilots (e.g. Mbarara) and UNDP-style impact dashboards.

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19.x-blue)](https://react.dev)

---

## What it does

WasteLink connects everyone in the waste value chain:

| Role | What they do |
|------|----------------|
| **Picker** | Logs waste at collection points, tracks jobs and earnings, withdraws to mobile money (simulated in demo) |
| **Agent** | Verifies or rejects waste at a collection point; verification **locks earnings** |
| **City admin / Super admin** | Manages pickers, points, waste types, users, earnings, and exports reports |
| **Recycler** | Views aggregated inventory and purchase requests (Module 17+) |

Core outcomes:

- Formalize informal collection with **job codes** and **agent verification**
- Transparent **livelihood tracking** (earned vs withdrawn vs still in wallet)
- **UNDP-aligned reports** (inclusion, environment, livelihood, operations)
- **Simulated MTN / Airtel** withdrawals for demos (no real money movement)

---

## Livelihood model (important)

When an agent verifies waste, the picker’s earning is **locked** at the verified amount (`original_amount`).

Across **one or many verified jobs**, balances always split as:

```
Total Earned  =  Total Withdrawn  +  Withdrawable Balance
```

| Term | Meaning |
|------|---------|
| **Total Earned** | Sum of all verified earnings (does **not** go down when someone withdraws) |
| **Total Withdrawn** | Sum of successful mobile-money withdrawal requests |
| **Withdrawable Balance** | Verified money still in the picker’s wallet (can withdraw later) |

**Example:** Verify 100,000 UGX → withdraw 53,000 UGX → **Earned 100k**, **Withdrawn 53k**, **Withdrawable 47k**.

This logic is used on:

- Picker dashboard & My Earnings
- Admin Overview, Earnings, and Reports
- City export packs (Excel / PDF)

In **demo mode**, simulated withdrawals **auto-confirm** so pickers see **PAID / SUCCESS** immediately instead of staying in “payout processing”.

---

## Tech stack

### Backend (`backend/`)

- Node.js 18+, Express 4
- PostgreSQL (e.g. Neon) via `pg`
- JWT auth, bcrypt passwords
- Excel (ExcelJS) & PDF (PDFKit) report exports

### Frontend (`frontend/`)

- React 19 + Vite 8
- React Router 7
- Tailwind CSS 4
- Axios API client
- Lucide icons

### Deployment (typical)

- **Frontend:** Vercel (or any static host)
- **API:** Render (or similar Node host)
- **Database:** Neon PostgreSQL (or any Postgres 14+)

> **Never commit** `.env` files, database URLs, JWT secrets, or admin passwords. Use the `.env.example` templates only.

---

## Repository layout

```
wastelink/
├── backend/
│   ├── src/
│   │   ├── controllers/     # HTTP handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (payments, reports, cities…)
│   │   ├── middleware/      # Auth, errors
│   │   └── utils/           # Shared helpers
│   ├── migrate-*.mjs        # One-off DB migrations (run manually)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/           # Admin dashboard pages
│   │   ├── picker/          # Picker mobile-first UI
│   │   ├── agent/           # Agent verification UI
│   │   ├── recycler/        # Recycler portal
│   │   └── api/             # Axios client
│   └── .env.example
└── README.md
```

---

## Local development

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)
- Git

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, SUPER_ADMIN_* (see .env.example)
npm run dev
```

Health check:

```bash
curl http://localhost:5000/api/health
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5000/api for local API
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### 3. Database migrations

After pointing `DATABASE_URL` at your database, run migrations as needed (from `backend/`):

```bash
node migrate-withdrawals.mjs
node migrate-module21-earning-original-amount.mjs
# …other migrate-*.mjs scripts for your environment
```

Module 21 adds `earnings.original_amount` for the earned / withdrawn split. Run it on production once after deploy.

---

## Environment variables

Copy from templates — **do not paste real secrets into the README or git**.

| File | Purpose |
|------|---------|
| `backend/.env.example` | `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, payment demo flags |
| `frontend/.env.example` | `VITE_API_BASE_URL`, `VITE_AUTH_ENFORCED` |

Production builds read variables from the host dashboard (Vercel / Render), not from committed files.

---

## User interfaces

### Admin (`/login` → dashboard)

| Path | Description |
|------|-------------|
| `/` | Overview — stats + **Total Earned / Withdrawn / Withdrawable** summary |
| `/pickers` | Register and manage pickers |
| `/collection-points` | Collection points and agents |
| `/waste-types` | City waste types and pricing |
| `/waste-logs` | All logs; search, verify context |
| `/earnings` | Per-job earned / withdrawn / withdrawable + withdrawal admin |
| `/reports` | Monthly, platform summary, UNDP pilot, city export |
| `/users` | Super admin: agents, city admins |
| `/cities` | Super admin: pilot cities |
| `/divisions` | Division performance |
| `/recyclers` | Recycler accounts (if enabled) |

### Picker (`/picker/…`)

| Path | Description |
|------|-------------|
| `/picker/register` | Self-registration (city-scoped) |
| `/picker/dashboard` | Jobs summary + livelihood cards |
| `/picker/log-waste` | Submit waste at a collection point |
| `/picker/jobs` | Job list and statuses |
| `/picker/earnings` | Withdraw (demo) + history |
| `/picker/help` | Status guide |

### Agent (`/agent/…`)

| Path | Description |
|------|-------------|
| `/agent/select-point` | Choose collection point |
| `/agent/pending` | Logs awaiting verification |
| `/agent/verify` | Verify or reject waste |

### Other

| Path | Description |
|------|-------------|
| `/ussd-simulator` | USSD flow demo |
| `/recycler/…` | Recycler inventory & requests |

---

## Demo walkthrough (happy path)

1. **Super admin / city admin:** Ensure an active **city**, **divisions**, **collection points**, and **payable waste types** exist.
2. **Picker:** Register → log waste at a collection point.
3. **Agent:** Open pending log → verify kg → earning is created immediately.
4. **Picker:** My Earnings → see **Total Earned**; withdraw part or all (simulated).
5. **Admin:** Overview / Earnings / Reports → confirm **Earned**, **Withdrawn**, and **Withdrawable** align.
6. **Reports:** Export monthly or UNDP pack for partner meetings.

**Tip:** If Log Waste fails for pickers, check that the city has **active collection points** in the admin panel.

---

## Key API areas

Base path: `/api`

| Area | Examples |
|------|----------|
| Health | `GET /health`, `GET /health/db` |
| Auth | `POST /auth/login` |
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/today` |
| Waste logs | `GET/POST /waste-logs`, `PATCH /waste-logs/:id/verify` |
| Withdrawals | `GET /withdrawals/balance`, `POST /withdrawals` |
| Reports | `GET /reports/summary`, `GET /reports/monthly`, `GET /reports/undp-pilot` |
| Cities & config | `GET /cities`, `GET /city-waste-types` |

All protected routes expect a JWT in the `Authorization: Bearer …` header after login.

---

## Production deploy checklist

1. Set backend env vars on Render (or your host): `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_*`, `NODE_ENV=production`.
2. Set frontend env on Vercel: `VITE_API_BASE_URL=https://your-api-host/api`, `VITE_AUTH_ENFORCED=true`.
3. Run pending migrations against production Postgres (including Module 21).
4. Hard-refresh the frontend after deploy.
5. Smoke test: verify waste → withdraw → check admin Overview totals.

---

## Security notes

- `.env` is gitignored — keep it that way.
- Rotate `JWT_SECRET` and admin passwords if they were ever exposed.
- Demo mobile money is **simulated**; do not use production MTN/Airtel keys in this repo.
- Smoke-test credentials in `backend/.env.example` are **placeholders** — fill only in local `.env`, never commit.

---

## Scripts (backend)

| Command | Purpose |
|---------|---------|
| `npm run dev` | API with nodemon |
| `npm start` | Production API |
| `node migrate-module21-earning-original-amount.mjs` | Earned / withdrawn schema support |

See `backend/package.json` for recycler and smoke-test scripts.

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit with a clear message
4. Open a pull request

---

## License

MIT — see [LICENSE](LICENSE).

---

## Links

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Recycler module notes](backend/docs/MODULE17_RECYCLER.md)
- [GitHub repository](https://github.com/edyeluandrew/wastelink)

---

**Last updated:** June 2026  
**Status:** Active pilot / demo ready
