const express = require('express');

const router = express.Router();

const getFallbackReply = () => {
    return 'I can help with route guidance, incidents, and safer commute suggestions. Try: fastest route to SM North, traffic alerts near Taft, or budget trip options.';
};

router.post('/assist', async (req, res) => {
    try {
        const message = (req.body.message || '').trim();
        const userId = Number.parseInt(req.body.user_id, 10);
        const contextStart = (req.body.start || '').trim();
        const contextDestination = (req.body.destination || '').trim();

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        const normalized = message.toLowerCase();
        const references = [];
        let answer = '';

        const userProfile = Number.isInteger(userId)
            ? await req.pool.query(
                `SELECT preferred_transport, budget_level, travel_window, home_location
                 FROM Users
                 WHERE user_id = $1`,
                [userId]
            )
            : { rows: [] };

        const profile = userProfile.rows[0] || null;

        if (/route|fastest|budget|commute|trip/.test(normalized)) {
            const routes = await req.pool.query(
                `SELECT
                    r.route_id,
                    r.start_location,
                    r.destination,
                    r.vote_score,
                    r.trust_score,
                    COALESCE(step_stats.total_fare, 0) AS total_fare,
                    COALESCE(r.estimated_duration_minutes, 40) AS estimated_duration_minutes
                 FROM Routes r
                 LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(COALESCE(rs.fare_regular, 0)), 0) AS total_fare
                    FROM RouteSteps rs
                    WHERE rs.route_id = r.route_id
                 ) step_stats ON TRUE
                 WHERE r.is_draft = FALSE
                   AND ($1 = '' OR r.start_location ILIKE ('%' || $1 || '%'))
                   AND ($2 = '' OR r.destination ILIKE ('%' || $2 || '%'))
                 ORDER BY r.trust_score DESC, r.vote_score DESC
                 LIMIT 3`,
                [contextStart, contextDestination]
            );

            if (routes.rows.length) {
                const summary = routes.rows
                    .map((route, index) => `${index + 1}) ${route.start_location} to ${route.destination} - ETA ~${route.estimated_duration_minutes} mins, Fare ~P${Number(route.total_fare).toFixed(2)}, Trust ${route.trust_score}`)
                    .join(' | ');

                references.push(...routes.rows.map((route) => ({
                    type: 'route',
                    id: route.route_id,
                    label: `${route.start_location} -> ${route.destination}`,
                })));

                const personalization = profile
                    ? ` Based on your profile (${profile.preferred_transport || 'mixed transport'}, ${profile.budget_level || 'balanced budget'}), prioritize trusted routes with predictable fare.`
                    : '';

                answer = `Here are strong route options right now: ${summary}.${personalization}`;
            }
        }

        if (!answer && /alert|incident|traffic|flood|delay|disruption|unsafe|safety/.test(normalized)) {
            const incidents = await req.pool.query(
                `SELECT update_id, title, category, location, severity, is_urgent, timestamp
                 FROM Updates
                 WHERE ($1 = '' OR location ILIKE ('%' || $1 || '%'))
                    OR ($2 = '' OR location ILIKE ('%' || $2 || '%'))
                 ORDER BY is_urgent DESC, timestamp DESC
                 LIMIT 4`,
                [contextStart, contextDestination]
            );

            if (incidents.rows.length) {
                const incidentSummary = incidents.rows
                    .map((incident) => `${incident.title || incident.category} at ${incident.location || 'unknown area'} (${incident.severity || 'medium'})`)
                    .join(' | ');

                references.push(...incidents.rows.map((incident) => ({
                    type: 'community_update',
                    id: incident.update_id,
                    label: incident.title || incident.category,
                })));

                answer = `Latest community disruptions: ${incidentSummary}. Consider leaving 10-20 minutes earlier and choosing well-lit transfer points.`;
            }
        }

        if (!answer && profile) {
            answer = `For your current preferences (${profile.preferred_transport || 'mixed'}, ${profile.budget_level || 'balanced'}), pick routes with trust score above 60 and fare under P60. I can also fetch route options if you provide From and To.`;
        }

        if (!answer) {
            answer = getFallbackReply();
        }

        return res.json({ answer, references });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
