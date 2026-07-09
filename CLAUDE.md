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
| Frontend   | https://ghn-booking-meeting-seven.vercel.app |
| Backend    | https://ghn-booking-meeting.onrender.com |
| Database   | Supabase (PostgreSQL 15, project: `ghn-booking-meeting`) |
| Report     | https://tilo2402.github.io/ghn_booking_meeting/ (GitHub Pages, `docs/index.html`) |

---

## Auto-Deploy Workflow

Vercel (frontend) and Render (backend) both auto-deploy on push to `main` — pushing **is** the deploy step, there is no separate deploy action.

When the user asks for a code change (fix, feature, content/copy update, etc.) in a normal chat turn:
1. Implement it, review related areas it touches, and verify (lint/build, and a real run-through for UI changes when a browser tool is available).
2. Commit with a clear message and **push to `main` right away, without pausing to ask for confirmation first** — the user has pre-authorized this so requested changes go live without an extra round trip. This applies even when no browser tool is available to visually confirm a UI change (e.g. CSS/Tailwind class tweaks) — lint/build passing and correct code review are sufficient; don't pause to ask the user to preview locally first unless they ask to.

Still stop and ask before proceeding when:
- The action is destructive or hard to reverse (force-push, `git reset --hard`, rewriting history, deleting branches, dropping/altering production DB data).
- The change is materially larger or riskier than what was asked for (e.g. a schema migration, a dependency downgrade, anything touching auth/security).
- The request is ambiguous enough that pushing the wrong thing would be worse than asking.

---

## Architecture

```
Browser → Vercel (React SPA) → Render (Express API) → Supabase (PostgreSQL)
```

- Frontend on **Vercel** — `frontend/vercel.json` has SPA rewrite rule
- Backend on **Render** (free tier) — cold start after 15 min inactivity
- DB on **Supabase** (free tier) — must use **Session Pooler** URL (IPv4), NOT Direct connection (IPv6 only, incompatible with Render free)

---

## Demo Accounts

| Email | Role |
|-------|------|
| admin@ghn.vn | Admin |
| vip@ghn.vn | VIP (BOD) |
| john@ghn.vn | User |
| jane@ghn.vn | User |
| mike@ghn.vn | User |

> Production auth is **Sign in with Google**, restricted to the `@ghn.vn` Google Workspace domain (see `frontend/src/pages/LoginPage.jsx` and `backend/src/services/AuthService.js#loginWithGoogle`) — Google verifies the person actually owns the mailbox before issuing a token, so one user can no longer type in a colleague's email to access their account. A matching `@ghn.vn` Google account must exist for these demo emails to actually sign in; any `@ghn.vn` Google account auto-creates a `user` account on first login, and role is set manually in the DB (Admin panel → Quản lý quyền).
> The old email-only login (`POST /api/auth/login`, no identity verification) still exists but is disabled whenever `NODE_ENV=production` — it's for local dev convenience only, never expose it in production.

---

## Key Environment Variables

### Backend (set on Render)
```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
NODE_ENV=production
PORT=10000
JWT_SECRET=<secret>
ALLOWED_ORIGINS=https://ghn-booking-meeting-seven.vercel.app
GOOGLE_CLIENT_ID=<oauth-client-id>.apps.googleusercontent.com
```
> Use Session Pooler URL (pooler.supabase.com), NOT direct connection.
> `GOOGLE_CLIENT_ID` must match the frontend's `VITE_GOOGLE_CLIENT_ID` — used to verify the audience of the Google ID token server-side.

### Frontend (set on Vercel)
```
VITE_API_URL=https://ghn-booking-meeting.onrender.com/api
VITE_GOOGLE_CLIENT_ID=<oauth-client-id>.apps.googleusercontent.com
```
> Must include `/api` suffix. Vite env vars are baked at build time — redeploy after changing.
> Local fallback: `http://localhost:5001/api` (see `frontend/src/api/axios.js`).
> `VITE_GOOGLE_CLIENT_ID` comes from a Google Cloud Console OAuth Client ID (type "Web application") — see [Google Sign-In Setup](#google-sign-in-setup) below.

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
- `/auth` — `POST /auth/google` (Sign in with Google, production login path, auto-creates account for new `@ghn.vn` Google accounts); `POST /auth/login` (email-only, dev only — disabled when `NODE_ENV=production`)
- `/rooms` — CRUD for rooms and search
- `/bookings` — user bookings (create, update, cancel, freeze-status)
- `/dashboard` — admin metrics and reports
- `/admin` — admin-only: settings, booking overrides

**Middleware** (`backend/src/middleware/auth.js`):
- `authMiddleware` — validates JWT from `Authorization: Bearer <token>` header
- `adminMiddleware` — requires `role === 'admin'`
- `vipMiddleware` — requires `role === 'vip'` or `role === 'admin'`

**Models** (`backend/src/models/`): Sequelize models with UUID PKs. Associations defined in `index.js`:
- `Room` → `RoomAmenity` (as `amenities`), `Booking` (as `bookings`)
- `User` → `Booking` (as `bookings`), `Notification`
- `Booking` → `Notification` (as `notifications`)

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

## Google Sign-In Setup

Login is enforced via Google OAuth (Sign in with Google) restricted to `@ghn.vn` — required once per Google Cloud project, not per deploy:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → OAuth consent screen**: set up as Internal (if the Workspace admin allows) or External; app name, support email.
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**, type **Web application**.
   - Authorized JavaScript origins: `https://ghn-booking-meeting-seven.vercel.app`, `http://localhost:5173` (and `5174` if used).
   - No redirect URI needed — the frontend uses the Google Identity Services popup/one-tap flow (`google.accounts.id`), not the redirect-based OAuth flow.
4. Copy the generated **Client ID** (`....apps.googleusercontent.com`).
5. Set it as `GOOGLE_CLIENT_ID` on Render (backend) and `VITE_GOOGLE_CLIENT_ID` on Vercel (frontend) — **same value on both**, then redeploy both (Vercel env vars are baked at build time).

Without these two env vars set, the login page shows an error instead of the Google button, and `/api/auth/google` rejects everything with "Google Sign-In chưa được cấu hình trên server".

---

## Deployment Checklist (fresh deploy)

1. **Supabase**: Create project → run `SETUP_DATABASE.sql` in SQL Editor → copy Session Pooler connection string → reset DB password
2. **Render**: New Web Service → connect GitHub → set root to `backend` → add all env vars above (including `GOOGLE_CLIENT_ID`)
3. **Vercel**: New project → connect GitHub → set root to `frontend` → add `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` → deploy
4. **Google Cloud Console**: follow [Google Sign-In Setup](#google-sign-in-setup) above
