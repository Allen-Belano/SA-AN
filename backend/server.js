const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up postgres pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'saan_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err));

// Share pool with routes by attaching it to req
app.use((req, res, next) => {
    req.pool = pool;
    next();
});

// Import route modules
const userRoutes = require('./routes/users');
const routeRoutes = require('./routes/routes');

app.use('/api/users', userRoutes);
app.use('/api/routes', routeRoutes);

app.get('/', (req, res) => {
  res.send('SA/AN API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
