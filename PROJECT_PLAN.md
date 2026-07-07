# Book Phòng Họp - Project Plan

**Tech Stack:** React (Frontend) + Node.js/Express (Backend) + PostgreSQL (Database)  
**Deployment:** On-premise  
**Timeline:** ASAP  

---

## 📊 PROJECT OVERVIEW

### Scope
- 20 phòng họp
- ~1000 users
- Real-time room availability
- Email notifications
- Admin dashboard with analytics

---

## 🎯 PHASES

### **PHASE 1 - MVP (Week 1-2)**
Chính tính năng cốt lõi - tối thiểu để system hoạt động được

**Backend:**
- [ ] User authentication (email-based)
- [ ] Room management (CRUD)
- [ ] Booking management (CRUD)
- [ ] Real-time availability check
- [ ] Basic API endpoints

**Frontend:**
- [ ] Login page
- [ ] Room list + search
- [ ] Booking form
- [ ] My bookings view
- [ ] Cancel booking

**Database:**
- [ ] Users table
- [ ] Rooms table
- [ ] Bookings table
- [ ] Room amenities table

---

### **PHASE 2 - Core Features (Week 3-4)**
Thêm các tính năng quan trọng

**Backend:**
- [ ] Email notifications
- [ ] Extend meeting
- [ ] Early finish
- [ ] Dashboard API (metrics)

**Frontend:**
- [ ] Active meeting view
- [ ] Extend/Early finish buttons
- [ ] Email notification settings
- [ ] Basic dashboard

**Database:**
- [ ] Notifications table

---

### **PHASE 3 - Admin & Advanced (Week 5-6)**
Admin panel và tính năng nâng cao

**Backend:**
- [ ] Admin endpoints
- [ ] Permissions/roles system
- [ ] Room settings (VIP, policy)
- [ ] Advanced analytics
- [ ] User management

**Frontend:**
- [ ] Admin dashboard (metrics)
- [ ] Room management panel
- [ ] User management
- [ ] Analytics & reports
- [ ] Booking policy settings

**Database:**
- [ ] Roles/permissions table
- [ ] Audit logs table

---

### **PHASE 4 - Polish & Optimization**
Production-ready

- [ ] Performance optimization
- [ ] Error handling & validation
- [ ] Security hardening
- [ ] Mobile responsiveness
- [ ] Testing & QA
- [ ] Documentation
- [ ] Deployment setup

---

## 🛠️ TECH STACK DETAILS

```
Frontend:
├── React 18+
├── React Router (navigation)
├── Axios (API calls)
├── React Query (state management)
└── TailwindCSS (styling)

Backend:
├── Node.js 18+
├── Express 4+
├── PostgreSQL 14+
├── Sequelize/TypeORM (ORM)
├── JWT (authentication)
├── Nodemailer (email)
├── Cors
└── Dotenv

DevOps:
├── Git
├── Docker (optional, for consistency)
└── PM2 (process management)
```

---

## 📁 PROJECT STRUCTURE

```
booking_meeting/
├── backend/
│   ├── src/
│   │   ├── config/           (database, email config)
│   │   ├── controllers/       (business logic)
│   │   ├── routes/            (API routes)
│   │   ├── models/            (database models)
│   │   ├── middleware/        (auth, validation)
│   │   ├── services/          (external service integration)
│   │   ├── utils/             (helpers, constants)
│   │   └── app.js             (express app)
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/        (React components)
│   │   ├── pages/             (page components)
│   │   ├── services/          (API calls)
│   │   ├── hooks/             (custom hooks)
│   │   ├── styles/            (TailwindCSS)
│   │   ├── utils/             (helpers)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── docs/
│   ├── API.md                 (API documentation)
│   ├── DATABASE.md            (schema & ER diagram)
│   ├── SETUP.md               (development setup)
│   └── DEPLOYMENT.md          (deployment guide)
│
├── SPECS.md                   (từ PDF)
├── PROJECT_PLAN.md            (file này)
└── README.md
```

---

## 🗄️ DATABASE SCHEMA (Preview)

### Users
```sql
- id (PK)
- email (unique)
- full_name
- department
- role (user, admin, vip)
- is_active
- created_at
```

### Rooms
```sql
- id (PK)
- name
- location
- floor
- capacity
- is_vip (boolean)
- created_at
```

### Room_Amenities
```sql
- id (PK)
- room_id (FK)
- amenity (TV, Audio Conference, Video Conference, Projector)
```

### Bookings
```sql
- id (PK)
- room_id (FK)
- user_id (FK)
- title
- participants_count
- start_time
- end_time
- status (pending, confirmed, active, completed, cancelled)
- recurring (none, weekly, monthly)
- created_at
```

### Notifications
```sql
- id (PK)
- booking_id (FK)
- type (reminder, confirmed, cancelled)
- sent_at
- recipient_email
```

---

## 🔌 API ENDPOINTS (Preview)

### Auth
```
POST   /api/auth/login          (email login)
POST   /api/auth/logout
GET    /api/auth/me             (current user)
```

### Rooms
```
GET    /api/rooms               (list all rooms)
GET    /api/rooms/search        (search with filters)
GET    /api/rooms/:id
POST   /api/rooms               (admin only)
PUT    /api/rooms/:id           (admin only)
DELETE /api/rooms/:id           (admin only)
```

### Bookings
```
GET    /api/bookings            (my bookings)
GET    /api/bookings/available  (search available)
POST   /api/bookings            (create booking)
GET    /api/bookings/:id
PUT    /api/bookings/:id        (extend/early finish)
DELETE /api/bookings/:id        (cancel)
```

### Dashboard (Admin)
```
GET    /api/dashboard/metrics   (occupancy, peak hour, etc)
GET    /api/dashboard/rooms     (room stats)
GET    /api/dashboard/users     (user stats)
```

---

## 🚀 GETTING STARTED

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed & running
- Git
- Text editor (VS Code)

### Quick Start
```bash
# Clone/init project
cd booking_meeting
mkdir backend frontend

# Backend setup
cd backend
npm init -y
npm install express pg sequelize jsonwebtoken cors nodemailer dotenv

# Frontend setup
cd ../frontend
npm create vite@latest . -- --template react
npm install react-router-dom axios react-query
```

---

## 📅 MILESTONE TARGETS

| Phase | Target | Features |
|-------|--------|----------|
| MVP | Week 1-2 | Book, Cancel, View rooms |
| Core | Week 3-4 | Extend/Early finish, Notifications |
| Admin | Week 5-6 | Dashboard, Analytics, Permissions |
| Polish | Week 7+ | Deploy, Optimize, Test |

---

## ⚠️ IMPORTANT NOTES

1. **Free system** - using open-source tech only
2. **Email integration** - use company email service
3. **On-premise** - no cloud dependency
4. **Authentication** - email-based (no LDAP for now, can add later)

---

## 📝 NEXT STEPS

1. [ ] Setup backend project (Express + PostgreSQL)
2. [ ] Create database schema & migrations
3. [ ] Build authentication system
4. [ ] Setup frontend project (React + Vite)
5. [ ] Create basic UI components
6. [ ] Implement Phase 1 features
7. ...continue with phases

**Ready to start? Bắt đầu từ backend setup!** 🚀
