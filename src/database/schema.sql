-- bookings table creation schema
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(128) NOT NULL,
  call_sid VARCHAR(128),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  requested_service VARCHAR(255) NOT NULL,
  appointment_time TIMESTAMPTZ NOT NULL,
  calendar_event_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, rescheduled, cancelled
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for checking availability or searching by time range
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_time ON bookings (appointment_time);

-- Index for searching by conversation session context
CREATE INDEX IF NOT EXISTS idx_bookings_conversation_id ON bookings (conversation_id);

-- call_logs table creation schema
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid VARCHAR(128) NOT NULL UNIQUE,
  caller_phone VARCHAR(50) NOT NULL,
  transcript TEXT NOT NULL,
  summary TEXT,
  duration_seconds INT DEFAULT 0,
  booking_outcome VARCHAR(50) DEFAULT 'Inquiry', -- Booked, Inquiry, Cancelled, Failed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for searching call logs by call_sid
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON call_logs (call_sid);

