-- Sample data for GHN Meeting Room Booking System
-- Run this after running the schema

-- Insert test users
INSERT INTO users (id, email, full_name, department, role, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@ghn.vn', 'Admin User', 'IT', 'admin', true),
('22222222-2222-2222-2222-222222222222', 'vip@ghn.vn', 'VIP User (BOD)', 'Management', 'vip', true),
('33333333-3333-3333-3333-333333333333', 'john@ghn.vn', 'John Doe', 'Sales', 'user', true),
('44444444-4444-4444-4444-444444444444', 'jane@ghn.vn', 'Jane Smith', 'Marketing', 'user', true),
('55555555-5555-5555-5555-555555555555', 'mike@ghn.vn', 'Mike Johnson', 'Engineering', 'user', true);

-- Rivera Park - 1F (4 phòng)
INSERT INTO rooms (id, name, location, floor, capacity, code, is_vip, is_active) VALUES
('a1111111-1111-1111-1111-111111111111', 'Thành Thái',  'Rivera Park', '1F', 14, 'RPARK-1F-001', false, true),
('a2222222-2222-2222-2222-222222222222', 'Hưng Yên',    'Rivera Park', '1F', 40, 'RPARK-1F-002', false, true),
('a3333333-3333-3333-3333-333333333333', 'Our Roads',   'Rivera Park', '1F',  6, 'RPARK-1F-003', false, true),
('a4444444-4444-4444-4444-444444444444', 'Your Loads',  'Rivera Park', '1F',  6, 'RPARK-1F-004', false, true);

-- Rivera Park - G (3 phòng)
INSERT INTO rooms (id, name, location, floor, capacity, code, is_vip, is_active) VALUES
('b1111111-1111-1111-1111-111111111111', 'GHN Thành Công',        'Rivera Park', 'G', 10, 'RPARK-G-001', false, true),
('b2222222-2222-2222-2222-222222222222', 'Khách Hàng Thành Công', 'Rivera Park', 'G', 10, 'RPARK-G-002', false, true),
('b3333333-3333-3333-3333-333333333333', 'Chính Trực',            'Rivera Park', 'G',  4, 'RPARK-G-003', false, true);

-- Rivera Park - 3F (9 phòng)
INSERT INTO rooms (id, name, location, floor, capacity, code, is_vip, is_active) VALUES
('c2222222-2222-2222-2222-222222222222', 'Sảnh Lễ Tân',       'Rivera Park', '3F', 40, 'RPARK-3F-002', false, true),
('c3333333-3333-3333-3333-333333333333', 'Dịch Vụ 5 Sao',     'Rivera Park', '3F', 10, 'RPARK-3F-003', false, true),
('c4444444-4444-4444-4444-444444444444', 'Shop Siêu Sao',      'Rivera Park', '3F', 10, 'RPARK-3F-004', false, true),
('c1111111-1111-1111-1111-111111111111', 'Hàng Nặng Ký',       'Rivera Park', '3F', 10, 'RPARK-3F-001', false, true),
('c5555555-5555-5555-5555-555555555555', 'Lữ Gia',             'Rivera Park', '3F',  6, 'RPARK-3F-005', false, true),
('c6666666-6666-6666-6666-666666666666', 'Đồng Nai',           'Rivera Park', '3F',  6, 'RPARK-3F-006', false, true),
('c7777777-7777-7777-7777-777777777777', 'Nguyễn Huy Tưởng',   'Rivera Park', '3F',  6, 'RPARK-3F-007', false, true),
('c8888888-8888-8888-8888-888888888888', 'Hoàng Văn Thụ',      'Rivera Park', '3F',  6, 'RPARK-3F-008', false, true),
('ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Learning Center',   'Rivera Park', '3F', 56, 'RPARK-3F-010',  true, true);

-- Mipec - 8F (2 phòng)
INSERT INTO rooms (id, name, location, floor, capacity, code, is_vip, is_active) VALUES
('d1111111-1111-1111-1111-111111111111', 'Nguyễn Ngọc Vũ', 'Mipec', '8F',  6, 'MIPEC-8F-001', false, true),
('d2222222-2222-2222-2222-222222222222', 'Đài Tư',          'Mipec', '8F', 20, 'MIPEC-8F-002', false, true);

-- Insert room amenities for some rooms
INSERT INTO room_amenities (room_id, amenity) VALUES
-- Thành Thái: TV, Audio Conference, Video Conference
('a1111111-1111-1111-1111-111111111111', 'TV'),
('a1111111-1111-1111-1111-111111111111', 'Audio Conference'),
('a1111111-1111-1111-1111-111111111111', 'Video Conference'),

-- Hưng Yên: TV, Video Conference
('a2222222-2222-2222-2222-222222222222', 'TV'),
('a2222222-2222-2222-2222-222222222222', 'Video Conference'),

-- Learning Center: Audio Conference, Projector, Video Conference
('ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Audio Conference'),
('ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Projector'),
('ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'Video Conference');

-- Insert sample bookings (for testing)
INSERT INTO bookings (id, room_id, user_id, title, participants_count, start_time, end_time, status, recurring) VALUES
-- Past booking (completed)
('e1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Team Sync', 8, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', 'completed', 'none'),

-- Current/upcoming bookings
('e2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Project Planning', 12, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hours', 'confirmed', 'none'),
('e3333333-3333-3333-3333-333333333333', 'b4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Marketing Review', 6, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '4 hours', 'pending', 'weekly');

-- Create index for faster queries
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
