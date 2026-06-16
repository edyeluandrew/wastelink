# WasteLink deployment environment variables

## Render (backend) — https://wastelink-3lgu.onrender.com

Set these in **Render Dashboard → wastelink-backend → Environment**:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | Long random secret (same as local `.env`) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `PAYMENT_MODE` | `manual` |
| `AUTO_PAYOUT_ON_VERIFY` | `false` |
| `DEFAULT_PAYMENT_PROVIDER` | `SIMULATION` |

Optional (seed super admin once via Render shell):

| Key | Value |
|-----|--------|
| `SUPER_ADMIN_EMAIL` | Your admin email |
| `SUPER_ADMIN_PASSWORD` | Your admin password |

After first deploy, run migration on Render shell:

```bash
node migrate-module13.mjs
```

Health check: `GET https://wastelink-3lgu.onrender.com/api/health`

---

## Vercel (frontend) — https://wastelink-delta.vercel.app/

Set these in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | `https://wastelink-3lgu.onrender.com/api` |
| `VITE_AUTH_ENFORCED` | `true` |

Redeploy after changing env vars (Vite bakes them at build time).

---

## Local setup

1. Copy examples (or use the `.env` files already created):
   - `backend/.env` — add `DATABASE_URL`, `JWT_SECRET`, smoke-test logins
   - `frontend/.env` — already points at Render API
2. Install and migrate:
   ```bash
   cd backend
   npm install
   npm run migrate:module13
   ```
3. Smoke test against Render:
   ```bash
   cd backend
   npm run smoke:module13
   ```
