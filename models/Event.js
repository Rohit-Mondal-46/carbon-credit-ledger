
const pool = require('../config/db');

class Event {   
    static async findByRecordId(recordId) {
        try {
            const result = await pool.query(
                `SELECT * FROM events WHERE record_id = $1 ORDER BY timestamp ASC`,
                [recordId]
            );
            
            return result.rows;
        } catch (error) {
            console.error('Error finding events by record ID:', error);
            throw error;
        }
    }

    static async calculateRecordState(recordId) {
        
        try {
            // Get the record's total quantity
            const recordResult = await pool.query(
                'SELECT quantity FROM records WHERE id = $1',
                [recordId]
            );
            
            if (recordResult.rows.length === 0) {
                throw new Error('Record not found');
            }
            
            const total = recordResult.rows[0].quantity;
            
            // Calculate total retired amount from all retirement events
            const retiredResult = await pool.query(
                'SELECT COALESCE(SUM(amount), 0) as total_retired FROM events WHERE record_id = $1 AND event_type = $2',
                [recordId, 'retired']
            );
            
            const retired = parseInt(retiredResult.rows[0].total_retired) || 0;
            const active = total - retired;
            
            return { total, retired, active };
        } catch (error) {
            console.error('Error calculating record state:', error);
            throw error;
        }
    }

    static async validateRetirement(recordId, retirementAmount) {
        try {
            const currentState = await this.calculateRecordState(recordId);
            
            const isValid = retirementAmount > 0 && retirementAmount <= currentState.active;
            
            return {
                isValid,
            };
        } catch (error) {
            console.error('Error validating retirement:', error);
            throw error;
        }
    }

    static async retireCredits(recordId, amount) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Validate retirement
            const validation = await this.validateRetirement(recordId, amount);
            if (!validation.isValid) {
                throw new Error(`Cannot retire ${amount} credits`);
            }
            
            // Create retirement event
            const retirementEvent = await client.query(
                'INSERT INTO events (record_id, event_type, amount) VALUES ($1, $2, $3) RETURNING *',
                [recordId, 'retired', amount]
            );
            
            await client.query('COMMIT');
            
            return {
                retirementEvent: retirementEvent.rows[0],
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = Event;