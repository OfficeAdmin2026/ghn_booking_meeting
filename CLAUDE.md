# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Internal meeting room booking system for GHN (Giao Hàng Nhanh).
- 19 rooms across 2 locations (Rivera Park, Mipec)
- ~1000 users, 3 roles: `user`, `vip`, `admin`
- Stack: React 18 + Vite + Tailwind (frontend) / Node.js + Express + Sequelize (backend) / PostgreSQL

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

## Demo Accounts (no password — login only requires email + name)

| Email | Role |
|-------|------|
| admin@ghn.vn | Admin |
| vip@ghn.vn | VIP (BOD) |
| john@ghn.vn | User |
| jane@ghn.vn | User |
| mike@ghn.vn | User |

> Auth is email-only (no password): any `@ghn.vn` email auto-creates a `user` account on first login. Role is set manually in the DB.

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
> Local fallback: `http://localhost:5001/api` (see `frontend/src/api/axios.js`).

---

## Local Development

```bash
# Backend (runs on :3000)
cd backend && npm install && npm run dev

# Frontend (runs on :5173)
cd frontend && npm install && npm run dev

# Frontend lint
cd frontend && npm run lint

# Database migrations & seeding
cd backend && npm run db:migrate
cd backend && npm run db:seed
```

No test suite exists — there are no test commands.

---

## Backend Architecture

Routes → Controllers → Services. All business logic lives in services.

**API routes** (all prefixed `/api`):
- `/auth` — login (email-only, auto-creates account for new `@ghn.vn` emails)
- `/rooms` — CRUD for rooms and search
- `/bookings` — user bookings (create, update, cancel, check-in, freeze-status)
- `/checkins` — check-in flow
- `/dashboard` — admin metrics and reports
- `/admin` — admin-only: settings, booking overrides

**Middleware** (`backend/src/middleware/auth.js`):
- `authMiddleware` — validates JWT from `Authorization: Bearer <token>` header
- `adminMiddleware` — requires `role === 'admin'`
- `vipMiddleware` — requires `role === 'vip'` or `role === 'admin'`

**Models** (`backend/src/models/`): Sequelize models with UUID PKs. Associations defined in `index.js`:
- `Room` → `RoomAmenity` (as `amenities`), `Booking` (as `bookings`)
- `User` → `Booking` (as `bookings`), `Notification`
- `Booking` → `CheckIn` (as `checkin`), `Notification` (as `notifications`)

**Booking status flow**: `pending → confirmed → active → completed | cancelled`

---

## Frontend Architecture

Single-page React app using React Router v7. Entry: `frontend/src/App.jsx`.

**Route structure**:
- `/login` — public
- `/` — `CalendarPage` (protected, all users)
- `/dashboard`, `/admin`, `/analytics` — protected, admin only

**Auth** (`frontend/src/contexts/AuthContext.jsx`): JWT stored in `localStorage` as `ghn_token`; user object as `ghn_user`. The `useAuth()` hook exposes `user`, `isAdmin`, `isVip`, `login`, `logout`.

**API layer** (`frontend/src/api/`):
- `axios.js` — Axios instance, attaches JWT header, redirects to `/login` on 401
- `index.js` — typed API functions grouped by domain: `authApi`, `roomsApi`, `bookingsApi`, `dashboardApi`, `adminApi`

**Styling**: Tailwind CSS only (no component library).

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/config/database.js` | Supports `DATABASE_URL` (production) or individual env vars (local) |
| `backend/src/app.js` | Express setup, CORS via `ALLOWED_ORIGINS`, route registration |
| `backend/SETUP_DATABASE.sql` | Full DB setup — schema + seed. Run once on fresh Supabase instance |
| `backend/SEED_DATA.sql` | Seed data only (requires schema already created) |
| `frontend/vercel.json` | SPA routing rewrite `/*` → `/index.html` |
| `frontend/src/pages/AdminPage.jsx` | Admin panel — amenities use `a.amenity` field (not `a.name`) |
| `docs/index.html` | Project report — deployed to GitHub Pages |

---

## DB Schema Notes

- All tables use UUID primary keys (except `admin_settings` which uses SERIAL)
- `bookings` has extra columns not in original schema SQL: `cancellation_message TEXT`, `is_admin_hidden BOOLEAN`
- `room_amenities.amenity` is an ENUM (`TV`, `Audio Conference`, `Video Conference`, `Projector`)
- `is_admin_hidden` allows admins to book during freeze periods invisibly to regular users

---

## Known Issues Fixed

| Issue | Fix |
|-------|-----|
| Render can't connect to Supabase | Use Session Pooler URL (IPv4), not Direct connection (IPv6) |
| `column "cancellation_message" does not exist` | `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_message TEXT, ADD COLUMN IF NOT EXISTS is_admin_hidden BOOLEAN DEFAULT false;` |
| Admin tab blank (React error #31) | Amenity objects have field `amenity`, not `name`. Fixed in AdminPage.jsx |
| 404 on Vercel page refresh | `frontend/vercel.json` rewrites `/*` → `/index.html` |
| Login spinning | `VITE_API_URL` must end with `/api` |
| CORS blocked | `ALLOWED_ORIGINS` must exactly match Vercel URL (no trailing slash) |

---

## Render (Backend) Notes

- Free tier sleeps after 15 min of inactivity — first request takes ~30s (cold start)
- Build command: `npm install` | Start command: `npm start` | Root directory: `backend`

---

## Deployment Checklist (fresh deploy)

1. **Supabase**: Create project → run `SETUP_DATABASE.sql` in SQL Editor → copy Session Pooler connection string → reset DB password
2. **Render**: New Web Service → connect GitHub → set root to `backend` → add all env vars above
3. **Vercel**: New project → connect GitHub → set root to `frontend` → add `VITE_API_URL` → deploy
