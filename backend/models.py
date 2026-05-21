"""
models.py — SQLAlchemy ORM models for Rehab Swat CMS.

Phase 1 types:
  - JSON fields   → PortableJSONB  (JSONB on PG, JSON on SQLite)
  - Datetime      → DateTime(timezone=True)  → TIMESTAMPTZ on PostgreSQL
  - Currency      → Numeric(10, 2)           → exact decimal PKR
  - UUIDs         → PortableUUID  (native UUID on PG, String on SQLite)

Phase 2 additions:
  - DoctorAvailability  (2.4)
  - TreatmentPlan       (2.5)
  - TreatmentPlanExercise (2.5)
  - SessionProgress     (2.5)
  - TreatmentMilestone  (2.5)
  - OutcomeMeasure      (2.6)
  - Service             (2.7)
  - Invoice.discount_percent  (2.8)
  - Appointment.is_cancelled  (2.3)
"""
import enum
import uuid

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, ForeignKey, Integer,
    Numeric, String, Text, Time,
)
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import JSON, TypeDecorator

from database import Base


# ── Portable UUID type ────────────────────────────────────────────────────────
class PortableUUID(TypeDecorator):
    """UUID that works on both PostgreSQL (native) and SQLite (string)."""
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


# ── Portable JSONB type ───────────────────────────────────────────────────────
class PortableJSONB(TypeDecorator):
    """JSONB on PostgreSQL, JSON on SQLite."""
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


# ══════════════════════════════════════════════════════════════════════════════
#  Enum definitions
# ══════════════════════════════════════════════════════════════════════════════

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    DOCTOR = "DOCTOR"
    INTERN = "INTERN"
    RECEPTIONIST = "RECEPTIONIST"


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class AppointmentType(str, enum.Enum):
    INITIAL_ASSESSMENT = "INITIAL_ASSESSMENT"
    FOLLOW_UP = "FOLLOW_UP"
    REHAB_SESSION = "REHAB_SESSION"


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class InvoiceStatus(str, enum.Enum):
    PENDING = "PENDING"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    OVERDUE = "OVERDUE"


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CARD = "CARD"
    TRANSFER = "TRANSFER"
    E_WALLET = "E_WALLET"


# Phase 2 enums ───────────────────────────────────────────────────────────────

class TreatmentPlanStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"


class OutcomeMeasureType(str, enum.Enum):
    VAS = "VAS"
    KOOS = "KOOS"
    NDI = "NDI"
    DASH = "DASH"
    ODI = "ODI"
    PSFS = "PSFS"
    CUSTOM = "CUSTOM"


class ServiceCategory(str, enum.Enum):
    ASSESSMENT = "ASSESSMENT"
    THERAPY = "THERAPY"
    PROCEDURE = "PROCEDURE"
    PACKAGE = "PACKAGE"


class NotificationType(str, enum.Enum):
    EMR_REVIEW = "EMR_REVIEW"
    LOW_STOCK = "LOW_STOCK"
    OVERDUE_INVOICE = "OVERDUE_INVOICE"
    APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED"
    RECALL = "RECALL"
    GENERAL = "GENERAL"


# ══════════════════════════════════════════════════════════════════════════════
#  Phase 1 Models
# ══════════════════════════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLAlchemyEnum(UserRole, name="userrole"), nullable=False)
    full_name = Column(String(255), nullable=False)
    specialization = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    totp_secret = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    availability = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")


class RefreshToken(Base):
    """Opaque refresh tokens stored in DB for full revocability."""
    __tablename__ = "refresh_tokens"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(PortableUUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    mrn = Column(String(20), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False, index=True)
    dob = Column(Date, nullable=False)
    gender = Column(SQLAlchemyEnum(Gender, name="gender"), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    cnic = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    blood_group = Column(String(10), nullable=True)
    emergency_contact = Column(PortableJSONB, nullable=True)
    photo_url = Column(String(512), nullable=True)
    # Phase 1 & 2 additions
    allergies = Column(Text, nullable=True)
    chronic_conditions = Column(Text, nullable=True)
    medical_history = Column(PortableJSONB, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    appointments = relationship("Appointment", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient")
    invoices = relationship("Invoice", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    treatment_plans = relationship("TreatmentPlan", back_populates="patient")
    outcome_measures = relationship("OutcomeMeasure", back_populates="patient")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(PortableUUID, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(PortableUUID, ForeignKey("users.id"), nullable=True, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_min = Column(Integer, default=30, nullable=False)
    type = Column(SQLAlchemyEnum(AppointmentType, name="appointmenttype"), nullable=False)
    status = Column(SQLAlchemyEnum(AppointmentStatus, name="appointmentstatus"),
                    default=AppointmentStatus.SCHEDULED, nullable=False)
    notes = Column(Text, nullable=True)
    reminder_sent = Column(Boolean, default=False, nullable=False)
    same_day_reminder_sent = Column(Boolean, default=False, nullable=False)
    session_num = Column(Integer, default=1, nullable=False)
    # Phase 1 additions
    cancellation_reason = Column(Text, nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    # Phase 2.3 addition
    is_cancelled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("User")


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(PortableUUID, ForeignKey("patients.id"), nullable=False, index=True)
    appointment_id = Column(PortableUUID, ForeignKey("appointments.id"), nullable=True)
    doctor_id = Column(PortableUUID, ForeignKey("users.id"), nullable=False, index=True)

    vitals = Column(PortableJSONB, nullable=True)
    chief_complaint = Column(Text, nullable=True)
    subjective = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)
    diagnosis_codes = Column(PortableJSONB, nullable=True)
    physio_assessment = Column(PortableJSONB, nullable=True)
    is_finalized = Column(Boolean, default=False, nullable=False)
    is_draft = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    patient = relationship("Patient", back_populates="medical_records")
    doctor = relationship("User")
    appointment = relationship("Appointment")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(PortableUUID, ForeignKey("patients.id"), nullable=False, index=True)
    appointment_id = Column(PortableUUID, ForeignKey("appointments.id"), nullable=True)

    invoice_number = Column(String(30), unique=True, index=True, nullable=False)
    line_items = Column(PortableJSONB, nullable=True)

    subtotal = Column(Numeric(10, 2), default=0, nullable=False)
    discount = Column(Numeric(10, 2), default=0, nullable=False)
    # Phase 2.8: percentage-based discount (nullable — only one of discount/discount_percent used)
    discount_percent = Column(Numeric(5, 2), nullable=True)
    tax_amount = Column(Numeric(10, 2), default=0, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0, nullable=False)

    status = Column(SQLAlchemyEnum(InvoiceStatus, name="invoicestatus"),
                    default=InvoiceStatus.PENDING, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="invoices")
    appointment = relationship("Appointment")
    payments = relationship("Payment", back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    invoice_id = Column(PortableUUID, ForeignKey("invoices.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(SQLAlchemyEnum(PaymentMethod, name="paymentmethod"), nullable=False)
    reference_number = Column(String(100), nullable=True)
    payment_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="payments")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(PortableUUID, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(PortableUUID, ForeignKey("users.id"), nullable=False, index=True)

    medications = Column(PortableJSONB, nullable=False)
    notes = Column(Text, nullable=True)
    valid_until = Column(Date, nullable=True)
    is_refillable = Column(Boolean, default=False, nullable=False)
    pdf_url = Column(String(512), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("User")


# ══════════════════════════════════════════════════════════════════════════════
#  Phase 2 Models
# ══════════════════════════════════════════════════════════════════════════════

# ── 2.4 Doctor Availability ───────────────────────────────────────────────────

class DoctorAvailability(Base):
    """
    Weekly recurring availability window for a doctor.
    day_of_week: 0=Monday … 6=Sunday (matches Python datetime.weekday()).
    """
    __tablename__ = "doctor_availability"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    doctor_id = Column(PortableUUID, ForeignKey("users.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)   # 0 = Monday, 6 = Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    doctor = relationship("User", back_populates="availability")


# ── 2.5 Treatment Plans ───────────────────────────────────────────────────────

class TreatmentPlan(Base):
    __tablename__ = "treatment_plans"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(PortableUUID, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(PortableUUID, ForeignKey("users.id"), nullable=False, index=True)
    diagnosis = Column(Text, nullable=False)
    goals = Column(PortableJSONB, nullable=True)           # [{"goal": "...", "target": "..."}]
    total_sessions = Column(Integer, nullable=False, default=12)
    frequency_per_week = Column(Integer, nullable=False, default=3)
    status = Column(SQLAlchemyEnum(TreatmentPlanStatus, name="treatmentplanstatus"),
                    default=TreatmentPlanStatus.ACTIVE, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = relationship("Patient", back_populates="treatment_plans")
    doctor = relationship("User")
    exercises = relationship("TreatmentPlanExercise", back_populates="plan",
                             cascade="all, delete-orphan", order_by="TreatmentPlanExercise.order_index")
    sessions = relationship("SessionProgress", back_populates="plan",
                            cascade="all, delete-orphan")
    milestones = relationship("TreatmentMilestone", back_populates="plan",
                              cascade="all, delete-orphan")


class TreatmentPlanExercise(Base):
    __tablename__ = "treatment_plan_exercises"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    plan_id = Column(PortableUUID, ForeignKey("treatment_plans.id", ondelete="CASCADE"),
                     nullable=False, index=True)
    exercise_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sets = Column(Integer, nullable=True)
    reps = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    resistance_kg = Column(Numeric(6, 2), nullable=True)
    frequency = Column(String(100), nullable=True)   # e.g. "Daily", "3x/week"
    video_url = Column(String(512), nullable=True)
    instructions = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)

    plan = relationship("TreatmentPlan", back_populates="exercises")


class SessionProgress(Base):
    __tablename__ = "session_progress"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    plan_id = Column(PortableUUID, ForeignKey("treatment_plans.id", ondelete="CASCADE"),
                     nullable=False, index=True)
    appointment_id = Column(PortableUUID, ForeignKey("appointments.id"), nullable=True)
    session_number = Column(Integer, nullable=False)
    # JSONB: [{"exercise_id": "...", "sets_done": 3, "reps_done": 10, "notes": "..."}]
    exercises_completed = Column(PortableJSONB, nullable=True)
    pain_before = Column(Integer, nullable=True)   # 0–10 VAS
    pain_after = Column(Integer, nullable=True)    # 0–10 VAS
    notes = Column(Text, nullable=True)
    therapist_id = Column(PortableUUID, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    plan = relationship("TreatmentPlan", back_populates="sessions")
    therapist = relationship("User")
    appointment = relationship("Appointment")


class TreatmentMilestone(Base):
    __tablename__ = "treatment_milestones"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    plan_id = Column(PortableUUID, ForeignKey("treatment_plans.id", ondelete="CASCADE"),
                     nullable=False, index=True)
    milestone_name = Column(String(255), nullable=False)
    target_date = Column(Date, nullable=False)
    achieved_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    plan = relationship("TreatmentPlan", back_populates="milestones")


# ── 2.6 Outcome Measures ──────────────────────────────────────────────────────

class OutcomeMeasure(Base):
    __tablename__ = "outcome_measures"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(PortableUUID, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(PortableUUID, ForeignKey("users.id"), nullable=False, index=True)
    appointment_id = Column(PortableUUID, ForeignKey("appointments.id"), nullable=True)
    measure_type = Column(SQLAlchemyEnum(OutcomeMeasureType, name="outcomemeasuretype"),
                          nullable=False)
    # JSONB: raw responses e.g. {"q1": 3, "q2": 7} or {"items": [...]}
    responses = Column(PortableJSONB, nullable=True)
    total_score = Column(Numeric(6, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = relationship("Patient", back_populates="outcome_measures")
    doctor = relationship("User")
    appointment = relationship("Appointment")


# ── 2.7 Service Catalog ───────────────────────────────────────────────────────

class Service(Base):
    __tablename__ = "services"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    default_price = Column(Numeric(10, 2), nullable=False)
    duration_min = Column(Integer, nullable=False, default=30)
    category = Column(SQLAlchemyEnum(ServiceCategory, name="servicecategory"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ── 3.6 Internal Notifications ───────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(PortableUUID, primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(PortableUUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(SQLAlchemyEnum(NotificationType, name="notificationtype"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
