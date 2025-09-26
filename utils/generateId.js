const crypto = require('crypto');


const generateDeterministicId = (record) => {
    const { project_name, registry, vintage, quantity, serial_number } = record;
    
    // Canonicalization: trim whitespace, convert to lowercase, ensure consistent format
    const canonical = [
        project_name.trim().toLowerCase(),
        registry.trim().toLowerCase(),
        vintage.toString(),
        quantity.toString(),
        serial_number.trim().toLowerCase()
    ].join('|');
    
    // Generate SHA-256 hash as hex string
    const hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
    return hash;
};

module.exports = {generateDeterministicId};