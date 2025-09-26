const generateDeterministicId = require('../utils/generateId');
const pool = require('../config/db');
const Event = require('./Event');

class Record {

    static async create(recordData) {
        // Generate deterministic ID
        const id = generateDeterministicId(recordData);

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Check if already exists
            const existingRecord = await client.query(
                'SELECT * FROM records WHERE id = $1',
                [id]
            );
            
            let record;
            let isNewRecord = false;
            
            if (existingRecord.rows.length > 0) {
                // Record exists
                record = existingRecord.rows[0];
                console.log('Record already exists:', id);
            } else {
                // Create new record
                const insertResult = await client.query(
                    `INSERT INTO records (id, project_name, registry, vintage, quantity, serial_number) 
                     VALUES ($1, $2, $3, $4, $5, $6) 
                     RETURNING *`,
                    [id, recordData.project_name, recordData.registry, recordData.vintage, recordData.quantity, recordData.serial_number]
                );
                await client.query(
                'INSERT INTO events (record_id, event_type, amount) VALUES ($1, $2, $3) RETURNING *',
                [id, 'created', recordData.quantity]
            );
                record = insertResult.rows[0];
                isNewRecord = true;
            }
            
            await client.query('COMMIT');
            
            return {
                record,
                isNewRecord,
                id
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        try {
            const result = await pool.query(
                'SELECT * FROM records WHERE id = $1',
                [id]
            );
            
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error finding record by ID:', error);
            throw error;
        }
    }

    
}

module.exports = Record;