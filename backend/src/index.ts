import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import prisma from './config/db.config.js';

const app = express();
app.use(cors());
app.use(express.json());

// Define routes first
app.get('/', (req, res) => {
    res.send('Hello World');
});

// Then start the server (only once!)
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
