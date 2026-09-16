-- Doctor weekly availability
CREATE TABLE IF NOT EXISTS doctor_availability (
    id             VARCHAR(36) PRIMARY KEY,
    tenant_id      VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doctor_id      VARCHAR(36) NOT NULL REFERENCES users(id),
    day_of_week    INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time     VARCHAR(5)  NOT NULL,   -- "09:00"
    end_time       VARCHAR(5)  NOT NULL,   -- "17:00"
    slot_duration  INTEGER     NOT NULL DEFAULT 30,
    is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_doctor_day UNIQUE (tenant_id, doctor_id, day_of_week)
);

-- Blocked / leave dates
CREATE TABLE IF NOT EXISTS doctor_blockouts (
    id            VARCHAR(36) PRIMARY KEY,
    tenant_id     VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doctor_id     VARCHAR(36) NOT NULL REFERENCES users(id),
    blocked_date  DATE        NOT NULL,
    reason        VARCHAR(300)
);

CREATE INDEX IF NOT EXISTS idx_avail_doctor   ON doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_blockout_doctor ON doctor_blockouts(doctor_id);
