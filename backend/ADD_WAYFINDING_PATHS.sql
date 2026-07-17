-- =============================================================
-- ADD_WAYFINDING_PATHS.sql
-- Thêm bảng lưu đường chỉ dẫn (vẽ tay) trên Bản đồ văn phòng
-- Chạy file này 1 lần trong Supabase SQL Editor (idempotent, an
-- toàn chạy lại nhiều lần)
-- =============================================================

CREATE TABLE IF NOT EXISTS wayfinding_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  points JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wayfinding_paths_room_id ON wayfinding_paths(room_id);
