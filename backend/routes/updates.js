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
    severity: row.severity || 'medium',
    is_urgent: Boolean(row.is_urgent),
    timestamp: row.timestamp,
    author_name: row.author_name,
    avatar_memoji: row.avatar_memoji || null,
    reputation_points: row.reputation_points || 0,
    reaction_count: Number(row.reaction_count || 0),
    comment_count: Number(row.comment_count || 0),
});

router.get('/', async (req, res) => {
    try {
        const pool = req.pool;
        const parsedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(parsedLimit)
            ? Math.min(Math.max(parsedLimit, 1), 100)
            : 40;

        const { category, location, urgent, q } = req.query;

        let query = `SELECT
                u.update_id,
                u.user_id,
                u.route_id,
                u.title,
                u.category,
                u.location,
                u.message,
                u.photo_url,
                u.severity,
                u.is_urgent,
                u.timestamp,
                us.name AS author_name,
                us.avatar_memoji,
                us.reputation_points,
                COALESCE(reaction_stats.reaction_count, 0) AS reaction_count,
                COALESCE(comment_stats.comment_count, 0) AS comment_count
                FROM Updates u
                JOIN Users us ON u.user_id = us.user_id
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::INT AS reaction_count
                    FROM UpdateReactions ur
                    WHERE ur.update_id = u.update_id
                ) reaction_stats ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::INT AS comment_count
                    FROM UpdateComments uc
                    WHERE uc.update_id = u.update_id
                ) comment_stats ON TRUE
                WHERE 1=1`;

        const params = [];
        let index = 1;

        const addParam = (value) => {
            params.push(value);
            const slot = `$${index}`;
            index += 1;
            return slot;
        };

        if (category) {
            const categoryParam = addParam(category);
            query += ` AND u.category = ${categoryParam}`;
        }

        if (location) {
            const locationParam = addParam(`%${location}%`);
            query += ` AND COALESCE(u.location, '') ILIKE ${locationParam}`;
        }

        if (q) {
            const searchParam = addParam(`%${q}%`);
            query += ` AND (COALESCE(u.title, '') ILIKE ${searchParam} OR COALESCE(u.message, '') ILIKE ${searchParam})`;
        }

        if (urgent === 'true') {
            query += ' AND u.is_urgent = TRUE';
        }

        query += ` ORDER BY u.is_urgent DESC, u.timestamp DESC LIMIT ${addParam(limit)}`;

        const updates = await pool.query(query, params);

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
            severity,
            is_urgent,
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
                photo_url,
                severity,
                is_urgent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                user_id,
                route_id || null,
                (title && title.trim()) || null,
                (category && category.trim()) || 'General',
                (location && location.trim()) || null,
                message.trim(),
                (photo_url && photo_url.trim()) || null,
                (severity && severity.trim()) || 'medium',
                is_urgent === true,
            ]
        );

        await pool.query(
            `INSERT INTO UserNotifications (user_id, title, message, kind)
             SELECT user_id, $1, $2, 'community_alert'
             FROM Users
             WHERE user_id <> $3
               AND notify_disruptions = TRUE`,
            [
                (title && title.trim()) || 'New community alert',
                message.trim().slice(0, 220),
                user_id,
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
                u.severity,
                u.is_urgent,
                u.timestamp,
                us.name AS author_name,
                us.avatar_memoji,
                us.reputation_points,
                COALESCE(reaction_stats.reaction_count, 0) AS reaction_count,
                COALESCE(comment_stats.comment_count, 0) AS comment_count
                FROM Updates u
                JOIN Users us ON u.user_id = us.user_id
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::INT AS reaction_count
                    FROM UpdateReactions ur
                    WHERE ur.update_id = u.update_id
                ) reaction_stats ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::INT AS comment_count
                    FROM UpdateComments uc
                    WHERE uc.update_id = u.update_id
                ) comment_stats ON TRUE
                WHERE u.update_id = $1`,
            [createdUpdate.rows[0].update_id]
        );

        res.status(201).json({ update: mapUpdate(hydratedUpdate.rows[0]) });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/reactions', async (req, res) => {
    try {
        const updateId = Number.parseInt(req.params.id, 10);
        const userId = Number.parseInt(req.body.user_id, 10);
        const reactionType = (req.body.reaction_type || 'helpful').trim().slice(0, 30);

        if (!Number.isInteger(updateId) || !Number.isInteger(userId)) {
            return res.status(400).json({ error: 'Valid update id and user id are required' });
        }

        await req.pool.query(
            `INSERT INTO UpdateReactions (update_id, user_id, reaction_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (update_id, user_id, reaction_type)
             DO NOTHING`,
            [updateId, userId, reactionType]
        );

        const stats = await req.pool.query(
            `SELECT COUNT(*)::INT AS reaction_count
             FROM UpdateReactions
             WHERE update_id = $1`,
            [updateId]
        );

        return res.json({ update_id: updateId, reaction_count: stats.rows[0]?.reaction_count || 0 });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:id/comments', async (req, res) => {
    try {
        const updateId = Number.parseInt(req.params.id, 10);

        if (!Number.isInteger(updateId)) {
            return res.status(400).json({ error: 'Valid update id is required' });
        }

        const comments = await req.pool.query(
            `SELECT
                c.comment_id,
                c.update_id,
                c.user_id,
                c.comment,
                c.created_at,
                COALESCE(u.name, 'Commuter') AS author_name,
                     u.avatar_memoji
             FROM UpdateComments c
             LEFT JOIN Users u ON u.user_id = c.user_id
             WHERE c.update_id = $1
             ORDER BY c.created_at ASC`,
            [updateId]
        );

        return res.json({ comments: comments.rows });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/comments', async (req, res) => {
    try {
        const updateId = Number.parseInt(req.params.id, 10);
        const userId = Number.parseInt(req.body.user_id, 10);
        const comment = (req.body.comment || '').trim();

        if (!Number.isInteger(updateId) || !Number.isInteger(userId) || !comment) {
            return res.status(400).json({ error: 'update_id, user_id, and comment are required' });
        }

        const inserted = await req.pool.query(
            `INSERT INTO UpdateComments (update_id, user_id, comment)
             VALUES ($1, $2, $3)
             RETURNING comment_id, update_id, user_id, comment, created_at`,
            [updateId, userId, comment]
        );

        const withAuthor = await req.pool.query(
            `SELECT
                c.comment_id,
                c.update_id,
                c.user_id,
                c.comment,
                c.created_at,
                COALESCE(u.name, 'Commuter') AS author_name,
                     u.avatar_memoji
             FROM UpdateComments c
             LEFT JOIN Users u ON u.user_id = c.user_id
             WHERE c.comment_id = $1`,
            [inserted.rows[0].comment_id]
        );

        return res.status(201).json({ comment: withAuthor.rows[0] });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
