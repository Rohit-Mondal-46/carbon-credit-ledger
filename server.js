const dotenv = require('dotenv')
const express = require('express');
const db = require('./db');
const recordsRouter = require('./routes/records');
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
        console.log('Testing db connection...');
        //db connection
        const dbConnected = await db.testConnection();
        
        if (!dbConnected) {
            throw new Error('Cannot connect to database');
        }
        
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
