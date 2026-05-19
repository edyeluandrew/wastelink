# WasteLink Backend - Module 2.5: Neon Database Connection Fix

## Status: ✅ Complete - Real Database Only

This is the backend server for WasteLink Uganda - a digital waste management system.

**Important**: This version uses **ONLY Neon PostgreSQL**. No mock data. If the database is unavailable, endpoints return proper error responses.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
Create `.env` file with your Neon connection string:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@your-host:6432/neondb?sslmode=require
DATABASE_SSL=true
NODE_ENV=development
```

See [NEON_SETUP.md](./NEON_SETUP.md) for detailed setup.

### 3. Start Server
```bash
npm run dev          # Development with auto-reload
npm start            # Production
```

Server runs on http://localhost:5000

### 4. Initialize Database Schema
```bash
curl -X POST http://localhost:5000/api/admin/init-db
```

---

## API Endpoints

### Health Checks

```bash
# API health (no database required)
GET /api/health

# Database health (tests Neon connection)
GET /api/health/db
```

### Pickers Module (Module 2)

```bash
# List all pickers
GET /api/pickers?division=Kawempe&gender=Male&status=ACTIVE

# Get single picker
GET /api/pickers/:id

# Create picker
POST /api/pickers
{
  "name": "Juma Katongole",
  "phone": "+256701234567",
  "gender": "Male",
  "age_group": "25-35",
  "division": "Kawempe",
  "main_waste_type": "PLASTIC"
}

# Update picker
PATCH /api/pickers/:id
{
  "name": "Updated Name",
  "division": "Rubaga"
}
```

---

## File Structure

```
backend/
├── src/
│   ├── app.js                          # Express app configuration
│   ├── server.js                       # Server entry point
│   ├── config/
│   │   └── db.js                       # Database connection pool
│   ├── controllers/
│   │   └── pickerController.js         # Picker business logic
│   ├── routes/
│   │   └── pickerRoutes.js             # Picker endpoints
│   ├── middleware/
│   │   └── errorHandler.js             # Global error handler
│   └── utils/
│       ├── apiResponse.js              # Response formatting
│       ├── generateCodes.js            # Code generation (WL-XXXX)
│       └── calculateEarnings.js        # Waste type rates
├── schema.sql                          # Database schema
├── package.json
├── .env                                # Environment variables (Git-ignored)
├── NEON_SETUP.md                       # Neon setup guide
├── WSL_NETWORKING_TROUBLESHOOTING.md   # WSL connectivity fixes
└── README.md                           # This file
```

---

## Key Features

### ✅ Real Database Connections Only
- All endpoints require Neon PostgreSQL
- No mock data fallbacks
- Clear error messages on connection failure
- Database errors logged with error codes

### ✅ Comprehensive Error Handling
- Database timeout → HTTP 503
- Invalid request → HTTP 400
- Not found → HTTP 404
- Unified error response format

### ✅ Connection Monitoring
- Startup connection test
- Pool error handling
- Detailed logging for debugging
- Health check endpoints

### ✅ Security
- SSL/TLS enabled for Neon
- Connection pooling (max 5 concurrent)
- Input validation
- SQL injection prevention (parameterized queries)

---

## Database Schema

Five tables (created by `POST /api/admin/init-db`):

### users
```sql
id, name, email, phone, password_hash, role, status, created_at, updated_at
```

### pickers
```sql
id, picker_code, name, phone, gender, age_group, division, main_waste_type, status, created_at, updated_at
```

### collection_points
```sql
id, point_code, name, division, agent_name, agent_phone, status, created_at, updated_at
```

### waste_logs
```sql
id, job_code, picker_id, collection_point_id, waste_type, estimated_kg, verified_kg, status, logged_at, verified_at, created_at, updated_at
```

### earnings
```sql
id, picker_id, waste_log_id, rate_per_kg, amount, status, created_at, paid_at
```

---

## Troubleshooting

### Database Connection Timeout (ETIMEDOUT)

This is usually a **WSL networking issue**. See comprehensive guide:

```bash
cat WSL_NETWORKING_TROUBLESHOOTING.md
```

**Quick fix** (try in order):
1. Restart WSL: `wsl --shutdown`
2. Check DNS: `nslookup ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech`
3. Try direct endpoint instead of pooler (see NEON_SETUP.md)
4. Increase timeout in `src/config/db.js`

### Database Authentication Failed

```bash
# Verify credentials in .env
echo $DATABASE_URL

# Copy fresh string from Neon console
# Double-check password has no special characters that need escaping
```

### Tables Not Found

```bash
# Initialize schema
curl -X POST http://localhost:5000/api/admin/init-db

# Verify in Neon console
# Go to SQL Editor and run:
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
```

---

## Scripts

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# Production with PM2 (recommended)
npm install -g pm2
pm2 start src/server.js --name wastelink-backend
pm2 save
pm2 startup
```

---

## Environment Variables

Required in `.env`:

```env
# Port
PORT=5000

# Database (get from Neon console)
DATABASE_URL=postgresql://user:password@your-host:6432/neondb?sslmode=require
DATABASE_SSL=true

# Environment
NODE_ENV=development
```

---

## Deployment (Production)

### Environment Setup

```env
# .env (production)
PORT=5000
DATABASE_URL=postgresql://prod_user:prod_password@prod-host:6432/prod_db?sslmode=require
DATABASE_SSL=true
NODE_ENV=production
```

### Using PM2

```bash
npm install -g pm2
pm2 start src/server.js \
  --name "wastelink-backend" \
  --env NODE_ENV=production \
  --max-memory-restart 512M \
  --error /var/log/wastelink-error.log \
  --out /var/log/wastelink-out.log
```

### Docker (Optional)

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "src/server.js"]
```

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Database connection failed. Please check Neon DATABASE_URL or network configuration.",
  "data": null
}
```

---

## Next Steps

1. **Verify database connection**: `curl http://localhost:5000/api/health/db`
2. **Initialize schema**: `curl -X POST http://localhost:5000/api/admin/init-db`
3. **Test Pickers API**: `curl http://localhost:5000/api/pickers`
4. **Fix Neon connectivity** (if needed): See WSL_NETWORKING_TROUBLESHOOTING.md
5. **Proceed to Module 3**: Collection Points API

---

## Modules Progress

- ✅ Module 1: Backend Foundation
- ✅ Module 2: Pickers API
- ✅ Module 2.5: Neon Database Connection Fix (Real database only)
- ⏳ Module 3: Collection Points API
- ⏳ Module 4: Waste Logs API
- ⏳ Module 5: Dashboard API
- ⏳ Module 6: Reports API

---

## Support & Documentation

- **Neon Setup**: See [NEON_SETUP.md](./NEON_SETUP.md)
- **WSL Troubleshooting**: See [WSL_NETWORKING_TROUBLESHOOTING.md](./WSL_NETWORKING_TROUBLESHOOTING.md)
- **Neon Docs**: https://neon.tech/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

**Last Updated**: 2026-05-19
