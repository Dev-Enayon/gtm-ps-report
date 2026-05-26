# ⛪ Gospel of Truth Mission — Church Report Management System

A full-stack web application for managing monthly church branch reports, featuring role-based access control with a single Head Administrator who approves all admin access requests.

---

## 🏗️ Architecture

```
church-app/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── index.js          # Server entry point
│   │   ├── models/
│   │   │   ├── db.js         # PostgreSQL pool
│   │   │   ├── migrate.js    # Database schema
│   │   │   └── seed.js       # Head admin seed
│   │   ├── routes/
│   │   │   ├── auth.js       # Login, register, admin request
│   │   │   ├── admin.js      # Admin management
│   │   │   └── reports.js    # Report CRUD + approve/reject
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT + role guards
│   │   └── utils/
│   │       ├── email.js      # Nodemailer templates
│   │       └── audit.js      # Audit logging
│   └── Dockerfile
├── frontend/         # React app
│   ├── src/
│   │   ├── App.js            # Routes
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── utils/
│   │   │   └── api.js        # Axios with token refresh
│   │   ├── components/
│   │   │   └── DashboardLayout.js
│   │   └── pages/
│   │       ├── LoginPage.js
│   │       ├── RegisterPage.js
│   │       ├── AdminDashboard.js
│   │       ├── AdminRequests.js   ← Head Admin only
│   │       ├── AllReports.js
│   │       ├── ReportDetail.js
│   │       ├── Analytics.js
│   │       ├── ActivityLog.js
│   │       ├── UserManagement.js
│   │       ├── MyReports.js
│   │       ├── ReportForm.js
│   │       └── RequestAdminPage.js
│   └── Dockerfile
├── docker-compose.yml
├── render.yaml        # Render.com deployment
├── netlify.toml       # Netlify frontend deployment
└── README.md
```

---

## 👥 User Role System

| Role | Description | Capabilities |
|------|-------------|--------------|
| `head_admin` | **One only.** Created via seed script. | Everything + approve/reject admin requests |
| `admin` | Approved by head_admin. | Manage all reports, view analytics, manage users |
| `branch` | Any registered user. | Submit own reports, request admin access |

### Admin Request Flow
```
Branch User → Submits request with reason
     ↓
Head Admin notified by email + in-app notification
     ↓
Head Admin reviews → Approves or Rejects
     ↓
Branch User notified by email → Role elevated to Admin
```

---

## 🚀 Deployment Guide

### Option A — Render.com (Backend) + Vercel (Frontend) [Recommended]

#### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/gotm-church-app.git
git push -u origin main
```

#### Step 2 — Deploy Backend on Render.com

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render detects `render.yaml` automatically and creates:
   - A **Web Service** (Node.js API)
   - A **PostgreSQL database**
4. In the Render dashboard, set these **environment variables manually**:

| Variable | Value |
|----------|-------|
| `HEAD_ADMIN_EMAIL` | `headadmin@yourdomain.com` |
| `HEAD_ADMIN_PASSWORD` | `YourSecurePassword@2024!` |
| `HEAD_ADMIN_FULLNAME` | `Your Full Name` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-gmail@gmail.com` |
| `SMTP_PASS` | `your-gmail-app-password` |
| `EMAIL_FROM` | `noreply@gospeloftruth.org` |

5. After deploy, run database setup via Render Shell:
```bash
npm run db:migrate
npm run db:seed
```

6. Note your API URL: `https://gotm-church-api.onrender.com`

#### Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   REACT_APP_API_URL = https://gotm-church-api.onrender.com/api
   ```
5. Click **Deploy**

#### Step 4 — Update CORS
Back in Render, update `FRONTEND_URL` to your Vercel URL (e.g. `https://gotm-church.vercel.app`).

---

### Option B — Netlify (Frontend) + Render (Backend)

Same backend steps as above.

For frontend:
1. Go to [netlify.com](https://netlify.com) → **New site from Git**
2. Connect GitHub repo, set **Base directory** to `frontend`
3. Build command: `npm run build`
4. Publish directory: `build`
5. Add environment variable: `REACT_APP_API_URL`

---

### Option C — Local Development with Docker

```bash
# Clone and start everything
git clone https://github.com/YOUR_USERNAME/gotm-church-app.git
cd gotm-church-app

# Start all services (Postgres + Backend + Frontend)
docker-compose up --build

# In a new terminal, run migrations + seed
docker exec gotm_backend npm run db:migrate
docker exec gotm_backend npm run db:seed

# App is running at:
#   Frontend: http://localhost:3000
#   Backend:  http://localhost:5000
#   Database: localhost:5432
```

---

### Option D — Manual Local Setup (No Docker)

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/gotm-church-app.git
cd gotm-church-app

# 2. Install all dependencies
npm run install:all

# 3. Setup backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials and settings

# 4. Setup frontend environment
echo "REACT_APP_API_URL=http://localhost:5000/api" > frontend/.env

# 5. Create PostgreSQL database
createdb gotm_church_db

# 6. Run migrations and seed
npm run db:setup

# 7. Start development servers
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

---

## 📧 Email Setup (Gmail)

1. Go to your Google Account → **Security** → **2-Step Verification** (enable it)
2. Go to **App passwords** → Generate a password for "Mail"
3. Use that 16-character password as `SMTP_PASS`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourchurch@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

---

## 🔐 API Endpoints

### Auth
```
POST /api/auth/register           Create branch account
POST /api/auth/login              Login
POST /api/auth/refresh            Refresh access token
POST /api/auth/logout             Logout
GET  /api/auth/me                 Current user
POST /api/auth/request-admin      Submit admin request [branch only]
```

### Reports
```
GET  /api/reports                 List reports (filtered)
GET  /api/reports/:id             Single report with attendance rows
POST /api/reports                 Create/update report (save or submit)
POST /api/reports/:id/approve     Approve report [admin only]
POST /api/reports/:id/reject      Reject report [admin only]
GET  /api/reports/analytics/summary  Analytics data [admin only]
```

### Admin (head_admin + admin)
```
GET  /api/admin/stats             Dashboard statistics
GET  /api/admin/users             All users
PUT  /api/admin/users/:id/status  Suspend/activate user [head_admin]
GET  /api/admin/requests          Admin access requests [head_admin]
POST /api/admin/requests/:id/approve  Approve admin request [head_admin]
POST /api/admin/requests/:id/reject   Reject admin request [head_admin]
GET  /api/admin/audit-logs        Activity log
GET  /api/admin/notifications     User notifications
```

---

## 🔑 First Login

After running `npm run db:seed`, login with:
- **Email:** value of `HEAD_ADMIN_EMAIL` in your `.env`
- **Password:** value of `HEAD_ADMIN_PASSWORD` in your `.env`

**Change your password immediately after first login.**

---

## ✨ Features

- ✅ Single Head Admin with full control
- ✅ Admin role request → email notification → Head Admin approval flow
- ✅ Full monthly report form matching spreadsheet layout
- ✅ Auto-save draft every 60 seconds
- ✅ Approve / Reject reports with comments
- ✅ Email notifications for all key events
- ✅ PDF export (jsPDF)
- ✅ Excel export (SheetJS)
- ✅ Analytics dashboard with Chart.js
- ✅ Audit log for all user actions
- ✅ User suspension/activation
- ✅ JWT with refresh token rotation
- ✅ Rate limiting and helmet security headers
- ✅ Mobile-responsive layout

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router 6, Chart.js, jsPDF, SheetJS |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL 15 |
| Auth | JWT (access + refresh tokens) |
| Email | Nodemailer (SMTP) |
| Hosting | Render.com (API + DB) + Vercel (Frontend) |
| Containers | Docker + Docker Compose |
