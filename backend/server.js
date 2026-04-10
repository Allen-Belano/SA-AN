const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up postgres pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'saan_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const ensureProfileColumns = async () => {
  await pool.query(`
    ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS home_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS preferred_transport VARCHAR(100),
    ADD COLUMN IF NOT EXISTS budget_level VARCHAR(50),
    ADD COLUMN IF NOT EXISTS travel_window VARCHAR(100),
    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255),
    ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(50) DEFAULT '#f0932b',
    ADD COLUMN IF NOT EXISTS avatar_memoji JSONB
  `);
};

const ensureRouteStepMediaColumns = async () => {
  await pool.query(`
    ALTER TABLE RouteSteps
    ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS video_url VARCHAR(255)
  `);
};

const ensureUpdatesColumns = async () => {
  await pool.query(`
    ALTER TABLE Updates
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS category VARCHAR(80),
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE
  `);
};

const ensureRouteColumns = async () => {
  await pool.query(`
    ALTER TABLE Routes
    ADD COLUMN IF NOT EXISTS estimated_duration_minutes INT,
    ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 0
  `);
};

const ensureUserPreferenceColumns = async () => {
  await pool.query(`
    ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS notify_disruptions BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notify_safety BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notify_saved_routes BOOLEAN DEFAULT TRUE
  `);
};

const ensureVoteConstraints = async () => {
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_user_route ON Votes(user_id, route_id)');
};

const ensureAuxiliaryTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS RouteBookmarks (
      bookmark_id SERIAL PRIMARY KEY,
      user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
      route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, route_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS RouteReports (
      report_id SERIAL PRIMARY KEY,
      route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
      user_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
      reason VARCHAR(120) NOT NULL,
      details TEXT,
      status VARCHAR(20) DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS UpdateReactions (
      reaction_id SERIAL PRIMARY KEY,
      update_id INT REFERENCES Updates(update_id) ON DELETE CASCADE,
      user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
      reaction_type VARCHAR(30) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(update_id, user_id, reaction_type)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS UpdateComments (
      comment_id SERIAL PRIMARY KEY,
      update_id INT REFERENCES Updates(update_id) ON DELETE CASCADE,
      user_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS UserNotifications (
      notification_id SERIAL PRIMARY KEY,
      user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      kind VARCHAR(40) DEFAULT 'general',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

pool.connect()
  .then(async () => {
    console.log('Connected to PostgreSQL database');
    await ensureProfileColumns();
    await ensureRouteStepMediaColumns();
    await ensureUpdatesColumns();
    await ensureRouteColumns();
    await ensureUserPreferenceColumns();
    await ensureAuxiliaryTables();
    await ensureVoteConstraints();
  })
  .catch(err => console.error('Database connection error:', err));

// Share pool with routes by attaching it to req
app.use((req, res, next) => {
    req.pool = pool;
    next();
});

// Import route modules
const userRoutes = require('./routes/users');
const routeRoutes = require('./routes/routes');
const updatesRoutes = require('./routes/updates');
const notificationsRoutes = require('./routes/notifications');
const chatbotRoutes = require('./routes/chatbot');

app.use('/api/users', userRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.get('/', (req, res) => {
  res.send('SA/AN API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
