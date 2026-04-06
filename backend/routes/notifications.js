const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const userId = Number.parseInt(req.query.user_id, 10);
        const onlyUnread = req.query.unread === 'true';

        if (!Number.isInteger(userId)) {
            return res.status(400).json({ error: 'Valid user_id is required' });
        }

        let query = `SELECT notification_id, user_id, title, message, kind, is_read, created_at
                     FROM UserNotifications
                     WHERE user_id = $1`;

        if (onlyUnread) {
            query += ' AND is_read = FALSE';
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const notifications = await req.pool.query(query, [userId]);
        return res.json({ notifications: notifications.rows });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const userId = Number.parseInt(req.body.user_id, 10);
        const title = (req.body.title || '').trim();
        const message = (req.body.message || '').trim();
        const kind = (req.body.kind || 'general').trim();

        if (!Number.isInteger(userId) || !title || !message) {
            return res.status(400).json({ error: 'user_id, title, and message are required' });
        }

        const inserted = await req.pool.query(
            `INSERT INTO UserNotifications (user_id, title, message, kind)
             VALUES ($1, $2, $3, $4)
             RETURNING notification_id, user_id, title, message, kind, is_read, created_at`,
            [userId, title, message, kind]
        );

        return res.status(201).json({ notification: inserted.rows[0] });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/read', async (req, res) => {
    try {
        const notificationId = Number.parseInt(req.params.id, 10);

        if (!Number.isInteger(notificationId)) {
            return res.status(400).json({ error: 'Valid notification id is required' });
        }

        const updated = await req.pool.query(
            `UPDATE UserNotifications
             SET is_read = TRUE
             WHERE notification_id = $1
             RETURNING notification_id, user_id, title, message, kind, is_read, created_at`,
            [notificationId]
        );

        if (!updated.rows.length) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        return res.json({ notification: updated.rows[0] });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
