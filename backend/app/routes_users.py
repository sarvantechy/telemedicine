from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, DoctorProfile, Appointment
from app.schemas import UserCreate, UserOut, DoctorOut, DoctorProfileUpdate, AdminStats
from app.security import get_current_user, require_roles, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "superadmin")),
):
    tenant_id = current_user.tenant_id
    if db.query(User).filter(User.tenant_id == tenant_id, User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered in this clinic")

    user = User(
        tenant_id=tenant_id,
        email=body.email,
        full_name=body.full_name,
        role=body.role,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.flush()

    if body.role == "doctor":
        db.add(DoctorProfile(tenant_id=tenant_id, user_id=user.id))

    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserOut])
def list_users(
    role: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "superadmin")),
):
    q = db.query(User).filter(User.tenant_id == current_user.tenant_id)
    if role:
        q = q.filter(User.role == role)
    return q.order_by(User.created_at.desc()).all()


@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doctors = (
        db.query(User)
        .filter(User.tenant_id == current_user.tenant_id, User.role == "doctor", User.is_active == True)
        .all()
    )
    result = []
    for d in doctors:
        p = d.doctor_profile
        result.append(DoctorOut(
            id=d.id,
            email=d.email,
            full_name=d.full_name,
            specialization=p.specialization if p else None,
            qualification=p.qualification if p else None,
            consultation_fee=float(p.consultation_fee) if p and p.consultation_fee else None,
        ))
    return result


@router.patch("/doctors/profile", response_model=UserOut)
def update_doctor_profile(
    body: DoctorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor")),
):
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    db.commit()
    return current_user


@router.get("/admin/stats", response_model=AdminStats)
def admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "superadmin")),
):
    tid = current_user.tenant_id
    return AdminStats(
        total_doctors=db.query(User).filter(User.tenant_id == tid, User.role == "doctor").count(),
        total_patients=db.query(User).filter(User.tenant_id == tid, User.role == "patient").count(),
        total_appointments=db.query(Appointment).filter(Appointment.tenant_id == tid).count(),
        scheduled_appointments=db.query(Appointment).filter(
            Appointment.tenant_id == tid, Appointment.status == "scheduled"
        ).count(),
    )
