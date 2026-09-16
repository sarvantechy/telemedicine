from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user
from app.models import MedicalRecord
from app.schemas import MedicalRecordOut

router = APIRouter(prefix="/api/records", tags=["records"])

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg", "image/png", "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/upload", response_model=MedicalRecordOut)
def upload_record(
    title: str = Form(...),
    record_type: str = Form("other"),
    notes: str | None = Form(None),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type not supported: {file.content_type}")

    s3_key: str | None = None
    try:
        from app.services_s3 import upload_file_to_s3
        s3_key = upload_file_to_s3(file.file, file.content_type, "medical-records", f"rec_{current_user.id[:8]}")
    except Exception:
        pass  # S3 optional in local dev

    record = MedicalRecord(
        tenant_id=current_user.tenant_id,
        patient_id=current_user.id,
        uploaded_by=current_user.id,
        title=title,
        record_type=record_type,
        s3_key=s3_key,
        file_name=file.filename,
        notes=notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_out(record)


@router.get("/", response_model=list[MedicalRecordOut])
def list_records(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(MedicalRecord)
        .filter(
            MedicalRecord.tenant_id == current_user.tenant_id,
            MedicalRecord.patient_id == current_user.id,
        )
        .order_by(MedicalRecord.created_at.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.delete("/{record_id}")
def delete_record(
    record_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.tenant_id == current_user.tenant_id,
        MedicalRecord.patient_id == current_user.id,
    ).first()
    if not record:
        raise HTTPException(404, "Record not found")
    if record.s3_key:
        try:
            from app.services_s3 import delete_from_s3
            delete_from_s3(record.s3_key)
        except Exception:
            pass
    db.delete(record)
    db.commit()
    return {"ok": True}


def _to_out(r: MedicalRecord) -> MedicalRecordOut:
    download_url: str | None = None
    if r.s3_key:
        try:
            from app.services_s3 import get_presigned_url
            download_url = get_presigned_url(r.s3_key)
        except Exception:
            pass
    return MedicalRecordOut(
        id=r.id,
        title=r.title,
        record_type=r.record_type,
        file_name=r.file_name,
        notes=r.notes,
        download_url=download_url,
        created_at=r.created_at,
    )
