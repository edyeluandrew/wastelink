# Deployment Environment Variables

Use placeholders only. Do not commit real values.

## Backend

- `PORT` - server port, for example `5000`
- `DATABASE_URL` - PostgreSQL connection string placeholder
- `DATABASE_SSL` - `true` or `false`
- `SUPER_ADMIN_EMAIL` - placeholder super admin login email or phone
- `SUPER_ADMIN_PASSWORD` - placeholder super admin password
- `RESET_SUPER_ADMIN_PASSWORD` - `true` or `false`
- `JWT_SECRET` - placeholder JWT signing secret
- `JWT_EXPIRES_IN` - example `7d`
- `PAYMENT_MODE` - example `manual` or `live`
- `AUTO_PAYOUT_ON_VERIFY` - `true` or `false`
- `DEFAULT_PAYMENT_PROVIDER` - example `MOBILE_MONEY` or `MANUAL`

## Frontend

- `VITE_API_BASE_URL` - example `https://wastelink-3lgu.onrender.com/api`
- `VITE_AUTH_ENFORCED` - set to `true` for production and demo deployments; set to `false` only when intentionally allowing legacy fallback sessions during local testing

## Notes

- Keep production/demo deployments on auth-enforced mode.
- Use the same API base URL in local and hosted smoke tests when possible.