const express = require('express');
const { syncTransportNews } = require('../services/transportNewsSync');

const router = express.Router();

const mapNewsItem = (row) => ({
    news_id: row.news_id,
    title: row.title,
    details: row.details,
    category: row.category || 'advisory',
    source_label: row.source_label || 'Transit Bulletin',
    source_url: row.source_url || null,
    published_at: row.published_at || null,
    external_id: row.external_id || null,
    effective_start: row.effective_start,
    effective_end: row.effective_end,
    is_active: row.is_active !== false,
    priority: Number(row.priority || 0),
    created_at: row.created_at,
});

router.get('/', async (req, res) => {
    try {
        const limitParam = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(limitParam)
            ? Math.min(Math.max(limitParam, 1), 20)
            : 8;

        const category = (req.query.category || '').trim().toLowerCase();
        const activeOnly = req.query.active !== 'false';

        const params = [];
        let index = 1;

        let query = `SELECT
            news_id,
            title,
            details,
            category,
            source_label,
            source_url,
            published_at,
            external_id,
            effective_start,
            effective_end,
            is_active,
            priority,
            created_at
          FROM TransitNews
          WHERE 1 = 1`;

        if (activeOnly) {
            query += ' AND is_active = TRUE';
            query += ` AND (effective_start IS NULL OR effective_start <= CURRENT_DATE)`;
            query += ` AND (effective_end IS NULL OR effective_end >= CURRENT_DATE)`;
        }

        if (category) {
            params.push(category);
            query += ` AND LOWER(category) = $${index}`;
            index += 1;
        }

        params.push(limit);
        query += ` ORDER BY priority DESC, created_at DESC LIMIT $${index}`;

        const result = await req.pool.query(query, params);

        return res.json({ updates: result.rows.map(mapNewsItem) });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Unable to fetch transport news' });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            title,
            details,
            category = 'advisory',
            source_label = 'Transit Bulletin',
            source_url = null,
            published_at = null,
            external_id = null,
            effective_start = null,
            effective_end = null,
            is_active = true,
            priority = 50,
        } = req.body;

        if (!title || !details) {
            return res.status(400).json({ error: 'title and details are required' });
        }

        const normalizedPriority = Number.isFinite(Number(priority))
            ? Math.min(Math.max(Number(priority), 0), 100)
            : 50;

        const inserted = await req.pool.query(
            `INSERT INTO TransitNews (
                title,
                details,
                category,
                source_label,
                source_url,
                published_at,
                external_id,
                effective_start,
                effective_end,
                is_active,
                priority
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                title.trim(),
                details.trim(),
                (category || 'advisory').trim().toLowerCase(),
                source_label,
                source_url,
                published_at,
                external_id,
                effective_start,
                effective_end,
                is_active !== false,
                normalizedPriority,
            ]
        );

        return res.status(201).json({ update: mapNewsItem(inserted.rows[0]) });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Unable to create transport news update' });
    }
});

router.post('/sync', async (req, res) => {
    try {
        const result = await syncTransportNews(req.pool, {
            perFeedLimit: 10,
        });

        return res.json({ sync: result });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Unable to sync external transport news' });
    }
});

module.exports = router;
