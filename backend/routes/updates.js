const express = require('express');
const router = express.Router();

const mapUpdate = (row) => ({
    update_id: row.update_id,
    user_id: row.user_id,
    route_id: row.route_id,
    title: row.title || 'Community Update',
    category: row.category || 'General',
    location: row.location || '',
    message: row.message,
    photo_url: row.photo_url || '',
    timestamp: row.timestamp,
    author_name: row.author_name,
    avatar_color: row.avatar_color || '#f0932b',
    reputation_points: row.reputation_points || 0,
});

router.get('/', async (req, res) => {
    try {
        const pool = req.pool;
        const parsedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(parsedLimit)
            ? Math.min(Math.max(parsedLimit, 1), 100)
            : 40;

        const updates = await pool.query(
            `SELECT
                u.update_id,
                u.user_id,
                u.route_id,
                u.title,
                u.category,
                u.location,
                u.message,
                u.photo_url,
                u.timestamp,
                us.name AS author_name,
                us.avatar_color,
                us.reputation_points
                FROM Updates u
                JOIN Users us ON u.user_id = us.user_id
                ORDER BY u.timestamp DESC
                LIMIT $1`,
            [limit]
        );

        res.json({ updates: updates.rows.map(mapUpdate) });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            user_id,
            route_id,
            title,
            category,
            location,
            message,
            photo_url,
        } = req.body;

        if (!user_id || !message || !message.trim()) {
            return res.status(400).json({ error: 'user_id and message are required' });
        }

        const pool = req.pool;
        const createdUpdate = await pool.query(
            `INSERT INTO Updates (
                user_id,
                route_id,
                title,
                category,
                location,
                message,
                photo_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                user_id,
                route_id || null,
                (title && title.trim()) || null,
                (category && category.trim()) || 'General',
                (location && location.trim()) || null,
                message.trim(),
                (photo_url && photo_url.trim()) || null,
            ]
        );

        const hydratedUpdate = await pool.query(
            `SELECT
                u.update_id,
                u.user_id,
                u.route_id,
                u.title,
                u.category,
                u.location,
                u.message,
                u.photo_url,
                u.timestamp,
                us.name AS author_name,
                us.avatar_color,
                us.reputation_points
                FROM Updates u
                JOIN Users us ON u.user_id = us.user_id
                WHERE u.update_id = $1`,
            [createdUpdate.rows[0].update_id]
        );

        res.status(201).json({ update: mapUpdate(hydratedUpdate.rows[0]) });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
