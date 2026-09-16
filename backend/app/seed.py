from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import Tenant, User, DoctorProfile, Appointment, Prescription, DoctorAvailability
from app.security import hash_password

DEMO_SLUG = "demo-clinic"


def seed_demo_data(db: Session) -> None:
    if db.query(Tenant).filter(Tenant.slug == DEMO_SLUG).first():
        return  # already seeded

    print("[SEED] Creating demo data…")

    tenant = Tenant(
        slug=DEMO_SLUG,
        name="Sundaram Medical Centre",
        type="clinic",
        contact_email="info@sundarammedical.in",
    )
    db.add(tenant)
    db.flush()
    tid = tenant.id

    admin = User(tenant_id=tid, email="admin@demo.com",  full_name="Karthik Sundaram",        role="admin",   hashed_password=hash_password("admin123"))
    dr1   = User(tenant_id=tid, email="sarah@demo.com",  full_name="Dr. Priya Nair",          role="doctor",  hashed_password=hash_password("doctor123"))
    dr2   = User(tenant_id=tid, email="john@demo.com",   full_name="Dr. Arjun Patel",         role="doctor",  hashed_password=hash_password("doctor123"))
    p1    = User(tenant_id=tid, email="alice@demo.com",  full_name="Meenakshi Subramaniam",   role="patient", hashed_password=hash_password("patient123"))
    p2    = User(tenant_id=tid, email="bob@demo.com",    full_name="Rajesh Venkataraman",     role="patient", hashed_password=hash_password("patient123"))
    p3    = User(tenant_id=tid, email="carol@demo.com",  full_name="Sunita Devi",             role="patient", hashed_password=hash_password("patient123"))
    db.add_all([admin, dr1, dr2, p1, p2, p3])
    db.flush()

    db.add(DoctorProfile(
        tenant_id=tid, user_id=dr1.id,
        specialization="Cardiology", qualification="MBBS, MD (Cardiology)",
        registration_number="KMC/2015/4821", consultation_fee=500,
    ))
    db.add(DoctorProfile(
        tenant_id=tid, user_id=dr2.id,
        specialization="General Medicine", qualification="MBBS, DNB (Internal Medicine)",
        registration_number="KMC/2018/7302", consultation_fee=300,
    ))

    # Weekly availability: Mon-Fri 09:00–17:00 (30-min slots)
    for doc_id in [dr1.id, dr2.id]:
        for dow in range(5):  # Mon=0 … Fri=4
            db.add(DoctorAvailability(
                tenant_id=tid, doctor_id=doc_id,
                day_of_week=dow, start_time="09:00", end_time="17:00",
                slot_duration=30, is_active=True,
            ))

    now = datetime.now(timezone.utc)
    a1 = Appointment(tenant_id=tid, patient_id=p1.id, doctor_id=dr1.id,
                     scheduled_at=now + timedelta(hours=2), status="scheduled",
                     notes="Chest pain follow-up",
                     meeting_url="https://meet.google.com/demo-room-1")
    a2 = Appointment(tenant_id=tid, patient_id=p2.id, doctor_id=dr1.id,
                     scheduled_at=now + timedelta(days=1), status="confirmed",
                     notes="Blood pressure checkup")
    a3 = Appointment(tenant_id=tid, patient_id=p3.id, doctor_id=dr2.id,
                     scheduled_at=now + timedelta(hours=4), status="scheduled",
                     notes="Annual physical exam")
    a4 = Appointment(tenant_id=tid, patient_id=p1.id, doctor_id=dr2.id,
                     scheduled_at=now - timedelta(days=2), status="completed",
                     notes="Viral fever")
    a5 = Appointment(tenant_id=tid, patient_id=p2.id, doctor_id=dr2.id,
                     scheduled_at=now - timedelta(days=5), status="completed",
                     notes="Routine check")
    a6 = Appointment(tenant_id=tid, patient_id=p3.id, doctor_id=dr1.id,
                     scheduled_at=now - timedelta(hours=12), status="cancelled")
    db.add_all([a1, a2, a3, a4, a5, a6])
    db.flush()

    # Seed a prescription for a4 (completed appointment)
    db.add(Prescription(
        tenant_id=tid,
        appointment_id=a4.id,
        doctor_id=dr2.id,
        patient_id=p1.id,
        patient_name=p1.full_name,
        doctor_name=dr2.full_name,
        diagnosis="Acute Viral Fever (J06.9)",
        medicines=[
            {"name": "Paracetamol 500mg", "dose": "1 tablet",  "frequency": "TID",  "duration": "5 days",   "notes": "After food"},
            {"name": "Cetirizine 10mg",   "dose": "1 tablet",  "frequency": "OD",   "duration": "5 days",   "notes": "At night"},
            {"name": "Vitamin C 500mg",   "dose": "1 tablet",  "frequency": "BD",   "duration": "10 days",  "notes": None},
        ],
        instructions="Drink plenty of fluids. Rest for 3 days. Return if fever persists beyond 5 days.",
    ))

    db.commit()

    print("[SEED] ✅ Demo tenant:  demo-clinic (Sundaram Medical Centre)")
    print("[SEED]    Admin:   admin@demo.com   / admin123")
    print("[SEED]    Doctor:  sarah@demo.com   / doctor123  (Dr. Priya Nair)")
    print("[SEED]    Patient: alice@demo.com   / patient123 (Meenakshi Subramaniam)")
