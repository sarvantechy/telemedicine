-- Medical records table (metadata only; actual files stored in S3)
CREATE TABLE IF NOT EXISTS medical_records (
    id           VARCHAR(36) PRIMARY KEY,
    tenant_id    VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id   VARCHAR(36) NOT NULL REFERENCES users(id),
    uploaded_by  VARCHAR(36) REFERENCES users(id),
    title        VARCHAR(300) NOT NULL,
    record_type  VARCHAR(50)  NOT NULL DEFAULT 'other',
    s3_key       VARCHAR(500),
    file_name    VARCHAR(300),
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_tenant  ON medical_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rec_patient ON medical_records(patient_id);
