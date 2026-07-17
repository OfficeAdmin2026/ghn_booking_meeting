-- =============================================================
-- ADD_ROOM_SHAPES.sql
-- Thêm bảng lưu khung phòng vẽ tay (đa giác) trên Bản đồ văn phòng
-- Chạy file này 1 lần trong Supabase SQL Editor (idempotent, an
-- toàn chạy lại nhiều lần)
-- =============================================================

CREATE TABLE IF NOT EXISTS room_shapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  points JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_shapes_room_id ON room_shapes(room_id);
