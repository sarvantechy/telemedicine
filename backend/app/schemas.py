from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Tenants ───────────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    slug: str
    name: str
    type: str = "clinic"
    contact_email: Optional[EmailStr] = None


class TenantOut(BaseModel):
    id: str
    slug: str
    name: str
    type: str
    is_active: bool
    contact_email: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    tenant_slug: str
    email: str
    password: str


class SetupRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    tenant_id: str


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Doctor ────────────────────────────────────────────────────────────────────

class DoctorProfileUpdate(BaseModel):
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    registration_number: Optional[str] = None
    consultation_fee: Optional[float] = None


class DoctorOut(BaseModel):
    id: str
    email: str
    full_name: str
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    consultation_fee: Optional[float] = None
    model_config = {"from_attributes": True}


# ── Appointments ──────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    doctor_id: str
    scheduled_at: datetime
    duration_minutes: int = 20
    notes: Optional[str] = None
    meeting_url: Optional[str] = None


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    meeting_url: Optional[str] = None


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    status: str
    notes: Optional[str]
    meeting_url: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Admin stats ───────────────────────────────────────────────────────────────

class AdminStats(BaseModel):
    total_doctors: int
    total_patients: int
    total_appointments: int
    scheduled_appointments: int


# ── Prescriptions ─────────────────────────────────────────────────────────────

class MedicineItem(BaseModel):
    name: str
    dose: str
    frequency: str
    duration: str
    notes: Optional[str] = None

    @field_validator("name", "dose", "frequency", "duration")
    @classmethod
    def required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be empty")
        return value


class PrescriptionCreate(BaseModel):
    appointment_id: str
    diagnosis: Optional[str] = None
    medicines: list[MedicineItem] = Field(min_length=1)
    instructions: Optional[str] = None
    follow_up_date: Optional[date] = None


class PrescriptionOut(BaseModel):
    id: str
    appointment_id: str
    doctor_id: str
    patient_id: str
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    diagnosis: Optional[str] = None
    medicines: list[dict] = Field(default_factory=list)
    instructions: Optional[str] = None
    follow_up_date: Optional[date] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Medical Records ───────────────────────────────────────────────────────────

class MedicalRecordOut(BaseModel):
    id: str
    title: str
    record_type: str
    file_name: Optional[str] = None
    notes: Optional[str] = None
    download_url: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Doctor Availability ───────────────────────────────────────────────────────

class AvailabilitySet(BaseModel):
    day_of_week: int        # 0=Mon … 6=Sun
    start_time: str         # "09:00"
    end_time: str           # "17:00"
    slot_duration: int = 30
    is_active: bool = True


class AvailabilityOut(BaseModel):
    id: str
    day_of_week: int
    start_time: str
    end_time: str
    slot_duration: int
    is_active: bool
    model_config = {"from_attributes": True}


class BlockoutCreate(BaseModel):
    blocked_date: date
    reason: Optional[str] = None


class BlockoutOut(BaseModel):
    id: str
    blocked_date: date
    reason: Optional[str] = None
    model_config = {"from_attributes": True}
