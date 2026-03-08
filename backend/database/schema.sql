CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    reputation_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Routes (
    route_id SERIAL PRIMARY KEY,
    start_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    created_by INT REFERENCES Users(user_id),
    vote_score INT DEFAULT 0,
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
    photo_url VARCHAR(255)
);

CREATE TABLE Updates (
    update_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    photo_url VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Votes (
    vote_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    route_id INT REFERENCES Routes(route_id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1))
);
