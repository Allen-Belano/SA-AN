const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'secretkey';

const createToken = (user) => jwt.sign(
    { user_id: user.user_id, name: user.name },
    jwtSecret,
    { expiresIn: '1h' }
);

const mapUserProfile = (user) => ({
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    reputation_points: user.reputation_points,
    bio: user.bio || '',
    home_location: user.home_location || '',
    preferred_transport: user.preferred_transport || '',
    budget_level: user.budget_level || '',
    travel_window: user.travel_window || '',
    emergency_contact: user.emergency_contact || '',
    avatar_color: user.avatar_color || '#f0932b'
});

const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        req.user = jwt.verify(token, jwtSecret);
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

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
            'INSERT INTO Users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [name, email, passwordHash]
        );

        const user = mapUserProfile(newUser.rows[0]);
        const token = createToken(newUser.rows[0]);

        res.status(201).json({ token, user });
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
        const token = createToken(user.rows[0]);

        res.json({ token, user: mapUserProfile(user.rows[0]) });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/me', authenticateUser, async (req, res) => {
    try {
        const user = await req.pool.query('SELECT * FROM Users WHERE user_id = $1', [req.user.user_id]);

        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: mapUserProfile(user.rows[0]) });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/me', authenticateUser, async (req, res) => {
    try {
        const {
            name,
            bio,
            home_location,
            preferred_transport,
            budget_level,
            travel_window,
            emergency_contact,
            avatar_color
        } = req.body;

        const updatedUser = await req.pool.query(
            `UPDATE Users
             SET name = $1,
                 bio = $2,
                 home_location = $3,
                 preferred_transport = $4,
                 budget_level = $5,
                 travel_window = $6,
                 emergency_contact = $7,
                 avatar_color = $8
             WHERE user_id = $9
             RETURNING *`,
            [
                name,
                bio || '',
                home_location || '',
                preferred_transport || '',
                budget_level || '',
                travel_window || '',
                emergency_contact || '',
                avatar_color || '#f0932b',
                req.user.user_id
            ]
        );

        res.json({ user: mapUserProfile(updatedUser.rows[0]) });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
