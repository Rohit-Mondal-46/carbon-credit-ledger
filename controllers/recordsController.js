const Record = require('../models/Record');
const Event = require('../models/Event');
const validateRecord = require('../utils/validateRecord');

const createRecord = async (req, res) => {
    try {
        const recordData = req.body;
        const validation = validateRecord(recordData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Invalid record data',
                details: validation.errors
            });
        }

        // create record
        const result = await Record.create(recordData);
        res.status(result.isNewRecord ? 201 : 200).json({
            message: result.isNewRecord ? 'Record created successfully' : 'Record already exists',
            record: result.record
        });
        
    } catch (error) {
        console.error('Error creating record:', error);
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
        
        // Validating ID format
        if (!/^[a-f0-9]{64}$/.test(id)) {
            return res.status(400).json({
                error: 'Invalid record ID format',
                details: 'ID must be a 64-character hexadecimal string'
            });
        }
        
        // Validating amount
        if (amount === undefined || !Number.isInteger(amount) || amount <= 0) {
            return res.status(400).json({
                error: 'Invalid amount',
                details: 'Amount is required and must be a positive integer'
            });
        }
        
        // retire x amount of credits
        const result = await Event.retireCredits(id, amount);
        
        res.status(201).json({
            message: `Successfully retired ${amount} credits`,
            retirement_event: result.retirementEvent
        });
        
    } catch (error) {
        console.error('Error retiring record:', error);
        
        if (error.message.includes('Cannot retire')) {
            return res.status(400).json({
                error: 'Insufficient active credits',
                details: error.message
            });
        }
        
        res.status(500).json({
            error: 'Internal server error',
            details: 'Failed to retire record'
        });
    }
};


const getRecord = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validating id format
        if (!/^[a-f0-9]{64}$/.test(id)) {
            return res.status(400).json({
                error: 'Invalid record ID format'
            });
        }
        
        // Find record by id
        const record = await Record.findById(id);
        
        if (!record) {
            return res.status(404).json({
                error: 'Record not found',
                details: `No record found with ID: ${id}`
            });
        }
        
        // Get all events 
        const events = await Event.findByRecordId(id);
        
        // Get current state 
        const recordState = await Event.calculateRecordState(id);
        
        res.json({
            record,
            state: {
                total: recordState.total,
                retired: recordState.retired,
                active: recordState.active
            },
            events,
            event_count: events.length
        });
        
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
