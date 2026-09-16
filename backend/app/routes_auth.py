from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Tenant, User
from app.schemas import LoginRequest, SetupRequest, TokenResponse
from app.security import verify_password, create_token, hash_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(
        Tenant.slug == body.tenant_slug, Tenant.is_active == True
    ).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Clinic not found")

    user = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.email == body.email,
        User.is_active == True,
    ).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenResponse(
        access_token=create_token(user.id, tenant.id, user.role),
        role=user.role,
        full_name=user.full_name,
        tenant_id=tenant.id,
    )


@router.post("/setup", status_code=201)
def setup_superadmin(body: SetupRequest, db: Session = Depends(get_db)):
    """One-time bootstrap: creates the superadmin. Disabled once a superadmin exists."""
    if db.query(User).filter(User.role == "superadmin").first():
        raise HTTPException(status_code=409, detail="Setup already complete")

    # superadmin lives outside any tenant — use a dedicated system tenant
    system_tenant = db.query(Tenant).filter(Tenant.slug == "_system").first()
    if not system_tenant:
        system_tenant = Tenant(slug="_system", name="System", type="system", is_active=True)
        db.add(system_tenant)
        db.flush()

    admin = User(
        tenant_id=system_tenant.id,
        email=body.email,
        full_name=body.full_name,
        role="superadmin",
        hashed_password=hash_password(body.password),
    )
    db.add(admin)
    db.commit()
    return {"message": "Superadmin created. Use /api/auth/login with tenant_slug='_system'."}
