-- =============================================================
-- ADD_CAR_BOOKING.sql
-- Thêm tính năng đặt xe công ty (Company Car booking)
-- Chạy file này 1 lần trong Supabase SQL Editor (idempotent, an
-- toàn chạy lại nhiều lần)
-- =============================================================

CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  license_plate VARCHAR(50),
  seats INTEGER CHECK (seats > 0),
  driver_note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cars_is_active ON cars(is_active);

CREATE TABLE IF NOT EXISTS car_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id),
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  notes TEXT,
  cancellation_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_car_bookings_car_id ON car_bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_car_bookings_status ON car_bookings(status);
CREATE INDEX IF NOT EXISTS idx_car_bookings_car_time ON car_bookings(car_id, start_time, end_time);
