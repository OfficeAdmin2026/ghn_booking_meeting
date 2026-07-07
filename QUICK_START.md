# ⚡ QUICK START - Chạy Hệ Thống Local (5 Bước)

## 🎯 Mục Tiêu

Chạy backend trên localhost:5000, có thể:
- ✅ Login/register users
- ✅ Tìm phòng trống
- ✅ Đặt phòng
- ✅ Hủy booking
- ✅ Xem danh sách booking

---

## 📋 Yêu Cầu

- MacOS (bạn dùng)
- Terminal/zsh
- Internet (để download dependencies)

---

## 🚀 5 BƯỚC QUICK START

### **BƯỚC 1: Cài Node.js**

```bash
# Kiểm tra có Node chưa
node --version

# Nếu chưa, cài với Homebrew
brew install node

# Verify
node --version  # v18.0.0+
npm --version   # 8.0.0+
```

**⏱️ Thời gian:** 5 phút

---

### **BƯỚC 2: Cài Đặt NPM Dependencies**

```bash
cd /Users/long_dinh/Documents/GHN/Web/booking_meeting/backend

npm install
```

**Output expected:**
```
npm notice 
npm notice New minor version of npm available! 10.2.4 -> 10.5.0
npm notice To update run: npm install -g npm@10.5.0
npm notice 
added 74 packages in 2m
```

**⏱️ Thời gian:** 2-3 phút

---

### **BƯỚC 3: Setup PostgreSQL**

**Option A: Nếu chưa cài PostgreSQL**
```bash
# Cài Homebrew (nếu chưa có)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Cài PostgreSQL
brew install postgresql@14

# Start service
brew services start postgresql@14

# Verify
psql --version  # Should be 14.x+
```

**Option B: Nếu đã cài PostgreSQL**
```bash
# Kiểm tra đang chạy?
brew services list

# Nếu chưa, start lại
brew services start postgresql@14
```

**⏱️ Thời gian:** 5-10 phút (nếu cài mới) / 30 giây (nếu có rồi)

---

### **BƯỚC 4: Tạo Database + Load Schema**

```bash
# Tạo database
createdb ghn_meeting_room_booking

# Chạy schema (tạo bảng)
cd /Users/long_dinh/Documents/GHN/Web/booking_meeting/backend
psql -U postgres -d ghn_meeting_room_booking -f DATABASE_SCHEMA.sql

# Load dữ liệu test
psql -U postgres -d ghn_meeting_room_booking -f SEED_DATA.sql

# Verify (optional)
psql -U postgres -d ghn_meeting_room_booking -c "\dt"
# Output: Should show tables (users, rooms, bookings, etc)
```

**Expected output:**
```
CREATE TYPE
CREATE TYPE
CREATE TABLE
CREATE INDEX
...
(No errors)
```

**⏱️ Thời gian:** 1 phút

---

### **BƯỚC 5: Copy .env & Chạy Server**

```bash
cd /Users/long_dinh/Documents/GHN/Web/booking_meeting/backend

# Copy .env
cp .env.example .env

# Chạy server
npm run dev
```

**Expected output:**
```
✅ Database connection established
✅ Database models synced
✅ Server is running on port 5000
📍 API URL: http://localhost:5000
📍 Health check: http://localhost:5000/health
```

**⏱️ Thời gian:** 30 giây

---

## ✅ Verify Setup

**Test Health Check:**
```bash
curl http://localhost:5000/health
```

**Output:**
```json
{"status":"ok","timestamp":"2026-05-23T10:30:45.123Z"}
```

---

## 🧪 Test Login (Tạo Admin Account)

```bash
# Tạo admin account
curl -X POST http://localhost:5000/api/auth/admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ghn.vn", "full_name":"Admin User"}'
```

**Output (success):**
```json
{
  "status": "success",
  "message": "Admin account created/updated",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "email": "admin@ghn.vn",
      "full_name": "Admin User",
      "role": "admin"
    }
  }
}
```

**💡 Copy token này để test API sau!**

---

## 📱 Test API - List Rooms

```bash
# Copy token từ trên
TOKEN="eyJhbGciOi..."

# Test list all rooms
curl -X GET http://localhost:5000/api/rooms \
  -H "Authorization: Bearer $TOKEN"
```

**Output (success):**
```json
{
  "status": "success",
  "data": {
    "count": 19,
    "rooms": [
      {
        "id": "a1111111-1111-1111-1111-111111111111",
        "name": "Thành Thái",
        "location": "RiveraPark",
        "floor": "1F",
        "capacity": 20,
        "code": "RPARK-1F-001",
        "is_vip": false,
        "amenities": [
          { "id": "...", "amenity": "TV" },
          { "id": "...", "amenity": "Audio Conference" },
          { "id": "...", "amenity": "Video Conference" }
        ]
      },
      ...
    ]
  }
}
```

---

## 🔍 Test API - Search Available Rooms

```bash
TOKEN="eyJhbGciOi..."

# Tìm phòng trống ngày mai 2PM-3PM, 8 người, cần TV
curl -X GET "http://localhost:5000/api/rooms/search?start_time=2026-05-24T14:00:00Z&end_time=2026-05-24T15:00:00Z&capacity=8&amenities=TV" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💼 Test API - Login as Regular User

```bash
# Login user thường (tự động tạo account)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@ghn.vn", "full_name":"John Doe"}'
```

**Output:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "33333333-3333-3333-3333-333333333333",
      "email": "john@ghn.vn",
      "full_name": "John Doe",
      "role": "user"
    }
  }
}
```

---

## 📅 Test API - Book a Room

```bash
# User token từ login
USER_TOKEN="eyJhbGciOi..."

# Đặt phòng "Thành Thái" ngày mai 2PM-3PM
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "room_id": "a1111111-1111-1111-1111-111111111111",
    "title": "Team Sync",
    "participants_count": 8,
    "start_time": "2026-05-24T14:00:00Z",
    "end_time": "2026-05-24T15:00:00Z",
    "recurring": "none",
    "notes": "Bring projector cable"
  }'
```

**Output (success):**
```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "e2222222-2222-2222-2222-222222222222",
      "room_id": "a1111111-1111-1111-1111-111111111111",
      "user_id": "33333333-3333-3333-3333-333333333333",
      "title": "Team Sync",
      "participants_count": 8,
      "start_time": "2026-05-24T14:00:00.000Z",
      "end_time": "2026-05-24T15:00:00.000Z",
      "status": "confirmed",
      "recurring": "none",
      "notes": "Bring projector cable",
      "createdAt": "2026-05-23T10:30:45.123Z",
      "room": {
        "id": "a1111111-1111-1111-1111-111111111111",
        "name": "Thành Thái",
        "location": "RiveraPark",
        "floor": "1F",
        "capacity": 20
      }
    }
  }
}
```

---

## ❌ Troubleshooting

### **"npm: command not found"**
```bash
brew install node
node --version
npm --version
```

### **"PostgreSQL connection refused"**
```bash
brew services start postgresql@14
brew services list  # Verify running
```

### **"Database ghn_meeting_room_booking does not exist"**
```bash
createdb ghn_meeting_room_booking
psql -U postgres -d ghn_meeting_room_booking -f DATABASE_SCHEMA.sql
```

### **"Port 5000 already in use"**
```bash
# Use different port
PORT=5001 npm run dev

# Or kill process on 5000
lsof -ti:5000 | xargs kill -9
```

### **Schema load error (permissions)**
```bash
# If permissions issue, try:
psql -U postgres

# Then inside psql:
CREATE DATABASE ghn_meeting_room_booking;
\c ghn_meeting_room_booking;
\i /path/to/DATABASE_SCHEMA.sql
```

---

## 📊 Environment File (.env)

File `.env` sẽ có nội dung này (default OK):

```
NODE_ENV=development
PORT=5000
SERVER_URL=http://localhost:5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ghn_meeting_room_booking
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

MAX_BOOKING_DURATION_HOURS=4
BOOKING_WINDOW_DAYS=30
```

---

## 🎯 Tiếp Theo

**Sau khi setup xong:**

1. **Cài Postman** (GUI để test API dễ hơn curl)
   - https://www.postman.com/downloads/

2. **Import Postman Collection** (sắp tạo)
   - Sẽ có file `booking-api.postman_collection.json`

3. **Test tất cả endpoints** bằng Postman

4. **Xem logs** để debug:
   - Terminal sẽ show tất cả SQL queries + errors

---

## 📞 Cần Giúp?

**Problem:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
brew services restart postgresql@14
# Wait 2 seconds
npm run dev
```

---

## ✅ Checklist Setup

- [ ] Node.js installed (`node --version`)
- [ ] PostgreSQL running (`brew services list`)
- [ ] npm install completed (node_modules/ tồn tại)
- [ ] Database created (`createdb ghn_meeting_room_booking`)
- [ ] Schema loaded (psql check for tables)
- [ ] .env file copied
- [ ] Server running (`npm run dev`)
- [ ] Health check works (`curl http://localhost:5000/health`)
- [ ] Admin account created (curl POST /auth/admin)
- [ ] Can list rooms (curl GET /rooms with token)

---

## 🎉 All Done!

Hệ thống đã chạy trên `http://localhost:5000` ✅

Giờ bạn có thể:
1. ✅ Tạo accounts
2. ✅ Tìm phòng trống
3. ✅ Đặt/hủy booking
4. ✅ Xem danh sách booking

**Next:** Frontend (React) development! 🚀
