from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user, require_roles
from app.models import DoctorAvailability, DoctorBlockout, Appointment
from app.schemas import AvailabilitySet, AvailabilityOut, BlockoutCreate, BlockoutOut

router = APIRouter(prefix="/api/availability", tags=["availability"])


@router.get("/my", response_model=list[AvailabilityOut])
def get_my_availability(
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == current_user.id,
            DoctorAvailability.tenant_id == current_user.tenant_id,
        )
        .order_by(DoctorAvailability.day_of_week)
        .all()
    )


@router.put("/", response_model=list[AvailabilityOut])
def set_availability(
    slots: list[AvailabilitySet],
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == current_user.id,
        DoctorAvailability.tenant_id == current_user.tenant_id,
    ).delete()

    saved = []
    for s in slots:
        if s.is_active:
            row = DoctorAvailability(
                tenant_id=current_user.tenant_id,
                doctor_id=current_user.id,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                slot_duration=s.slot_duration,
                is_active=True,
            )
            db.add(row)
            saved.append(row)

    db.commit()
    return saved


@router.get("/{doctor_id}/slots")
def get_slots(
    doctor_id: str,
    date: str = Query(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    try:
        target = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")

    day_of_week = target.weekday()

    avail = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id,
        DoctorAvailability.tenant_id == current_user.tenant_id,
        DoctorAvailability.day_of_week == day_of_week,
        DoctorAvailability.is_active.is_(True),
    ).first()
    if not avail:
        return []

    if db.query(DoctorBlockout).filter(
        DoctorBlockout.doctor_id == doctor_id,
        DoctorBlockout.blocked_date == target,
    ).first():
        return []

    sh, sm = map(int, avail.start_time.split(":"))
    eh, em = map(int, avail.end_time.split(":"))
    start_dt = datetime(target.year, target.month, target.day, sh, sm)
    end_dt = datetime(target.year, target.month, target.day, eh, em)
    step = timedelta(minutes=avail.slot_duration)

    all_slots: list[datetime] = []
    cur = start_dt
    while cur + step <= end_dt:
        all_slots.append(cur)
        cur += step

    day_start = datetime(target.year, target.month, target.day, 0, 0)
    day_end = datetime(target.year, target.month, target.day, 23, 59, 59)
    booked = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.tenant_id == current_user.tenant_id,
        Appointment.scheduled_at >= day_start,
        Appointment.scheduled_at <= day_end,
        Appointment.status.in_(["scheduled", "confirmed"]),
    ).all()
    booked_times = {
        a.scheduled_at.replace(tzinfo=None, second=0, microsecond=0)
        for a in booked
    }

    return [
        {"time": s.strftime("%H:%M"), "datetime": s.isoformat(), "available": s not in booked_times}
        for s in all_slots
    ]


@router.post("/blockout", response_model=BlockoutOut)
def create_blockout(
    data: BlockoutCreate,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    row = DoctorBlockout(
        tenant_id=current_user.tenant_id,
        doctor_id=current_user.id,
        blocked_date=data.blocked_date,
        reason=data.reason,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/blockouts", response_model=list[BlockoutOut])
def list_blockouts(
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    return (
        db.query(DoctorBlockout)
        .filter(
            DoctorBlockout.doctor_id == current_user.id,
            DoctorBlockout.tenant_id == current_user.tenant_id,
            DoctorBlockout.blocked_date >= datetime.today().date(),
        )
        .order_by(DoctorBlockout.blocked_date)
        .all()
    )


@router.delete("/blockout/{blockout_id}")
def delete_blockout(
    blockout_id: str,
    current_user=Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    row = db.query(DoctorBlockout).filter(
        DoctorBlockout.id == blockout_id,
        DoctorBlockout.doctor_id == current_user.id,
        DoctorBlockout.tenant_id == current_user.tenant_id,
    ).first()
    if not row:
        raise HTTPException(404, "Blockout not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
