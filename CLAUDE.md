# CLAUDE.md — GHN Meeting Room Booking

Context file for Claude Code sessions. Read this at the start of every new session.

---

## Project Overview

Internal meeting room booking system for GHN (Giao Hàng Nhanh).
- 19 rooms across 2 locations (Rivera Park, Mipec)
- ~1000 users, 3 roles: `user`, `vip`, `admin`
- Stack: React 18 + Vite (frontend) / Node.js + Express + Sequelize (backend) / PostgreSQL

---

## Repo & Live URLs

| Service    | URL |
|------------|-----|
| GitHub     | https://github.com/tilo2402/ghn_booking_meeting |
| Frontend   | https://ghn-booking-meeting.vercel.app |
| Backend    | https://ghn-booking-meeting.onrender.com |
| Database   | Supabase (PostgreSQL 15, project: `ghn-booking-meeting`) |
| Report     | https://tilo2402.github.io/ghn_booking_meeting/ (GitHub Pages, `docs/index.html`) |

---

## Architecture

```
Browser → Vercel (React SPA) → Render (Express API) → Supabase (PostgreSQL)
```

- Frontend on **Vercel** — `frontend/vercel.json` has SPA rewrite rule
- Backend on **Render** (free tier) — cold start after 15 min inactivity
- DB on **Supabase** (free tier) — must use **Session Pooler** URL (IPv4), NOT Direct connection (IPv6 only, incompatible with Render free)

---

## Demo Accounts (password: `123456` for all)

| Email | Role |
|-------|------|
| admin@ghn.vn | Admin |
| vip@ghn.vn | VIP (BOD) |
| john@ghn.vn | User |
| jane@ghn.vn | User |
| mike@ghn.vn | User |

---

## Key Environment Variables

### Backend (set on Render)
```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
NODE_ENV=production
PORT=10000
JWT_SECRET=<secret>
ALLOWED_ORIGINS=https://ghn-booking-meeting.vercel.app
```
> Use Session Pooler URL (pooler.supabase.com), NOT direct connection.

### Frontend (set on Vercel)
```
VITE_API_URL=https://ghn-booking-meeting.onrender.com/api
```
> Must include `/api` suffix. Vite env vars are baked at build time — redeploy after changing.

---

## Local Development

```bash
# Backend
cd backend && npm install && npm run dev   # runs on :3000

# Frontend
cd frontend && npm install && npm run dev  # runs on :5173
```

Local backend uses `backend/.env` (PostgreSQL on localhost, see `.env.example`).

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/config/database.js` | Supports both `DATABASE_URL` (production) and individual env vars (local) |
| `backend/src/app.js` | CORS config using `ALLOWED_ORIGINS` env var |
| `backend/SETUP_DATABASE.sql` | **Full DB setup** — schema + seed data. Run once on fresh Supabase instance |
| `backend/SEED_DATA.sql` | Seed data only (requires schema already created) |
| `frontend/vercel.json` | SPA routing rewrites for Vercel |
| `docs/index.html` | Project report (HTML) — deployed to GitHub Pages |
| `frontend/src/pages/AdminPage.jsx` | Admin panel — amenities use `a.amenity` field (not `a.name`) |

---

## Known Issues Fixed

| Issue | Fix |
|-------|-----|
| Render can't connect to Supabase | Use Session Pooler URL (IPv4), not Direct connection (IPv6) |
| `column "cancellation_message" does not exist` | Run: `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_message TEXT, ADD COLUMN IF NOT EXISTS is_admin_hidden BOOLEAN DEFAULT false;` |
| Admin tab blank (React error #31) | Amenity objects have field `amenity`, not `name`. Fixed in AdminPage.jsx |
| 404 on Vercel page refresh | `frontend/vercel.json` rewrites `/*` → `/index.html` |
| Login spinning | `VITE_API_URL` must end with `/api` |
| CORS blocked | `ALLOWED_ORIGINS` must exactly match Vercel URL (no trailing slash) |

---

## DB Schema Notes

- All tables use UUID primary keys (except `admin_settings` which uses SERIAL)
- `bookings` has extra columns not in original schema SQL: `cancellation_message TEXT`, `is_admin_hidden BOOLEAN`
- `room_amenities.amenity` is an ENUM (`TV`, `Audio Conference`, `Video Conference`, `Projector`)
- Booking statuses: `pending → confirmed → active → completed | cancelled`

---

## Render (Backend) Notes

- Free tier sleeps after 15 min of inactivity — first request takes ~30s (cold start)
- Build command: `npm install`
- Start command: `npm start`
- Root directory: `backend`

---

## Deployment Checklist (fresh deploy)

1. **Supabase**: Create project → run `SETUP_DATABASE.sql` in SQL Editor → copy Session Pooler connection string → reset DB password
2. **Render**: New Web Service → connect GitHub → set root to `backend` → add all env vars above
3. **Vercel**: New project → connect GitHub → set root to `frontend` → add `VITE_API_URL` env var → deploy
