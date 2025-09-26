const dotenv = require('dotenv')
const express = require('express');
const recordsRouter = require('./routes/recordsRoutes.js');
const pool = require('./config/db');
const initSchema = require("./config/schema.js")
dotenv.config();

// Initializing app
const app = express();
const PORT = process.env.PORT || 3000;

//middlwares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
    res.json({
        message: 'server is up',
    });
});

// routes
app.use('/records', recordsRouter);

const startServer = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to the database');
        client.release();
        await initSchema();
        app.listen(PORT, () => {
            console.log(`server running on port ${PORT}`);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server
startServer();
