const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const pool = req.pool;

        // Check if user exists
        const userExists = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        const newUser = await pool.query(
            'INSERT INTO Users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, email, reputation_points',
            [name, email, passwordHash]
        );

        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = req.pool;

        // Find user
        const user = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Validate password
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { user_id: user.rows[0].user_id, name: user.rows[0].name }, 
            process.env.JWT_SECRET || 'secretkey', 
            { expiresIn: '1h' }
        );

        res.json({ token, user: { user_id: user.rows[0].user_id, name: user.rows[0].name, email: user.rows[0].email, reputation_points: user.rows[0].reputation_points } });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
