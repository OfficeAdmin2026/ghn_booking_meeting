-- GHN Meeting Room Booking Database Schema
-- PostgreSQL 14+

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'vip');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
CREATE TYPE recurring_type AS ENUM ('none', 'weekly', 'monthly');
CREATE TYPE amenity_type AS ENUM ('TV', 'Audio Conference', 'Video Conference', 'Projector');
CREATE TYPE notification_type AS ENUM ('booking_confirmed', 'reminder', 'cancelled', 'meeting_completed');

-- Users Table
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

-- Rooms Table
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

-- Room Amenities Table
CREATE TABLE room_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  amenity amenity_type NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_room_amenities_room_id ON room_amenities(room_id);
CREATE UNIQUE INDEX idx_room_amenities_unique ON room_amenities(room_id, amenity);

-- Bookings Table
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

-- Notifications Table
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

-- View: Available Rooms at specific time
CREATE VIEW available_rooms_at_time AS
SELECT DISTINCT
  r.id,
  r.name,
  r.location,
  r.floor,
  r.capacity,
  r.is_vip,
  r.code
FROM rooms r
WHERE r.is_active = true
AND r.id NOT IN (
  SELECT DISTINCT room_id FROM bookings
  WHERE status IN ('pending', 'confirmed', 'active')
);

-- Audit trigger function (optional, for future use)
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

-- Wayfinding Paths (đường chỉ dẫn vẽ tay trên Bản đồ văn phòng)
CREATE TABLE wayfinding_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  points JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_wayfinding_paths_room_id ON wayfinding_paths(room_id);

-- Room Shapes (khung phòng vẽ tay trên Bản đồ văn phòng)
CREATE TABLE room_shapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  points JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_room_shapes_room_id ON room_shapes(room_id);

-- Floor Backgrounds (ảnh sơ đồ tầng do admin upload, lưu trên Supabase Storage)
CREATE TABLE floor_backgrounds (
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
