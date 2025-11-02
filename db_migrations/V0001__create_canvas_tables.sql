CREATE TABLE IF NOT EXISTS canvas_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS canvas_objects (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES canvas_projects(id),
    object_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL,
    height REAL,
    text TEXT,
    color VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_canvas_objects_project_id ON canvas_objects(project_id);