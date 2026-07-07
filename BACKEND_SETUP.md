# 🚀 Backend Setup - Quick Start Guide

## What's Been Created

Your backend project is now fully scaffolded with:

```
backend/
├── src/
│   ├── config/database.js          ✅ Database connection
│   ├── models/                     ✅ 6 Database models
│   │   ├── User.js
│   │   ├── Room.js
│   │   ├── RoomAmenity.js
│   │   ├── Booking.js
│   │   └── Notification.js
│   ├── routes/                     ✅ Route skeleton
│   │   ├── auth.js                 (Placeholder)
│   │   ├── rooms.js                (Placeholder)
│   │   ├── bookings.js             (Placeholder)
│   │   ├── dashboard.js            (Placeholder)
│   │   └── admin.js                (Placeholder)
│   ├── middleware/auth.js          ✅ JWT authentication
│   ├── app.js                      ✅ Express app
│   └── server.js                   ✅ Server entry point
├── migrations/
├── package.json                    ✅ Dependencies listed
├── .env.example                    ✅ Environment template
├── DATABASE_SCHEMA.sql             ✅ Complete schema
├── SEED_DATA.sql                   ✅ Sample data
└── README.md                       ✅ Full documentation
```

## ⚙️ Installation Steps

### 1. Install Node Dependencies
```bash
cd backend
npm install
```

### 2. Setup PostgreSQL

**Option A: Using Homebrew (macOS)**
```bash
# Install PostgreSQL if not already installed
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create the database
createdb ghn_meeting_room_booking
```

**Option B: Using Docker**
```bash
docker run --name ghn-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ghn_meeting_room_booking \
  -p 5432:5432 \
  -d postgres:14
```

### 3. Create .env File
```bash
cp .env.example .env
```

Edit `.env` and adjust if needed (defaults should work for local development):
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ghn_meeting_room_booking
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

### 4. Initialize Database Schema
```bash
# Run the schema SQL file
psql -U postgres -d ghn_meeting_room_booking -f DATABASE_SCHEMA.sql

# Seed with sample data (optional)
psql -U postgres -d ghn_meeting_room_booking -f SEED_DATA.sql
```

### 5. Start Development Server
```bash
npm run dev
```

You should see:
```
✅ Database connection established
✅ Database models synced
✅ Server is running on port 5000
📍 API URL: http://localhost:5000
📍 Health check: http://localhost:5000/health
```

## 🧪 Test Your Setup

```bash
# Test health endpoint
curl http://localhost:5000/health

# Should return:
# {"status":"ok","timestamp":"2026-05-23T10:30:45.123Z"}
```

## 📝 Environment Configuration

Key variables in `.env`:

```
# Server
NODE_ENV=development|production
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ghn_meeting_room_booking
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d

# Email (to be configured later)
EMAIL_API_KEY=your_email_service_api_key
EMAIL_API_URL=https://your-email-service.com/api/send
EMAIL_FROM=noreply@ghn.vn

# Feature flags
MAX_BOOKING_DURATION_HOURS=4
BOOKING_WINDOW_DAYS=30
```

## 📚 Database Info

### Tables Created
- `users` - User accounts
- `rooms` - Meeting room catalog
- `room_amenities` - Room features (TV, projector, etc)
- `bookings` - Meeting reservations
- `notifications` - Email notifications
- `audit_log` - Action audit trail

### Sample Data Loaded
- 5 test users (admin, vip, regular)
- 19 meeting rooms from the spec
- 3 sample bookings
- Room amenities assignments

## 🔄 Next Steps to Implement

### Phase 1 - MVP (Week 1-2)
1. **Authentication** - Implement email login
2. **Room Search** - GET /api/rooms with filtering
3. **Booking Creation** - POST /api/bookings with validation
4. **Booking Management** - Cancel, view, extend, early finish

### Phase 2 - Core Features (Week 3-4)
1. **Email Notifications** - Booking confirmations & reminders
2. **Dashboard** - Basic analytics & metrics

### Phase 3 - Advanced (Week 5-6)
1. **Admin Panel** - User management, policies
2. **Recurring Bookings** - Weekly/monthly support
3. **Advanced Analytics** - Room utilization, trends

## 🐛 Troubleshooting

### "Cannot find module 'sequelize'"
```bash
npm install
```

### "PostgreSQL connection refused"
```bash
# Check if PostgreSQL is running
brew services list  # macOS

# Start it
brew services start postgresql
```

### "Database does not exist"
```bash
createdb ghn_meeting_room_booking
psql -d ghn_meeting_room_booking -f DATABASE_SCHEMA.sql
```

### "Port 5000 already in use"
```bash
# Use different port
PORT=5001 npm run dev
```

## 📖 Documentation Files

- **README.md** - Full backend documentation
- **DATABASE_SCHEMA.sql** - Complete database design
- **SEED_DATA.sql** - Test data
- **IMPLEMENTATION_CHECKLIST.md** - Detailed task list
- **PROJECT_PLAN.md** - Overall project roadmap
- **SPECS.md** - Original requirements from PDF

## 🚀 API Endpoints (Current Status)

### ✅ Ready to Implement
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/rooms`
- `GET /api/rooms/search`
- `POST /api/bookings`
- `GET /api/bookings`
- `DELETE /api/bookings/:id`

### 📋 Route Placeholders (Awaiting Implementation)
- All other endpoints return 501 Not Implemented

## 💾 Database Connection

The app uses Sequelize ORM which will:
1. ✅ Auto-sync models to database on startup
2. ✅ Create tables if they don't exist
3. ✅ Handle migrations
4. ✅ Provide query builder

## 🔑 Key Features Configured

- [x] JWT authentication middleware
- [x] CORS enabled
- [x] Request logging
- [x] Error handling
- [x] 404 handler
- [x] Health check endpoint
- [x] Database auto-sync

## 📱 Frontend Integration (Later)

The React frontend will connect to these endpoints:
```javascript
const API_URL = 'http://localhost:5000/api';

// Example
fetch(`${API_URL}/auth/login`, { method: 'POST', body: JSON.stringify({email: 'user@ghn.vn'}) })
```

---

**✨ Your backend is ready for implementation!**

Next: Implement Phase 1 endpoints starting with authentication.

Questions? Check README.md or IMPLEMENTATION_CHECKLIST.md
