CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal TEXT,
    level TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    roadmap JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    course_id UUID REFERENCES courses(id),
    completed_topics TEXT[] DEFAULT '{}',
    current_module INTEGER DEFAULT 0,
    current_topic INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, course_id)
);