-- =============================================================
-- ADD_CAR_BOOKING_REQUESTER.sql
-- Thêm liên kết người sử dụng xe (MSNV/Tên/Phòng ban) vào car_bookings,
-- để báo cáo lấy dữ liệu chính xác từ bảng users (đồng bộ SSO sau này)
-- thay vì chỉ dựa vào tiêu đề tự do.
-- Chạy 1 lần trong Supabase SQL Editor (idempotent, an toàn chạy lại)
-- =============================================================

ALTER TABLE car_bookings
  ADD COLUMN IF NOT EXISTS requester_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_car_bookings_requester ON car_bookings(requester_user_id);
