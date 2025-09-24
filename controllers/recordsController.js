const db = require('../db');
const {generateDeterministicId} = require('../utils/generateId');
const {validateRecord}= require('../utils/validateRecord');
const {calculateRecordState} = require('../utils/calculateRecordState');


const createRecord = async (req, res) => {
    try {
        const recordData = req.body;
        
        // Validate input
        const validation = validateRecord(recordData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Invalid input data',
                details: validation.errors
            });
        }
        
        // Generate deterministic ID
        const id = generateDeterministicId(recordData);
        
        // to ensure atomicity
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Check if record already exists
            const existingRecord = await client.query(
                'SELECT * FROM records WHERE id = $1',
                [id]
            );
            
            let record;
            let isNewRecord = false;
            
            if (existingRecord.rows.length > 0) {
                // Record exists, return existing record
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
                record = insertResult.rows[0];
                isNewRecord = true;
                console.log('Created new record:', id);
            }
            
            // Check if 'created' event already exists
            const existingEvent = await client.query(
                'SELECT * FROM events WHERE record_id = $1 AND event_type = $2',
                [id, 'created']
            );
            
            let createdEvent;
            if (existingEvent.rows.length === 0) {
                // Create 'created' event with amount equal to record quantity
                const eventResult = await client.query(
                    'INSERT INTO events (record_id, event_type, amount) VALUES ($1, $2, $3) RETURNING *',
                    [id, 'created', record.quantity]
                );
                createdEvent = eventResult.rows[0];
                console.log('Created event for record:', id);
            } else {
                createdEvent = existingEvent.rows[0];
                console.log('Created event already exists for record:', id);
            }
            
            // Get all events for this record
            const allEvents = await client.query(
                'SELECT * FROM events WHERE record_id = $1 ORDER BY timestamp ASC',
                [id]
            );
            
            await client.query('COMMIT');
            
            // Return response with appropriate status code
            const statusCode = isNewRecord ? 201 : 200;
            res.status(statusCode).json({
                record,
                events: allEvents.rows,
                message: isNewRecord ? 'Record created successfully' : 'Record already exists'
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error creating record:', error);
        
        // Handle specific database errors
        if (error.code === '23505') { // Unique violation
            if (error.constraint === 'records_serial_number_key') {
                return res.status(400).json({
                    error: 'Serial number already exists',
                    details: 'A record with this serial number already exists'
                });
            }
        }
        
        res.status(500).json({
            error: 'Internal server error',
            details: 'Failed to create record'
        });
    }
};

const retireRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body || {};
        
        // Validate ID format
        if (!/^[a-f0-9]{64}$/.test(id)) {
            return res.status(400).json({
                error: 'Invalid record ID format',
                details: 'ID must be a 64-character hexadecimal string'
            });
        }
        
        // Validate amount
            if (amount === undefined || !Number.isInteger(amount) || amount <= 0) {
                return res.status(400).json({
                    error: 'Invalid amount',
                    details: 'Amount is required and must be a positive integer'
                });
            }

        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Check if record exists and get current state
            const recordResult = await client.query(
                'SELECT * FROM records WHERE id = $1',
                [id]
            );
            
            if (recordResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    error: 'Record not found',
                    details: `No record found with ID: ${id}`
                });
            }
            
            const record = recordResult.rows[0];
            
            // Calculate current state
            const currentState = await calculateRecordState(id, client);
            
            if (amount > currentState.active) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Insufficient active credits',
                    details: `Cannot retire ${amount} credits. Only ${currentState.active} credits are active.`
                });
            }
            
            // Create retirement event
            const retirementResult = await client.query(
                'INSERT INTO events (record_id, event_type, amount) VALUES ($1, $2, $3) RETURNING *',
                [id, 'retired', amount]
            );
            
            const retirementEvent = retirementResult.rows[0];
            
            // Calculate new state after retirement
            const newState = {
                total: currentState.total,
                retired: currentState.retired + amount,
                active: currentState.active - amount
            };
            
            // Get all events for this record
            const allEvents = await client.query(
                'SELECT * FROM events WHERE record_id = $1 ORDER BY timestamp ASC',
                [id]
            );
            
            await client.query('COMMIT');
            
            console.log('Record retired:', {
                id,
                amount: amount,
                newState
            });
            
            res.status(201).json({
                message: `Successfully retired ${amount} credits`,
                record: {
                    ...record,
                },
                retirement_event: retirementEvent,
                state: newState,
                events: allEvents.rows
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error retiring record:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: 'Failed to retire record'
        });
    }
};


const getRecord = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate id format
        if (!/^[a-f0-9]{64}$/.test(id)) {
            return res.status(400).json({
                error: 'Invalid record ID format'
            });
        }
        
        
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            const recordResult = await client.query(
                'SELECT * FROM records WHERE id = $1',
                [id]
            );
            
            if (recordResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    error: 'Record not found',
                    details: `No record found with ID: ${id}`
                });
            }
            
            const record = recordResult.rows[0];
            
            // Get all events
            const eventsResult = await client.query(
                'SELECT * FROM events WHERE record_id = $1 ORDER BY timestamp ASC',
                [id]
            );
            
            // Calculate current state from events
            const state = await calculateRecordState(id, client);
            
            await client.query('COMMIT');
            
            // Determine detailed status
            let status;
            if (state.retired === 0) {
                status = 'active';
            } else if (state.active === 0) {
                status = 'retired';
            }
            
            res.json({
                record: {
                    ...record,
                    status
                },
                state,
                events: eventsResult.rows,
                event_count: eventsResult.rows.length
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error getting record:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: 'Failed to retrieve record'
        });
    }
};

module.exports = {
    createRecord,
    retireRecord,
    getRecord
};
