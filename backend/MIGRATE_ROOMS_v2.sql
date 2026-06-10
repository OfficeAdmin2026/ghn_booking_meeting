-- =============================================================
-- MIGRATE_ROOMS_v2.sql
-- Đồng bộ danh sách phòng họp theo chuẩn mới (18 phòng)
-- Chạy file này trong Supabase SQL Editor
-- =============================================================

-- ── 1. Cập nhật sức chứa & thông tin các phòng đã có ─────────

UPDATE rooms SET capacity = 14  WHERE id = 'a1111111-1111-1111-1111-111111111111'; -- Thành Thái
UPDATE rooms SET capacity = 40  WHERE id = 'a2222222-2222-2222-2222-222222222222'; -- Hưng Yên
UPDATE rooms SET capacity = 40  WHERE id = 'c2222222-2222-2222-2222-222222222222'; -- Sảnh Lễ Tân
UPDATE rooms SET capacity = 6   WHERE id = 'c5555555-5555-5555-5555-555555555555'; -- Lữ Gia
UPDATE rooms SET capacity = 6   WHERE id = 'c6666666-6666-6666-6666-666666666666'; -- Đồng Nai
UPDATE rooms SET capacity = 6   WHERE id = 'c7777777-7777-7777-7777-777777777777'; -- Nguyễn Huy Tưởng
UPDATE rooms SET capacity = 6   WHERE id = 'c8888888-8888-8888-8888-888888888888'; -- Hoàng Văn Thụ
UPDATE rooms SET capacity = 56, is_vip = true WHERE id = 'ca1a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1'; -- Learning Center → VIP
UPDATE rooms SET capacity = 6   WHERE id = 'd1111111-1111-1111-1111-111111111111'; -- Nguyễn Ngọc Vũ
UPDATE rooms SET capacity = 20  WHERE id = 'd2222222-2222-2222-2222-222222222222'; -- Đài Tư

-- ── 2. Ẩn các phòng không còn trong danh sách (is_active = false) ──

UPDATE rooms SET is_active = false WHERE id = 'b4444444-4444-4444-4444-444444444444'; -- Hiệu Suất Cao
UPDATE rooms SET is_active = false WHERE id = 'c9999999-9999-9999-9999-999999999999'; -- Thiên Phước
UPDATE rooms SET is_active = false WHERE id = 'ca2a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2'; -- War Room

-- ── 3. Thêm phòng mới (Our Roads, Your Loads) ────────────────

INSERT INTO rooms (id, name, location, floor, capacity, code, is_vip, is_active)
VALUES
  ('a3333333-3333-3333-3333-333333333333', 'Our Roads',   'Rivera Park', '1F', 6, 'RPARK-1F-003', false, true),
  ('a4444444-4444-4444-4444-444444444444', 'Your Loads',  'Rivera Park', '1F', 6, 'RPARK-1F-004', false, true)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Xác nhận kết quả ──────────────────────────────────────

SELECT name, location, floor, capacity, is_vip, is_active
FROM rooms
ORDER BY location DESC, floor, name;
