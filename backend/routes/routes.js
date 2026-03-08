const express = require('express');
const router = express.Router();

// Get all routes or search
router.get('/', async (req, res) => {
    try {
        const pool = req.pool;
        const { start, destination } = req.query;

        let query = 'SELECT r.*, u.name as creator_name FROM Routes r JOIN Users u ON r.created_by = u.user_id';
        const params = [];

        if (start && destination) {
            query += ' WHERE r.start_location ILIKE $1 AND r.destination ILIKE $2';
            params.push(`%${start}%`, `%${destination}%`);
        }
        
        query += ' ORDER BY r.vote_score DESC';

        const allRoutes = await pool.query(query, params);
        res.json(allRoutes.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single route by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.pool;

        const route = await pool.query(
            'SELECT r.*, u.name as creator_name FROM Routes r JOIN Users u ON r.created_by = u.user_id WHERE r.route_id = $1',
            [id]
        );

        if (route.rows.length === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }

        const steps = await pool.query(
            'SELECT * FROM RouteSteps WHERE route_id = $1 ORDER BY step_order ASC',
            [id]
        );

        res.json({ route: route.rows[0], steps: steps.rows });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new route
router.post('/', async (req, res) => {
    try {
        const { start_location, destination, created_by, steps } = req.body;
        const pool = req.pool;

        // Start transaction
        await pool.query('BEGIN');

        // Insert route definition
        const newRoute = await pool.query(
            'INSERT INTO Routes (start_location, destination, created_by) VALUES ($1, $2, $3) RETURNING *',
            [start_location, destination, created_by]
        );
        const routeId = newRoute.rows[0].route_id;

        // Insert steps
        if (steps && steps.length > 0) {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                await pool.query(
                    'INSERT INTO RouteSteps (route_id, step_order, instruction, vehicle_type, fare_regular, fare_discount, stop_location, photo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [
                        routeId, 
                        i + 1, 
                        step.instruction, 
                        step.vehicle_type, 
                        step.fare_regular, 
                        step.fare_discount, 
                        step.stop_location, 
                        step.photo_url || null
                    ]
                );
            }
        }

        await pool.query('COMMIT');

        res.status(201).json({ route_id: routeId, message: 'Route created successfully' });
    } catch (error) {
        await req.pool.query('ROLLBACK');
        console.error(error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
