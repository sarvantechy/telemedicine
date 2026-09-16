from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Appointment, User
from app.schemas import AppointmentCreate, AppointmentUpdate, AppointmentOut
from app.security import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


def _with_relations(db: Session, tenant_id: str):
    return (
        db.query(Appointment)
        .options(joinedload(Appointment.patient), joinedload(Appointment.doctor))
        .filter(Appointment.tenant_id == tenant_id)
    )


def _to_out(a: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=a.id,
        patient_id=a.patient_id,
        doctor_id=a.doctor_id,
        patient_name=a.patient.full_name if a.patient else None,
        doctor_name=a.doctor.full_name if a.doctor else None,
        scheduled_at=a.scheduled_at,
        duration_minutes=a.duration_minutes,
        status=a.status,
        notes=a.notes,
        meeting_url=a.meeting_url,
        created_at=a.created_at,
    )


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = _with_relations(db, current_user.tenant_id)
    if current_user.role == "patient":
        q = q.filter(Appointment.patient_id == current_user.id)
    elif current_user.role == "doctor":
        q = q.filter(Appointment.doctor_id == current_user.id)
    return [_to_out(a) for a in q.order_by(Appointment.scheduled_at).all()]


@router.post("", response_model=AppointmentOut, status_code=201)
def book_appointment(
    body: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doctor = db.query(User).filter(
        User.id == body.doctor_id,
        User.tenant_id == current_user.tenant_id,
        User.role == "doctor",
        User.is_active == True,
    ).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # admin/doctor books on behalf of a patient; patient books for themselves
    patient_id = current_user.id

    appt = Appointment(
        tenant_id=current_user.tenant_id,
        patient_id=patient_id,
        doctor_id=body.doctor_id,
        scheduled_at=body.scheduled_at,
        duration_minutes=body.duration_minutes,
        notes=body.notes,
        meeting_url=body.meeting_url,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    appt = _with_relations(db, current_user.tenant_id).filter(Appointment.id == appt.id).first()
    return _to_out(appt)


@router.patch("/{appt_id}", response_model=AppointmentOut)
def update_appointment(
    appt_id: str,
    body: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = _with_relations(db, current_user.tenant_id).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.role == "patient":
        if appt.patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your appointment")
        if body.status and body.status != "cancelled":
            raise HTTPException(status_code=403, detail="Patients can only cancel appointments")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(appt, field, value)
    db.commit()

    appt = _with_relations(db, current_user.tenant_id).filter(Appointment.id == appt_id).first()
    return _to_out(appt)
