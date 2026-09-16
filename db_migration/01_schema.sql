-- Telemedicine v1.0 — PostgreSQL schema
-- Run as telemedicine_migrate (BYPASSRLS) or postgres

-- ── Database setup (run once as superuser) ───────────────────────────────────
-- CREATE DATABASE telemedicine;
-- CREATE USER telemedicine_app WITH PASSWORD 'CHANGE_ME';
-- GRANT CONNECT ON DATABASE telemedicine TO telemedicine_app;
-- \c telemedicine
-- GRANT USAGE ON SCHEMA public TO telemedicine_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO telemedicine_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO telemedicine_app;

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
    id           VARCHAR(36)  PRIMARY KEY,
    slug         VARCHAR(100) UNIQUE NOT NULL,
    name         VARCHAR(300) NOT NULL,
    type         VARCHAR(50)  NOT NULL DEFAULT 'clinic',
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    contact_email VARCHAR(255),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(36)  PRIMARY KEY,
    tenant_id       VARCHAR(36)  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(300) NOT NULL,
    role            VARCHAR(50)  NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

CREATE TABLE IF NOT EXISTS doctor_profiles (
    id                  VARCHAR(36)   PRIMARY KEY,
    tenant_id           VARCHAR(36)   NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id             VARCHAR(36)   UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialization      VARCHAR(200)  NOT NULL DEFAULT 'General',
    qualification       VARCHAR(300),
    registration_number VARCHAR(100),
    consultation_fee    NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_tenant_id ON doctor_profiles(tenant_id);

CREATE TABLE IF NOT EXISTS appointments (
    id               VARCHAR(36)  PRIMARY KEY,
    tenant_id        VARCHAR(36)  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id       VARCHAR(36)  NOT NULL REFERENCES users(id),
    doctor_id        VARCHAR(36)  NOT NULL REFERENCES users(id),
    scheduled_at     TIMESTAMPTZ  NOT NULL,
    duration_minutes INTEGER      NOT NULL DEFAULT 20,
    status           VARCHAR(50)  NOT NULL DEFAULT 'scheduled',
    notes            TEXT,
    meeting_url      VARCHAR(500),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id    ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id   ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id    ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
