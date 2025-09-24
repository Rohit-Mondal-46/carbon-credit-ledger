CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Records table: immutable carbon credit records
CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,  -- deterministic SHA-256 hash of input fields
    project_name TEXT NOT NULL,
    registry TEXT NOT NULL,
    vintage INTEGER NOT NULL CHECK (vintage >= 1990 AND vintage <= 2050),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    serial_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Events table: append-only audit log for all record state changes
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    record_id TEXT NOT NULL REFERENCES records(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'retired')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    amount INTEGER CHECK (amount > 0),  -- amount for partial retirements
    metadata JSONB DEFAULT '{}'::jsonb  -- for future extensibility
);

-- Critical indexes for performance and concurrency
CREATE INDEX IF NOT EXISTS idx_events_record_id ON events(record_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_records_serial_number ON records(serial_number);
CREATE INDEX IF NOT EXISTS idx_records_project_registry ON records(project_name, registry);

-- Note: Removed unique index for single retirement to allow partial retirements
-- Multiple retirement events are now allowed with amount tracking

-- Additional constraints for data integrity
ALTER TABLE records 
ADD CONSTRAINT IF NOT EXISTS chk_records_id_format 
CHECK (length(id) = 64 AND id ~ '^[a-f0-9]+$');