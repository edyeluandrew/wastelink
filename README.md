# WasteLink Uganda - Waste Management & Livelihood Platform

> A comprehensive waste management system connecting waste pickers, collection points, and city administrators for sustainable waste management and livelihood improvement in Kampala, Uganda.

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19.2.6-blue)](https://react.dev)

---

## Overview

WasteLink Uganda is a digital platform designed to:
- **Formalize** informal waste collection in Kampala
- **Verify** waste quantities through standardized processes
- **Track earnings** for waste pickers with transparency
- **Generate reports** for city administrators and development partners (UNDP)
- **Support** livelihood improvement through data-driven insights

The system consists of:
- **Backend API** (Node.js/Express) - RESTful API with PostgreSQL
- **City/Admin Dashboard** (React/Tailwind) - Management interface for administrators
- **Picker Mobile App** (Future) - React Native app for waste pickers
- **Collection Point Interface** (Future) - Agent interface for collection points
- **USSD Gateway** (Future) - SMS/USSD support for basic phones

---

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.18
- **Database:** PostgreSQL 14+
- **ORM:** Prisma 5.x
- **Authentication:** JWT (future)
- **API Docs:** Swagger/OpenAPI

### Frontend
- **Framework:** React 19.2.6 (ESM via Vite)
- **Styling:** Tailwind CSS 3.4.17
- **Routing:** React Router DOM 7.15.1
- **HTTP Client:** Axios 1.6.0
- **Icons:** Lucide React 0.263.0
- **Charts:** Recharts 2.10.0
- **Build Tool:** Vite 8.0.12

---

## Project Structure

```
wastelink/
├── backend/                          # Express.js API Server
│   ├── src/
│   │   ├── config/                   # Configuration files
│   │   ├── controllers/              # Route handlers
│   │   ├── middlewares/              # Express middleware
│   │   ├── models/                   # Database models (Prisma)
│   │   ├── routes/                   # API routes
│   │   ├── services/                 # Business logic
│   │   ├── utils/                    # Utility functions
│   │   ├── scripts/                  # Database setup scripts
│   │   └── server.js                 # App entry point
│   ├── prisma/
│   │   ├── migrations/               # Database migrations
│   │   └── schema.prisma             # Database schema
│   ├── .env.example                  # Environment variables template
│   ├── package.json
│   └── README.md
│
├── frontend/                         # React Admin Dashboard
│   ├── src/
│   │   ├── api/                      # Axios setup & API client
│   │   ├── components/               # Reusable React components
│   │   ├── layouts/                  # Layout components
│   │   ├── pages/                    # Page components
│   │   ├── utils/                    # Utility functions
│   │   ├── App.jsx                   # Router setup
│   │   ├── main.jsx                  # Entry point
│   │   └── index.css                 # Tailwind styles
│   ├── public/                       # Static assets
│   ├── .env.example                  # Environment variables template
│   ├── vite.config.js                # Vite configuration
│   ├── tailwind.config.js            # Tailwind configuration
│   ├── package.json
│   └── README.md
│
├── docs/                             # Documentation
│   ├── API.md                        # API endpoints reference
│   ├── DATABASE.md                   # Database schema
│   └── DEPLOYMENT.md                 # Deployment guide
│
├── README.md                         # This file
├── .gitignore                        # Git ignore rules
└── LICENSE                           # MIT License
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+ (local or remote)
- Git
- A code editor (VS Code recommended)

### Backend Setup

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your database credentials and settings.

4. **Setup database:**
   ```bash
   npm run db:setup    # Run migrations and seed data
   ```

5. **Start development server:**
   ```bash
   npm run dev         # Runs on http://localhost:5000
   ```

6. **Check API health:**
   ```bash
   curl http://localhost:5000/api/health
   ```

### Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_BASE_URL=http://localhost:5000/api`

4. **Start development server:**
   ```bash
   npm run dev         # Runs on http://localhost:5173
   ```

5. **Build for production:**
   ```bash
   npm run build       # Creates dist/ folder
   ```

---

## API Endpoints

### Health Check
- `GET /api/health` - API status

### Dashboard
- `GET /api/dashboard/stats` - Overview statistics
- `GET /api/dashboard/today` - Today's activity
- `GET /api/dashboard/recent-logs` - Recent waste logs
- `GET /api/dashboard/waste-types` - Waste type breakdown
- `GET /api/dashboard/top-pickers` - Top performing pickers
- `GET /api/dashboard/divisions` - Division performance

### Pickers Management
- `GET /api/pickers` - List all pickers
- `POST /api/pickers` - Create new picker
- `PATCH /api/pickers/:id` - Update picker

### Collection Points
- `GET /api/collection-points` - List collection points
- `POST /api/collection-points` - Create collection point
- `PATCH /api/collection-points/:id` - Update collection point
- `PATCH /api/collection-points/:id/deactivate` - Deactivate collection point

### Waste Logs
- `GET /api/waste-logs` - List waste logs
- `POST /api/waste-logs` - Create waste log
- `GET /api/waste-logs/job/:jobCode` - Search by job code
- `PATCH /api/waste-logs/:id/verify` - Verify waste log
- `PATCH /api/waste-logs/:id/reject` - Reject waste log
- `PATCH /api/waste-logs/:id/mark-paid` - Mark as paid

### Reports
- `GET /api/reports/summary` - Platform summary
- `GET /api/reports/monthly` - Monthly report (with ?month=YYYY-MM)
- `GET /api/reports/undp-pilot` - UNDP pilot report (with ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD)

See [API Documentation](docs/API.md) for detailed endpoint specifications.

---

## Pages & Features

### 1. Overview Dashboard
- **Path:** `/`
- **Features:**
  - 9 key stat cards (total pickers, collection points, verified waste, earnings, women %, youth %, pending/verified/rejected logs)
  - Today's activity summary (logs submitted, verified, weight, earnings)
  - Recent waste logs table (last 5)
  - Waste type breakdown (total logs, verified, KG, earnings)
  - Top 5 pickers by verified waste

**APIs Used:**
- GET /api/dashboard/stats
- GET /api/dashboard/today
- GET /api/dashboard/recent-logs?limit=5
- GET /api/dashboard/waste-types
- GET /api/dashboard/top-pickers?limit=5

---

### 2. Pickers Management
- **Path:** `/pickers`
- **Features:**
  - List all pickers with filtering (division, gender, status)
  - Add new picker modal (name, phone, gender, age group, division, main waste type)
  - Edit picker inline modal
  - Real-time table updates after create/update
  - Status badges (active/inactive)
  - Picker codes displayed

**APIs Used:**
- GET /api/pickers
- POST /api/pickers
- PATCH /api/pickers/:id

---

### 3. Collection Points
- **Path:** `/collection-points`
- **Features:**
  - List all collection points with filtering (division, status)
  - Add new collection point modal
  - Edit collection point modal
  - Deactivate collection point button
  - Real-time updates
  - Point codes displayed

**APIs Used:**
- GET /api/collection-points
- POST /api/collection-points
- PATCH /api/collection-points/:id
- PATCH /api/collection-points/:id/deactivate

---

### 4. Waste Logs
- **Path:** `/waste-logs`
- **Features:**
  - List all waste logs
  - **Search by Job Code** with dedicated search box
  - Filter by status (pending, verified, rejected, paid)
  - Filter by waste type
  - Filter by division
  - **Create waste log modal** (select picker, collection point, waste type, estimated kg)
  - **Verify waste log modal** (enter verified kg, optional notes)
  - **Reject waste log modal** (optional rejection reason)
  - **Mark as paid button** (for verified logs)
  - Status and earning status indicators
  - Real-time updates after all actions

**APIs Used:**
- GET /api/waste-logs
- POST /api/waste-logs
- GET /api/waste-logs/job/:jobCode (for search)
- PATCH /api/waste-logs/:id/verify
- PATCH /api/waste-logs/:id/reject
- PATCH /api/waste-logs/:id/mark-paid
- GET /api/pickers (for dropdown)
- GET /api/collection-points (for dropdown)

---

### 5. Divisions
- **Path:** `/divisions`
- **Features:**
  - 3 summary stat cards (divisions covered, best division by waste, total verified waste)
  - Division performance table with comprehensive metrics
  - Columns: division, pickers, active pickers, collection points, logs breakdown (total, pending, verified, rejected, paid), verified KG, total earnings
  - Color-coded status badges in table

**APIs Used:**
- GET /api/dashboard/divisions
- GET /api/reports/summary

---

### 6. Earnings
- **Path:** `/earnings`
- **Features:**
  - 3 summary stat cards (total earnings, paid earnings, pending earnings)
  - Filter by earning status (pending, paid)
  - Earnings table with all transaction details
  - **Mark as Paid button** for verified logs with pending earnings
  - Shows waste log status alongside earning status
  - Real-time updates after mark paid action
  - Derived from waste logs API

**APIs Used:**
- GET /api/waste-logs
- PATCH /api/waste-logs/:id/mark-paid

---

### 7. Reports
- **Path:** `/reports`
- **Features:**
  - **Month selector** for reports
  - **Custom date range option** for UNDP reports
  - **Platform Summary section** (all-time stats: pickers, women, youth, collection points, waste, earnings, jobs, divisions)
  - **Monthly Report section** with:
    - Reporting period dates
    - Key metrics (pickers, women %, youth %, logs breakdown, waste breakdown, earnings)
    - Waste type breakdown table
    - Division performance table
    - Top pickers for the month
    - Recent verified logs
  - **UNDP Pilot Report section** with:
    - Pilot city and divisions
    - Inclusion metrics (registered pickers, women, youth with percentages)
    - Environmental impact (verified waste in kg and tonnes, waste type breakdown)
    - Livelihood impact (total earnings, paid, pending, average per picker)
    - Operations metrics (collection points, logs by status)
    - Division performance
    - Collection point performance
    - Top pickers

**APIs Used:**
- GET /api/reports/monthly?month=YYYY-MM
- GET /api/reports/summary
- GET /api/reports/undp-pilot
- GET /api/reports/undp-pilot?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

---

## Design System

### Color Palette
```
Primary Green:     #238636  (Main CTA buttons, active states)
Secondary Green:   #2F9E44  (Hover states, accents)
Background:        #F8F9FA  (Page background)
Surface:           #FFFFFF  (Card backgrounds)
Text Dark:         #111111  (Primary text)
Text Muted:        #6B7280  (Secondary text, meta)
Border:            #D9D9D9  (Dividers, borders)
Success:           #EAF6EA  (Success indicators)
```

### Typography
- **Brand:** Orbitron (WasteLink logo, major titles)
- **Content:** Inter (body text, tables, forms)

### Status Colors
- Green: ACTIVE, VERIFIED, PAID
- Amber: PENDING
- Red: REJECTED, INACTIVE

---

## Demo Workflow (MVP Walkthrough)

Follow this flow to test the complete system:

1. **Go to Pickers page** (/pickers)
2. **Add a new picker** 
   - Name: John Doe
   - Phone: +256701234567
   - Gender: Male
   - Age Group: 25-35
   - Division: Kawempe
   - Main Waste Type: Plastic
3. **Go to Collection Points** (/collection-points)
4. **Add a collection point**
   - Name: Central Hub
   - Division: Kawempe
   - Agent Name: Robert Mwebe
   - Agent Phone: +256702234567
5. **Go to Waste Logs** (/waste-logs)
6. **Create a waste log**
   - Picker: John Doe
   - Collection Point: Central Hub
   - Waste Type: Plastic
   - Estimated KG: 15.5
7. **Verify the waste log**
   - Click Verify button
   - Enter Verified KG: 14.2
   - Optional notes: "Quality check passed"
8. **Confirm earnings appear**
   - Go to Earnings page (/earnings)
   - Should show calculated earning amount
9. **Mark as paid**
   - Click "Mark Paid" button on the log
   - Earning status changes to PAID
10. **Go to Overview** (/)
    - See updated stats reflecting the new log and earnings
11. **Go to Reports** (/reports)
    - See updated monthly report with the new data
    - View division performance
    - See UNDP-style report with inclusion metrics

---

## Build & Deploy

### Build for Production

```bash
npm run build
```

Output: `dist/` folder with optimized static files

### Preview Build Locally

```bash
npm run preview
```

---

## Key Features Implemented

✅ **No Mock Data** - All data from real Express backend  
✅ **Real API Integration** - Using Axios for all requests  
✅ **Responsive Layout** - Sidebar + topbar + content area  
✅ **7 Complete Pages** - Overview, Pickers, Collection Points, Waste Logs, Divisions, Earnings, Reports  
✅ **CRUD Operations** - Create, read, update on pickers and collection points  
✅ **Complex Actions** - Verify, reject, mark as paid on waste logs  
✅ **Search & Filter** - By job code, status, type, division  
✅ **Modal Forms** - For all create/edit/action operations  
✅ **Data Formatting** - Currency, weights, dates, percentages  
✅ **Error Handling** - Try/catch, user-friendly messages, retry buttons  
✅ **Loading States** - Spinners while fetching data  
✅ **Status Badges** - Color-coded status indicators  
✅ **Tables** - Clean, scrollable, responsive tables  
✅ **Reports** - Monthly, summary, and UNDP-style reports  
✅ **Design System** - WasteLink green colors, Inter fonts, consistent styling  
✅ **Tailwind CSS** - Custom theme with color variables

---

## Data Handling

### API Client Setup (src/api/axios.js)
- Reads base URL from `VITE_API_BASE_URL` environment variable
- Sets 10-second timeout
- Includes error interceptor for logging
- Ready for future authentication headers

### Response Format Expected
```json
{
  "success": true,
  "message": "Success message",
  "data": {...}
}
```

### Error Handling
- Try/catch on all API calls
- User-friendly error messages in modals
- Retry buttons on error states
- Console logging for debugging

### Formatters (src/utils/formatters.js)
- `formatCurrencyUGX(amount)` - Currency formatting
- `formatKg(value)` - Weight in kilograms
- `formatTonnes(value)` - Weight in tonnes
- `formatPercentage(value)` - Percentage display
- `formatDate(value, relative)` - Date formatting
- `formatDateTime(value)` - DateTime formatting
- `formatNumber(value)` - Thousands separator
- `formatTime(value)` - Time only
- `formatStatus(status)` - Status text beautification

---

## Environment Variables

### Backend (.env)
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wastelink

# Server
NODE_ENV=development
PORT=5000

# CORS
CORS_ORIGIN=http://localhost:5173

# JWT (future)
JWT_SECRET=your_jwt_secret_key

# Email (future)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
```

See `.env.example` files in respective directories for full templates.

---

## Contributing

1. **Fork the repository**
2. **Create feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit changes:**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open Pull Request**

---

## Project Roadmap

### Phase 1: MVP (Current - Modules 1-7)
- [x] Backend API with CRUD operations
- [x] Database schema and migrations
- [x] Admin dashboard
- [x] Waste log management
- [x] Earnings tracking
- [x] Reports and analytics

### Phase 2: Mobile & Auth (Modules 8-10)
- [ ] Authentication system (JWT)
- [ ] Picker mobile app (React Native)
- [ ] Collection point agent app
- [ ] Push notifications

### Phase 3: Integration (Modules 11-12)
- [ ] USSD gateway for basic phones
- [ ] Mobile money integration (MTN Money, Airtel Money)
- [ ] SMS notifications
- [ ] Advanced analytics

### Phase 4: Scale
- [ ] Multi-city support
- [ ] Real-time syncing
- [ ] Offline-first capabilities
- [ ] Advanced reporting

---

## Troubleshooting

### Backend Issues

**Database Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
Solution: Ensure PostgreSQL is running and `DATABASE_URL` in `.env` is correct.

**Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::5000
```
Solution: Change PORT in `.env` or kill process using port 5000.

### Frontend Issues

**CORS Errors**
```
Access to XMLHttpRequest has been blocked by CORS policy
```
Solution: Ensure backend has CORS enabled and `VITE_API_BASE_URL` is correct.

**Blank Page**
```
No content displayed
```
Solution: Check browser console for errors, verify Tailwind build is included, clear cache.

See issue tracker for more: [GitHub Issues](https://github.com/edyeluandrew/wastelink/issues)

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## Contact & Support

**Project Lead:** edyeluandrew  
**Email:** edyelu3@gmail.com  
**Repository:** https://github.com/edyeluandrew/wastelink

### Support Channels
- GitHub Issues: Report bugs and feature requests
- Discussions: General questions and ideas
- Email: Direct inquiries

---

## Acknowledgments

- **UNDP Uganda** - Development partner for sustainable livelihoods
- **Kampala Capital City Authority** - Municipal support
- **Waste Management Partners** - Local waste collection stakeholders
- **Community Partners** - Waste picker associations

---

## Quick Links

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [GitHub Repository](https://github.com/edyeluandrew/wastelink)

---

**Last Updated:** May 2026  
**Version:** 1.0.0  
**Status:** Production Ready
