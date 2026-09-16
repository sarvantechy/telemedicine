from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Tenant
from app.schemas import TenantCreate, TenantOut
from app.security import require_roles

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


@router.post("", response_model=TenantOut, status_code=201)
def create_tenant(
    body: TenantCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles("superadmin")),
):
    if db.query(Tenant).filter(Tenant.slug == body.slug).first():
        raise HTTPException(status_code=409, detail="Slug already taken")
    tenant = Tenant(**body.model_dump())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("", response_model=list[TenantOut])
def list_tenants(
    db: Session = Depends(get_db),
    _=Depends(require_roles("superadmin")),
):
    return db.query(Tenant).order_by(Tenant.created_at.desc()).all()


@router.get("/{slug}", response_model=TenantOut)
def get_tenant(slug: str, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.slug == slug, Tenant.is_active == True).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant
