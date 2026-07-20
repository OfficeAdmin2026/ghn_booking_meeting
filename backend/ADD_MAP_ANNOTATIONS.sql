-- =============================================================
-- ADD_MAP_ANNOTATIONS.sql
-- Thêm bảng lưu khu vực chung vẽ tay (thang máy, WC, pantry...)
-- trên Bản đồ văn phòng. Chạy file này 1 lần trong Supabase SQL
-- Editor (idempotent, an toàn chạy lại nhiều lần)
-- =============================================================

CREATE TABLE IF NOT EXISTS map_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(255) NOT NULL,
  floor VARCHAR(10) NOT NULL,
  type VARCHAR(30) NOT NULL,
  shape VARCHAR(10) NOT NULL,
  points JSONB NOT NULL,
  color VARCHAR(7),
  label VARCHAR(255),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_map_annotations_floor ON map_annotations(location, floor);
