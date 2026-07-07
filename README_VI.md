# 📚 GHN Meeting Room Booking - Hướng Dẫn Toàn Bộ (Tiếng Việt)

## 🎯 Tổng Quan Dự Án

**Tên:** GHN Meeting Room Booking System  
**Mục đích:** Xây dựng hệ thống booking phòng họp nội bộ cho công ty GHN  
**Quy mô:** 20 phòng họp, ~1000 người dùng  
**Tech Stack:** React (Frontend) + Node.js/Express (Backend) + PostgreSQL (Database)  
**Deployment:** Local/On-premise  

---

## 📁 Cấu Trúc Thư Mục

```
booking_meeting/                           ← Thư mục gốc dự án
│
├── 📄 SPECS.md                            ← Spec chi tiết từ file PDF gốc
├── 📄 PROJECT_PLAN.md                     ← Kế hoạch 4 giai đoạn phát triển
├── 📄 IMPLEMENTATION_CHECKLIST.md         ← Danh sách 50+ task cần làm
├── 📄 BACKEND_SETUP.md                    ← Hướng dẫn cài đặt backend
├── 📄 README_VI.md                        ← File này (hướng dẫn tiếng Việt)
│
└── 🗂️ backend/                            ← Thư mục backend (Node.js + Express)
    │
    ├── 📁 src/                            ← Source code chính
    │   ├── 📁 config/
    │   │   └── database.js                ← Cấu hình kết nối PostgreSQL
    │   │
    │   ├── 📁 models/                     ← Database models (6 cái)
    │   │   ├── User.js                    ← Model người dùng
    │   │   ├── Room.js                    ← Model phòng họp
    │   │   ├── RoomAmenity.js             ← Model tiện nghi (TV, projector, etc)
    │   │   ├── Booking.js                 ← Model đặt phòng
    │   │   ├── Notification.js            ← Model thông báo email
    │   │   └── index.js                   ← Kết nối các model lại với nhau
    │   │
    │   ├── 📁 routes/                     ← Định nghĩa API routes (6 cái)
    │   │   ├── auth.js                    ← Routes đăng nhập/logout
    │   │   ├── rooms.js                   ← Routes quản lý phòng
    │   │   ├── bookings.js                ← Routes đặt phòng
    │   │   ├── dashboard.js               ← Routes dashboard admin
    │   │   └── admin.js                   ← Routes admin settings
    │   │
    │   ├── 📁 middleware/
    │   │   └── auth.js                    ← JWT authentication + role check
    │   │
    │   ├── 📁 controllers/                ← Business logic (chưa làm)
    │   ├── 📁 services/                   ← Service layer (chưa làm)
    │   ├── 📁 utils/                      ← Helper functions (chưa làm)
    │   │
    │   ├── app.js                         ← Express app configuration
    │   └── server.js                      ← Entry point chính
    │
    ├── 📁 migrations/                     ← Database migrations (chưa làm)
    │
    ├── 📄 package.json                    ← NPM dependencies
    ├── 📄 .env.example                    ← Template environment variables
    ├── 📄 .gitignore                      ← Git ignore rules
    ├── 📄 README.md                       ← Tài liệu tiếng Anh chi tiết
    ├── 📄 DATABASE_SCHEMA.sql             ← SQL tạo database (7 bảng)
    └── 📄 SEED_DATA.sql                   ← Dữ liệu test mẫu
```

---

## 💡 Giải Thích Từng Phần

### 1️⃣ **Database Models (6 mô hình dữ liệu)**

#### **User (Người dùng)**
```
- id: UUID duy nhất cho mỗi user
- email: @ghn.vn (công ty domain)
- full_name: Tên đầy đủ
- department: Phòng ban
- role: 
  - 'user' = Nhân viên thường
  - 'admin' = Admin/OA/IT
  - 'vip' = Lãnh đạo (BOD)
- is_active: Có đang hoạt động không
- last_login: Lần đăng nhập gần nhất
```

#### **Room (Phòng họp)**
```
- id: UUID duy nhất
- name: Tên phòng (VD: "Thành Thái", "Learning Center")
- location: Tòa nhà (RiveraPark hoặc Mipec)
- floor: Tầng (1F, 3F, 8F, G)
- capacity: Sức chứa (4-50 người)
- code: Mã QR (VD: "RPARK-1F-001")
- is_vip: Có phải phòng VIP không (chỉ manager/BOD book được)
- is_active: Có hoạt động không
```

#### **RoomAmenity (Tiện nghi phòng)**
```
- id: UUID duy nhất
- room_id: Liên kết tới phòng nào
- amenity: Loại tiện nghi:
  - TV
  - Audio Conference
  - Video Conference
  - Projector
```

#### **Booking (Đặt phòng/Lịch họp)**
```
- id: UUID duy nhất
- room_id: Phòng nào
- user_id: Người nào book
- title: Tên cuộc họp (VD: "OA meeting")
- participants_count: Số người tham gia
- start_time: Thời gian bắt đầu
- end_time: Thời gian kết thúc
- status: Trạng thái
  - 'pending' = Chờ xác nhận
  - 'confirmed' = Đã xác nhận, chưa tới giờ họp
  - 'active' = Đang trong giờ họp
  - 'completed' = Kết thúc
  - 'cancelled' = Hủy (bởi user hoặc admin)
- recurring: Lặp lại
  - 'none' = Không lặp
  - 'weekly' = Mỗi tuần
  - 'monthly' = Mỗi tháng
- recurring_end_date: Kết thúc lặp lại
- notes: Ghi chú
```

#### **Notification (Thông báo email)**
```
- id: UUID duy nhất
- booking_id: Booking nào
- user_id: Gửi cho user nào
- type: Loại thông báo
  - 'booking_confirmed' = Xác nhận đặt phòng
  - 'reminder' = Nhắc nhở 15 phút trước
  - 'cancelled' = Booking bị hủy
  - 'meeting_completed' = Kết thúc họp
- recipient_email: Email nhận
- subject: Tiêu đề email
- message: Nội dung email
- sent_at: Thời gian gửi
- is_sent: Đã gửi chưa
- error_message: Lỗi nếu gửi thất bại
```

---

### 2️⃣ **API Endpoints (Các điểm cuối API)**

#### **Authentication (Xác thực)**
```
POST /api/auth/login
  → Đăng nhập với email @ghn.vn
  → Nhận lại JWT token

GET /api/auth/me
  → Lấy thông tin user hiện tại
  → Cần token

POST /api/auth/logout
  → Đăng xuất
```

#### **Rooms (Phòng họp)**
```
GET /api/rooms
  → Liệt kê tất cả phòng họp

GET /api/rooms/search
  → Tìm phòng trống với filter:
    • start_time: Thời gian bắt đầu
    • end_time: Thời gian kết thúc
    • capacity: Sức chứa cần thiết
    • amenities: Tiện nghi (TV, projector, etc)
    • location: Vị trí (tòa nhà)

GET /api/rooms/:id
  → Chi tiết 1 phòng (kèm tiện nghi)

POST /api/rooms (Admin only)
  → Tạo phòng mới

PUT /api/rooms/:id (Admin only)
  → Sửa phòng

DELETE /api/rooms/:id (Admin only)
  → Xóa phòng
```

#### **Bookings (Đặt phòng)**
```
GET /api/bookings
  → Danh sách booking của tôi

POST /api/bookings
  → Đặt phòng
  Body: {
    room_id,
    title,
    participants_count,
    start_time,
    end_time,
    recurring? (none/weekly/monthly),
    notes?
  }

GET /api/bookings/:id
  → Chi tiết 1 booking

PUT /api/bookings/:id
  → Sửa booking (extend/early finish)
  Body: {
    action: 'extend' | 'early_finish',
    new_end_time? (nếu extend)
  }

DELETE /api/bookings/:id
  → Hủy booking
```

#### **Dashboard (Admin only - Bảng điều khiển)**
```
GET /api/dashboard/metrics
  → Các số liệu chính:
    • occupancy_rate: Tỉ lệ sử dụng phòng (%)
    • peak_hour: Giờ cao điểm
    • most_used_rooms: Top phòng dùng nhiều nhất
    • avg_meeting_duration: Thời lượng họp trung bình

GET /api/dashboard/rooms
  → Thống kê từng phòng

GET /api/dashboard/users
  → Thống kê từng user
```

#### **Admin Settings (Admin only - Cài đặt)**
```
GET /api/admin/users
  → Danh sách tất cả user

PUT /api/admin/users/:id
  → Thay đổi role user

POST /api/admin/policies
  → Tạo policy booking:
    • max_duration_hours: Max 4 giờ/lần
    • max_future_days: Max 30 ngày tương lai
    • vip_only_rooms: Phòng nào chỉ VIP

GET /api/admin/policies
  → Lấy policy hiện tại
```

---

## 🔄 Quy Trình Hoạt Động

### **Quy Trình Booking Phòng Họp (6 bước)**

```
1️⃣ USER TRUY CẬP HỆ THỐNG
   → Vào Web/App, đăng nhập email @ghn.vn

2️⃣ XEM DANH SÁCH PHÒNG
   → Hệ thống hiển thị tất cả phòng user được phép book
   → Kèm sức chứa, tiện nghi, vị trí

3️⃣ TÌM KIẾM PHÒNG TRỐNG
   → Nhập: thời gian, số người, tiện nghi cần, tầng
   → Hệ thống trả về danh sách phòng available
   Status: "Available" (trống) hoặc "Available Soon" (sắp trống)

4️⃣ ĐẶT PHÒNG
   → Nhập: tên meeting, số người, thời gian bắt đầu/kết thúc
   → Có thể set lặp lại (Weekly/Monthly)
   → Booking có status "pending" (chờ xác nhận)

5️⃣ NHẬN EMAIL NHẮC NHỞ
   → 15 phút trước khi họp, hệ thống gửi email nhắc nhở
   → Email có thông tin phòng, thời gian, vị trí

6️⃣ TRONG CUỘC HỌP - CÓ THỂ
   → Gia hạn thời gian (nếu phòng sau không bị đặt)
   → Kết thúc sớm → tự động release phòng
```

---

## 🛠️ Tech Stack Chi Tiết

### **Frontend (Sắp làm)**
- React 18 - JavaScript framework để UI
- React Router - Điều hướng trang
- Axios - Gọi API
- TailwindCSS - CSS framework cho styling

### **Backend (Đang làm)**
- Node.js - JavaScript runtime
- Express - Web framework cho API
- PostgreSQL - Database
- Sequelize - ORM (dễ thao tác database)
- JWT - Token-based authentication
- Nodemailer - Gửi email

### **Deployment (Sắp)**
- Local/On-premise - Chạy trên server nội bộ
- PM2 - Quản lý process Node.js
- Docker - Optional (nhóm gói ứng dụng)

---

## 📊 Cơ Sở Dữ Liệu (Database)

### **7 Bảng Chính**
```
┌─────────────────┐
│     USERS       │ ← Người dùng (admin, VIP, regular)
└─────────────────┘
        │
        ├──→ BOOKINGS ← Đặt phòng
        │         │
        │         └──→ NOTIFICATIONS (email)
        │
        └──→ ROOMS ← Phòng họp
                │
                └──→ ROOM_AMENITIES (tiện nghi)

+ AUDIT_LOG (ghi lại các hành động)
```

### **Dữ Liệu Test Ban Đầu**
```
✓ 5 Users (admin, vip, 3 user thường)
✓ 19 Rooms (từ spec PDF)
  - 2 phòng RiveraPark 1F
  - 4 phòng RiveraPark G
  - 11 phòng RiveraPark 3F
  - 2 phòng Mipec 8F
✓ 3 Bookings mẫu (để test)
✓ Room Amenities (TV, Audio, Video, Projector)
```

---

## ✅ Những Gì Đã Hoàn Thành

### **Backend Structure** (100% xong)
- [x] Express app setup
- [x] PostgreSQL schema & models
- [x] 6 routes file (skeleton)
- [x] JWT authentication middleware
- [x] Database models associations
- [x] Error handling
- [x] CORS, logging middleware

### **Documentation** (100% xong)
- [x] SPECS.md - Từ PDF spec
- [x] PROJECT_PLAN.md - 4 giai đoạn
- [x] IMPLEMENTATION_CHECKLIST.md - 50+ tasks
- [x] BACKEND_SETUP.md - Hướng dẫn setup
- [x] README_VI.md - File này

### **Database** (100% xong)
- [x] Schema design
- [x] SQL file tạo bảng
- [x] SQL file seed data
- [x] Model definitions
- [x] Model associations

### **API Routes** (Skeleton 100%, Implementation 0%)
- [x] Routes defined (6 files)
- [x] Endpoint structure
- [ ] Controllers (cần implement)
- [ ] Business logic (cần implement)

---

## 🚀 Bước Tiếp Theo (Cần Làm)

### **GIAI ĐOẠN 1: MVP (Tuần 1-2)** 🎯 HIỆN TẠI
```
✓ Backend setup (xong)
✓ Database schema (xong)
✓ Models (xong)
✓ Routes skeleton (xong)

⏳ Cần làm:
  1. Authentication
     - Kiểm tra email @ghn.vn
     - Tạo/lấy user từ DB
     - Sinh JWT token
     
  2. Room Management
     - GET /api/rooms - Liệt kê
     - GET /api/rooms/search - Tìm kiếm với filter
     
  3. Booking Management
     - POST /api/bookings - Đặt phòng
     - GET /api/bookings - Danh sách của tôi
     - DELETE /api/bookings/:id - Hủy
     
  4. Validation
     - Kiểm tra conflict thời gian
     - Kiểm tra capacity
     - Kiểm tra max duration (4 giờ)
```

### **GIAI ĐOẠN 2: Core Features (Tuần 3-4)**
```
- Email notifications (15 min reminder)
- Dashboard metrics
```

### **GIAI ĐOẠN 3: Advanced (Tuần 5-6)**
```
- Admin panel
- Recurring bookings (weekly/monthly)
- Advanced analytics
```

### **GIAI ĐOẠN 4: Polish (Tuần 7+)**
```
- Testing & QA
- Performance optimization
- Deployment
```

---

## 📦 Cài Đặt & Chạy (3 Bước)

### **Bước 1: Cài đặt dependencies**
```bash
cd backend
npm install
```

### **Bước 2: Setup PostgreSQL & Database**
```bash
# Tạo database
createdb ghn_meeting_room_booking

# Chạy schema (tạo bảng)
psql -U postgres -d ghn_meeting_room_booking < DATABASE_SCHEMA.sql

# Chạy seed data (tạo dữ liệu test)
psql -U postgres -d ghn_meeting_room_booking < SEED_DATA.sql
```

### **Bước 3: Chạy server**
```bash
npm run dev
```

**Nếu thành công bạn sẽ thấy:**
```
✅ Database connection established
✅ Database models synced
✅ Server is running on port 5000
📍 API URL: http://localhost:5000
📍 Health check: http://localhost:5000/health
```

---

## 🔐 Thông Tin Bảo Mật

### **JWT Token**
```javascript
// Token chứa thông tin user
{
  id: "uuid của user",
  email: "user@ghn.vn",
  full_name: "Tên user",
  role: "user|admin|vip",
  exp: "hết hạn sau 7 ngày"
}

// Header của request phải có:
Authorization: Bearer <token>
```

### **Role-Based Access**
```
User (nhân viên thường):
  → Book phòng
  → View phòng của mình
  → Hủy booking
  
VIP (lãnh đạo):
  → Mọi quyền của user
  → Book phòng VIP
  
Admin (OA/IT):
  → Mọi quyền
  → Quản lý user
  → Quản lý phòng
  → Xem dashboard & báo cáo
```

---

## 📋 Danh Sách File Tài Liệu

| File | Mô Tả |
|------|-------|
| **SPECS.md** | Spec chi tiết từ PDF gốc (20 phòng, 7 bước booking, etc) |
| **PROJECT_PLAN.md** | Kế hoạch 4 giai đoạn + tech stack details |
| **IMPLEMENTATION_CHECKLIST.md** | Danh sách 50+ tasks chi tiết với giai đoạn |
| **BACKEND_SETUP.md** | Hướng dẫn cài đặt backend (tiếng Anh) |
| **README_VI.md** | File này (hướng dẫn tiếng Việt) |
| **DATABASE_SCHEMA.sql** | SQL tạo bảng, indexes, views |
| **SEED_DATA.sql** | SQL tạo dữ liệu test |

---

## ❓ Câu Hỏi Thường Gặp

### **Q: Tại sao dùng PostgreSQL?**
A: Miễn phí, mạnh mẽ, hỗ trợ JSON/UUID, phù hợp để scale.

### **Q: JWT có bảo mật không?**
A: Có, vì token được ký bằng secret key. Backend kiểm tra khi mỗi request.

### **Q: Database sẽ tự tạo bảng không?**
A: Có! Sequelize sẽ auto-sync. Nhưng nên chạy SQL schema trước để sure.

### **Q: Phòng VIP là gì?**
A: Phòng chỉ lãnh đạo (BOD) được book, nhân viên không được phép.

### **Q: Email dùng công ty API hay SMTP?**
A: API (bạn sẽ config khi giai đoạn 2).

### **Q: Có authentication khác ngoài email?**
A: Hiện tại chỉ email. Có thể thêm LDAP sau.

---

## 🎓 Lộ Trình Học Tập

Nếu bạn chưa quen:
1. Đọc **SPECS.md** để hiểu requirement
2. Xem **PROJECT_PLAN.md** để hiểu architecture
3. Chạy **BACKEND_SETUP.md** để cài đặt
4. Đọc **IMPLEMENTATION_CHECKLIST.md** để bắt đầu code
5. Tham khảo model trong `src/models/` để hiểu database

---

## 📞 Hỗ Trợ

**Nếu có lỗi:**
1. Kiểm tra file `.env` có đúng không
2. Kiểm tra PostgreSQL có chạy không: `psql --version`
3. Kiểm tra database có được tạo không: `psql -l`
4. Xem console output để tìm error

**Nếu cần debug:**
- Terminal: `NODE_ENV=development npm run dev`
- Database queries sẽ log ra console

---

## 🎉 Tóm Tắt

Bạn đã có:
- ✅ Backend project hoàn chỉnh
- ✅ Database schema & models
- ✅ Routes skeleton
- ✅ JWT authentication
- ✅ Documentation đầy đủ

**Bước tiếp theo:** Implement Phase 1 (authentication + room search + booking)

**Mục tiêu:** Hoàn thành MVP trong 2 tuần

**Công việc:** Bắt tay vào code! 💪

---

**Chúc bạn thành công! 🚀**

Nếu cần giải thích thêm chi tiết nào, cứ hỏi nhé!
