-- ============================================================
-- GHN Meeting Room Booking - Complete Database Setup
-- Chạy file này 1 lần duy nhất trên Supabase SQL Editor
-- ============================================================

-- ENUM types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'vip');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
CREATE TYPE recurring_type AS ENUM ('none', 'weekly', 'monthly');
CREATE TYPE amenity_type AS ENUM ('TV', 'Audio Conference', 'Video Conference', 'Projector');
CREATE TYPE checkin_method AS ENUM ('qr_code', 'nfc', 'tablet', 'mobile_app');
CREATE TYPE notification_type AS ENUM ('booking_confirmed', 'reminder', 'check_in_reminder', 'auto_cancelled', 'meeting_completed');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  role user_role DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  location VARCHAR(255) NOT NULL,
  floor VARCHAR(10) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  code VARCHAR(100) UNIQUE NOT NULL,
  is_vip BOOLEAN DEFAULT false,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rooms_location ON rooms(location);
CREATE INDEX idx_rooms_is_active ON rooms(is_active);
CREATE INDEX idx_rooms_is_vip ON rooms(is_vip);

-- Room Amenities
CREATE TABLE room_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  amenity amenity_type NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_room_amenities_room_id ON room_amenities(room_id);
CREATE UNIQUE INDEX idx_room_amenities_unique ON room_amenities(room_id, amenity);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  participants_count INTEGER NOT NULL CHECK (participants_count > 0),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status booking_status DEFAULT 'pending',
  recurring recurring_type DEFAULT 'none',
  recurring_end_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_time > start_time)
);
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_room_time ON bookings(room_id, start_time, end_time);
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);

-- Check-Ins
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  method checkin_method NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  device_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_checkins_booking_id ON checkins(booking_id);
CREATE UNIQUE INDEX idx_checkins_one_per_booking ON checkins(booking_id);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type notification_type NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP,
  is_sent BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_sent ON notifications(is_sent);

-- Admin Settings
CREATE TABLE admin_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100),
  action VARCHAR(50),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- View
CREATE VIEW available_rooms_at_time AS
SELECT DISTINCT r.id, r.name, r.location, r.floor, r.capacity, r.is_vip, r.code
FROM rooms r
WHERE r.is_active = true
AND r.id NOT IN (
  SELECT DISTINCT room_id FROM bookings
  WHERE status IN ('pending', 'confirmed', 'active')
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO users (id, email, full_name, department, role, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@ghn.vn', 'Admin User', 'IT', 'admin', true),
('22222222-2222-2222-2222-222222222222', 'vip@ghn.vn', 'VIP User (BOD)', 'Management', 'vip', true),
('33333333-3333-3333-3333-333333333333', 'john@ghn.vn', 'John Doe', 'Sales', 'user', true),
('44444444-4444-4444-4444-444444444444', 'jane@ghn.vn', 'Jane Smith', 'Marketing', 'user', true),
('55555555-5555-5555-5555-555555555555', 'mike@ghn.vn', 'Mike Johnson', 'Engineering', 'user', true);

INSERT INTO rooms (id, name, location, floor, capacity, code, is_vip, is_active) VALUES
('a1111111-1111-1111-1111-111111111111', 'Thành Thái', 'Rivera Park', '1F', 20, 'RPARK-1F-001', false, true),
('a2222222-2222-2222-2222-222222222222', 'Hưng Yên', 'Rivera Park', '1F', 10, 'RPARK-1F-002', false, true),
('b1111111-1111-1111-1111-111111111111', 'GHN Thành Công', 'Rivera Park', 'G', 10, 'RPARK-G-001', false, true),
('b2222222-2222-2222-2222-222222222222', 'Khách Hàng Thành Công', 'Rivera Park', 'G', 10, 'RPARK-G-002', false, true),
('b3333333-3333-3333-3333-333333333333', 'Chính Trực', 'Rivera Park', 'G', 4, 'RPARK-G-003', false, true),
('b4444444-4444-4444-4444-444444444444', 'Hiệu Suất Cao', 'Rivera Park', 'G', 10, 'RPARK-G-004', false, true),
('c1111111-1111-1111-1111-111111111111', 'Hàng Nặng Ký', 'Rivera Park', '3F', 10, 'RPARK-3F-001', false, true),
('c2222222-2222-2222-2222-222222222222', 'Sảnh Lễ Tân', 'Rivera Park', '3F', 10, 'RPARK-3F-002', false, true),
('c3333333-3333-3333-3333-333333333333', 'Dịch Vụ 5 Sao', 'Rivera Park', '3F', 10, 'RPARK-3F-003', false, true),
('c4444444-4444-4444-4444-444444444444', 'Shop Siêu Sao', 'Rivera Park', '3F', 10, 'RPARK-3F-004', false, true),
('c5555555-5555-5555-5555-555555555555', 'Lữ Gia', 'Rivera Park', '3F', 10, 'RPARK-3F-005', false, true),
('c6666666-6666-6666-6666-666666666666', 'Đồng Nai', 'Rivera Park', '3F', 10, 'RPARK-3F-006', false, true),
('c7777777-7777-7777-7777-777777777777', 'Nguyễn Huy Tưởng', 'Rivera Park', '3F', 10, 'RPARK-3F-007', false, true),
('c8888888-8888-8888-8888-888888888888', 'Hoàng Văn Thụ', 'Rivera Park', '3F', 10, 'RPARK-3F-008', false, true),
('c9999999-9999-9999-9999-999999999999', 'Thiên Phước', 'Rivera Park', '3F', 20, 'RPARK-3F-009', false, true),
('ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Learning Center', 'Rivera Park', '3F', 50, 'RPARK-3F-010', false, true),
('ca2a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'War Room', 'Rivera Park', '3F', 20, 'RPARK-3F-011', false, true),
('d1111111-1111-1111-1111-111111111111', 'Nguyễn Ngọc Vũ', 'Mipec', '8F', 8, 'MIPEC-8F-001', false, true),
('d2222222-2222-2222-2222-222222222222', 'Đài Tư', 'Mipec', '8F', 50, 'MIPEC-8F-002', false, true);

INSERT INTO room_amenities (room_id, amenity) VALUES
('a1111111-1111-1111-1111-111111111111', 'TV'),
('a1111111-1111-1111-1111-111111111111', 'Audio Conference'),
('a1111111-1111-1111-1111-111111111111', 'Video Conference'),
('a2222222-2222-2222-2222-222222222222', 'TV'),
('a2222222-2222-2222-2222-222222222222', 'Video Conference'),
('b4444444-4444-4444-4444-444444444444', 'TV'),
('b4444444-4444-4444-4444-444444444444', 'Audio Conference'),
('b4444444-4444-4444-4444-444444444444', 'Video Conference'),
('ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Audio Conference'),
('ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Projector'),
('ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Video Conference');

INSERT INTO admin_settings (key, value) VALUES
('booking_freeze_weekly_enabled', 'false'),
('booking_freeze_weekly_day', '4'),
('booking_freeze_weekly_time', '14:00');

INSERT INTO bookings (id, room_id, user_id, title, participants_count, start_time, end_time, status, recurring) VALUES
('e1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Team Sync', 8, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', 'completed', 'none'),
('e2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Project Planning', 12, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hours', 'confirmed', 'none'),
('e3333333-3333-3333-3333-333333333333', 'b4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Marketing Review', 6, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '4 hours', 'pending', 'none');
