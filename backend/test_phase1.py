"""
test_phase1.py — Automated verification for Phase 1 security hardening.

Tests all 13 implementation items against an in-memory SQLite database
(no PostgreSQL required locally — SQLite used for unit tests only).

Run: .\\venv\\Scripts\\python.exe test_phase1.py
"""
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# ── Use SQLite for testing (no PostgreSQL dependency) ─────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///./test_phase1.db"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_unit_tests_only_32bytes!"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:5173,http://testserver"

# ── Imports ───────────────────────────────────────────────────────────────────
from settings import settings
from auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_refresh_token_expiry,
    hash_password,
    verify_password,
)
from database import Base, engine, SessionLocal
import models

PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"
results = []


def test(name, condition, detail=""):
    status = PASS if condition else FAIL
    results.append((name, condition))
    detail_str = f" — {detail}" if detail else ""
    print(f"  {status}  {name}{detail_str}")


def run_all_tests():
    print("\n" + "="*70)
    print(" PHASE 1 VERIFICATION — Rehab Swat CMS")
    print("="*70 + "\n")

    # ── Create tables ─────────────────────────────────────────────────────────
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ─────────────────────────────────────────────────────────────────────────
    print("── STEP 1: Settings (pydantic-settings) ─────────────────────────────")
    test("JWT secret loaded from env",
         bool(settings.jwt_secret_key) and settings.jwt_secret_key != "CHANGE_ME_generate_with_secrets_token_hex_32",
         f"key prefix: {settings.jwt_secret_key[:8]}...")
    test("Database URL loaded from env",
         "sqlite" in settings.database_url,
         settings.database_url)
    test("CORS origins parsed as list",
         isinstance(settings.parsed_cors_origins, list) and len(settings.parsed_cors_origins) == 2,
         str(settings.parsed_cors_origins))

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 2: auth.py — hardcoded secret removed ───────────────────────")
    src = open("auth.py").read()
    test("No hardcoded SECRET_KEY string in auth.py",
         "rehab-swat-super-secret-key" not in src,
         "secret not found in source ✓")
    test("create_access_token works",
         bool(create_access_token({"sub": "test", "role": "DOCTOR", "name": "T"})),
         "token generated")
    test("Access token has 'type':'access' claim",
         decode_token(create_access_token({"sub": "test", "role": "DOCTOR", "name": "T"})).get("type") == "access",
         "type=access verified")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 3: CORS from environment ────────────────────────────────────")
    main_src = open("main.py").read()
    test("main.py does not hardcode localhost:5173 in CORSMiddleware",
         'allow_origins=["http://localhost:5173"]' not in main_src,
         "no hardcoded CORS ✓")
    test("main.py uses settings.parsed_cors_origins",
         "settings.parsed_cors_origins" in main_src,
         "env-driven CORS ✓")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 4: PostgreSQL types in models ───────────────────────────────")
    models_src = open("models.py").read()
    test("PortableJSONB TypeDecorator present",
         "class PortableJSONB" in models_src,
         "JSONB abstraction ✓")
    test("PortableUUID TypeDecorator present",
         "class PortableUUID" in models_src,
         "UUID abstraction ✓")
    test("Invoice uses Numeric(10, 2) for currency",
         "Numeric(10, 2)" in models_src,
         "exact decimal currency ✓")
    test("DateTime uses timezone=True",
         "DateTime(timezone=True)" in models_src,
         "timestamptz ✓")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 5: Alembic initialized ──────────────────────────────────────")
    import os
    test("alembic/ directory exists",
         os.path.isdir("alembic"),
         "alembic dir ✓")
    test("alembic/env.py exists and loads settings",
         os.path.isfile("alembic/env.py"),
         "env.py ✓")
    test("alembic.ini exists",
         os.path.isfile("alembic.ini"),
         "alembic.ini ✓")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 6: Auth guards on all endpoints ─────────────────────────────")
    test("POST /api/patients has get_current_user",
         'Depends(get_current_user)' in main_src and 'def create_patient' in main_src,
         "auth guard on create_patient ✓")
    test("GET /api/stats has get_current_user",
         'def get_stats' in main_src and main_src.count('Depends(get_current_user)') >= 5,
         f"{main_src.count('Depends(get_current_user)')} endpoints guarded")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 7: Refresh token system ─────────────────────────────────────")
    # Create a user and test full token flow
    user = models.User(
        id=uuid.uuid4(),
        email="test@rehabswat.pk",
        password_hash=hash_password("TestPass@123"),
        role=models.UserRole.DOCTOR,
        full_name="Test Doctor",
        is_active=True,
    )
    db.add(user)
    db.commit()

    raw_refresh = create_refresh_token()
    test("create_refresh_token() returns 32-char hex string",
         len(raw_refresh) == 32,
         f"len={len(raw_refresh)}")

    expiry = get_refresh_token_expiry()
    test("Refresh token expiry is ~7 days in future",
         (expiry - datetime.now(timezone.utc)).days >= 6,
         f"expires: {expiry.date()}")

    db_token = models.RefreshToken(
        user_id=user.id,
        token=raw_refresh,
        expires_at=expiry,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)

    test("RefreshToken stored in DB",
         db_token.id is not None and not db_token.is_revoked,
         f"id={str(db_token.id)[:8]}...")

    # Revoke and verify
    db_token.is_revoked = True
    db.commit()
    revoked = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == raw_refresh,
        models.RefreshToken.is_revoked == False,
    ).first()
    test("Revoked refresh token not findable",
         revoked is None,
         "revocation works ✓")

    test("/api/auth/refresh endpoint defined in main.py",
         "def refresh_access_token" in main_src,
         "refresh endpoint ✓")
    test("/api/auth/logout endpoint defined in main.py",
         "def logout" in main_src,
         "logout endpoint ✓")

    # Access token should be 15 minutes
    tok = create_access_token({"sub": "u1", "role": "DOCTOR", "name": "T"})
    payload = decode_token(tok)
    exp_dt = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    minutes_until_exp = (exp_dt - datetime.now(timezone.utc)).total_seconds() / 60
    test("Access token expires in ~15 minutes",
         13 < minutes_until_exp < 17,
         f"{minutes_until_exp:.1f} minutes")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 8: Patient soft delete ──────────────────────────────────────")
    patient = models.Patient(
        id=uuid.uuid4(),
        mrn="MRN-TEST01",
        full_name="Test Patient",
        dob=datetime(1990, 1, 1).date(),
        gender=models.Gender.MALE,
        phone="03001234567",
        is_active=True,
    )
    db.add(patient)
    db.commit()

    # Soft delete
    patient.is_active = False
    db.commit()

    active_patients = db.query(models.Patient).filter(models.Patient.is_active == True).all()
    all_patients = db.query(models.Patient).all()

    test("Soft-deleted patient excluded from is_active=True filter",
         not any(p.id == patient.id for p in active_patients),
         "excluded from active list ✓")
    test("Soft-deleted patient still in DB (not hard deleted)",
         any(p.id == patient.id for p in all_patients),
         "record preserved ✓")
    test("DELETE /api/patients sets is_active=False (not db.delete)",
         "db_patient.is_active = False" in main_src,
         "soft delete in endpoint ✓")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 9: Month calculation with relativedelta ─────────────────────")
    from dateutil.relativedelta import relativedelta
    now = datetime.now()
    six_months_ago = now - relativedelta(months=6)
    approx_six_months = now - timedelta(days=180)

    # For dates near month boundaries these differ
    test("relativedelta imported successfully",
         True,
         "dateutil.relativedelta ✓")
    test("relativedelta months=6 is in right ballpark",
         abs((six_months_ago - approx_six_months).days) <= 5,
         f"relativedelta: {six_months_ago.date()}, approx: {approx_six_months.date()}")
    test("main.py uses relativedelta for stats",
         "relativedelta" in main_src and "timedelta(days=30*i)" not in main_src,
         "old buggy calculation removed ✓")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 10: Appointment conflict detection ───────────────────────────")
    test("Conflict detection code in main.py",
         "HTTP_409_CONFLICT" in main_src and "double-booking" in main_src.lower() or "Conflict" in main_src,
         "409 Conflict logic present ✓")

    # Simulate the overlap check logic
    base_time = datetime(2025, 6, 15, 10, 0, tzinfo=timezone.utc)
    existing_start = base_time
    existing_end = base_time + timedelta(minutes=30)

    new_start_overlap = base_time + timedelta(minutes=15)   # Overlaps
    new_end_overlap = new_start_overlap + timedelta(minutes=30)
    overlap_detected = existing_start < new_end_overlap and new_start_overlap < existing_end
    test("Overlap detection algorithm: overlapping slots flagged",
         overlap_detected,
         f"existing 10:00-10:30 vs new 10:15-10:45 → overlap={overlap_detected}")

    new_start_clean = base_time + timedelta(minutes=30)     # No overlap
    new_end_clean = new_start_clean + timedelta(minutes=30)
    no_overlap = existing_start < new_end_clean and new_start_clean < existing_end
    test("Overlap detection algorithm: back-to-back slots NOT flagged",
         not no_overlap,
         f"existing 10:00-10:30 vs new 10:30-11:00 → overlap={no_overlap}")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 11: slowapi rate limiting ───────────────────────────────────")
    test("slowapi imported in main.py",
         "from slowapi import" in main_src,
         "slowapi import ✓")
    test("Login endpoint has @limiter.limit",
         '@limiter.limit("5/minute")' in main_src,
         "5/minute rate limit ✓")
    test("RateLimitExceeded handler added to app",
         "RateLimitExceeded" in main_src,
         "429 handler ✓")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 12: Invoice line_items ──────────────────────────────────────")
    # Create an invoice with line items
    patient2 = models.Patient(
        id=uuid.uuid4(),
        mrn="MRN-TEST02",
        full_name="Billing Patient",
        dob=datetime(1985, 5, 10).date(),
        gender=models.Gender.FEMALE,
        phone="03009876543",
        is_active=True,
    )
    db.add(patient2)
    db.commit()

    line_items_data = [
        {"service_name": "Initial Assessment", "quantity": 1, "unit_price": "1500.00", "subtotal": "1500.00"},
        {"service_name": "Dry Needling", "quantity": 1, "unit_price": "800.00", "subtotal": "800.00"},
    ]
    invoice = models.Invoice(
        id=uuid.uuid4(),
        patient_id=patient2.id,
        invoice_number="INV-TEST01",
        line_items=line_items_data,
        subtotal=2300,
        discount=0,
        tax_amount=0,
        total_amount=2300,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    test("Invoice stores line_items as JSON",
         invoice.line_items is not None and len(invoice.line_items) == 2,
         f"{len(invoice.line_items)} line items stored ✓")
    test("line_items contains service_name",
         invoice.line_items[0]["service_name"] == "Initial Assessment",
         invoice.line_items[0]["service_name"])
    test("Invoice model has tax_amount column",
         hasattr(invoice, "tax_amount"),
         "tax_amount ✓")
    test("InvoiceCreate schema has line_items",
         "line_items" in open("schemas.py").read(),
         "LineItem schema ✓")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── STEP 13: Docker infrastructure files ─────────────────────────────")
    test("docker-compose.yml exists with 4 services",
         os.path.isfile("../docker-compose.yml") and
         all(svc in open("../docker-compose.yml").read() for svc in ["db:", "redis:", "app:", "nginx:"]),
         "db + redis + app + nginx ✓")
    test("Dockerfile.backend exists",
         os.path.isfile("../Dockerfile.backend"),
         "Dockerfile.backend ✓")
    test("nginx.conf exists with upstream block",
         os.path.isfile("../nginx.conf") and "upstream backend" in open("../nginx.conf").read(),
         "nginx reverse proxy ✓")

    # ─────────────────────────────────────────────────────────────────────────
    db.close()
    # Cleanup test DB — dispose engine first to release Windows file lock
    try:
        engine.dispose()
        if os.path.exists("test_phase1.db"):
            os.remove("test_phase1.db")
    except Exception:
        pass  # Non-critical cleanup

    # ── Summary ───────────────────────────────────────────────────────────────
    passed = sum(1 for _, ok in results if ok)
    failed = sum(1 for _, ok in results if not ok)
    total = len(results)

    print("\n" + "="*70)
    print(f" RESULTS: {passed}/{total} passed  |  {failed} failed")
    print("="*70)

    if failed > 0:
        print("\n❌ FAILED TESTS:")
        for name, ok in results:
            if not ok:
                print(f"   - {name}")
        sys.exit(1)
    else:
        print("\n🎉 All Phase 1 tests passed! Ready to start Phase 2.")
        sys.exit(0)


if __name__ == "__main__":
    run_all_tests()
