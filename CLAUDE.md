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
| **GitLab (source of truth)** | `https://gitlab.ghn.vn/ex/roombookings_oa_hr.git` — remote name `gitlab`. Replaces the old `dat-phong-hop.git` repo as of 2026-08-26. **`master` is a protected branch** — code was pushed to a `main` branch instead (`git push gitlab main:main`); merging `main` → `master` needs either a Merge Request on GitLab or a maintainer temporarily lifting branch protection for a force-push. |
| GitHub (mirror) | https://github.com/OfficeAdmin2026/ghn_booking_meeting — remote name `origin`, branch `main`. Keep pushing here too for redundancy; not tied to any deploy. |
| **Live app** | `https://datphonghop.ghn.vn` (frontend + `/api/*` proxy) and `https://datphonghop-api.ghn.vn` (same target — see Architecture) — both resolve through GHN's external ingress (Traefik, IP `167.254.73.248`) to the internal docker host below. |

> `gitlab.ghn.vn` was previously thought to be reachable only from GHN's internal network/VPN; as of 2026-08-26 it's reachable directly from this sandbox (`git fetch`/`push` both worked). Re-verify if this stops working again — VPN/network setup may have changed.

---

## Deploy — self-hosted Docker on internal GHN server (current, since 2026-08-26)

**Vercel + Render + Supabase are decommissioned.** The app now runs entirely on an internal GHN
Linux server via Docker Compose — no external hosting, no auto-deploy-on-push. Full details,
architecture diagram, secrets handling, and the exact redeploy commands live in
[`deploy/README.md`](deploy/README.md) — that file is the source of truth, this section is just a
pointer + the facts most relevant to day-to-day work here.

- **Server:** `root@10.43.100.249` (Ubuntu 24.04, internal GHN network), directory `/opt/ghn-booking-meeting/`.
- **3 containers** (`deploy/docker-compose.prod.yml`): `postgres` (16-alpine, internal only), `backend`
  (internal only, port 5000 not published), `frontend` (nginx, publishes `8080:80`, proxies `/api/*`
  to `backend:5000` — same-origin, no CORS needed for normal traffic).
- **Ingress:** GHN's Traefik (external IP `167.254.73.248`) routes both `datphonghop.ghn.vn` and
  `datphonghop-api.ghn.vn` to `10.43.100.249:8080` — same target for both hostnames, since nginx
  splits `/api/*` vs the SPA by path, not by hostname.
- **No git-triggered deploy.** Pushing to GitLab does *not* redeploy anything by itself. To ship a
  change: rsync `backend`/`frontend`/`deploy` to the server, then `docker compose -f
  docker-compose.prod.yml up -d --build` — exact command in `deploy/README.md`.
- **Auth:** GHN SSO v2 (OIDC), **production** credentials (`SSO_BASE_URL=https://online-gateway.ghn.vn/sso-v2`).
  Login by MSNV via `allowed_employees` allowlist (managed in the Admin UI) — SSO claims carry
  `employee_id` directly, no email involved.
- **Cleanup still owed** (external accounts I can't reach/delete myself — needs Huyền, on their own
  dashboards): pause or delete the old Vercel project, Render service, and Supabase project so
  nothing stale keeps running or costing money under the old architecture.

Still stop and ask before proceeding when:
- The action is destructive or hard to reverse (force-push, `git reset --hard`, rewriting history,
  deleting branches, dropping/altering production DB data on the live Postgres container).
- The change is materially larger or riskier than what was asked for (e.g. a schema migration, a
  dependency downgrade, anything touching auth/security).
- The request is ambiguous enough that pushing the wrong thing would be worse than asking.

---

## Architecture

```
Browser → GHN Traefik ingress (167.254.73.248, TLS)
            → 10.43.100.249:8080 → frontend (nginx, React SPA)
                                      → /api/* → backend (Express, internal-only)
                                                   → postgres (internal-only, docker volume)
```

- Auth: GHN SSO v2 (OpenID Connect) — see `backend/src/services/SsoService.js`. Falls back to a
  blocked/disabled state (`SsoService.isEnabled()` false) only if any of the 4 required env vars
  (`SSO_BASE_URL`/`CLIENT_ID`/`CLIENT_SECRET`/`REDIRECT_URI`) is missing — production refuses to
  boot in that state unless `ALLOW_LOGIN_WITHOUT_SSO=true` is explicitly set (see `server.js`).

---

## Login

No more standalone demo accounts / email-only login — that flow is fully replaced by GHN SSO +
an MSNV allowlist:
- Real users authenticate via `GET /api/auth/sso/login` → GHN SSO → `GET /api/auth/sso/callback`.
- The MSNV (`employee_id`) returned by SSO must already exist in the `allowed_employees` table
  (managed via the Admin UI's "Import thông tin nhân viên" — supports Excel/CSV bulk import) or
  login is rejected with "MSNV không nằm trong danh sách được phép truy cập".
- First admin bootstrap MSNV seeded directly in Postgres: `3091620` (Huyền) — see `deploy/README.md`.

---

## Key Environment Variables

Actual values (secrets) live in `deploy/.env` on the server and locally at `deploy/.env`
(gitignored, never commit). This is what's currently set on the live backend container — see
`deploy/docker-compose.prod.yml` for the full list:

```
NODE_ENV=production
DB_HOST=postgres / DB_PORT=5432 / DB_NAME / DB_USER / DB_PASSWORD   # NOT DATABASE_URL — see note below
JWT_SECRET
ALLOWED_ORIGINS=https://datphonghop.ghn.vn
SSO_ENABLED=true
SSO_BASE_URL=https://online-gateway.ghn.vn/sso-v2
SSO_CLIENT_ID / SSO_CLIENT_SECRET
SSO_REDIRECT_URI=https://datphonghop-api.ghn.vn/api/auth/sso/callback
SSO_FRONTEND_URL=https://datphonghop.ghn.vn
```

> `backend/src/config/database.js` forces `ssl: { require: true }` whenever `DATABASE_URL` is set
> (needed for Supabase/Neon) — the self-hosted Postgres container doesn't speak TLS, so the deploy
> deliberately uses the individual `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` vars instead, which
> skip that branch entirely. Don't set `DATABASE_URL` on this deploy or the backend won't connect.

Frontend build arg: `VITE_API_URL=/api` (relative — same-origin via the nginx proxy, no absolute
URL needed since frontend and backend are served from the same host/port).

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

Local `backend/.env` currently has SSO **disabled** (`SSO_ENABLED=false`) with a comment explaining
why: the registered `SSO_REDIRECT_URI` is the production HTTPS URL, not `localhost`, so enabling
SSO locally would just get rejected by GHN SSO for a redirect_uri mismatch. It also holds a staging
SSO client_id/secret pair (unused while disabled) — the actual root-level `ghn_booking_meeting/.env`
(not a real dotenv, just Huyền's notes) has both the staging and production credential pairs.

---

## Backend Architecture

Routes → Controllers → Services. All business logic lives in services.

**API routes** (all prefixed `/api`):
- `/auth` — SSO login (`/sso/login`, `/sso/callback`, `/sso/status`); legacy `/login` (MSNV-only,
  no SSO) is blocked with 403 whenever SSO is enabled
- `/rooms` — CRUD for rooms and search
- `/bookings` — user bookings (create, update, cancel, freeze-status)
- `/dashboard` — admin metrics and reports
- `/admin` — admin-only: settings, booking overrides, allowlist (`allowed-employees`, incl. bulk Excel import)

**Middleware** (`backend/src/middleware/auth.js`):
- `authMiddleware` — validates JWT from `Authorization: Bearer <token>` header
- `adminMiddleware` — requires `role === 'admin'`
- `vipMiddleware` — requires `role === 'vip'` or `role === 'admin'`

**Models** (`backend/src/models/`): Sequelize models with UUID PKs. Associations defined in `index.js`:
- `Room` → `RoomAmenity` (as `amenities`), `Booking` (as `bookings`)
- `User` → `Booking` (as `bookings`), `Notification`
- `Booking` → `Notification` (as `notifications`)
- `AllowedEmployee` — MSNV allowlist, independent of `User`/SSO, admin-managed

**Booking status flow**: `pending → confirmed → active → completed | cancelled`

---

## Frontend Architecture

Single-page React app using React Router v7. Entry: `frontend/src/App.jsx`.

**Route structure**:
- `/login` — public
- `/sso-complete` — SSO redirect landing page (`SsoCompletePage.jsx`), picks up `?token=` or `?error=`
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
| `backend/src/config/database.js` | `DATABASE_URL` (forces TLS, for Supabase/Neon) or individual `DB_*` vars (local + current self-host deploy, no TLS) |
| `backend/src/app.js` | Express setup, CORS via `ALLOWED_ORIGINS`, route registration, JSON body limit `10mb` |
| `backend/src/services/SsoService.js` | GHN SSO v2 OIDC client — authorize URL, code exchange, JWKS id_token verify, userinfo |
| `backend/SETUP_DATABASE.sql` | Base schema + demo seed data — predates the MSNV/SSO allowlist feature, see `deploy/postgres-init/01-setup.sql` for the self-host version with an admin seed row added |
| `frontend/src/pages/AdminPage.jsx` | Admin panel — amenities use `a.amenity` field (not `a.name`); also has the Excel/CSV MSNV bulk import UI |
| `deploy/README.md` | **Deploy source of truth** — architecture, secrets, redeploy steps, pending TODOs |
| `docs/index.html` | Project report — deployed to GitHub Pages |

---

## DB Schema Notes

- All tables use UUID primary keys (except `admin_settings` which uses SERIAL)
- `bookings` has extra columns not in original schema SQL: `cancellation_message TEXT`, `is_admin_hidden BOOLEAN`
- `room_amenities.amenity` is an ENUM (`TV`, `Audio Conference`, `Video Conference`, `Projector`)
- `is_admin_hidden` allows admins to book during freeze periods invisibly to regular users
- `allowed_employees` (MSNV allowlist) is Sequelize-model-only — not in `SETUP_DATABASE.sql`,
  created by `sequelize.sync()` on first backend boot

---

## Known Issues Fixed

| Issue | Fix |
|-------|-----|
| `column "cancellation_message" does not exist` | `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_message TEXT, ADD COLUMN IF NOT EXISTS is_admin_hidden BOOLEAN DEFAULT false;` (runs automatically on every backend boot, `server.js`) |
| Admin tab blank (React error #31) | Amenity objects have field `amenity`, not `name`. Fixed in `AdminPage.jsx` |
| Login spinning | `VITE_API_URL` must end with `/api` (or be `/api` relative, for the self-host nginx-proxy setup) |
| CORS blocked | `ALLOWED_ORIGINS` must exactly match the frontend origin (no trailing slash) |
| "request entity too large" on MSNV Excel import | `express.json()`/`urlencoded()` default to a 100kb body limit — raised to `10mb` in `app.js` to match nginx's `client_max_body_size` |
| "Nonce của SSO không khớp" | User double-submitted login (2 tabs) or refreshed the `/sso/callback` redirect — each login attempt has its own nonce, by design (replay protection). Fix: log in again from scratch, don't refresh mid-flow |

---

## Deployment

See [`deploy/README.md`](deploy/README.md) for the full checklist (server setup, Docker install,
secrets, first-boot admin seeding, redeploy commands, pending items).
