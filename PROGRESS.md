# Telemedicine MVP — Progress Tracker

## Status: Local dev running ✅ · Demo deploy scripts ready ✅

---

## Done

### Infrastructure & Tooling
- [x] **uv** as package manager (`backend/uv.lock`, `.venv` at `backend/.venv`)
- [x] Python 3.12 venv isolated from pyenv 3.8 PATH conflict
- [x] SQLite for local dev (zero config), PostgreSQL for production
- [x] FastAPI + Vite dev servers on ports 8003 / 5173

### Backend (`backend/app/`)
- [x] `config.py` — pydantic-settings; defaults to SQLite locally
- [x] `database.py` — SQLAlchemy 2.0, handles SQLite + PostgreSQL
- [x] `models.py` — `Tenant`, `User`, `DoctorProfile`, `Appointment`, `Prescription`, `MedicalRecord`, `DoctorAvailability`, `DoctorBlockout`
- [x] `schemas.py` — Pydantic request/response schemas for all resources including new modules
- [x] `security.py` — bcrypt (direct, no passlib), JWT with `{sub, tenant_id, role}` payload
- [x] `seed.py` — idempotent demo data with **Indian names**, Mon–Fri availability, sample prescription
- [x] `services_s3.py` — boto3 S3 wrapper (graceful fallback if credentials missing); bucket `scoringbasket/telemedicine/`
- [x] `routes_auth.py` — `POST /api/auth/login`, `POST /api/auth/setup`
- [x] `routes_users.py` — me, list, create, doctors list, doctor profile, admin stats
- [x] `routes_appointments.py` — list (role-filtered), book, update/cancel
- [x] `routes_tenants.py` — superadmin tenant management
- [x] `routes_prescriptions.py` — doctor creates Rx; patient/doctor views by appointment or ID
- [x] `routes_records.py` — patient uploads lab reports (S3 optional); list, delete with pre-signed URLs
- [x] `routes_availability.py` — doctor sets weekly schedule; blockout dates; public slot query
- [x] `main.py` — lifespan: create tables + seed on startup; all 6 routers registered

### Frontend (`frontend/src/`)
- [x] React 19 + TypeScript + Vite 8 + DaisyUI 5 + Tailwind CSS 4
- [x] `api.ts` — Axios client; `authAPI`, `usersAPI`, `appointmentsAPI`, `prescriptionsAPI`, `recordsAPI`, `availabilityAPI`
- [x] `types.ts` — all TypeScript interfaces including `Prescription`, `MedicalRecord`, `AvailabilitySlot`, `Blockout`, `TimeSlot`
- [x] `AuthContext.tsx` — token + user state, localStorage persistence
- [x] `App.tsx` — role-based routing + new routes: `/prescription/:id`, `/doctor/availability`, `/patient/records`, `/admin/users`
- [x] `DashboardLayout.tsx` — DaisyUI drawer sidebar; `btm-nav` mobile tabs; live nav links for all features
- [x] `Login.tsx` — tenant slug + email + password; one-click demo credential fill
- [x] `AdminDashboard.tsx` — greeting + 4-stat grid + quick action cards (links to /admin/users)
- [x] `AdminUsersPage.tsx` — user table with role/status badges, add-user modal (separate from overview)
- [x] `DoctorDashboard.tsx` — today/upcoming/history sections; **Write Rx / View Rx** buttons; **Manage Availability** shortcut
- [x] `PatientDashboard.tsx` — next-appointment hero card, stats row, appointment list + doctors sidebar; **View Prescription** links
- [x] `PrescriptionView.tsx` — printable Rx document; medicines table; print/save PDF button
- [x] `AvailabilityPage.tsx` — weekly schedule editor; blockout date picker; upcoming blockouts list
- [x] `RecordsPage.tsx` — upload form; record cards with type badge; download + delete

### DB Migrations
- [x] `db_migration/01_schema.sql` — base PostgreSQL schema (users, appointments, tenants)
- [x] `db_migration/02_prescriptions.sql` — prescriptions table
- [x] `db_migration/03_medical_records.sql` — medical_records table
- [x] `db_migration/04_doctor_availability.sql` — doctor_availability + doctor_blockouts tables

### Deployment Files
- [x] `deployment/telemedicine.service` — systemd unit, port 8003
- [x] `deployment/nginx-https.conf` — `telemedicine.4by4softwares.com` → 8003 + static
- [x] `deployment/provision.sh` — first-time EC2 setup
- [x] `deployment/deploy.sh` — wheel build + S3 + SSM deploy

### Demo Data (tenant: `demo-clinic`) — Indian Names
| Role    | Email            | Password    | Name                    |
|---------|-----------------|-------------|-------------------------|
| Admin   | admin@demo.com   | admin123    | Karthik Sundaram        |
| Doctor  | sarah@demo.com   | doctor123   | Dr. Priya Nair          |
| Doctor  | john@demo.com    | doctor123   | Dr. Arjun Patel         |
| Patient | alice@demo.com   | patient123  | Meenakshi Subramaniam   |
| Patient | bob@demo.com     | patient123  | Rajesh Venkataraman     |
| Patient | carol@demo.com   | patient123  | Sunita Devi             |

> **Note:** To reset demo data with Indian names, delete `telemedicine.db` and restart the backend.

---

## Running Locally

```bash
# Backend
/Users/Saravanan.S2/sarvan/telemedicine/backend/.venv/bin/uvicorn app.main:app \
  --port 8003 --reload \
  --app-dir /Users/Saravanan.S2/sarvan/telemedicine/backend

# Frontend
cd frontend && npm run dev

# App → http://localhost:5173
# API docs → http://localhost:8003/docs
```

---

## Demo Deploy to EC2 (SQLite)

```bash
# Step 1 — Run ONCE on a fresh EC2 instance
bash deployment/demo_provision.sh

# Step 2 — Run for every update
bash deployment/demo_deploy.sh

# Backend only / Frontend only:
bash deployment/demo_deploy.sh --backend-only
bash deployment/demo_deploy.sh --frontend-only
```

**Demo URLs:** `http://16.112.61.10` · API docs at `/api/docs`  
**Reset demo data on EC2:** `rm /var/lib/telemedicine/demo.db && systemctl restart telemedicine`

---

## Not Started

### High Priority — Core Clinical Features
- [ ] **Video/Audio Consultation** — WebRTC or Daily.co integration for actual telemedicine calls
- [ ] **Notifications** — email/SMS reminders for upcoming appointments (SendGrid / AWS SES + SNS)
- [ ] **Payment Integration** — Razorpay for consultation fee collection before booking
- [ ] **Write Prescription UI** — inline form in DoctorDashboard (currently navigates to `/prescription/new?appointment_id=X` which is a stub)

### Medium Priority — Operational Features
- [ ] **Tenant Onboarding UI** — self-signup flow for new clinics (currently admin-only via API)
- [ ] **Superadmin Dashboard** — manage all tenants, usage stats, billing
- [ ] **Audit Log** — record who did what (HIPAA-style access log)
- [ ] **Find Doctors** — patient searches by specialty/availability (sidebar nav placeholder)

### Lower Priority — Nice-to-Have
- [ ] **Analytics Dashboard** — appointment trends, revenue, doctor utilisation
- [ ] **Multi-language / i18n** — Tamil, Hindi for local market
- [ ] **Mobile App** — React Native / Expo (same pattern as scorer-app)
- [ ] **Production Deploy** — DNS → `telemedicine.4by4softwares.com`, SSL cert, run `provision.sh`


## Status: Local dev running ✅

---

## Done

### Infrastructure & Tooling
- [x] **uv** as package manager (`backend/uv.lock`, `.venv` at `backend/.venv`)
- [x] Python 3.12 venv isolated from pyenv 3.8 PATH conflict
- [x] SQLite for local dev (zero config), PostgreSQL for production
- [x] FastAPI + Vite dev servers on ports 8003 / 5173

### Backend (`backend/app/`)
- [x] `config.py` — pydantic-settings; defaults to SQLite locally
- [x] `database.py` — SQLAlchemy 2.0, handles SQLite + PostgreSQL
- [x] `models.py` — `Tenant`, `User`, `DoctorProfile`, `Appointment`
- [x] `schemas.py` — Pydantic request/response schemas for all resources
- [x] `security.py` — bcrypt (direct, no passlib), JWT with `{sub, tenant_id, role}` payload
- [x] `seed.py` — idempotent demo data (1 tenant, 6 users, 6 appointments)
- [x] `routes_auth.py` — `POST /api/auth/login`, `POST /api/auth/setup`
- [x] `routes_users.py` — me, list, create, doctors list, doctor profile, admin stats
- [x] `routes_appointments.py` — list (role-filtered), book, update/cancel
- [x] `routes_tenants.py` — superadmin tenant management
- [x] `main.py` — lifespan: create tables + seed on startup

### Frontend (`frontend/src/`)
- [x] React 19 + TypeScript + Vite 8 + DaisyUI 5 + Tailwind CSS 4
- [x] `api.ts` — Axios client with JWT interceptor + auto-logout on 401
- [x] `AuthContext.tsx` — token + user state, localStorage persistence
- [x] `App.tsx` — role-based routing (patient → `/patient`, doctor → `/doctor`, admin → `/admin`)
- [x] `DashboardLayout.tsx` — shared navbar with role badge + logout
- [x] `Login.tsx` — tenant slug + email + password; one-click demo credential fill
- [x] `AdminDashboard.tsx` — stats cards, user table, add-user modal
- [x] `DoctorDashboard.tsx` — upcoming + history tabs, confirm/complete/cancel actions
- [x] `PatientDashboard.tsx` — appointment list, book-appointment modal with doctor picker

### Deployment Files
- [x] `deployment/telemedicine.service` — systemd unit for production (PostgreSQL)
- [x] `deployment/telemedicine-demo.service` — systemd unit for demo (SQLite, `/var/lib/telemedicine/demo.db`)
- [x] `deployment/nginx-http.conf` — HTTP nginx; serves on IP + domain (demo-friendly)
- [x] `deployment/nginx-https.conf` — HTTPS nginx for production
- [x] `deployment/provision.sh` — full provision (PostgreSQL + SSL)
- [x] `deployment/demo_provision.sh` — **demo provision** (SQLite only); run once from local machine
- [x] `deployment/demo_deploy.sh` — **demo deploy** (build → S3 → SSM → restart); run for every update
- [x] `deployment/deploy.sh` — full production deploy (PostgreSQL)
- [x] `db_migration/01_schema.sql` — PostgreSQL production schema

### Demo Data (tenant: `demo-clinic`)
| Role    | Email            | Password    |
|---------|-----------------|-------------|
| Admin   | admin@demo.com   | admin123    |
| Doctor  | sarah@demo.com   | doctor123   |
| Doctor  | john@demo.com    | doctor123   |
| Patient | alice@demo.com   | patient123  |
| Patient | bob@demo.com     | patient123  |
| Patient | carol@demo.com   | patient123  |

---

## Running Locally

```bash
# Backend
/Users/Saravanan.S2/sarvan/telemedicine/backend/.venv/bin/uvicorn app.main:app \
  --port 8003 --reload \
  --app-dir /Users/Saravanan.S2/sarvan/telemedicine/backend

# Frontend
cd frontend && npm run dev

# App → http://localhost:5173
# API docs → http://localhost:8003/docs
```

---

## Not Started

### High Priority — Core Clinical Features
- [ ] **Video/Audio Consultation** — WebRTC or Daily.co integration for actual telemedicine calls
- [ ] **Prescription Module** — doctor creates Rx after consultation; patient can view/download PDF
- [ ] **Patient Medical Records** — upload lab reports, past prescriptions; store in S3
- [ ] **Notifications** — email/SMS reminders for upcoming appointments (SendGrid / AWS SES + SNS)
- [ ] **Payment Integration** — Razorpay for consultation fee collection before booking

### Medium Priority — Operational Features
- [ ] **Tenant Onboarding UI** — self-signup flow for new clinics (currently admin-only via API)
- [ ] **Doctor Availability / Schedule** — define weekly slots; block-off dates
- [ ] **Superadmin Dashboard** — manage all tenants, usage stats, billing
- [ ] **Audit Log** — record who did what (HIPAA-style access log)
- [ ] **File Upload (S3)** — profile photos, documents (same `services_s3.py` pattern as scorer-app)

### Lower Priority — Nice-to-Have
- [ ] **Analytics Dashboard** — appointment trends, revenue, doctor utilisation
- [ ] **Multi-language / i18n** — Tamil, Hindi for local market
- [ ] **Mobile App** — React Native / Expo (same pattern as scorer-app)
- [ ] **Production Deploy** — DNS → `telemedicine.4by4softwares.com`, SSL cert, run `provision.sh`
