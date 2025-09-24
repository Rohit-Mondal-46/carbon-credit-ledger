const validateRecord = (record) => {
    const errors = [];
    const { project_name, registry, vintage, quantity, serial_number } = record;
    
    if (!project_name || typeof project_name !== 'string' || project_name.trim().length === 0) {
        errors.push('project_name is required and must be a non-empty string');
    }
    
    if (!registry || typeof registry !== 'string' || registry.trim().length === 0) {
        errors.push('registry is required and must be a non-empty string');
    }
    
    if (!vintage || !Number.isInteger(vintage) || vintage < 1990 || vintage > 2050) {
        errors.push('vintage is required and must be an integer between 1990 and 2050');
    }
    
    if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
        errors.push('quantity is required and must be a positive integer');
    }
    
    if (!serial_number || typeof serial_number !== 'string' || serial_number.trim().length === 0) {
        errors.push('serial_number is required and must be a non-empty string');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {validateRecord};