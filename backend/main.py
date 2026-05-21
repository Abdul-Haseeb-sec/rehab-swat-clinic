"""
main.py — FastAPI application for Rehab Swat CMS.

Phase 1 (security hardening):
  ✔ CORS from env | auth guards | refresh token system | soft delete
  ✔ relativedelta stats | conflict detection | slowapi | line_items

Phase 2 (feature expansion):
  ✔ 2.1 Staff CRUD — POST/GET/PUT /api/users, POST /api/users/{id}/deactivate
  ✔ 2.2 Patient search + 409 duplicate detection
  ✔ 2.3 Appointment cancel, reschedule, date filter, doctor filter, today
  ✔ 2.4 Doctor availability model + appointment booking validation
  ✔ 2.5 Treatment plans, exercises, sessions, milestones
  ✔ 2.6 Outcome measures + trend endpoint
  ✔ 2.7 Service catalog CRUD
  ✔ 2.8 Invoice overdue list, PUT update (PENDING only), discount_percent
"""
import uuid
from datetime import datetime, timedelta, timezone, time as dt_time

from dateutil.relativedelta import relativedelta
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import and_, func as sql_func, or_
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

import models
import schemas
from auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_refresh_token_expiry,
    hash_password,
    oauth2_scheme,
    verify_password,
)
from database import engine, get_db
from settings import settings
import sentry_sdk

# ── Sentry Error Tracking (Phase 5) ───────────────────────────────────────────
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.2,
        environment=settings.environment,
    )

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[])

# ── App & middleware ───────────────────────────────────────────────────────────
app = FastAPI(
    title="Rehab Swat CMS API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Security Headers Middleware (Phase 5) ─────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# create_all for local dev; production uses alembic upgrade head at container start
models.Base.metadata.create_all(bind=engine)


# ── Health Check (Phase 5) ───────────────────────────────────────────────────
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    from fastapi import Response
    response = Response()
    
    db_status = "error"
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        pass

    redis_status = "error"
    try:
        import redis
        r = redis.Redis.from_url(settings.redis_url, socket_timeout=1.0)
        r.ping()
        redis_status = "connected"
    except Exception:
        pass

    is_sqlite = settings.database_url.startswith("sqlite")
    if db_status == "connected" and (redis_status == "connected" or is_sqlite):
        status_str = "ok"
    else:
        status_str = "error"

    # We want to return the response status code and JSON content
    # In FastAPI, returning a dictionary with an active custom Response parameter works, 
    # but to be 100% standard and robust, we can use a custom JSONResponse if we want to override status_code.
    # Let's import JSONResponse from fastapi.responses!
    from fastapi.responses import JSONResponse
    
    status_code = 200 if status_str == "ok" else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status_str,
            "environment": settings.environment,
            "database": db_status,
            "redis": redis_status,
        }
    )


# ══════════════════════════════════════════════════════════════════════════════
#  Role-based dependency helpers
# ══════════════════════════════════════════════════════════════════════════════

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_doctor(cu: models.User = Depends(get_current_user)) -> models.User:
    if cu.role not in {models.UserRole.DOCTOR, models.UserRole.SUPER_ADMIN}:
        raise HTTPException(status_code=403, detail="Doctor access required")
    return cu


def require_admin(cu: models.User = Depends(get_current_user)) -> models.User:
    if cu.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return cu


def require_billing_access(cu: models.User = Depends(get_current_user)) -> models.User:
    if cu.role not in {models.UserRole.SUPER_ADMIN, models.UserRole.RECEPTIONIST}:
        raise HTTPException(status_code=403, detail="Billing access restricted to Admin and Receptionist")
    return cu


# ══════════════════════════════════════════════════════════════════════════════
#  Internal helpers
# ══════════════════════════════════════════════════════════════════════════════

def _check_appointment_conflict(
    db: Session,
    doctor_id: UUID,
    scheduled_at: datetime,
    duration_min: int,
    exclude_id: Optional[UUID] = None,
):
    """
    Raise 409 if the doctor has an overlapping non-cancelled appointment.
    Python-side overlap: existing.start < new.end AND new.start < existing.end
    """
    appt_end = scheduled_at + timedelta(minutes=duration_min)
    # Fetch a conservative window — anything within 4 hours
    candidates = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.doctor_id == doctor_id,
            models.Appointment.is_cancelled == False,
            models.Appointment.status != models.AppointmentStatus.CANCELLED,
            models.Appointment.scheduled_at >= scheduled_at - timedelta(hours=4),
            models.Appointment.scheduled_at < appt_end + timedelta(hours=4),
        )
    )
    if exclude_id:
        candidates = candidates.filter(models.Appointment.id != exclude_id)

    for existing in candidates.all():
        existing_end = existing.scheduled_at + timedelta(minutes=existing.duration_min)
        
        # Strip tzinfo for SQLite/PostgreSQL safe comparison
        ext_start = existing.scheduled_at.replace(tzinfo=None) if existing.scheduled_at.tzinfo else existing.scheduled_at
        ext_end = existing_end.replace(tzinfo=None) if existing_end.tzinfo else existing_end
        new_start = scheduled_at.replace(tzinfo=None) if scheduled_at.tzinfo else scheduled_at
        new_end = appt_end.replace(tzinfo=None) if appt_end.tzinfo else appt_end

        if ext_start < new_end and new_start < ext_end:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Doctor already has an appointment from "
                    f"{existing.scheduled_at.strftime('%H:%M')} to "
                    f"{existing_end.strftime('%H:%M')}. Choose a different slot."
                ),
            )


def _check_doctor_availability(db: Session, doctor_id: UUID, scheduled_at: datetime, duration_min: int):
    """
    Validate that the requested slot falls within the doctor's working hours.
    If NO availability is configured for that doctor, booking is always allowed.
    If availability IS configured, the slot must fall within a window for that day.
    Returns 422 if outside working hours.
    """
    day = scheduled_at.weekday()  # 0=Monday … 6=Sunday
    windows = (
        db.query(models.DoctorAvailability)
        .filter(
            models.DoctorAvailability.doctor_id == doctor_id,
            models.DoctorAvailability.day_of_week == day,
        )
        .all()
    )
    if not windows:
        return  # No availability configured — allow booking

    slot_start = scheduled_at.time()
    slot_end = (scheduled_at + timedelta(minutes=duration_min)).time()

    for w in windows:
        if w.start_time <= slot_start and slot_end <= w.end_time:
            return  # Slot fits within this window

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    windows_str = ", ".join(f"{w.start_time.strftime('%H:%M')}–{w.end_time.strftime('%H:%M')}" for w in windows)
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=(
            f"Requested time {slot_start.strftime('%H:%M')}–{slot_end.strftime('%H:%M')} is outside "
            f"Dr.'s availability on {day_names[day]}: {windows_str}."
        ),
    )


def create_notification(db: Session, user_id: UUID, type: models.NotificationType, title: str, message: str) -> models.Notification:
    db_notif = models.Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        is_read=False,
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif


# ══════════════════════════════════════════════════════════════════════════════
#  Seed default accounts on startup
# ══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
def startup_tasks():
    # 1. Seed admin accounts
    from database import SessionLocal
    db = SessionLocal()
    try:
        if not db.query(models.User).filter(models.User.email == "admin@rehabswat.pk").first():
            db.add(models.User(
                email="admin@rehabswat.pk",
                password_hash=hash_password("Admin@12345"),
                role=models.UserRole.SUPER_ADMIN,
                full_name="Super Admin",
                is_active=True,
            ))
            db.add(models.User(
                email="dr.yaqoob@rehabswat.pk",
                password_hash=hash_password("Doctor@12345"),
                role=models.UserRole.DOCTOR,
                full_name="Dr. Mian Yaqoob Jan",
                specialization="Physiotherapy",
                is_active=True,
            ))
            db.commit()
    finally:
        db.close()

    # 2. Automatically launch browser when running as a packaged desktop app
    import sys
    import os
    import webbrowser
    from threading import Timer

    is_packaged = hasattr(sys, '_MEIPASS')
    should_open = is_packaged or os.getenv("AUTO_OPEN_BROWSER", "false").lower() == "true"
    
    if should_open:
        def open_browser():
            webbrowser.open("http://localhost:8000")
        
        # Delay by 1.5 seconds so Uvicorn listener is fully active
        Timer(1.5, open_browser).start()



# ══════════════════════════════════════════════════════════════════════════════
#  Health
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/")
def read_root():
    import os
    dist_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
    if os.path.exists(dist_path):
        from fastapi.responses import FileResponse
        return FileResponse(os.path.join(dist_path, "index.html"))
    return {"status": "ok", "message": "Rehab Swat CMS API v2.0.0"}


# ══════════════════════════════════════════════════════════════════════════════
#  Auth endpoints
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    access_token = create_access_token(
        {"sub": str(user.id), "role": user.role.value, "name": user.full_name}
    )
    raw_refresh = create_refresh_token()
    db.add(models.RefreshToken(
        user_id=user.id,
        token=raw_refresh,
        expires_at=get_refresh_token_expiry(),
    ))
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    return schemas.TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        role=user.role.value,
        name=user.full_name,
    )


@app.post("/api/auth/refresh", response_model=schemas.TokenResponse)
def refresh_access_token(body: schemas.RefreshRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    db_token = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.token == body.refresh_token,
            models.RefreshToken.is_revoked == False,
            models.RefreshToken.expires_at > now,
        )
        .first()
    )
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    db_token.is_revoked = True
    new_access = create_access_token({"sub": str(user.id), "role": user.role.value, "name": user.full_name})
    new_raw = create_refresh_token()
    db.add(models.RefreshToken(user_id=user.id, token=new_raw, expires_at=get_refresh_token_expiry()))
    db.commit()

    return schemas.TokenResponse(
        access_token=new_access,
        refresh_token=new_raw,
        role=user.role.value,
        name=user.full_name,
    )


@app.post("/api/auth/logout", status_code=204)
def logout(body: schemas.LogoutRequest, db: Session = Depends(get_db)):
    db_token = db.query(models.RefreshToken).filter(models.RefreshToken.token == body.refresh_token).first()
    if db_token:
        db_token.is_revoked = True
        db.commit()


@app.get("/api/auth/me", response_model=schemas.UserOut)
def me(cu: models.User = Depends(get_current_user)):
    return cu


# ══════════════════════════════════════════════════════════════════════════════
#  2.1 — Staff / User management (SUPER_ADMIN only for create/deactivate)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/users", response_model=schemas.UserOut, status_code=201)
def create_staff(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    db_user = models.User(
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role,
        full_name=user.full_name,
        specialization=user.specialization,
        phone=user.phone,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/api/users", response_model=List[schemas.UserOut])
def list_staff(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.User)
    if role:
        try:
            role_enum = models.UserRole(role.upper())
            q = q.filter(models.User.role == role_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    return q.order_by(models.User.full_name).all()


@app.get("/api/users/{user_id}", response_model=schemas.UserOut)
def get_staff(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.put("/api/users/{user_id}", response_model=schemas.UserOut)
def update_staff(
    user_id: UUID,
    body: schemas.UserUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/users/{user_id}/deactivate", status_code=200)
def deactivate_staff(
    user_id: UUID,
    db: Session = Depends(get_db),
    cu: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == cu.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = False
    db.commit()
    return {"message": f"User {user.full_name} deactivated successfully"}


# ══════════════════════════════════════════════════════════════════════════════
#  Stats (guarded)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    import calendar
    total_patients = db.query(sql_func.count(models.Patient.id)).filter(
        models.Patient.is_active == True
    ).scalar()
    total_appointments = db.query(sql_func.count(models.Appointment.id)).scalar()

    now = datetime.now(timezone.utc)
    today_date = now.date()
    today_appointments = db.query(sql_func.count(models.Appointment.id)).filter(
        sql_func.date(models.Appointment.scheduled_at) == today_date
    ).scalar()

    invoices = db.query(models.Invoice).all()
    appointments = db.query(models.Appointment).all()

    months, revenue_data, appointments_data = [], [], []
    for i in range(5, -1, -1):
        d = now - relativedelta(months=i)
        months.append(calendar.month_abbr[d.month])
        revenue_data.append(sum(float(inv.total_amount) for inv in invoices
                                if inv.issued_at and inv.issued_at.month == d.month and inv.issued_at.year == d.year))
        appointments_data.append(sum(1 for appt in appointments
                                     if appt.scheduled_at and appt.scheduled_at.month == d.month and appt.scheduled_at.year == d.year))

    return {
        "total_patients": total_patients,
        "total_appointments": total_appointments,
        "today_appointments": today_appointments,
        "chart_labels": months,
        "chart_revenue": revenue_data,
        "chart_appointments": appointments_data,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  Patients — 2.2 search + duplicate detection
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/patients", response_model=schemas.PatientOut, status_code=201)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    # 2.2: Duplicate detection — same full_name + phone, is_active=True → 409
    duplicate = db.query(models.Patient).filter(
        sql_func.lower(models.Patient.full_name) == patient.full_name.lower(),
        models.Patient.phone == patient.phone,
        models.Patient.is_active == True,
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An active patient named '{duplicate.full_name}' with phone {duplicate.phone} "
                f"already exists (MRN: {duplicate.mrn}). "
                "If this is a different patient, use a unique phone number."
            ),
        )

    mrn = f"MRN-{uuid.uuid4().hex[:6].upper()}"
    db_patient = models.Patient(**patient.model_dump(), mrn=mrn)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@app.get("/api/patients", response_model=List[schemas.PatientOut])
def get_patients(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """
    2.2: Case-insensitive search on full_name, MRN, and phone.
    Only returns active patients.
    """
    q = db.query(models.Patient).filter(models.Patient.is_active == True)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            models.Patient.full_name.ilike(like),
            models.Patient.mrn.ilike(like),
            models.Patient.phone.ilike(like),
        ))
    return q.order_by(models.Patient.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/patients/{patient_id}", response_model=schemas.PatientOut)
def get_patient(
    patient_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@app.put("/api/patients/{patient_id}", response_model=schemas.PatientOut)
def update_patient(
    patient_id: UUID,
    patient: schemas.PatientUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for k, v in patient.model_dump(exclude_unset=True).items():
        setattr(db_patient, k, v)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@app.delete("/api/patients/{patient_id}", status_code=204)
def delete_patient(
    patient_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db_patient.is_active = False
    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
#  Medical Records
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/medical-records", response_model=schemas.MedicalRecordOut, status_code=201)
def create_medical_record(
    record: schemas.MedicalRecordCreate,
    db: Session = Depends(get_db),
    cu: models.User = Depends(require_doctor),
):
    db_record = models.MedicalRecord(**record.model_dump(), doctor_id=cu.id)
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@app.get("/api/medical-records/patient/{patient_id}", response_model=List[schemas.MedicalRecordOut])
def get_patient_medical_records(
    patient_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.MedicalRecord)
        .filter(models.MedicalRecord.patient_id == patient_id)
        .order_by(models.MedicalRecord.created_at.desc())
        .all()
    )


# ══════════════════════════════════════════════════════════════════════════════
#  Appointments — 2.3 enhancements
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/appointments", response_model=schemas.AppointmentOut, status_code=201)
def create_appointment(
    appt: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    if appt.doctor_id:
        # 2.4: Check working-hours availability first
        _check_doctor_availability(db, appt.doctor_id, appt.scheduled_at, appt.duration_min)
        # Phase 1: Conflict detection
        _check_appointment_conflict(db, appt.doctor_id, appt.scheduled_at, appt.duration_min)

    db_appt = models.Appointment(**appt.model_dump())
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt


@app.get("/api/appointments/today", response_model=List[schemas.AppointmentOut])
def get_todays_appointments(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    today = datetime.now(timezone.utc).date()
    return (
        db.query(models.Appointment)
        .filter(sql_func.date(models.Appointment.scheduled_at) == today)
        .order_by(models.Appointment.scheduled_at)
        .all()
    )


@app.get("/api/appointments/doctor/{doctor_id}", response_model=List[schemas.AppointmentOut])
def get_doctor_appointments(
    doctor_id: UUID,
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor_id)
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d").date()
            q = q.filter(sql_func.date(models.Appointment.scheduled_at) == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD")
    return q.order_by(models.Appointment.scheduled_at).all()


@app.get("/api/appointments", response_model=List[schemas.AppointmentOut])
def get_appointments(
    skip: int = 0,
    limit: int = 100,
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.Appointment)
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d").date()
            q = q.filter(sql_func.date(models.Appointment.scheduled_at) == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD")
    return q.order_by(models.Appointment.scheduled_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/appointments/patient/{patient_id}", response_model=List[schemas.AppointmentOut])
def get_patient_appointments(
    patient_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Appointment)
        .filter(models.Appointment.patient_id == patient_id)
        .order_by(models.Appointment.scheduled_at.desc())
        .all()
    )


@app.put("/api/appointments/{appt_id}/status")
def update_appointment_status(
    appt_id: UUID,
    new_status: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    db_appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not db_appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db_appt.status = new_status
    db.commit()
    db.refresh(db_appt)
    return db_appt


@app.post("/api/appointments/{appt_id}/cancel", response_model=schemas.AppointmentOut)
def cancel_appointment(
    appt_id: UUID,
    body: schemas.AppointmentCancel,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """2.3: Soft-cancel — sets is_cancelled=True, status=CANCELLED, stores reason."""
    db_appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not db_appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if db_appt.is_cancelled:
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")

    db_appt.is_cancelled = True
    db_appt.status = models.AppointmentStatus.CANCELLED
    db_appt.cancellation_reason = body.cancellation_reason
    db.commit()
    db.refresh(db_appt)

    if db_appt.doctor_id:
        create_notification(
            db=db,
            user_id=db_appt.doctor_id,
            type=models.NotificationType.APPOINTMENT_CANCELLED,
            title="Appointment Cancelled",
            message=f"Appointment for patient {db_appt.patient.full_name} scheduled at {db_appt.scheduled_at.strftime('%Y-%m-%d %H:%M')} has been cancelled. Reason: {body.cancellation_reason}",
        )

    return db_appt


@app.post("/api/appointments/{appt_id}/reschedule", response_model=schemas.AppointmentOut)
def reschedule_appointment(
    appt_id: UUID,
    body: schemas.AppointmentReschedule,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """2.3: Move appointment to a new datetime — re-runs conflict + availability checks."""
    db_appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not db_appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if db_appt.is_cancelled:
        raise HTTPException(status_code=400, detail="Cannot reschedule a cancelled appointment")

    new_duration = body.duration_min or db_appt.duration_min

    if db_appt.doctor_id:
        _check_doctor_availability(db, db_appt.doctor_id, body.scheduled_at, new_duration)
        _check_appointment_conflict(db, db_appt.doctor_id, body.scheduled_at, new_duration,
                                    exclude_id=appt_id)

    db_appt.scheduled_at = body.scheduled_at
    db_appt.duration_min = new_duration
    db_appt.status = models.AppointmentStatus.SCHEDULED
    db.commit()
    db.refresh(db_appt)
    return db_appt


# ══════════════════════════════════════════════════════════════════════════════
#  2.4 — Doctor Availability
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/availability", response_model=schemas.AvailabilityOut, status_code=201)
def create_availability(
    body: schemas.AvailabilityCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    # Verify doctor exists
    if not db.query(models.User).filter(models.User.id == body.doctor_id).first():
        raise HTTPException(status_code=404, detail="Doctor not found")

    db_avail = models.DoctorAvailability(**body.model_dump())
    db.add(db_avail)
    db.commit()
    db.refresh(db_avail)
    return db_avail


@app.get("/api/availability/doctor/{doctor_id}", response_model=List[schemas.AvailabilityOut])
def get_doctor_availability(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.DoctorAvailability)
        .filter(models.DoctorAvailability.doctor_id == doctor_id)
        .order_by(models.DoctorAvailability.day_of_week, models.DoctorAvailability.start_time)
        .all()
    )


@app.put("/api/availability/{avail_id}", response_model=schemas.AvailabilityOut)
def update_availability(
    avail_id: UUID,
    body: schemas.AvailabilityUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_avail = db.query(models.DoctorAvailability).filter(models.DoctorAvailability.id == avail_id).first()
    if not db_avail:
        raise HTTPException(status_code=404, detail="Availability record not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(db_avail, k, v)
    db.commit()
    db.refresh(db_avail)
    return db_avail


@app.delete("/api/availability/{avail_id}", status_code=204)
def delete_availability(
    avail_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    db_avail = db.query(models.DoctorAvailability).filter(models.DoctorAvailability.id == avail_id).first()
    if not db_avail:
        raise HTTPException(status_code=404, detail="Availability record not found")
    db.delete(db_avail)
    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
#  2.5 — Treatment Plans
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/treatment-plans", response_model=schemas.TreatmentPlanOut, status_code=201)
def create_treatment_plan(
    body: schemas.TreatmentPlanCreate,
    db: Session = Depends(get_db),
    cu: models.User = Depends(require_doctor),
):
    plan = models.TreatmentPlan(**body.model_dump(), doctor_id=cu.id)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@app.get("/api/treatment-plans/patient/{patient_id}", response_model=List[schemas.TreatmentPlanOut])
def get_patient_treatment_plans(
    patient_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.TreatmentPlan)
        .filter(models.TreatmentPlan.patient_id == patient_id)
        .order_by(models.TreatmentPlan.created_at.desc())
        .all()
    )


@app.get("/api/treatment-plans/{plan_id}", response_model=schemas.TreatmentPlanOut)
def get_treatment_plan(
    plan_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    plan = db.query(models.TreatmentPlan).filter(models.TreatmentPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found")
    return plan


@app.put("/api/treatment-plans/{plan_id}", response_model=schemas.TreatmentPlanOut)
def update_treatment_plan(
    plan_id: UUID,
    body: schemas.TreatmentPlanUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_doctor),
):
    plan = db.query(models.TreatmentPlan).filter(models.TreatmentPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found")
    
    old_status = plan.status
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)

    if body.status == models.TreatmentPlanStatus.COMPLETED and old_status != models.TreatmentPlanStatus.COMPLETED:
        from tasks.clinical import schedule_patient_recall
        schedule_patient_recall.delay(str(plan.id))

    return plan


# Exercises

@app.post("/api/treatment-plans/{plan_id}/exercises", response_model=schemas.ExerciseOut, status_code=201)
def add_exercise(
    plan_id: UUID,
    body: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_doctor),
):
    plan = db.query(models.TreatmentPlan).filter(models.TreatmentPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found")
    ex = models.TreatmentPlanExercise(**body.model_dump(), plan_id=plan_id)
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@app.get("/api/treatment-plans/{plan_id}/exercises", response_model=List[schemas.ExerciseOut])
def get_exercises(
    plan_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.TreatmentPlanExercise)
        .filter(models.TreatmentPlanExercise.plan_id == plan_id)
        .order_by(models.TreatmentPlanExercise.order_index)
        .all()
    )


# Sessions

@app.post("/api/treatment-plans/{plan_id}/sessions", response_model=schemas.SessionProgressOut, status_code=201)
def log_session(
    plan_id: UUID,
    body: schemas.SessionProgressCreate,
    db: Session = Depends(get_db),
    cu: models.User = Depends(get_current_user),
):
    plan = db.query(models.TreatmentPlan).filter(models.TreatmentPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found")
    session = models.SessionProgress(**body.model_dump(), plan_id=plan_id, therapist_id=cu.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@app.get("/api/treatment-plans/{plan_id}/sessions", response_model=List[schemas.SessionProgressOut])
def get_sessions(
    plan_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.SessionProgress)
        .filter(models.SessionProgress.plan_id == plan_id)
        .order_by(models.SessionProgress.session_number)
        .all()
    )


# Milestones

@app.post("/api/treatment-plans/{plan_id}/milestones", response_model=schemas.MilestoneOut, status_code=201)
def add_milestone(
    plan_id: UUID,
    body: schemas.MilestoneCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_doctor),
):
    plan = db.query(models.TreatmentPlan).filter(models.TreatmentPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found")
    ms = models.TreatmentMilestone(**body.model_dump(), plan_id=plan_id)
    db.add(ms)
    db.commit()
    db.refresh(ms)
    return ms


@app.put("/api/treatment-plans/{plan_id}/milestones/{mid}/achieve", response_model=schemas.MilestoneOut)
def achieve_milestone(
    plan_id: UUID,
    mid: UUID,
    body: schemas.MilestoneAchieve,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_doctor),
):
    ms = db.query(models.TreatmentMilestone).filter(
        models.TreatmentMilestone.id == mid,
        models.TreatmentMilestone.plan_id == plan_id,
    ).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")
    ms.achieved_date = body.achieved_date
    if body.notes:
        ms.notes = body.notes
    db.commit()
    db.refresh(ms)
    return ms


# ══════════════════════════════════════════════════════════════════════════════
#  2.6 — Outcome Measures
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/outcome-measures", response_model=schemas.OutcomeMeasureOut, status_code=201)
def create_outcome_measure(
    body: schemas.OutcomeMeasureCreate,
    db: Session = Depends(get_db),
    cu: models.User = Depends(require_doctor),
):
    om = models.OutcomeMeasure(**body.model_dump(), doctor_id=cu.id)
    db.add(om)
    db.commit()
    db.refresh(om)
    return om


@app.get("/api/outcome-measures/patient/{patient_id}", response_model=List[schemas.OutcomeMeasureOut])
def get_patient_outcome_measures(
    patient_id: UUID,
    measure_type: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.OutcomeMeasure).filter(models.OutcomeMeasure.patient_id == patient_id)
    if measure_type:
        try:
            mt = models.OutcomeMeasureType(measure_type.upper())
            q = q.filter(models.OutcomeMeasure.measure_type == mt)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid measure_type: {measure_type}")
    return q.order_by(models.OutcomeMeasure.created_at.desc()).all()


@app.get("/api/outcome-measures/patient/{patient_id}/trend", response_model=List[schemas.OutcomeTrendPoint])
def get_outcome_trend(
    patient_id: UUID,
    measure_type: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """2.6: Returns list of {date, score, measure_type} for trend charting."""
    q = db.query(models.OutcomeMeasure).filter(models.OutcomeMeasure.patient_id == patient_id)
    if measure_type:
        try:
            mt = models.OutcomeMeasureType(measure_type.upper())
            q = q.filter(models.OutcomeMeasure.measure_type == mt)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid measure_type: {measure_type}")
    records = q.order_by(models.OutcomeMeasure.created_at).all()
    return [
        schemas.OutcomeTrendPoint(date=r.created_at, score=r.total_score, measure_type=r.measure_type)
        for r in records
    ]


# ══════════════════════════════════════════════════════════════════════════════
#  2.7 — Service Catalog
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/services", response_model=schemas.ServiceOut, status_code=201)
def create_service(
    body: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    if db.query(models.Service).filter(
        sql_func.lower(models.Service.name) == body.name.lower()
    ).first():
        raise HTTPException(status_code=409, detail=f"A service named '{body.name}' already exists")
    svc = models.Service(**body.model_dump())
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@app.get("/api/services", response_model=List[schemas.ServiceOut])
def list_services(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.Service)
    if active_only:
        q = q.filter(models.Service.is_active == True)
    if category:
        try:
            cat = models.ServiceCategory(category.upper())
            q = q.filter(models.Service.category == cat)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    return q.order_by(models.Service.name).all()


@app.get("/api/services/{service_id}", response_model=schemas.ServiceOut)
def get_service(
    service_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc


@app.put("/api/services/{service_id}", response_model=schemas.ServiceOut)
def update_service(
    service_id: UUID,
    body: schemas.ServiceUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(svc, k, v)
    db.commit()
    db.refresh(svc)
    return svc


@app.delete("/api/services/{service_id}", status_code=204)
def delete_service(
    service_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    svc.is_active = False   # Soft deactivation — preserves historical invoice references
    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
#  Invoices & Payments — 2.8 overdue + PUT update + discount_percent
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/invoices", response_model=schemas.InvoiceOut, status_code=201)
def create_invoice(
    invoice: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_billing_access),
):
    inv_num = f"INV-{uuid.uuid4().hex[:6].upper()}"
    line_items_data = [item.model_dump(mode="json") for item in invoice.line_items] if invoice.line_items else None
    db_invoice = models.Invoice(
        patient_id=invoice.patient_id,
        appointment_id=invoice.appointment_id,
        invoice_number=inv_num,
        line_items=line_items_data,
        subtotal=invoice.subtotal,
        discount=invoice.discount,
        discount_percent=invoice.discount_percent,
        tax_amount=invoice.tax_amount,
        total_amount=invoice.total_amount,
        due_date=invoice.due_date,
        notes=invoice.notes,
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@app.get("/api/invoices/overdue", response_model=List[schemas.InvoiceOut])
def get_overdue_invoices(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_billing_access),
):
    """2.8: Return invoices where due_date < today and status is not PAID/CANCELLED."""
    now = datetime.now(timezone.utc)
    return (
        db.query(models.Invoice)
        .filter(
            models.Invoice.due_date < now,
            models.Invoice.status.in_([models.InvoiceStatus.PENDING, models.InvoiceStatus.PARTIAL]),
        )
        .order_by(models.Invoice.due_date)
        .all()
    )


@app.get("/api/invoices", response_model=List[schemas.InvoiceOut])
def get_invoices(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Invoice)
        .order_by(models.Invoice.issued_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@app.get("/api/invoices/patient/{patient_id}", response_model=List[schemas.InvoiceOut])
def get_patient_invoices(
    patient_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Invoice)
        .filter(models.Invoice.patient_id == patient_id)
        .order_by(models.Invoice.issued_at.desc())
        .all()
    )


@app.get("/api/invoices/{invoice_id}", response_model=schemas.InvoiceOut)
def get_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@app.put("/api/invoices/{invoice_id}", response_model=schemas.InvoiceOut)
def update_invoice(
    invoice_id: UUID,
    body: schemas.InvoiceUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_billing_access),
):
    """2.8: Edit an invoice — only allowed if status is PENDING."""
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status != models.InvoiceStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invoice cannot be edited — current status is '{inv.status.value}'. Only PENDING invoices can be modified.",
        )
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "line_items" and v is not None:
            v = [item.model_dump(mode="json") for item in v]
        setattr(inv, k, v)
    db.commit()
    db.refresh(inv)
    return inv


@app.post("/api/invoices/{invoice_id}/payments", response_model=schemas.PaymentOut, status_code=201)
def record_payment(
    invoice_id: UUID,
    payment: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_billing_access),
):
    db_invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db_payment = models.Payment(**payment.model_dump(), invoice_id=invoice_id)
    db.add(db_payment)
    db_invoice.amount_paid = (db_invoice.amount_paid or 0) + payment.amount
    if db_invoice.amount_paid >= db_invoice.total_amount:
        db_invoice.status = models.InvoiceStatus.PAID
    elif db_invoice.amount_paid > 0:
        db_invoice.status = models.InvoiceStatus.PARTIAL
    db.commit()
    db.refresh(db_payment)
    return db_payment


# ══════════════════════════════════════════════════════════════════════════════
#  Prescriptions
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/prescriptions", response_model=schemas.PrescriptionOut, status_code=201)
def create_prescription(
    prescription: schemas.PrescriptionCreate,
    db: Session = Depends(get_db),
    cu: models.User = Depends(require_doctor),
):
    medications_data = [m.model_dump(mode="json") for m in prescription.medications]
    db_prescription = models.Prescription(
        patient_id=prescription.patient_id,
        doctor_id=cu.id,
        medications=medications_data,
        notes=prescription.notes,
        valid_until=prescription.valid_until,
        is_refillable=prescription.is_refillable,
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    return db_prescription


@app.get("/api/prescriptions/patient/{patient_id}", response_model=List[schemas.PrescriptionOut])
def get_patient_prescriptions(
    patient_id: UUID,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Prescription)
        .filter(models.Prescription.patient_id == patient_id)
        .order_by(models.Prescription.created_at.desc())
        .all()
    )


# ══════════════════════════════════════════════════════════════════════════════
#  Notifications
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/notifications", response_model=List[schemas.NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    cu: models.User = Depends(get_current_user),
):
    """Retrieve current user's unread notifications, newest first."""
    return (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == cu.id,
            models.Notification.is_read == False,
        )
        .order_by(models.Notification.created_at.desc())
        .all()
    )


@app.get("/api/notifications/all", response_model=List[schemas.NotificationOut])
def get_all_notifications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    cu: models.User = Depends(get_current_user),
):
    """Retrieve all user notifications paginated."""
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == cu.id)
        .order_by(models.Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@app.put("/api/notifications/{id}/read", response_model=schemas.NotificationOut)
def mark_notification_read(
    id: UUID,
    db: Session = Depends(get_db),
    cu: models.User = Depends(get_current_user),
):
    """Mark a notification as read."""
    notif = db.query(models.Notification).filter(
        models.Notification.id == id,
        models.Notification.user_id == cu.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@app.put("/api/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    cu: models.User = Depends(get_current_user),
):
    """Mark all notifications as read for current user."""
    db.query(models.Notification).filter(
        models.Notification.user_id == cu.id,
        models.Notification.is_read == False,
    ).update({models.Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}


# ── Serve React Frontend SPA ──────────────────────────────────────────────────
# This mounts the static frontend output assets compiled via Vite.
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

dist_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

if os.path.exists(dist_path):
    # Mount build assets (JS, CSS, etc.) under /assets
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    # Serve static assets that live at root level
    @app.get("/favicon.svg", include_in_schema=False)
    def serve_favicon():
        return FileResponse(os.path.join(dist_path, "favicon.svg"))

    @app.get("/icons.svg", include_in_schema=False)
    def serve_icons():
        return FileResponse(os.path.join(dist_path, "icons.svg"))

    # Serve the React Single Page Application (SPA) on all unmatched routes
    @app.get("/{catchall:path}", include_in_schema=False)
    def serve_spa(catchall: str):
        # Let API requests fail naturally with 404 if they don't match any route
        if catchall.startswith("api/") or catchall.startswith("api"):
            raise HTTPException(status_code=404, detail="API Route Not Found")
        return FileResponse(os.path.join(dist_path, "index.html"))


if __name__ == "__main__":
    import uvicorn
    import sys
    import socket
    import webbrowser
    from threading import Timer

    def is_port_in_use(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('127.0.0.1', port)) == 0

    def find_free_port(start_port: int = 8000, max_attempts: int = 100) -> int:
        for port in range(start_port, start_port + max_attempts):
            if not is_port_in_use(port):
                return port
        s = socket.socket()
        s.bind(('', 0))
        port = s.getsockname()[1]
        s.close()
        return port

    def open_browser(port: int):
        print(f"[RehabSwat] Launching default web browser...", flush=True)
        webbrowser.open(f"http://localhost:{port}")

    # Determine free port
    port = find_free_port(8000)
    
    # Start a timer to open the browser shortly after the server starts
    Timer(1.5, open_browser, args=[port]).start()
    
    # Packaged execution
    print("[RehabSwat] Starting Clinic Management System Desktop Server...", flush=True)
    print(f"[RehabSwat] Access local app at: http://localhost:{port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port)


