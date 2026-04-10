CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    reputation_points INT DEFAULT 0,
    bio TEXT,
    home_location VARCHAR(255),
    preferred_transport VARCHAR(100),
    budget_level VARCHAR(50),
    travel_window VARCHAR(100),
    emergency_contact VARCHAR(255),
    avatar_color VARCHAR(50) DEFAULT '#f0932b',
    avatar_memoji JSONB,
    notify_disruptions BOOLEAN DEFAULT TRUE,
    notify_safety BOOLEAN DEFAULT TRUE,
    notify_saved_routes BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Routes (
    route_id SERIAL PRIMARY KEY,
    start_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    created_by INT REFERENCES Users(user_id),
    vote_score INT DEFAULT 0,
    estimated_duration_minutes INT,
    is_draft BOOLEAN DEFAULT FALSE,
    trust_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE RouteSteps (
    step_id SERIAL PRIMARY KEY,
    route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    instruction TEXT NOT NULL,
    vehicle_type VARCHAR(50),
    fare_regular DECIMAL(10, 2),
    fare_discount DECIMAL(10, 2),
    stop_location VARCHAR(255),
    photo_url VARCHAR(255),
    video_url VARCHAR(255)
);

CREATE TABLE Updates (
    update_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
    title VARCHAR(255),
    category VARCHAR(80),
    location VARCHAR(255),
    message TEXT NOT NULL,
    photo_url VARCHAR(255),
    severity VARCHAR(20) DEFAULT 'medium',
    is_urgent BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Votes (
    vote_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1))
);

CREATE UNIQUE INDEX idx_votes_user_route ON Votes(user_id, route_id);

CREATE TABLE RouteBookmarks (
    bookmark_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, route_id)
);

CREATE TABLE RouteReports (
    report_id SERIAL PRIMARY KEY,
    route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
    reason VARCHAR(120) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE UpdateReactions (
    reaction_id SERIAL PRIMARY KEY,
    update_id INT REFERENCES Updates(update_id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    reaction_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(update_id, user_id, reaction_type)
);

CREATE TABLE UpdateComments (
    comment_id SERIAL PRIMARY KEY,
    update_id INT REFERENCES Updates(update_id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(user_id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE UserNotifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    kind VARCHAR(40) DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
