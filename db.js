const { Pool } = require('pg');
const dotenv = require('dotenv')
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const query = async (text, params) => {
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('Database query error:', {
            query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            error: error.message,
            code: error.code
        });
        throw error;
    }
};

const getClient = async () => {
    try {
        const client = await pool.connect();
        
        // Enhanced client with query logging
        const originalQuery = client.query;
        client.query = async (text, params) => {
            const start = Date.now();
            try {
                const result = await originalQuery.call(client, text, params);
                const duration = Date.now() - start;
                
                if (process.env.NODE_ENV !== 'production') {
                    console.log('Transaction query:', {
                        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                        duration: `${duration}ms`,
                        rows: result.rowCount
                    });
                }
                
                return result;
            } catch (error) {
                console.error('Transaction query error:', {
                    query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    error: error.message,
                    code: error.code
                });
                throw error;
            }
        };
        
        return client;
    } catch (error) {
        console.error('Failed to get database client:', error.message);
        throw error;
    }
};

const testConnection = async () => {
    try {
        const result = await query('SELECT NOW() as current_time, version() as postgres_version');
        console.log('Database connection successful:', {
            timestamp: result.rows[0].current_time,
            version: result.rows[0].postgres_version.split(' ')[1] // Extract version number
        });
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        return false;
    }
};

const shutdown = async () => {
    try {
        await pool.end();
        console.log('Database connection pool closed');
    } catch (error) {
        console.error('Error closing database pool:', error.message);
    }
};

module.exports = {
    query,
    getClient,
    testConnection,
    shutdown,
};