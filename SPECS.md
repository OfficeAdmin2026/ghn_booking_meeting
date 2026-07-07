# Xây dựng Phần mềm Book Phòng Họp

**Quy mô:** 20 phòng họp / ~1000 users

---

## I. MỤC TIÊU

Mục tiêu khi xây dựng hệ thống book phòng nội bộ:

- Đặt phòng nhanh, tránh trùng lịch
- Có phân quyền rõ ràng (Admin và User)
- Tích hợp lịch calendar
- Hiển thị trạng thái phòng realtime
- Giới hạn khung thời gian booking
- Đưa ra được thống kê - báo cáo (VD: Phòng dùng nhiều nhất/ít nhất; Người book nhưng không dùng nhiều nhất)

---

## II. CHI TIẾT PHÂN QUYỀN (2 NHÓM)

### 1. Quyền của Admin (OA, IT)

- Tạo/sửa/xóa phòng
- Phân quyền/chỉnh sửa quyền cho user
- Tạo Booking Policy:
  - Phòng VIP chỉ manager được book
  - Max thời gian booking = 4 giờ/booking
  - Max booking trong tương lai: từ thứ 2 đến thứ 6
- Xem báo cáo

### 2. Phân quyền của User

**User thường:** Toàn bộ nhân viên
**User VIP:** BOD

#### Quyền của User:
- Tìm phòng
- Book phòng trong thời gian giới hạn của Admin
- Hủy booking
- Gia hạn meeting
- Được book các phòng VIP (VIP User only)

---

## III. DASHBOARD CHO OA

Các metric cần hiển thị:

| Metric | Ý nghĩa |
|--------|---------|
| **Occupancy rate** | % sử dụng |
| **Cancellation rate** | Tỷ lệ booking bị hủy |
| **Peak hour** | Giờ cao điểm |
| **Most used rooms** | Phòng hot |
| **Average meeting duration** | Thời lượng trung bình |

---

## IV. QUY TRÌNH BOOK PHÒNG HỌP

### Bước 1: Truy cập hệ thống
User truy cập hệ thống Web nội bộ hoặc App Gtalk để book phòng họp

### Bước 2: Xem danh sách phòng
Giao diện hiển thị tất cả các phòng họp user được phân quyền

### Bước 3: Tìm kiếm phòng
User search được các thông tin để tìm kiếm phòng trống nhanh hơn:

| Tiêu chí | Ví dụ |
|----------|-------|
| Thời gian | 2PM–3PM |
| Số người | 8 |
| Thiết bị | TV/máy chiếu |
| Location | Floor 3 |

**Hệ thống trả kết quả:**

| Room | Capacity | Status |
|------|----------|--------|
| Thành Thái | 12 | Available |
| Hưng Yên | 30 | Available Soon |

### Bước 4: Book phòng

| Trường | Ví dụ |
|--------|-------|
| Meeting title | OA meeting |
| Participants | 8 |
| Start time | 14:00 |
| End time | 15:00 |
| Recurring | Weekly |

### Bước 5: Nhận email nhắc nhở
Gửi email nội bộ nhắc nhở lịch dùng phòng trong 15 phút tới

### Bước 6: Trong Meeting
User có thể:

- **Extend meeting:** Gia hạn thời gian họp (Điều kiện: không conflict booking sau)
- **Early finish:** Kết thúc sớm - release room ngay

---

## V. DANH SÁCH PHÒNG HỌP

| No | Tên phòng họp | Vị trí | Sức chứa | Audio Conference | TV | Video Conference | Projector | Mã phòng |
|----|----|----|----|:-:|:-:|:-:|:-:|---|
| 1 | Thành Thái | RiveraPark 1F | 20 | ✓ | ✓ | ✓ | | RiveraPark-1F-Thành Thái (20) |
| 2 | Hưng Yên | RiveraPark 1F | 10 | | ✓ | ✓ | | RiveraPark-1F-Hưng Yên (10) |
| 3 | GHN Thành Công | RiveraPark G | 10 | | ✓ | ✓ | | RiveraPark-G-GHN Thành Công (10) |
| 4 | Khách Hàng Thành Công | RiveraPark G | 10 | | ✓ | ✓ | | RiveraPark-G-Khách Hàng Thành Công (10) |
| 5 | Chính Trực | RiveraPark G | 4 | | | ✓ | ✓ | RiveraPark-G-Chính Trực (4) |
| 6 | Hiệu Suất Cao | RiveraPark G | 10 | ✓ | ✓ | ✓ | | RiveraPark-G-Hiệu Suất Cao (10) |
| 7 | Hàng Nặng Ký | RiveraPark 3F | 10 | | ✓ | ✓ | | RiveraPark-3F-Hàng Nặng Ký (10) |
| 8 | Sảnh Lễ Tân | RiveraPark 3F | 10 | | ✓ | ✓ | | RiveraPark-3F-Sảnh Lễ Tân (10) |
| 9 | Dịch Vụ 5 Sao | RiveraPark 3F | 10 | | ✓ | ✓ | | RiveraPark-3F-Dịch Vụ 5 Sao (10) |
| 10 | Shop Siêu Sao | RiveraPark 3F | 10 | | ✓ | ✓ | | RiveraPark-3F-Shop Siêu Sao (10) |
| 11 | Lữ Gia | RiveraPark 3F | 10 | | ✓ | ✓ | | RiveraPark-3F-Lữ Gia (10) |
| 12 | Đồng Nai | RiveraPark 3F | 10 | | ✓ | ✓ | | RiveraPark-3F-Đồng Nai (10) |
| 13 | Nguyễn Huy Tưởng | RiveraPark 3F | 10 | | ✓ | ✓ | | RiveraPark-3F-Nguyễn Huy Tưởng (10) |
| 14 | Hoàng Văn Thụ | RiveraPark 3F | 10 | | ✓ | ✓ | | RiveraPark-3F-Hoàng Văn Thụ (10) |
| 15 | Thiên Phước | RiveraPark 3F | 20 | ✓ | | ✓ | ✓ | RiveraPark-3F-Thiên Phước (20) |
| 16 | Learning Center | RiveraPark 3F | 50 | ✓ | | ✓ | ✓ | RiveraPark-3F-Learning Center (50) |
| 17 | War Room | RiveraPark 3F | 20 | ✓ | ✓ | ✓ | | RiveraPark-3F-War Room (20) |
| 18 | Nguyễn Ngọc Vũ | Mipec 8F | 8 | | ✓ | ✓ | | Mipec-8F-Nguyễn Ngọc Vũ (8) |
| 19 | Đài Tư | Mipec 8F | 50 | | ✓ | ✓ | | Mipec-8F-Đài Tư (50) |

---

## VI. TÍNH NĂNG KHÁC

- **Tích hợp:** Nội bộ GHN và app Gtalk
- **Phân quyền VIP:** Một số phòng chỉ manager được book
- **Recurring booking:** Hỗ trợ booking định kỳ (ví dụ: Weekly)

---

## VII. CÂU HỎI CẦN TÀI LIỆU THÊM

Để bắt đầu phát triển, tôi cần hỏi bạn một số câu hỏi:

1. **Nền tảng phát triển:**
   - Bạn muốn xây dựng Web app, Mobile app, hay cả hai?
   - Ngôn ngữ/framework ưu tiên? (Node.js + React, Django, Laravel, etc.)

2. **Cơ sở dữ liệu:**
   - Bạn có server/database infrastructure sẵn rồi không?
   - Là on-premise hay cloud?

3. **Tích hợp calendar:**
   - Tích hợp với Google Calendar, Outlook hay hệ thống nội bộ?
   - Có API sẵn không?

4. **Email reminder:**
   - Dùng dịch vụ email nào? (Gmail, SendGrid, etc.)

5. **Timeline & Budget:**
   - Deadline hoàn thành là khi nào?
   - Budget có giới hạn không?

6. **Authentication:**
   - Xác thực user dùng LDAP/AD nội bộ hay khác?

7. **Báo cáo:**
   - Báo cáo cần xuất định dạng nào? (PDF, Excel, CSV)
   - Tần suất báo cáo?

---

**📝 Đã hoàn thành trích xuất spec từ PDF. Bạn hãy trả lời các câu hỏi trên để tôi có thể lên kế hoạch chi tiết cho dự án!**
