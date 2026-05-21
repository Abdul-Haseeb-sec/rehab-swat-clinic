"""
schemas.py — Pydantic validation schemas for Rehab Swat CMS API.

Phase 2 additions:
  - UserCreate / UserOut / UserUpdate  (2.1 Staff CRUD)
  - DoctorAvailability schemas         (2.4)
  - TreatmentPlan / Exercise / Session / Milestone schemas  (2.5)
  - OutcomeMeasure schemas             (2.6)
  - Service schemas                    (2.7)
  - InvoiceUpdate / discount_percent   (2.8)
"""
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from models import (
    AppointmentStatus, AppointmentType, Gender, InvoiceStatus,
    NotificationType, OutcomeMeasureType, PaymentMethod, ServiceCategory,
    TreatmentPlanStatus, UserRole,
)


# ══════════════════════════════════════════════════════════════════════════════
#  2.1 — Users / Staff
# ══════════════════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    full_name: str
    specialization: Optional[str] = None
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    full_name: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  Auth
# ══════════════════════════════════════════════════════════════════════════════

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    name: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


# ══════════════════════════════════════════════════════════════════════════════
#  Patients
# ══════════════════════════════════════════════════════════════════════════════

class PatientCreate(BaseModel):
    full_name: str
    dob: date
    gender: Gender
    phone: str
    cnic: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    medical_history: Optional[Dict[str, Any]] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[Gender] = None
    phone: Optional[str] = None
    cnic: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    medical_history: Optional[Dict[str, Any]] = None


class PatientOut(BaseModel):
    id: UUID
    mrn: str
    full_name: str
    dob: date
    gender: Gender
    phone: str
    cnic: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    medical_history: Optional[Dict[str, Any]] = None
    photo_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  Appointments
# ══════════════════════════════════════════════════════════════════════════════

class AppointmentCreate(BaseModel):
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    scheduled_at: datetime
    duration_min: int = 30
    type: AppointmentType
    notes: Optional[str] = None


class AppointmentReschedule(BaseModel):
    scheduled_at: datetime
    duration_min: Optional[int] = None


class AppointmentCancel(BaseModel):
    cancellation_reason: str


class AppointmentOut(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    scheduled_at: datetime
    duration_min: int
    type: AppointmentType
    status: AppointmentStatus
    notes: Optional[str] = None
    reminder_sent: bool
    same_day_reminder_sent: bool
    session_num: int
    cancellation_reason: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    is_cancelled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  Medical Records
# ══════════════════════════════════════════════════════════════════════════════

class MedicalRecordCreate(BaseModel):
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    vitals: Optional[Dict[str, Any]] = None
    chief_complaint: Optional[str] = None
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    diagnosis_codes: Optional[List[str]] = None
    physio_assessment: Optional[Dict[str, Any]] = None


class MedicalRecordOut(MedicalRecordCreate):
    id: UUID
    doctor_id: UUID
    is_finalized: bool
    is_draft: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  2.4 — Doctor Availability
# ══════════════════════════════════════════════════════════════════════════════

class AvailabilityCreate(BaseModel):
    doctor_id: UUID
    day_of_week: int                # 0=Monday … 6=Sunday
    start_time: time
    end_time: time

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v):
        if not 0 <= v <= 6:
            raise ValueError("day_of_week must be 0 (Monday) to 6 (Sunday)")
        return v

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v


class AvailabilityUpdate(BaseModel):
    day_of_week: Optional[int] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class AvailabilityOut(BaseModel):
    id: UUID
    doctor_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  2.5 — Treatment Plans
# ══════════════════════════════════════════════════════════════════════════════

class TreatmentPlanCreate(BaseModel):
    patient_id: UUID
    diagnosis: str
    goals: Optional[List[Dict[str, Any]]] = None
    total_sessions: int = 12
    frequency_per_week: int = 3
    start_date: date
    end_date: Optional[date] = None


class TreatmentPlanUpdate(BaseModel):
    diagnosis: Optional[str] = None
    goals: Optional[List[Dict[str, Any]]] = None
    total_sessions: Optional[int] = None
    frequency_per_week: Optional[int] = None
    status: Optional[TreatmentPlanStatus] = None
    end_date: Optional[date] = None


class TreatmentPlanOut(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    diagnosis: str
    goals: Optional[List[Dict[str, Any]]] = None
    total_sessions: int
    frequency_per_week: int
    status: TreatmentPlanStatus
    start_date: date
    end_date: Optional[date] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExerciseCreate(BaseModel):
    exercise_name: str
    description: Optional[str] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration_seconds: Optional[int] = None
    resistance_kg: Optional[Decimal] = None
    frequency: Optional[str] = None
    video_url: Optional[str] = None
    instructions: Optional[str] = None
    order_index: int = 0


class ExerciseOut(BaseModel):
    id: UUID
    plan_id: UUID
    exercise_name: str
    description: Optional[str] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration_seconds: Optional[int] = None
    resistance_kg: Optional[Decimal] = None
    frequency: Optional[str] = None
    video_url: Optional[str] = None
    instructions: Optional[str] = None
    order_index: int

    model_config = {"from_attributes": True}


class SessionProgressCreate(BaseModel):
    appointment_id: Optional[UUID] = None
    session_number: int
    exercises_completed: Optional[List[Dict[str, Any]]] = None
    pain_before: Optional[int] = None
    pain_after: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("pain_before", "pain_after", mode="before")
    @classmethod
    def valid_pain(cls, v):
        if v is not None and not 0 <= v <= 10:
            raise ValueError("Pain score must be 0–10")
        return v


class SessionProgressOut(BaseModel):
    id: UUID
    plan_id: UUID
    appointment_id: Optional[UUID] = None
    session_number: int
    exercises_completed: Optional[List[Dict[str, Any]]] = None
    pain_before: Optional[int] = None
    pain_after: Optional[int] = None
    notes: Optional[str] = None
    therapist_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class MilestoneCreate(BaseModel):
    milestone_name: str
    target_date: date
    notes: Optional[str] = None


class MilestoneAchieve(BaseModel):
    achieved_date: date
    notes: Optional[str] = None


class MilestoneOut(BaseModel):
    id: UUID
    plan_id: UUID
    milestone_name: str
    target_date: date
    achieved_date: Optional[date] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  2.6 — Outcome Measures
# ══════════════════════════════════════════════════════════════════════════════

class OutcomeMeasureCreate(BaseModel):
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    measure_type: OutcomeMeasureType
    responses: Optional[Dict[str, Any]] = None
    total_score: Optional[Decimal] = None


class OutcomeMeasureOut(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    appointment_id: Optional[UUID] = None
    measure_type: OutcomeMeasureType
    responses: Optional[Dict[str, Any]] = None
    total_score: Optional[Decimal] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OutcomeTrendPoint(BaseModel):
    """Single data point for trend chart: date + score."""
    date: datetime
    score: Optional[Decimal]
    measure_type: OutcomeMeasureType


# ══════════════════════════════════════════════════════════════════════════════
#  2.7 — Service Catalog
# ══════════════════════════════════════════════════════════════════════════════

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_price: Decimal
    duration_min: int = 30
    category: ServiceCategory


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_price: Optional[Decimal] = None
    duration_min: Optional[int] = None
    category: Optional[ServiceCategory] = None
    is_active: Optional[bool] = None


class ServiceOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    default_price: Decimal
    duration_min: int
    category: ServiceCategory
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  Invoices & Payments
# ══════════════════════════════════════════════════════════════════════════════

class LineItem(BaseModel):
    service_name: str
    quantity: int = 1
    unit_price: Decimal
    subtotal: Decimal


class InvoiceCreate(BaseModel):
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    line_items: Optional[List[LineItem]] = None
    subtotal: Decimal
    discount: Decimal = Decimal("0")
    discount_percent: Optional[Decimal] = None
    tax_amount: Decimal = Decimal("0")
    total_amount: Decimal
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    """Only allowed when invoice is still PENDING."""
    line_items: Optional[List[LineItem]] = None
    subtotal: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    amount: Decimal
    method: PaymentMethod
    reference_number: Optional[str] = None


class PaymentOut(BaseModel):
    id: UUID
    invoice_id: UUID
    amount: Decimal
    method: PaymentMethod
    reference_number: Optional[str] = None
    payment_date: datetime

    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: UUID
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    invoice_number: str
    line_items: Optional[List[LineItem]] = None
    subtotal: Decimal
    discount: Decimal
    discount_percent: Optional[Decimal] = None
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    status: InvoiceStatus
    issued_at: datetime
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    payments: List[PaymentOut] = []

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  Prescriptions
# ══════════════════════════════════════════════════════════════════════════════

class MedicationItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None


class PrescriptionCreate(BaseModel):
    patient_id: UUID
    medications: List[MedicationItem]
    notes: Optional[str] = None
    valid_until: Optional[date] = None
    is_refillable: bool = False


class PrescriptionOut(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    medications: List[MedicationItem]
    notes: Optional[str] = None
    valid_until: Optional[date] = None
    is_refillable: bool
    pdf_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  Notifications
# ══════════════════════════════════════════════════════════════════════════════

class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
