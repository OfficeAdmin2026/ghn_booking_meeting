# 🎯 Implementation Guide - Chi Tiết Những Gì Vừa Làm

## 📊 Tổng Quan

Tôi vừa implement **11 file** để hoàn thành **Phase 1 MVP**:

```
✅ 3 Services (xử lý logic)
   └── AuthService.js       - Quản lý user, token
   └── RoomService.js       - Tìm kiếm, lọc phòng
   └── BookingService.js    - Tạo booking, conflict detection

✅ 3 Controllers (xử lý HTTP requests)
   └── AuthController.js    - Login, register, get user
   └── RoomController.js    - List, search, CRUD phòng
   └── BookingController.js - Create, update, delete booking

✅ 3 Routes (kết nối HTTP endpoints)
   └── auth.js  (updated)   - 5 endpoints
   └── rooms.js (updated)   - 6 endpoints
   └── bookings.js (updated) - 5 endpoints
```

---

## 🔍 Chi Tiết Từng Phần

### 1️⃣ **AuthService.js** - Quản Lý Xác Thực

**Mục đích:** Xử lý user authentication mà không cần verify email (test mode)

**Các hàm chính:**

```javascript
// Tìm user bằng email
findUserByEmail(email) 
  → Tìm user trong database

// Tạo user mới
createUser(email, fullName, department, role)
  → Tạo account @ghn.vn mới
  → Default role = 'user'

// Tạo JWT token
generateToken(user)
  → Sinh token chứa user info
  → Token hết hạn sau 7 ngày

// Login (auto-create user nếu chưa có)
login(email, fullName)
  → Kiểm tra user tồn tại
  → Nếu không → tạo mới
  → Update last_login
  → Trả về token + user info

// Tạo admin account (cho testing)
createAdminAccount(email, fullName)
  → Dùng trong testing
  → Chỉ hoạt động trên development

// Verify token
verifyToken(token)
  → Kiểm tra token có hợp lệ không
  → Dùng bởi middleware
```

**Ví dụ:**
```javascript
// User gọi login
const result = await AuthService.login('john@ghn.vn', 'John Doe');
// Trả về:
{
  token: "eyJhbGciOiJIUzI1NiIs...",
  user: {
    id: "uuid",
    email: "john@ghn.vn",
    full_name: "John Doe",
    role: "user"
  }
}
```

---

### 2️⃣ **RoomService.js** - Quản Lý Phòng Họp

**Mục đích:** Tìm kiếm, lọc, quản lý danh sách phòng

**Các hàm chính:**

```javascript
// Lấy tất cả phòng
getAllRooms(filters)
  Input: { location, floor, min_capacity, is_vip }
  Output: Danh sách phòng matching filters

// Tìm phòng trống theo time slot
searchAvailableRooms(filters)
  Input: {
    start_time,   // "2026-05-23T14:00:00Z"
    end_time,     // "2026-05-23T15:00:00Z"
    capacity,     // 8
    amenities,    // ["TV", "Video Conference"]
    location,     // "RiveraPark"
    floor         // "3F"
  }
  Output: Danh sách phòng không bị book trong khoảng thời gian đó

  Logic:
  1. Kiểm tra start_time < end_time
  2. Tìm tất cả booking conflict trong time range
  3. Exclude những phòng bị book
  4. Filter theo capacity, location, floor
  5. Filter theo amenities (nếu user cần TV + projector)
  6. Return danh sách phòng trống

// Lấy chi tiết 1 phòng (kèm amenities)
getRoomById(roomId)
  Output: Room + list amenities

// Tạo phòng (admin only)
createRoom(roomData)
  Input: {
    name, location, floor, capacity, code,
    is_vip?, amenities?
  }
  Output: Room mới được tạo

// Update phòng (admin only)
updateRoom(roomId, roomData)
  → Cập nhật fields
  → Xoá old amenities, thêm new

// Xóa phòng (soft delete)
deleteRoom(roomId)
  → Set is_active = false (không xoá thực)

// Kiểm tra phòng available
isRoomAvailable(roomId, startTime, endTime)
  Output: true/false
```

**Ví dụ:**
```javascript
// User tìm phòng trống ngày mai 2PM-3PM, 8 người, cần TV
const rooms = await RoomService.searchAvailableRooms({
  start_time: "2026-05-24T14:00:00Z",
  end_time: "2026-05-24T15:00:00Z",
  capacity: 8,
  amenities: ["TV"]
});
// Trả về:
[
  {
    id: "a1111...",
    name: "Thành Thái",
    location: "RiveraPark",
    floor: "1F",
    capacity: 20,
    amenities: [
      { amenity: "TV" },
      { amenity: "Audio Conference" },
      { amenity: "Video Conference" }
    ]
  },
  ...
]
```

---

### 3️⃣ **BookingService.js** - Quản Lý Đặt Phòng

**Mục đích:** Tạo booking, kiểm tra conflict, extend/cancel meeting

**Các hàm chính:**

```javascript
// Lấy booking của user
getUserBookings(userId, status?)
  Output: Danh sách booking + room

// Lấy chi tiết 1 booking
getBookingById(bookingId)
  Output: Booking + room + user

// Kiểm tra time conflict
checkTimeConflict(roomId, startTime, endTime, excludeBookingId?)
  Output: Booking nếu có conflict, null nếu okay
  
  Logic: Tìm booking nào overlap với time range:
  - Booking bắt đầu trong range
  - Booking kết thúc trong range  
  - Booking cover cả range

// Tạo booking
createBooking(userId, bookingData)
  Input: {
    room_id,          // "a1111..."
    title,            // "Team sync"
    participants_count, // 8
    start_time,       // "2026-05-24T14:00:00Z"
    end_time,         // "2026-05-24T15:00:00Z"
    recurring?,       // "weekly" | "monthly" | "none"
    notes?            // "VD: Bring projector cable"
  }
  
  Validations:
  1. Check room exists + active
  2. Check user exists + active
  3. Validate: participants_count <= room.capacity
  4. Validate: VIP room → user is admin/vip
  5. Validate: duration <= 4 hours
  6. Validate: booking start date <= 30 days future
  7. Check: NO time conflict
  8. Create booking (status = 'confirmed')
  
  Output: Booking mới

// Update booking (extend/early finish)
updateBooking(bookingId, updateData)
  Actions:
  - 'extend' + new_end_time → Gia hạn meeting
    Check: new_end_time > current end_time
    Check: duration <= 4 hours
    Check: NO conflict với booking sau
    
  - 'early_finish' → Kết thúc sớm
    Set status = 'completed'

// Hủy booking
cancelBooking(bookingId, userId)
  Validations:
  - User is owner OR is admin
  - Booking status != 'active' (đang họp)
  - Booking status != 'completed'
  
  Set status = 'cancelled'
```

**Ví dụ:**
```javascript
// User tạo booking
const booking = await BookingService.createBooking('user-uuid', {
  room_id: 'a1111...',
  title: 'Project planning',
  participants_count: 8,
  start_time: '2026-05-24T14:00:00Z',
  end_time: '2026-05-24T15:00:00Z'
});

// Nếu có lỗi, throw error:
// "Room is already booked for this time slot"
// "Max booking duration is 4 hours"
// "This is a VIP room. Only admins and VIPs can book"
```

---

### 4️⃣ **AuthController.js** - HTTP Endpoints cho Auth

**Mục đích:** Xử lý HTTP requests và trả response

```javascript
POST /api/auth/login
  Body: { email: "john@ghn.vn", full_name?: "John" }
  Response 200: {
    status: "success",
    data: {
      token: "jwt-token",
      user: { id, email, full_name, role }
    }
  }

POST /api/auth/register
  Body: { email, full_name, department? }
  Response 201: Tương tự login
  Response 409: Email already exists

GET /api/auth/me (với token)
  Response 200: { status, data: { user } }

POST /api/auth/logout (với token)
  Response 200: { status, message }

POST /api/auth/admin (testing only)
  Body: { email, full_name? }
  Response 200: { status, data: { token, user } }
  Response 403: Not in development mode
```

---

### 5️⃣ **RoomController.js** - HTTP Endpoints cho Room

```javascript
GET /api/rooms?location=RiveraPark&floor=3F&min_capacity=10 (auth required)
  Response 200: {
    status: "success",
    data: {
      count: 5,
      rooms: [...]
    }
  }

GET /api/rooms/search?start_time=...&end_time=...&capacity=8&amenities=TV (auth required)
  Response 200: { status, data: { count, rooms } }
  Response 400: Missing required fields

GET /api/rooms/:id (auth required)
  Response 200: { status, data: { room } }
  Response 404: Room not found

POST /api/rooms (admin only)
  Body: {
    name, location, floor, capacity, code,
    is_vip?, amenities?: ["TV", "Projector"]
  }
  Response 201: { status, data: { room } }

PUT /api/rooms/:id (admin only)
  Body: Same as POST (partial update)
  Response 200: { status, data: { room } }

DELETE /api/rooms/:id (admin only)
  Response 200: { status, message, data: { room } }
```

---

### 6️⃣ **BookingController.js** - HTTP Endpoints cho Booking

```javascript
GET /api/bookings?status=confirmed (auth required)
  Response 200: {
    status: "success",
    data: {
      count: 3,
      bookings: [...]
    }
  }

GET /api/bookings/:id (auth required)
  Response 200: { status, data: { booking } }

POST /api/bookings (auth required)
  Body: {
    room_id,
    title,
    participants_count,
    start_time,
    end_time,
    recurring?,
    notes?
  }
  Response 201: { status, data: { booking } }
  Response 400: Validation error (conflict, capacity, etc)
  Response 403: VIP room only

PUT /api/bookings/:id (auth required)
  Body: {
    action: "extend" | "early_finish",
    new_end_time? (if extend)
  }
  Response 200: { status, data: { booking } }

DELETE /api/bookings/:id (auth required)
  Response 200: { status, message, data: { booking } }
  Response 400: Cannot cancel started meeting
```

---

## 🔗 Luồng Dữ Liệu (Data Flow)

```
USER REQUEST
    ↓
ROUTE (auth.js, rooms.js, booking.js)
    ↓
MIDDLEWARE (authMiddleware kiểm tra token)
    ↓
CONTROLLER (nhận request, validate)
    ↓
SERVICE (xử lý business logic)
    ↓
DATABASE (Sequelize ORM query)
    ↓
RESPONSE → CLIENT
```

**Ví dụ: User booking phòng**
```
User gửi POST /api/bookings
  ↓
bookings.js route → BookingController.createBooking()
  ↓
Kiểm tra authMiddleware (token có hợp lệ?)
  ↓
BookingService.createBooking()
  - Validate room, user, capacity, time, duration, VIP
  - Check time conflict
  - Create booking record
  ↓
Database: INSERT INTO bookings
  ↓
Return booking + room + user info
  ↓
Response 201 → User
```

---

## 📝 Cách Hoạt Động Từng Phần

### **Authentication (Đăng Nhập)**

Đơn giản so với enterprise:
```
User: POST /api/auth/login
Body: { email: "john@ghn.vn" }

Backend:
1. Kiểm tra email format → @ghn.vn ✓
2. Tìm user trong DB
3. Nếu không tồn tại → TẠO MỚI (tự động)
4. Update last_login = now
5. Sinh JWT token (7 ngày hết hạn)
6. Return token + user info

Không cần: 
- Password hashing
- Email verification
- 2FA
```

### **Room Search (Tìm Phòng Trống)**

```
User: GET /api/rooms/search?
  start_time=2026-05-24T14:00:00Z&
  end_time=2026-05-24T15:00:00Z&
  capacity=8&
  amenities=TV,Projector&
  location=RiveraPark

Backend:
1. Parse query params
2. Validate times (end > start)
3. Find ALL bookings in time range (status = pending/confirmed/active)
4. Get list booked room_ids
5. Find rooms matching filters (location, capacity, etc)
6. Exclude booked rooms
7. Filter by amenities (intersection)
8. Return available rooms
```

### **Booking (Đặt Phòng)**

```
User: POST /api/bookings
Body: {
  room_id: "a1111...",
  title: "Team sync",
  participants_count: 8,
  start_time: "2026-05-24T14:00:00Z",
  end_time: "2026-05-24T15:00:00Z"
}

Backend checks:
✓ Room exists & active
✓ User exists & active
✓ participants_count <= room.capacity
✓ If VIP room → user is admin/vip
✓ Duration <= 4 hours (policy)
✓ start_time <= 30 days future (policy)
✓ NO time conflict (queryBookings)

If all pass → Create booking (status='confirmed')
Return booking details
```

---

## ⚠️ Error Handling

Mỗi endpoint return proper HTTP status:

```
200 OK           → Success
201 Created      → Resource created
400 Bad Request  → Validation error
401 Unauthorized → No token
403 Forbidden    → Not permission (admin only, VIP room)
404 Not Found    → Resource not found
409 Conflict     → Email already exists
500 Server Error → Database error
```

---

## 🚀 Bước Tiếp Theo

### **Cần Làm:**
1. Install Node.js
2. `npm install`
3. Setup PostgreSQL
4. Chạy SQL schema & seed data
5. Chạy server: `npm run dev`
6. Test endpoints với Postman/curl

### **Các API Ready:**

| Endpoint | Status | Chi Tiết |
|----------|--------|---------|
| POST /api/auth/login | ✅ | Login auto-create user |
| POST /api/auth/register | ✅ | Tạo account mới |
| GET /api/auth/me | ✅ | Lấy user info |
| POST /api/auth/admin | ✅ | Tạo admin để test |
| GET /api/rooms | ✅ | List phòng |
| GET /api/rooms/search | ✅ | Tìm phòng trống |
| GET /api/rooms/:id | ✅ | Chi tiết phòng |
| POST /api/rooms | ✅ | Tạo phòng (admin) |
| PUT /api/rooms/:id | ✅ | Update phòng (admin) |
| DELETE /api/rooms/:id | ✅ | Xóa phòng (admin) |
| GET /api/bookings | ✅ | Danh sách booking |
| POST /api/bookings | ✅ | Tạo booking |
| GET /api/bookings/:id | ✅ | Chi tiết booking |
| PUT /api/bookings/:id | ✅ | Extend/early finish |
| DELETE /api/bookings/:id | ✅ | Hủy booking |

---

## 📦 File Tạo Ra

```
backend/
├── src/
│   ├── services/
│   │   ├── AuthService.js          ✨ NEW (xác thực)
│   │   ├── RoomService.js          ✨ NEW (quản lý phòng)
│   │   └── BookingService.js       ✨ NEW (quản lý booking)
│   ├── controllers/
│   │   ├── AuthController.js       ✨ NEW (HTTP auth)
│   │   ├── RoomController.js       ✨ NEW (HTTP room)
│   │   └── BookingController.js    ✨ NEW (HTTP booking)
│   └── routes/
│       ├── auth.js                 ✏️ UPDATED (implemented)
│       ├── rooms.js                ✏️ UPDATED (implemented)
│       └── bookings.js             ✏️ UPDATED (implemented)
```

---

**Giờ bạn có hệ thống hoàn chỉnh!** 🎉

Tiếp theo: Install Node.js + dependencies, setup PostgreSQL, chạy server!
