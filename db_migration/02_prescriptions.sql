-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id              VARCHAR(36) PRIMARY KEY,
    tenant_id       VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id  VARCHAR(36) NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id       VARCHAR(36) NOT NULL REFERENCES users(id),
    patient_id      VARCHAR(36) NOT NULL REFERENCES users(id),
    patient_name    VARCHAR(200),
    doctor_name     VARCHAR(200),
    diagnosis       VARCHAR(500),
    medicines       JSONB NOT NULL DEFAULT '[]',
    instructions    TEXT,
    follow_up_date  DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rx_tenant   ON prescriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rx_patient  ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_doctor   ON prescriptions(doctor_id);
