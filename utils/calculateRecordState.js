const calculateRecordState = async (recordId, client) => {
    // Get the record's total quantity
    const recordResult = await client.query(
        'SELECT quantity FROM records WHERE id = $1',
        [recordId]
    );
    
    if (recordResult.rows.length === 0) {
        throw new Error('Record not found');
    }
    
    const total = recordResult.rows[0].quantity;
    
    // Calculate total retired amount from all retirement events
    const retiredResult = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as total_retired FROM events WHERE record_id = $1 AND event_type = $2',
        [recordId, 'retired']
    );
    
    const retired = parseInt(retiredResult.rows[0].total_retired) || 0;
    const active = total - retired;
    
    return { total, retired, active };
};

module.exports = {
    calculateRecordState
};