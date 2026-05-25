# Backend Smoke Tests

Run these from the `backend` folder. Use a safe `BASE_URL` and environment variables for credentials. Do not hardcode passwords, tokens, or database values in the command line or docs.

## Required variables

- `BASE_URL` - API base URL, for example `http://localhost:5000/api` or `https://wastelink-3lgu.onrender.com/api`
- `AGENT_IDENTIFIER` - agent email or phone used to log in
- `AGENT_PASSWORD` - agent password
- `PICKER_IDENTIFIER` - picker email or phone used to log in
- `PICKER_PASSWORD` - picker password
- `SUPER_ADMIN_IDENTIFIER` - super admin email or phone used to log in
- `SUPER_ADMIN_PASSWORD` - super admin password
- `CITY_ADMIN_IDENTIFIER` - city admin email or phone used to log in
- `CITY_ADMIN_PASSWORD` - city admin password

## Scripts

### Agent auth smoke

Checks that an AGENT can log in, load `/auth/me`, has an assigned collection point, and is blocked from `/users`.

```bash
BASE_URL="https://wastelink-3lgu.onrender.com/api" npm run smoke:agent-auth
```

### Picker auth smoke

Checks that a PICKER can log in, load `/auth/me`, has a linked picker profile, and is blocked from `/users`.

```bash
BASE_URL="https://wastelink-3lgu.onrender.com/api" npm run smoke:picker-auth
```

### User role smoke

Checks that SUPER_ADMIN and CITY_ADMIN can log in, that both can access `/users`, and that CITY_ADMIN cannot create a SUPER_ADMIN user.

```bash
BASE_URL="https://wastelink-3lgu.onrender.com/api" npm run smoke:user-roles
```

## Safety notes

- The scripts never print tokens or passwords.
- The scripts do not read or print `.env` contents.
- The scripts do not modify user passwords or database credentials.
- The forbidden create check in `smoke:user-roles` is designed to fail before creating data.