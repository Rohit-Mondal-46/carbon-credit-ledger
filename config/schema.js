const pool = require('../config/db');

const initSchema = async()=>{
    const schema = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,  
    project_name TEXT NOT NULL,
    registry TEXT NOT NULL,
    vintage INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    serial_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    record_id TEXT NOT NULL REFERENCES records(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'retired')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    amount INTEGER CHECK (amount > 0)
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_events_record_id ON events(record_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
    `;

    try {
        await pool.query(schema);
        console.log("successfully created schema if not exists");
    } catch (error) {
        console.log("Error creating schema",error.message);
        process.exit(1);
        
    }
}

module.exports = initSchema;