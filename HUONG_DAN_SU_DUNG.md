# Hướng dẫn sử dụng hệ thống Đặt phòng họp GHN

> **Truy cập:** https://ghn-booking-meeting.vercel.app

---

## Mục lục

- [Bảng tổng hợp nhanh](#bảng-tổng-hợp-nhanh)
- [Dành cho User](#dành-cho-user)
- [Dành cho Admin](#dành-cho-admin)

---

## Bảng tổng hợp nhanh

### Dành cho User

| Tính năng | Vị trí | Cách thực hiện | Lưu ý |
|---|---|---|---|
| Đăng nhập | Trang đăng nhập | Nhập email `@ghn.vn` (+ Họ tên nếu lần đầu) → **Đăng nhập** | Không cần mật khẩu |
| Chọn phòng | Cột trái, tab "🏢 Phòng" | Lọc theo địa điểm (Rivera Park/Mipec), tầng, hoặc gõ tên phòng | Phòng được nhớ sau khi F5 |
| Tìm phòng trống | Tab "🏢 Phòng" → "Tìm phòng trống" | Nhập giờ bắt đầu/kết thúc, số người, địa điểm → **🔍 Tìm phòng trống** | Bấm kết quả để mở form đặt ngay |
| Đặt phòng mới | Vùng lịch tuần | Giữ và kéo chuột từ giờ bắt đầu đến giờ kết thúc → điền tên cuộc họp → **Xác nhận đặt phòng** | Mốc 15 phút; không đặt được giờ đã qua; không đè lịch khác; phòng **VIP** chỉ VIP/Admin đặt được; nếu đang **đóng băng** chỉ đặt được tuần hiện tại |
| Xem lịch của tôi | Tab "📅 Của tôi" | Lọc theo Tất cả / Sắp tới / Đã hủy / Đã xong | |
| Chỉnh sửa lịch | Bấm vào ô lịch | **Chỉnh sửa** → đổi ngày/giờ/tiêu đề/ghi chú → **Lưu thay đổi** | Chỉ áp dụng cho lịch chưa diễn ra |
| Hủy lịch | Bấm vào ô lịch | **Hủy đặt phòng** → xác nhận | Chỉ hủy được lịch **Đang chờ** hoặc **Đã xác nhận** |
| Theo dõi trạng thái | Ô lịch / tab "Của tôi" | Xem màu/icon trạng thái | 🟡 Đang chờ · 🟢 Đã xác nhận · 🔵 Đang diễn ra · ✅ Hoàn thành · ❌ Đã hủy |
| Đóng băng booking | Banner 🔒 trên lịch | Theo dõi banner để biết khi nào mở booking tuần tiếp | Khi đóng băng: không kéo tạo booking mới cho tuần tiếp |

### Dành cho Admin

> Admin có đầy đủ tính năng User ở trên, cộng thêm:

| Tính năng | Vị trí | Cách thực hiện | Lưu ý |
|---|---|---|---|
| Truy cập trang Admin | Nav "Admin" | Bấm vào — chỉ hiện với tài khoản Admin | Gồm 3 tab |
| Quản lý phòng | Tab "1. Quản lý phòng" | **+ Thêm phòng** → điền tên, địa điểm, tầng, sức chứa, tiện nghi, bật/tắt VIP → **Lưu**. Sửa bằng ✏️, xóa bằng 🗑️ | |
| Phân quyền | Tab "2. Phân quyền" | Nhập email `@ghn.vn`, chọn vai trò (Admin/Vip) → **Cấp quyền**; đổi vai trò qua dropdown cạnh tên user | Nếu user chưa từng đăng nhập, hệ thống tự tạo tài khoản với vai trò đã chọn; Admin không tự đổi quyền của chính mình |
| Đóng băng đặt phòng | Tab "3. Đóng băng đặt phòng" | Bật/Tắt, chọn ngày trong tuần + giờ mở booking tuần tiếp (vd: Thứ Năm 14:00) | Admin luôn đặt được mọi tuần; lịch đặt trước giờ mở sẽ ẩn với user thường |
| Dashboard & Analytics | Nav "Dashboard" / "Analytics" | Xem thống kê tổng số lịch/phòng/người dùng, biểu đồ sử dụng phòng theo thời gian | |
| Hủy lịch người dùng khác | Bấm vào ô lịch bất kỳ | **Hủy (Admin)** → điền lý do → xác nhận | Lý do được lưu lại, user xem được khi bấm vào ô lịch đã hủy đó trên calendar |
| Bảo mật | — | Đăng xuất sau khi dùng máy chung; không chia sẻ tài khoản Admin | Mọi thao tác Admin đều được ghi log |

---

# Dành cho User

## 1. Đăng nhập

1. Truy cập hệ thống và nhập **email công ty** đuôi `@ghn.vn`
2. Lần đầu đăng nhập: điền thêm **Họ tên** để hệ thống tạo tài khoản
3. Lần sau: chỉ cần nhập email, bấm **Đăng nhập**

> Không cần mật khẩu — hệ thống xác thực qua email nội bộ.

---

## 2. Giao diện chính — Lịch tuần

Sau khi đăng nhập, bạn thấy màn hình chính gồm 2 phần:

| Khu vực | Chức năng |
|---------|-----------|
| **Cột trái** | Chọn phòng, tìm phòng trống, xem lịch của tôi |
| **Vùng lịch** | Hiển thị lịch đặt phòng theo tuần, kéo để đặt |

---

## 3. Chọn phòng họp

### Tab "🏢 Phòng"
- Lọc theo **địa điểm** (Rivera Park / Mipec) và **tầng**
- Gõ tên phòng vào ô tìm kiếm
- Bấm vào tên phòng để xem lịch theo tuần
- Phòng được ghi nhớ sau khi **F5** (làm mới trang)

### Tìm phòng trống theo khung giờ
1. Mở phần **"Tìm phòng trống"** trong tab Phòng
2. Nhập thời gian bắt đầu / kết thúc, số người, địa điểm
3. Bấm **"🔍 Tìm phòng trống"**
4. Bấm vào kết quả để mở form đặt phòng ngay

---

## 4. Đặt phòng mới

**Cách kéo thả trên lịch** (nhanh nhất):
1. Chọn phòng ở cột trái
2. Trên ô ngày muốn đặt, **giữ và kéo chuột** từ giờ bắt đầu đến giờ kết thúc
3. Lịch nhảy theo mốc **15 phút**
4. Thả chuột → form đặt phòng hiện ra
5. Điền **Tên cuộc họp** và ghi chú (nếu có) → bấm **Xác nhận đặt phòng**

**Lưu ý quan trọng:**
- Chỉ đặt được từ **thời điểm hiện tại trở về sau** (không đặt trong quá khứ)
- Không thể kéo đè lên khung giờ đã có lịch (overlay đỏ báo xung đột)
- Phòng **VIP** chỉ dành cho VIP và Admin
- Nếu hệ thống đang **đóng băng** (🔒), bạn chỉ đặt được trong tuần hiện tại cho đến khi mở booking tuần tiếp theo

---

## 5. Xem và quản lý lịch của tôi

### Tab "📅 Của tôi"
Hiển thị toàn bộ lịch đặt phòng của bạn với bộ lọc:
- **Tất cả / Sắp tới / Đã hủy / Đã xong**

### Chỉnh sửa lịch đặt
1. Bấm vào ô lịch trên calendar (hoặc trong tab "Của tôi")
2. Bấm **"Chỉnh sửa"** (chỉ hiện với lịch chưa diễn ra)
3. Thay đổi ngày, giờ, tiêu đề, ghi chú
4. Bấm **"Lưu thay đổi"**

### Hủy lịch đặt
1. Bấm vào ô lịch
2. Bấm **"Hủy đặt phòng"** → xác nhận
3. Lịch chuyển sang trạng thái **Đã hủy**

> Chỉ hủy được lịch có trạng thái **Đang chờ** hoặc **Đã xác nhận**. Lịch đã kết thúc không hủy được.

---

## 6. Trạng thái lịch đặt

| Trạng thái | Ý nghĩa |
|------------|---------|
| 🟡 Đang chờ | Vừa tạo, chờ xác nhận |
| 🟢 Đã xác nhận | Đã được duyệt |
| 🔵 Đang diễn ra | Phòng đang được sử dụng |
| ✅ Hoàn thành | Cuộc họp đã kết thúc |
| ❌ Đã hủy | Bị hủy bởi user hoặc admin |

---

## 7. Lưu ý khi hệ thống đóng băng

Hệ thống có thể đóng băng đặt phòng theo lịch tuần (ví dụ: mỗi thứ Năm 14:00 mở booking tuần tiếp theo).

- Khi đóng băng: banner 🔒 hiện trên lịch, không thể kéo tạo booking mới cho tuần tiếp
- Khi hết đóng băng: banner biến mất, đặt phòng bình thường

---

# Dành cho Admin

> Admin có đầy đủ quyền của User, cộng thêm các tính năng quản trị bên dưới.

## 1. Truy cập trang Admin

Bấm **"Admin"** trên thanh điều hướng (chỉ hiện với tài khoản Admin).

Trang Admin gồm **3 tab**:

---

## 2. Tab "1. Quản lý phòng"

### Xem danh sách phòng
- Hiển thị toàn bộ phòng: tên, địa điểm, tầng, sức chứa, tiện nghi, trạng thái VIP

### Thêm phòng mới
1. Bấm **"+ Thêm phòng"**
2. Điền đầy đủ thông tin: tên, địa điểm, tầng, sức chứa
3. Tick tiện nghi: TV, Audio Conference, Video Conference, Projector
4. Bật/tắt **Phòng VIP** (chỉ VIP + Admin đặt được)
5. Bấm **Lưu**

### Chỉnh sửa / Xóa phòng
- Bấm ✏️ để chỉnh sửa thông tin phòng
- Bấm 🗑️ để xóa (cần xác nhận)

---

## 3. Tab "2. Phân quyền"

### Cấp quyền Admin hoặc VIP
1. Nhập **email** đuôi `@ghn.vn`
2. Chọn vai trò: **Admin** hoặc **Vip**
3. Bấm **"Cấp quyền"**

> Nếu người dùng chưa từng đăng nhập, hệ thống sẽ **tự tạo tài khoản** cho họ với vai trò đã chọn.

### Thay đổi quyền người dùng hiện có
Trong bảng danh sách bên dưới, chọn vai trò mới từ dropdown cạnh tên người dùng và xác nhận.

### Hạ quyền về User
Chọn **"User"** từ dropdown cạnh tên người dùng cần hạ quyền.

> Admin không thể tự thay đổi quyền của chính mình.

---

## 4. Tab "3. Đóng băng đặt phòng"

### Chức năng
Kiểm soát lịch mở booking tuần tiếp theo theo chu kỳ hàng tuần.

### Cấu hình
| Cài đặt | Mô tả |
|---------|-------|
| Bật / Tắt | Bật = áp dụng lịch mở booking; Tắt = mở tự do |
| Ngày mở | Ngày trong tuần sẽ mở booking tuần tiếp (vd: Thứ Năm) |
| Giờ mở | Giờ cụ thể trong ngày (vd: 14:00) |

**Ví dụ:** Đặt Thứ Năm 14:00 → mỗi thứ Năm 2 giờ chiều, hệ thống tự động cho phép đặt phòng tuần tiếp theo.

### Khi Admin đặt phòng trong lúc đóng băng
Admin vẫn đặt được cho bất kỳ tuần nào. Các lịch đặt trước thời điểm mở sẽ được **ẩn với user thường** cho đến khi booking được mở.

---

## 5. Dashboard & Analytics

Truy cập **"Dashboard"** và **"Analytics"** trên thanh điều hướng để xem:
- Tổng số lịch đặt, phòng đang hoạt động, người dùng
- Biểu đồ sử dụng phòng theo thời gian
- Thống kê theo phòng, địa điểm

---

## 6. Hủy lịch của người dùng khác

1. Bấm vào ô lịch bất kỳ trên calendar
2. Admin thấy nút **"Hủy (Admin)"** với ô nhập lý do
3. Điền lý do → bấm xác nhận
4. Lịch chuyển trạng thái **Đã hủy**, lý do được lưu lại — user xem được khi bấm vào ô lịch đó trên calendar

---

## 7. Lưu ý bảo mật

- Luôn đăng xuất sau khi dùng xong trên máy chung
- Không chia sẻ tài khoản Admin cho người không có thẩm quyền
- Mọi thao tác Admin đều được ghi log trong hệ thống

---

*Cần hỗ trợ? Liên hệ bộ phận IT nội bộ GHN.*
