# Neon PostgreSQL Setup Guide for WasteLink

## Overview

WasteLink uses **Neon PostgreSQL** - a serverless, managed PostgreSQL database hosted on AWS. This guide walks through setup and troubleshooting.

---

## Prerequisites

- Neon account (sign up at https://neon.tech)
- Node.js 18+ and npm
- WSL2 (if using Windows)
- `.env` file in `/backend` directory

---

## Step 1: Create Neon Project

1. **Go to Neon Console**: https://console.neon.tech
2. **Create new project**:
   - Project name: `wastelink-prod` (or your choice)
   - Region: `us-east-1` (recommended for lowest latency)
   - Postgres version: `16` or latest
3. **Click "Create project"** and wait 2-3 minutes

---

## Step 2: Get Connection String

1. In Neon console, go to **Connection String** section
2. Select dropdown: **Node.js**
3. Copy the connection string (looks like):
   ```
   postgresql://neondb_owner:npg_QxasYM8FH9BI@ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech:6432/neondb?sslmode=require
   ```

---

## Step 3: Configure .env File

Create or update `/backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST:6432/neondb?sslmode=require
DATABASE_SSL=true
NODE_ENV=development
```

**Replace:**
- `YOUR_PASSWORD` - Your Neon password
- `YOUR_HOST` - Your Neon hostname (e.g., `ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech`)

---

## Step 4: Initialize Database Schema

1. **Start backend server**:
   ```bash
   npm run dev
   ```

2. **In another terminal, initialize schema**:
   ```bash
   curl -X POST http://localhost:5000/api/admin/init-db
   ```

   **Expected response**:
   ```json
   {
     "success": true,
     "message": "Database schema initialized successfully",
     "data": {
       "tables_created": 5
     }
   }
   ```

3. **Verify tables in Neon console**:
   - Go to Neon console
   - Click **SQL Editor**
   - Run: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
   - Should show: `users`, `pickers`, `collection_points`, `waste_logs`, `earnings`

---

## Step 5: Test Connection

1. **API Health Check** (basic):
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Database Health Check** (database connection):
   ```bash
   curl http://localhost:5000/api/health/db
   ```

   **Expected response on success**:
   ```json
   {
     "success": true,
     "message": "Database connected successfully",
     "data": {
       "time": "2026-05-19T14:30:00.000Z"
     }
   }
   ```

   **Expected response on failure**:
   ```json
   {
     "success": false,
     "message": "Database connection failed. Please check Neon DATABASE_URL or network configuration.",
     "data": null
   }
   ```

---

## Security Best Practices

### 1. **Protect Your Database URL**
- ⚠️ **Never commit** `.env` file to Git
- ⚠️ **Never share** your DATABASE_URL publicly
- ✅ Use environment variables in production

### 2. **Neon Security Settings**
In Neon console:
- Go to **Settings → Network** 
- Ensure **"Allow access from public internet"** is **ENABLED**
- (Required for WSL, cloud deployments, etc.)

### 3. **Connection Pool Settings**
Already configured in `/backend/src/config/db.js`:
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,  // 10 sec timeout
  idleTimeoutMillis: 30000,        // 30 sec idle
  max: 5,                          // Max 5 connections
});
```

---

## Common Connection Issues

### Issue 1: ETIMEDOUT Error

**Symptoms**:
```
Error: connect ETIMEDOUT
Code: ETIMEDOUT
```

**Cause**: Network connectivity issue between your machine/WSL and Neon servers

**Solutions** (in order):
1. Check internet connection
2. See **WSL Networking Troubleshooting** section below
3. Verify Neon status: https://status.neon.tech
4. Try different Neon endpoint (pooler vs direct connection)

### Issue 2: Authentication Failed

**Symptoms**:
```
Error: password authentication failed
```

**Cause**: Wrong password or credentials in DATABASE_URL

**Solutions**:
1. Double-check password in Neon console
2. Copy fresh connection string from Neon
3. Ensure no typos in `.env` file
4. Check for special characters in password (may need URL encoding)

### Issue 3: SSL Certificate Error

**Symptoms**:
```
Error: self signed certificate
```

**Solution** (already done):
```javascript
ssl: { rejectUnauthorized: false }  // In db.js
```

---

## WSL Networking Troubleshooting

If you're getting `ETIMEDOUT` errors from WSL:

### Check 1: DNS Resolution

```bash
# Test DNS from WSL
wsl -d Ubuntu-22.04 nslookup ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech

# Expected: Should resolve to an IP address
```

### Check 2: Network Connectivity

```bash
# Test TCP connection from WSL
wsl -d Ubuntu-22.04 nc -zv ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech 6432

# Expected: Should show "succeeded"
```

### Check 3: WSL Network Settings

**From Windows PowerShell (as Admin)**:

```powershell
# Restart WSL network
wsl --shutdown
wsl

# Flush DNS cache
ipconfig /flushdns
```

### Check 4: Windows Firewall

**From Windows PowerShell (as Admin)**:

```powershell
# Check if PostgreSQL port is blocked
netsh advfirewall firewall show rule name=all | findstr "5432"

# Or add outbound rule for Neon
netsh advfirewall firewall add rule name="Allow Neon PostgreSQL" `
  dir=out action=allow protocol=tcp remoteport=6432 `
  remoteip=ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech
```

### Check 5: Try Direct Connection (Not Pooler)

Some users find the pooler endpoint times out. Try the direct endpoint:

1. **Get direct endpoint from Neon console**
2. **Update DATABASE_URL** (remove `-pooler`):
   ```
   postgresql://neondb_owner:PASSWORD@ep-falling-water-ap3jg70w.us-east-1.aws.neon.tech:5432/neondb?sslmode=require
   ```

3. **Update port** from `6432` to `5432`

4. **Restart backend**: `npm run dev`

---

## Database Maintenance

### Backup Your Data

Neon automatically creates backups. To manually:

1. **Export with pg_dump** (requires psql installed):
   ```bash
   pg_dump postgresql://neondb_owner:PASSWORD@your-host:6432/neondb > backup.sql
   ```

### Clear All Data

⚠️ **DANGER**: This deletes everything!

```bash
curl -X POST http://localhost:5000/api/admin/drop-all
```

---

## Monitoring Neon

### Check Usage in Neon Console

- **Compute**: Tracks active connections and queries
- **Storage**: Database size (free tier: 3GB)
- **Network**: Data transferred
- **Activity**: Recent queries and logs

### Query Logs

In Neon console **SQL Editor**:
```sql
SELECT * FROM pg_log LIMIT 100;
```

---

## Advanced: Environment-Specific URLs

For different environments:

```env
# .env.development
DATABASE_URL=postgresql://dev_user:pass@ep-dev-host:6432/dev_db?sslmode=require

# .env.production  
DATABASE_URL=postgresql://prod_user:pass@ep-prod-host:6432/prod_db?sslmode=require
```

Then load based on `NODE_ENV`:
```javascript
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });
```

---

## Support

- **Neon Docs**: https://neon.tech/docs
- **Neon Status**: https://status.neon.tech
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

**Last Updated**: 2026-05-19
