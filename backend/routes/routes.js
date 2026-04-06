const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const mapRouteSummary = (row) => ({
    route_id: row.route_id,
    start_location: row.start_location,
    destination: row.destination,
    created_by: row.created_by,
    creator_name: row.creator_name,
    vote_score: Number(row.vote_score || 0),
    created_at: row.created_at,
    estimated_duration_minutes: row.estimated_duration_minutes,
    total_fare: Number(row.total_fare || 0),
    step_count: Number(row.step_count || 0),
    vehicle_types: row.vehicle_types ? row.vehicle_types.split(',').filter(Boolean) : [],
    report_count: Number(row.report_count || 0),
    is_verified: Boolean(row.is_verified),
    trust_score: Number(row.computed_trust_score || row.trust_score || 0),
    is_saved: Boolean(row.is_saved),
});

const computeRouteTrust = async (pool, routeId) => {
    const trust = await pool.query(
        `SELECT
            COALESCE(v.upvotes, 0) AS upvotes,
            COALESCE(v.downvotes, 0) AS downvotes,
            COALESCE(r.reports, 0) AS reports
         FROM
            (SELECT $1::INT AS route_id) base
         LEFT JOIN (
            SELECT route_id,
                   SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END)::INT AS upvotes,
                   SUM(CASE WHEN vote_type = -1 THEN 1 ELSE 0 END)::INT AS downvotes
            FROM Votes
            WHERE route_id = $1
            GROUP BY route_id
         ) v ON v.route_id = base.route_id
         LEFT JOIN (
            SELECT route_id, COUNT(*)::INT AS reports
            FROM RouteReports
            WHERE route_id = $1 AND status = 'open'
            GROUP BY route_id
         ) r ON r.route_id = base.route_id`,
        [routeId]
    );

    const trustRow = trust.rows[0] || { upvotes: 0, downvotes: 0, reports: 0 };
    const trustScore = clamp((trustRow.upvotes * 12) - (trustRow.downvotes * 8) - (trustRow.reports * 15), 0, 100);

    await pool.query(
        `UPDATE Routes
         SET trust_score = $1,
             vote_score = (
                 SELECT COALESCE(SUM(vote_type), 0)::INT
                 FROM Votes
                 WHERE route_id = $2
             )
         WHERE route_id = $2`,
        [trustScore, routeId]
    );

    return trustScore;
};

const getRouteSortClause = (sortBy) => {
    const sortMap = {
        popular: 'r.vote_score DESC, r.created_at DESC',
        fastest: 'r.estimated_duration_minutes ASC NULLS LAST, r.vote_score DESC',
        budget: 'step_stats.total_fare ASC, r.vote_score DESC',
        newest: 'r.created_at DESC',
        trusted: 'r.trust_score DESC, r.vote_score DESC',
    };

    return sortMap[sortBy] || sortMap.popular;
};

const uploadsDir = path.join(__dirname, '..', 'uploads', 'route-steps');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        const safeExtension = extension || (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');

        if (!isImage && !isVideo) {
            cb(new Error('Only image or video files are allowed.'));
            return;
        }

        cb(null, true);
    }
});

router.post('/media', (req, res) => {
    upload.single('media')(req, res, (error) => {
        if (error) {
            return res.status(400).json({ error: error.message || 'Unable to upload media file' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Media file is required' });
        }

        const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'photo';
        const relativeUrl = `/uploads/route-steps/${req.file.filename}`;
        const mediaUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;

        return res.status(201).json({
            media_url: mediaUrl,
            media_type: mediaType,
        });
    });
});

router.get('/recommendations', async (req, res) => {
    try {
        const pool = req.pool;
        const userId = Number.parseInt(req.query.user_id, 10);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({ error: 'Valid user_id is required' });
        }

        const userProfile = await pool.query(
            `SELECT preferred_transport, budget_level, home_location
             FROM Users
             WHERE user_id = $1`,
            [userId]
        );

        if (!userProfile.rows.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userProfile.rows[0];
        const preferredTransport = (user.preferred_transport || '').toLowerCase();
        const budgetLevel = (user.budget_level || '').toLowerCase();

        const recommendations = await pool.query(
            `SELECT
                r.route_id,
                r.start_location,
                r.destination,
                r.vote_score,
                r.created_at,
                r.estimated_duration_minutes,
                r.trust_score,
                u.name AS creator_name,
                COALESCE(step_stats.total_fare, 0) AS total_fare,
                COALESCE(step_stats.step_count, 0) AS step_count,
                COALESCE(step_stats.vehicle_types, '') AS vehicle_types,
                CASE
                  WHEN $2 <> '' AND step_stats.vehicle_types ILIKE ('%' || $2 || '%') THEN 'Matches your preferred transport'
                  WHEN $3 LIKE '%budget%' AND step_stats.total_fare <= 40 THEN 'Budget-friendly fare'
                  WHEN r.trust_score >= 70 THEN 'Trusted by community votes'
                  ELSE 'Popular commute route'
                END AS recommendation_reason
             FROM Routes r
             JOIN Users u ON u.user_id = r.created_by
             LEFT JOIN LATERAL (
               SELECT
                 COALESCE(SUM(COALESCE(rs.fare_regular, 0)), 0) AS total_fare,
                 COUNT(*)::INT AS step_count,
                 STRING_AGG(DISTINCT LOWER(COALESCE(rs.vehicle_type, '')), ',') AS vehicle_types
               FROM RouteSteps rs
               WHERE rs.route_id = r.route_id
             ) step_stats ON TRUE
             WHERE r.is_draft = FALSE
             ORDER BY
               CASE WHEN $2 <> '' AND step_stats.vehicle_types ILIKE ('%' || $2 || '%') THEN 0 ELSE 1 END,
               CASE WHEN $3 LIKE '%budget%' THEN step_stats.total_fare ELSE 0 END ASC,
               r.trust_score DESC,
               r.vote_score DESC
             LIMIT 10`,
            [userId, preferredTransport, budgetLevel]
        );

        return res.json({ recommendations: recommendations.rows });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get all routes or search
router.get('/', async (req, res) => {
    try {
        const pool = req.pool;
        const {
            start,
            destination,
            sort = 'popular',
            mode,
            user_id,
            min_votes,
            max_fare,
            verified_only,
            include_drafts,
            created_by,
        } = req.query;

        let query = `SELECT
            r.route_id,
            r.start_location,
            r.destination,
            r.created_by,
            r.vote_score,
            r.created_at,
            r.estimated_duration_minutes,
            r.trust_score,
            u.name as creator_name,
            COALESCE(step_stats.total_fare, 0) AS total_fare,
            COALESCE(step_stats.step_count, 0) AS step_count,
            COALESCE(step_stats.vehicle_types, '') AS vehicle_types,
            COALESCE(report_stats.report_count, 0) AS report_count,
            (r.trust_score >= 60 AND COALESCE(report_stats.report_count, 0) < 3) AS is_verified,
            CASE WHEN rb.route_id IS NULL THEN FALSE ELSE TRUE END AS is_saved,
            LEAST(100, GREATEST(0,
                COALESCE(r.trust_score, 0)
                + CASE WHEN r.vote_score > 5 THEN 8 ELSE 0 END
                - (COALESCE(report_stats.report_count, 0) * 6)
            )) AS computed_trust_score
         FROM Routes r
         JOIN Users u ON r.created_by = u.user_id
         LEFT JOIN LATERAL (
            SELECT
              COALESCE(SUM(COALESCE(rs.fare_regular, 0)), 0) AS total_fare,
              COUNT(*)::INT AS step_count,
              STRING_AGG(DISTINCT LOWER(COALESCE(rs.vehicle_type, '')), ',') AS vehicle_types
            FROM RouteSteps rs
            WHERE rs.route_id = r.route_id
         ) step_stats ON TRUE
         LEFT JOIN LATERAL (
            SELECT COUNT(*)::INT AS report_count
            FROM RouteReports rr
            WHERE rr.route_id = r.route_id AND rr.status = 'open'
         ) report_stats ON TRUE`;

        const numericUserId = Number.parseInt(user_id, 10);

        if (Number.isInteger(numericUserId)) {
            query += ' LEFT JOIN RouteBookmarks rb ON rb.route_id = r.route_id AND rb.user_id = $1';
        } else {
            query += ' LEFT JOIN RouteBookmarks rb ON 1 = 0';
        }

        query += ' WHERE 1=1';
        const params = [];
        let index = 1;

        if (Number.isInteger(numericUserId)) {
            params.push(numericUserId);
            index += 1;
        }

        const addParam = (value) => {
            params.push(value);
            const current = `$${index}`;
            index += 1;
            return current;
        };

        if (include_drafts === 'true') {
            query += ' AND (r.is_draft = FALSE';
            if (created_by) {
                const createdByParam = addParam(Number.parseInt(created_by, 10));
                query += ` OR (r.is_draft = TRUE AND r.created_by = ${createdByParam})`;
            }
            query += ')';
        } else {
            query += ' AND r.is_draft = FALSE';
        }

        if (start && destination) {
            const startParam = addParam(`%${start}%`);
            const destinationParam = addParam(`%${destination}%`);
            query += ` AND r.start_location ILIKE ${startParam} AND r.destination ILIKE ${destinationParam}`;
        } else {
            if (start) {
                const startParam = addParam(`%${start}%`);
                query += ` AND r.start_location ILIKE ${startParam}`;
            }
            if (destination) {
                const destinationParam = addParam(`%${destination}%`);
                query += ` AND r.destination ILIKE ${destinationParam}`;
            }
        }

        if (min_votes) {
            const minVotesParam = addParam(Number.parseInt(min_votes, 10));
            query += ` AND r.vote_score >= ${minVotesParam}`;
        }

        if (max_fare) {
            const maxFareParam = addParam(Number.parseFloat(max_fare));
            query += ` AND step_stats.total_fare <= ${maxFareParam}`;
        }

        if (verified_only === 'true') {
            query += ' AND r.trust_score >= 60';
        }

        if (mode === 'personalized' && Number.isInteger(numericUserId)) {
            const userPreference = await pool.query(
                `SELECT preferred_transport, budget_level
                 FROM Users
                 WHERE user_id = $1`,
                [numericUserId]
            );

            const profile = userPreference.rows[0];

            if (profile?.preferred_transport) {
                const transport = addParam(`%${profile.preferred_transport.toLowerCase()}%`);
                query += ` AND step_stats.vehicle_types ILIKE ${transport}`;
            }

            if ((profile?.budget_level || '').toLowerCase().includes('budget')) {
                query += ' AND step_stats.total_fare <= 60';
            }
        }

        query += ` ORDER BY ${getRouteSortClause(sort)} LIMIT 50`;

        const allRoutes = await pool.query(query, params);
        res.json({ routes: allRoutes.rows.map(mapRouteSummary) });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single route by ID
router.get('/:id', async (req, res) => {
    try {
        const routeId = Number.parseInt(req.params.id, 10);
        const pool = req.pool;
        const requestedBy = Number.parseInt(req.query.user_id, 10);

        if (!Number.isInteger(routeId)) {
            return res.status(400).json({ error: 'Invalid route id' });
        }

        const route = await pool.query(
                        `SELECT
                                r.*,
                                u.name as creator_name,
                                COALESCE(step_stats.total_fare, 0) AS total_fare,
                                COALESCE(step_stats.step_count, 0) AS step_count,
                                COALESCE(report_stats.report_count, 0) AS report_count,
                                COALESCE(bookmark_stats.bookmark_count, 0) AS bookmark_count,
                                CASE
                                    WHEN $2::INT IS NULL THEN FALSE
                                    WHEN EXISTS (
                                        SELECT 1
                                        FROM RouteBookmarks rb
                                        WHERE rb.route_id = r.route_id AND rb.user_id = $2::INT
                                    ) THEN TRUE
                                    ELSE FALSE
                                END AS is_saved,
                                (r.trust_score >= 60 AND COALESCE(report_stats.report_count, 0) < 3) AS is_verified
                         FROM Routes r
                         JOIN Users u ON r.created_by = u.user_id
                         LEFT JOIN LATERAL (
                             SELECT
                                 COALESCE(SUM(COALESCE(rs.fare_regular, 0)), 0) AS total_fare,
                                 COUNT(*)::INT AS step_count
                             FROM RouteSteps rs
                             WHERE rs.route_id = r.route_id
                         ) step_stats ON TRUE
                         LEFT JOIN LATERAL (
                             SELECT COUNT(*)::INT AS report_count
                             FROM RouteReports rr
                             WHERE rr.route_id = r.route_id AND rr.status = 'open'
                         ) report_stats ON TRUE
                         LEFT JOIN LATERAL (
                             SELECT COUNT(*)::INT AS bookmark_count
                             FROM RouteBookmarks rb
                             WHERE rb.route_id = r.route_id
                         ) bookmark_stats ON TRUE
                         WHERE r.route_id = $1`,
                        [routeId, Number.isInteger(requestedBy) ? requestedBy : null]
        );

        if (route.rows.length === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }

        const steps = await pool.query(
            'SELECT * FROM RouteSteps WHERE route_id = $1 ORDER BY step_order ASC',
            [routeId]
        );

        const disruptions = await pool.query(
            `SELECT update_id, title, category, location, message, severity, is_urgent, timestamp
             FROM Updates
             WHERE (route_id = $1 OR location ILIKE $2 OR location ILIKE $3)
             ORDER BY is_urgent DESC, timestamp DESC
             LIMIT 5`,
            [routeId, `%${route.rows[0].start_location}%`, `%${route.rows[0].destination}%`]
        );

        res.json({ route: route.rows[0], steps: steps.rows, disruptions: disruptions.rows });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:id/live-status', async (req, res) => {
    try {
        const pool = req.pool;
        const routeId = Number.parseInt(req.params.id, 10);

        if (!Number.isInteger(routeId)) {
            return res.status(400).json({ error: 'Invalid route id' });
        }

        const routeResult = await pool.query(
            `SELECT route_id, estimated_duration_minutes, created_at, start_location, destination
             FROM Routes
             WHERE route_id = $1`,
            [routeId]
        );

        if (!routeResult.rows.length) {
            return res.status(404).json({ error: 'Route not found' });
        }

        const route = routeResult.rows[0];
        const baselineDuration = route.estimated_duration_minutes || 40;
        const elapsedMinutes = Math.max(1, Math.floor((Date.now() - new Date(route.created_at).getTime()) / 60000));
        const cycleMinute = elapsedMinutes % baselineDuration;
        const progress = clamp(Math.round((cycleMinute / baselineDuration) * 100), 8, 98);
        const remaining = Math.max(2, baselineDuration - cycleMinute);

        const disruptionResult = await pool.query(
            `SELECT title, message, severity, is_urgent, timestamp
             FROM Updates
             WHERE is_urgent = TRUE
               AND (route_id = $1 OR location ILIKE $2 OR location ILIKE $3)
             ORDER BY timestamp DESC
             LIMIT 1`,
            [routeId, `%${route.start_location}%`, `%${route.destination}%`]
        );

        const disruption = disruptionResult.rows[0] || null;

        return res.json({
            route_id: route.route_id,
            eta_minutes: remaining,
            progress_percent: progress,
            status: disruption ? 'Delayed by incident' : 'Running on schedule',
            disruption,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/bookmarks/list', async (req, res) => {
    try {
        const userId = Number.parseInt(req.query.user_id, 10);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({ error: 'Valid user_id is required' });
        }

        const bookmarks = await req.pool.query(
            `SELECT
                rb.bookmark_id,
                rb.created_at,
                r.route_id,
                r.start_location,
                r.destination,
                r.vote_score,
                r.trust_score,
                r.estimated_duration_minutes,
                u.name AS creator_name
             FROM RouteBookmarks rb
             JOIN Routes r ON r.route_id = rb.route_id
             JOIN Users u ON u.user_id = r.created_by
             WHERE rb.user_id = $1
             ORDER BY rb.created_at DESC`,
            [userId]
        );

        return res.json({ bookmarks: bookmarks.rows });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/check-duplicate', async (req, res) => {
    try {
        const { start_location, destination, steps = [] } = req.body;

        if (!start_location || !destination) {
            return res.status(400).json({ error: 'start_location and destination are required' });
        }

        const firstStep = (steps[0]?.instruction || '').trim();
        const duplicateCandidates = await req.pool.query(
            `SELECT r.route_id, r.start_location, r.destination, r.created_at, u.name AS creator_name
             FROM Routes r
             JOIN Users u ON u.user_id = r.created_by
             WHERE r.is_draft = FALSE
               AND r.start_location ILIKE $1
               AND r.destination ILIKE $2
             ORDER BY r.created_at DESC
             LIMIT 5`,
            [`%${start_location.trim()}%`, `%${destination.trim()}%`]
        );

        let probableDuplicate = false;

        if (firstStep && duplicateCandidates.rows.length) {
            const stepMatches = await req.pool.query(
                `SELECT rs.route_id
                 FROM RouteSteps rs
                 WHERE rs.route_id = ANY($1::INT[])
                   AND rs.step_order = 1
                   AND rs.instruction ILIKE $2`,
                [duplicateCandidates.rows.map((route) => route.route_id), `%${firstStep}%`]
            );

            probableDuplicate = stepMatches.rows.length > 0;
        }

        return res.json({
            probable_duplicate: probableDuplicate || duplicateCandidates.rows.length > 0,
            candidates: duplicateCandidates.rows,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Create new route
router.post('/', async (req, res) => {
    try {
        const {
            start_location,
            destination,
            created_by,
            steps,
            is_draft,
            estimated_duration_minutes,
        } = req.body;
        const pool = req.pool;

        // Start transaction
        await pool.query('BEGIN');

        // Insert route definition
        const newRoute = await pool.query(
            `INSERT INTO Routes (
                start_location,
                destination,
                created_by,
                is_draft,
                estimated_duration_minutes
             ) VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                start_location,
                destination,
                created_by,
                is_draft === true,
                Number.isFinite(Number(estimated_duration_minutes)) ? Number(estimated_duration_minutes) : null,
            ]
        );
        const routeId = newRoute.rows[0].route_id;

        // Insert steps
        if (steps && steps.length > 0) {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                await pool.query(
                    `INSERT INTO RouteSteps (
                        route_id,
                        step_order,
                        instruction,
                        vehicle_type,
                        fare_regular,
                        fare_discount,
                        stop_location,
                        photo_url,
                        video_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        routeId, 
                        i + 1, 
                        step.instruction, 
                        step.vehicle_type, 
                        step.fare_regular, 
                        step.fare_discount, 
                        step.stop_location, 
                        step.photo_url || null,
                        step.video_url || null
                    ]
                );
            }
        }

        await computeRouteTrust(pool, routeId);

        await pool.query('COMMIT');

        res.status(201).json({
            route_id: routeId,
            message: is_draft ? 'Route draft saved successfully' : 'Route created successfully',
            is_draft: is_draft === true,
        });
    } catch (error) {
        await req.pool.query('ROLLBACK');
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/vote', async (req, res) => {
    try {
        const routeId = Number.parseInt(req.params.id, 10);
        const userId = Number.parseInt(req.body.user_id, 10);
        const voteType = Number.parseInt(req.body.vote_type, 10);

        if (!Number.isInteger(routeId) || !Number.isInteger(userId) || ![-1, 1].includes(voteType)) {
            return res.status(400).json({ error: 'route_id, user_id, and vote_type (-1 or 1) are required' });
        }

        await req.pool.query(
            `INSERT INTO Votes (user_id, route_id, vote_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, route_id)
             DO UPDATE SET vote_type = EXCLUDED.vote_type`,
            [userId, routeId, voteType]
        );

        const trustScore = await computeRouteTrust(req.pool, routeId);

        const route = await req.pool.query(
            'SELECT route_id, vote_score, trust_score FROM Routes WHERE route_id = $1',
            [routeId]
        );

        return res.json({
            route_id: routeId,
            vote_score: route.rows[0]?.vote_score || 0,
            trust_score: route.rows[0]?.trust_score || trustScore,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/bookmark', async (req, res) => {
    try {
        const routeId = Number.parseInt(req.params.id, 10);
        const userId = Number.parseInt(req.body.user_id, 10);
        const action = req.body.action || 'toggle';

        if (!Number.isInteger(routeId) || !Number.isInteger(userId)) {
            return res.status(400).json({ error: 'Valid route_id and user_id are required' });
        }

        const existing = await req.pool.query(
            'SELECT bookmark_id FROM RouteBookmarks WHERE route_id = $1 AND user_id = $2',
            [routeId, userId]
        );

        let saved = false;

        if (action === 'remove' || (action === 'toggle' && existing.rows.length > 0)) {
            await req.pool.query(
                'DELETE FROM RouteBookmarks WHERE route_id = $1 AND user_id = $2',
                [routeId, userId]
            );
            saved = false;
        } else {
            await req.pool.query(
                `INSERT INTO RouteBookmarks (route_id, user_id)
                 VALUES ($1, $2)
                 ON CONFLICT (user_id, route_id) DO NOTHING`,
                [routeId, userId]
            );
            saved = true;

            await req.pool.query(
                `INSERT INTO UserNotifications (user_id, title, message, kind)
                 VALUES ($1, $2, $3, 'saved_route')`,
                [userId, 'Route saved', 'A route was added to your saved trips for quick access.']
            );
        }

        return res.json({ route_id: routeId, saved });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/report', async (req, res) => {
    try {
        const routeId = Number.parseInt(req.params.id, 10);
        const userId = Number.parseInt(req.body.user_id, 10);
        const reason = (req.body.reason || '').trim();
        const details = (req.body.details || '').trim();

        if (!Number.isInteger(routeId) || !reason) {
            return res.status(400).json({ error: 'route_id and reason are required' });
        }

        await req.pool.query(
            `INSERT INTO RouteReports (route_id, user_id, reason, details)
             VALUES ($1, $2, $3, $4)`,
            [routeId, Number.isInteger(userId) ? userId : null, reason, details || null]
        );

        const trustScore = await computeRouteTrust(req.pool, routeId);

        return res.status(201).json({
            message: 'Route issue reported successfully',
            trust_score: trustScore,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
