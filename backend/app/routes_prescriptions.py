from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user, require_roles
from app.models import Prescription, Appointment, User
from app.schemas import PrescriptionCreate, PrescriptionOut

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])


@router.post("/", response_model=PrescriptionOut)
def create_prescription(
    data: PrescriptionCreate,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(
        Appointment.id == data.appointment_id,
        Appointment.tenant_id == current_user.tenant_id,
        Appointment.doctor_id == current_user.id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if appt.status != "completed":
        raise HTTPException(400, "Prescription can only be written for completed appointments")
    if db.query(Prescription).filter(Prescription.appointment_id == appt.id).first():
        raise HTTPException(409, "Prescription already exists for this appointment")

    patient = db.query(User).filter(User.id == appt.patient_id).first()

    rx = Prescription(
        tenant_id=current_user.tenant_id,
        appointment_id=appt.id,
        doctor_id=current_user.id,
        patient_id=appt.patient_id,
        patient_name=patient.full_name if patient else None,
        doctor_name=current_user.full_name,
        diagnosis=data.diagnosis,
        medicines=[m.model_dump() for m in data.medicines],
        instructions=data.instructions,
        follow_up_date=data.follow_up_date,
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)
    return rx


@router.get("/my", response_model=list[PrescriptionOut])
def get_my_prescriptions(
    current_user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    return (
        db.query(Prescription)
        .filter(
            Prescription.tenant_id == current_user.tenant_id,
            Prescription.patient_id == current_user.id,
        )
        .order_by(Prescription.created_at.desc())
        .all()
    )


@router.get("/appointment/{appointment_id}", response_model=PrescriptionOut)
def get_by_appointment(
    appointment_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.tenant_id == current_user.tenant_id,
    ).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if current_user.role == "patient" and appt.patient_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if current_user.role == "doctor" and appt.doctor_id != current_user.id:
        raise HTTPException(403, "Access denied")

    rx = db.query(Prescription).filter(Prescription.appointment_id == appointment_id).first()
    if not rx:
        raise HTTPException(404, "No prescription for this appointment")
    return rx


@router.get("/{rx_id}", response_model=PrescriptionOut)
def get_prescription(
    rx_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rx = db.query(Prescription).filter(
        Prescription.id == rx_id,
        Prescription.tenant_id == current_user.tenant_id,
    ).first()
    if not rx:
        raise HTTPException(404, "Prescription not found")
    if current_user.role == "patient" and rx.patient_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if current_user.role == "doctor" and rx.doctor_id != current_user.id:
        raise HTTPException(403, "Access denied")
    return rx
