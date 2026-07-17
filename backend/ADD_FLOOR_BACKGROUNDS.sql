-- =============================================================
-- ADD_FLOOR_BACKGROUNDS.sql
-- Thêm bảng lưu ảnh sơ đồ tầng do admin upload (Supabase Storage)
-- Chạy file này 1 lần trong Supabase SQL Editor (idempotent, an
-- toàn chạy lại nhiều lần)
-- =============================================================

CREATE TABLE IF NOT EXISTS floor_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(255) NOT NULL,
  floor VARCHAR(10) NOT NULL,
  image_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(location, floor)
);
