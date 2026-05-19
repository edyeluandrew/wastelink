# Quick Start Guide - WasteLink Uganda Dashboard

Get the City/Admin Dashboard running in minutes.

## Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL 14+ (must be running)
- Git

## Installation (5 minutes)

### 1. Clone Repository
```bash
git clone https://github.com/edyeluandrew/wastelink.git
cd wastelink
```

### 2. Setup Backend
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials:
# DATABASE_URL=postgresql://user:password@localhost:5432/wastelink

# Setup database (creates tables and seeds data)
npm run db:setup

# Start backend
npm run dev
# Output: Server running on http://localhost:5000
```

### 3. Setup Frontend (in another terminal)
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Should contain: VITE_API_BASE_URL=http://localhost:5000/api

# Start frontend
npm run dev
# Output: http://localhost:5173 opens in browser
```

## Access the Dashboard

**URL:** http://localhost:5173

You should see:
- Sidebar with 7 menu items
- Overview page with statistics
- All pages fully functional

## Test the Demo Flow (5 minutes)

1. **Go to Pickers page** (/pickers)
   - Click "Add Picker"
   - Fill form: Name, Phone, Gender, Age, Division, Waste Type
   - Click "Add Picker"

2. **Go to Collection Points** (/collection-points)
   - Click "Add Collection Point"
   - Fill form: Name, Division, Agent Name, Phone
   - Verify it appears in table

3. **Go to Waste Logs** (/waste-logs)
   - Click "Create Waste Log"
   - Select: Picker, Collection Point, Waste Type, Weight (kg)
   - Click "Create Log"
   - Log appears with PENDING status

4. **Verify the Waste Log**
   - Click "Verify" button
   - Enter verified weight
   - Log status changes to VERIFIED

5. **Mark as Paid**
   - Click "Mark Paid" button
   - Earning status changes to PAID

6. **Check Overview Dashboard**
   - Go to home (/)
   - See updated stats reflecting your data

7. **Check Reports**
   - Go to /reports
   - Select current month
   - See monthly report with your data

## Common Issues & Solutions

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running
```bash
# macOS
brew services start postgresql

# Linux
sudo service postgresql start

# Windows
# Start from Services panel
```

### Port Already in Use (5000)
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change PORT in `backend/.env`
```env
PORT=5001
# Then restart backend
```

### Frontend Not Connecting to Backend
```
CORS error or "Cannot GET /api/..."
```
**Solution:** Verify VITE_API_BASE_URL in `frontend/.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Blank Page on Frontend
**Solution:** Clear browser cache and restart Vite
```bash
# Stop frontend (Ctrl+C)
# Clear cache: Ctrl+Shift+Delete in browser
npm run dev
```

## Build for Production

### Frontend Build
```bash
cd frontend
npm run build
# Creates optimized dist/ folder
npm run preview  # Preview production build
```

### Deploy Frontend
- Upload `dist/` folder to:
  - Vercel
  - Netlify
  - Azure Static Web Apps
  - Any static hosting

### Deploy Backend
- Update database credentials in production `.env`
- Deploy to:
  - Azure App Service
  - Heroku
  - DigitalOcean
  - AWS EC2

## Environment Variables

### Backend (backend/.env)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/wastelink
CORS_ORIGIN=http://localhost:5173
```

### Frontend (frontend/.env)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Directory Structure

```
wastelink/
├── backend/                # Express API server
│   ├── src/
│   ├── prisma/            # Database schema
│   └── package.json
├── frontend/              # React admin dashboard
│   ├── src/
│   │   ├── pages/        # 7 page components
│   │   ├── components/   # 10 reusable components
│   │   └── api/          # API client
│   └── package.json
├── README.md             # Full documentation
└── .gitignore
```

## Pages Available

| Page | URL | Purpose |
|------|-----|---------|
| Overview | / | Dashboard with stats |
| Pickers | /pickers | Manage waste pickers |
| Collection Points | /collection-points | Manage collection locations |
| Waste Logs | /waste-logs | Log and verify waste |
| Divisions | /divisions | Division performance |
| Earnings | /earnings | Payment tracking |
| Reports | /reports | Analytics & reports |

## API Endpoints

```
Health:              GET /api/health
Dashboard Stats:     GET /api/dashboard/stats
Pickers:             GET/POST /api/pickers
Collection Points:   GET/POST /api/collection-points
Waste Logs:          GET/POST /api/waste-logs
Verify Waste:        PATCH /api/waste-logs/:id/verify
Mark Paid:           PATCH /api/waste-logs/:id/mark-paid
Reports:             GET /api/reports/*
```

## Useful Commands

### Backend
```bash
cd backend

# Start development
npm run dev

# Check database connection
npm run db:status

# Seed data
npm run db:seed

# Reset database (development only)
npm run db:reset
```

### Frontend
```bash
cd frontend

# Start development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Git & GitHub

### Clone the Repository
```bash
git clone https://github.com/edyeluandrew/wastelink.git
```

### View on GitHub
https://github.com/edyeluandrew/wastelink

### Make Changes
```bash
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "Add my feature"
git push origin feature/my-feature
# Create Pull Request on GitHub
```

## Features

### Create & Manage
- Register waste pickers
- Create collection points
- Log waste collection
- Verify waste quality
- Track earnings

### View & Filter
- Search by job code
- Filter by division, status, type
- View performance metrics
- Generate reports

### Export & Report
- Platform summary reports
- Monthly performance reports
- UNDP pilot reports
- Custom date ranges

## Support

- **Documentation:** See README.md
- **Issues:** https://github.com/edyeluandrew/wastelink/issues
- **Email:** edyelu3@gmail.com

## Next Steps

1. ✅ Setup backend and frontend
2. ✅ Run demo flow (5 mins)
3. ✅ Test all 7 pages
4. ✅ Build for production: `npm run build`
5. ✅ Deploy to production

---

**Total Setup Time:** ~10 minutes  
**Demo Test Time:** ~5 minutes  
**Status:** Production Ready

For full documentation, see [README.md](README.md)
