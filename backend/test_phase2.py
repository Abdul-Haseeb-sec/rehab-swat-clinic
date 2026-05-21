"""
test_phase2.py — Automated verification for Phase 2 feature expansion.

Tests all 8 implementation items against an in-memory SQLite database using TestClient.

Run: .\\venv\\Scripts\\python.exe test_phase2.py
"""
import os
import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

# ── Use SQLite for testing (no PostgreSQL dependency) ─────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///./test_phase2.db"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_unit_tests_only_32bytes!"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:5173,http://testserver"

from fastapi.testclient import TestClient

from database import Base, engine, SessionLocal
import models
import schemas
from main import app
from auth import hash_password

PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"
results = []


def test(name, condition, detail=""):
    status = PASS if condition else FAIL
    results.append((name, condition))
    detail_str = f" — {detail}" if detail else ""
    print(f"  {status}  {name}{detail_str}")


def run_all_tests():
    print("\n" + "=" * 70)
    print(" PHASE 2 VERIFICATION — Rehab Swat CMS")
    print("=" * 70 + "\n")

    # ── Create tables & seed admin ────────────────────────────────────────────
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Pre-seed Admin (SUPER_ADMIN)
    admin_id = uuid.uuid4()
    admin_user = models.User(
        id=admin_id,
        email="admin@rehabswat.pk",
        password_hash=hash_password("Admin@12345"),
        role=models.UserRole.SUPER_ADMIN,
        full_name="Super Admin",
        is_active=True,
    )
    db.add(admin_user)

    # Pre-seed Receptionist (RECEPTIONIST)
    recept_id = uuid.uuid4()
    recept_user = models.User(
        id=recept_id,
        email="recept@rehabswat.pk",
        password_hash=hash_password("Recept@12345"),
        role=models.UserRole.RECEPTIONIST,
        full_name="Receptionist User",
        is_active=True,
    )
    db.add(recept_user)

    db.commit()
    db.close()

    # Create client
    client = TestClient(app)

    # Helper: Get auth headers
    def get_headers(email, password):
        resp = client.post(
            "/api/auth/login",
            data={"username": email, "password": password},
        )
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    admin_headers = get_headers("admin@rehabswat.pk", "Admin@12345")
    recept_headers = get_headers("recept@rehabswat.pk", "Recept@12345")

    # ─────────────────────────────────────────────────────────────────────────
    print("── 2.1 Staff CRUD (admin only) ──────────────────────────────────────")
    # Admin can create staff
    doctor_email = f"doctor_{uuid.uuid4().hex[:6]}@rehabswat.pk"
    doctor_payload = {
        "email": doctor_email,
        "password": "Doctor@12345",
        "role": "DOCTOR",
        "full_name": "Dr. Fazal Rahim",
        "specialization": "Orthopedic Rehab",
        "phone": "03339123456",
    }
    resp = client.post("/api/users", json=doctor_payload, headers=admin_headers)
    test("Admin can create new staff (Doctor)", resp.status_code == 201, f"Status: {resp.status_code}")
    doctor_id = resp.json()["id"]

    # Receptionist cannot create staff
    bad_pay = {
        "email": "hacker@rehabswat.pk",
        "password": "Hacker@12345",
        "role": "DOCTOR",
        "full_name": "Dr. Hacker",
    }
    resp_recept = client.post("/api/users", json=bad_pay, headers=recept_headers)
    test("Receptionist blocked from creating staff (403)", resp_recept.status_code == 403, f"Status: {resp_recept.status_code}")

    # List staff
    resp = client.get("/api/users", headers=admin_headers)
    test("List all staff members", resp.status_code == 200 and len(resp.json()) >= 3, f"Found: {len(resp.json())}")

    # Get staff by ID
    resp = client.get(f"/api/users/{doctor_id}", headers=recept_headers)
    test("Get staff details by ID", resp.status_code == 200 and resp.json()["full_name"] == "Dr. Fazal Rahim", resp.json().get("full_name"))

    # Update staff (admin only)
    update_payload = {"specialization": "Pediatric Physiotherapy"}
    resp = client.put(f"/api/users/{doctor_id}", json=update_payload, headers=admin_headers)
    test("Admin can update staff details", resp.status_code == 200 and resp.json()["specialization"] == "Pediatric Physiotherapy")

    # Deactivate staff (admin only)
    resp = client.post(f"/api/users/{doctor_id}/deactivate", headers=admin_headers)
    test("Admin can deactivate staff", resp.status_code == 200, f"Deactivated Dr. Fazal Rahim")
    # Verify inactive staff is inactive
    resp = client.get(f"/api/users/{doctor_id}", headers=admin_headers)
    test("Deactivated staff is_active is False", resp.json()["is_active"] is False)

    # Reactivate to let them log in for doctor availability tests
    db = SessionLocal()
    db.query(models.User).filter(models.User.id == uuid.UUID(doctor_id)).update({"is_active": True})
    db.commit()
    db.close()
    doctor_headers = get_headers(doctor_email, "Doctor@12345")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 2.2 Patient enhancements ─────────────────────────────────────────")
    # Create patient with custom fields
    patient_payload = {
        "full_name": "Sher Ali Khan",
        "dob": "1994-08-15",
        "gender": "MALE",
        "phone": "03459876543",
        "cnic": "15602-1234567-1",
        "address": "Mingora, Swat",
        "allergies": "Penicillin, Sulfa drugs",
        "chronic_conditions": "Hypertension",
        "medical_history": {"surgeries": ["Appendectomy (2018)"]},
    }
    resp = client.post("/api/patients", json=patient_payload, headers=recept_headers)
    test("Create patient with medical history, allergies, chronic conditions", resp.status_code == 201)
    patient_id = resp.json()["id"]
    mrn = resp.json()["mrn"]

    # Duplicate detection (same full_name AND phone)
    resp_dup = client.post("/api/patients", json=patient_payload, headers=recept_headers)
    test("Duplicate patient detection active (409)", resp_dup.status_code == 409, f"Msg: {resp_dup.json().get('detail')}")

    # Case-insensitive search on name
    resp_s1 = client.get("/api/patients?search=sher", headers=recept_headers)
    test("Search by full_name (case-insensitive)", len(resp_s1.json()) == 1 and resp_s1.json()[0]["id"] == patient_id)

    # Case-insensitive search on MRN
    resp_s2 = client.get(f"/api/patients?search={mrn[:8].lower()}", headers=recept_headers)
    test("Search by MRN (case-insensitive)", len(resp_s2.json()) == 1 and resp_s2.json()[0]["id"] == patient_id)

    # Case-insensitive search on Phone
    resp_s3 = client.get(f"/api/patients?search=9876", headers=recept_headers)
    test("Search by Phone substring", len(resp_s3.json()) == 1 and resp_s3.json()[0]["id"] == patient_id)

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 2.3 & 2.4 Doctor Availability & Appointment enhancements ─────────")
    # Verify no availability set allows booking by default
    appt_dt = datetime.now(timezone.utc) + timedelta(days=2)
    # Align appt_dt to doctor availability later (say Tuesday, which is day 1)
    # Let's target Tuesday, 10:00 AM
    tuesday_date = date.today() + timedelta(days=(1 - date.today().weekday()) % 7)
    if tuesday_date <= date.today():
        tuesday_date += timedelta(days=7)
    target_dt = datetime.combine(tuesday_date, time(10, 0, 0), tzinfo=timezone.utc)

    appt_payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "scheduled_at": target_dt.isoformat(),
        "duration_min": 30,
        "type": "INITIAL_ASSESSMENT",
        "notes": "Leg pain",
    }
    resp = client.post("/api/appointments", json=appt_payload, headers=recept_headers)
    test("Book appointment without doctor availability configured (allowed)", resp.status_code == 201)
    appt_id = resp.json()["id"]

    # Configure doctor availability: Day 1 (Tuesday) 09:00 - 12:00
    avail_payload = {
        "doctor_id": doctor_id,
        "day_of_week": 1,
        "start_time": "09:00:00",
        "end_time": "12:00:00",
    }
    resp_avail = client.post("/api/availability", json=avail_payload, headers=admin_headers)
    test("Admin can configure doctor availability", resp_avail.status_code == 201)
    avail_id = resp_avail.json()["id"]

    # Book another appointment: falls WITHIN doctor availability (Tuesday 11:00 AM)
    appt_payload2 = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "scheduled_at": datetime.combine(tuesday_date, time(11, 0, 0), tzinfo=timezone.utc).isoformat(),
        "duration_min": 30,
        "type": "FOLLOW_UP",
    }
    resp = client.post("/api/appointments", json=appt_payload2, headers=recept_headers)
    test("Book appointment WITHIN doctor availability (allowed)", resp.status_code == 201)
    appt_id2 = resp.json()["id"]

    # Book another appointment: falls OUTSIDE doctor availability (Tuesday 08:30 AM)
    appt_payload_bad = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "scheduled_at": datetime.combine(tuesday_date, time(8, 30, 0), tzinfo=timezone.utc).isoformat(),
        "duration_min": 30,
        "type": "FOLLOW_UP",
    }
    resp = client.post("/api/appointments", json=appt_payload_bad, headers=recept_headers)
    test("Book appointment OUTSIDE doctor availability (blocked 422)", resp.status_code == 422, f"Msg: {resp.json().get('detail')}")

    # Conflict check: Book appointment overlapping with appt_id2 (Tuesday 11:15 AM)
    appt_payload_overlap = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "scheduled_at": datetime.combine(tuesday_date, time(11, 15, 0), tzinfo=timezone.utc).isoformat(),
        "duration_min": 30,
        "type": "FOLLOW_UP",
    }
    resp = client.post("/api/appointments", json=appt_payload_overlap, headers=recept_headers)
    test("Book appointment overlapping with existing (blocked 409)", resp.status_code == 409)

    # Cancel appointment (soft cancel)
    cancel_payload = {"cancellation_reason": "Patient changed mind"}
    resp = client.post(f"/api/appointments/{appt_id}/cancel", json=cancel_payload, headers=recept_headers)
    test("Cancel appointment soft-cancellation works", resp.status_code == 200 and resp.json()["is_cancelled"] is True and resp.json()["status"] == "CANCELLED")

    # Reschedule appointment (within availability and without conflict)
    # Move appt_id2 to 11:30 AM on Tuesday
    resched_payload = {
        "scheduled_at": datetime.combine(tuesday_date, time(11, 30, 0), tzinfo=timezone.utc).isoformat(),
    }
    resp = client.post(f"/api/appointments/{appt_id2}/reschedule", json=resched_payload, headers=recept_headers)
    test("Reschedule appointment successfully", resp.status_code == 200 and "11:30" in resp.json()["scheduled_at"])

    # GET Filter endpoints
    # Today's appointments
    resp = client.get("/api/appointments/today", headers=recept_headers)
    test("GET /api/appointments/today returns list", resp.status_code == 200, f"Found: {len(resp.json())}")

    # Specific date YYYY-MM-DD
    resp = client.get(f"/api/appointments?date={tuesday_date.isoformat()}", headers=recept_headers)
    test("GET /api/appointments?date= filter works", resp.status_code == 200 and len(resp.json()) >= 1, f"Found: {len(resp.json())}")

    # Doctor specific list
    resp = client.get(f"/api/appointments/doctor/{doctor_id}?date={tuesday_date.isoformat()}", headers=recept_headers)
    test("GET /api/appointments/doctor/{id} filter works", resp.status_code == 200 and len(resp.json()) >= 1, f"Found: {len(resp.json())}")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 2.5 Treatment Plans ──────────────────────────────────────────────")
    # POST /api/treatment-plans
    plan_payload = {
        "patient_id": patient_id,
        "diagnosis": "L4-L5 Disc Herniation with Radiculopathy",
        "goals": [{"goal": "Reduce pain score below 3/10", "target": "4 weeks"}, {"goal": "Restore lumber flexion to 60 deg", "target": "6 weeks"}],
        "total_sessions": 12,
        "frequency_per_week": 3,
        "start_date": tuesday_date.isoformat(),
        "end_date": (tuesday_date + timedelta(weeks=4)).isoformat(),
    }
    resp = client.post("/api/treatment-plans", json=plan_payload, headers=doctor_headers)
    test("Create Treatment Plan", resp.status_code == 201, resp.json().get("diagnosis"))
    plan_id = resp.json()["id"]

    # GET /api/treatment-plans/patient/{patient_id}
    resp = client.get(f"/api/treatment-plans/patient/{patient_id}", headers=recept_headers)
    test("Get patient's treatment plans list", resp.status_code == 200 and len(resp.json()) == 1)

    # GET /api/treatment-plans/{plan_id}
    resp = client.get(f"/api/treatment-plans/{plan_id}", headers=recept_headers)
    test("Get specific treatment plan by ID", resp.status_code == 200 and resp.json()["diagnosis"] == "L4-L5 Disc Herniation with Radiculopathy")

    # PUT /api/treatment-plans/{plan_id}
    update_plan = {"total_sessions": 15}
    resp = client.put(f"/api/treatment-plans/{plan_id}", json=update_plan, headers=doctor_headers)
    test("Update treatment plan details", resp.status_code == 200 and resp.json()["total_sessions"] == 15)

    # Add Exercise
    ex_payload = {
        "exercise_name": "McKenzie Extension in Lying",
        "description": "Prone press-ups, arching lower back",
        "sets": 3,
        "reps": 10,
        "duration_seconds": 15,
        "resistance_kg": 0.0,
        "frequency": "3x daily",
        "video_url": "https://youtube.com/watch?v=mckenzie",
        "instructions": "Keep pelvis flat on table, press chest up using arms.",
        "order_index": 1,
    }
    resp = client.post(f"/api/treatment-plans/{plan_id}/exercises", json=ex_payload, headers=doctor_headers)
    test("Add Exercise to Treatment Plan", resp.status_code == 201, resp.json().get("exercise_name"))
    exercise_id = resp.json()["id"]

    # GET exercises
    resp = client.get(f"/api/treatment-plans/{plan_id}/exercises", headers=recept_headers)
    test("Get exercises list of plan", resp.status_code == 200 and len(resp.json()) == 1)

    # POST Session Progress
    session_payload = {
        "appointment_id": appt_id2,
        "session_number": 1,
        "exercises_completed": [{"exercise_id": exercise_id, "sets_done": 3, "reps_done": 10}],
        "pain_before": 7,
        "pain_after": 4,
        "notes": "Patient tolerated exercise well. Significant relief after 3rd set.",
    }
    resp = client.post(f"/api/treatment-plans/{plan_id}/sessions", json=session_payload, headers=doctor_headers)
    test("Log Session Progress", resp.status_code == 201, f"Pain improvement: 7 -> 4")

    # GET sessions
    resp = client.get(f"/api/treatment-plans/{plan_id}/sessions", headers=recept_headers)
    test("Get sessions list of plan", resp.status_code == 200 and len(resp.json()) == 1)

    # POST Milestones
    milestone_payload = {
        "milestone_name": "Walk 1km pain free",
        "target_date": (tuesday_date + timedelta(weeks=2)).isoformat(),
        "notes": "Patient wants to resume walking routine",
    }
    resp = client.post(f"/api/treatment-plans/{plan_id}/milestones", json=milestone_payload, headers=doctor_headers)
    test("Add Milestone to Treatment Plan", resp.status_code == 201, resp.json().get("milestone_name"))
    milestone_id = resp.json()["id"]

    # PUT Milestone achieved
    achieve_payload = {
        "achieved_date": tuesday_date.isoformat(),
        "notes": "Achieved early! Excellent progress.",
    }
    resp = client.put(f"/api/treatment-plans/{plan_id}/milestones/{milestone_id}/achieve", json=achieve_payload, headers=doctor_headers)
    test("Mark Milestone achieved", resp.status_code == 200 and resp.json()["achieved_date"] == tuesday_date.isoformat())

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 2.6 Outcome Measures ─────────────────────────────────────────────")
    # POST Outcome Measure
    om_payload = {
        "patient_id": patient_id,
        "appointment_id": appt_id2,
        "measure_type": "VAS",
        "responses": {"pain_level": 6},
        "total_score": 6.0,
    }
    resp = client.post("/api/outcome-measures", json=om_payload, headers=doctor_headers)
    test("Log Outcome Measure (VAS)", resp.status_code == 201, f"Score: {resp.json().get('total_score')}")

    # GET outcome measures list
    resp = client.get(f"/api/outcome-measures/patient/{patient_id}", headers=recept_headers)
    test("Get patient outcome measures list", resp.status_code == 200 and len(resp.json()) == 1)

    # GET outcome trend
    resp = client.get(f"/api/outcome-measures/patient/{patient_id}/trend?measure_type=VAS", headers=recept_headers)
    test("Get patient outcome measure trend for charting", resp.status_code == 200 and len(resp.json()) == 1 and resp.json()[0]["score"] == "6.00")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 2.7 Service Catalog ──────────────────────────────────────────────")
    # POST /api/services
    svc_payload = {
        "name": "Spinal Mobilization",
        "description": "Manual therapy targeting lumbar joints",
        "default_price": 2500.0,
        "duration_min": 45,
        "category": "PROCEDURE",
    }
    resp = client.post("/api/services", json=svc_payload, headers=admin_headers)
    test("Admin can create catalog service", resp.status_code == 201, resp.json().get("name"))
    service_id = resp.json()["id"]

    # GET /api/services
    resp = client.get("/api/services", headers=recept_headers)
    test("List all active services", resp.status_code == 200 and len(resp.json()) == 1)

    # GET /api/services/{id}
    resp = client.get(f"/api/services/{service_id}", headers=recept_headers)
    test("Get service details by ID", resp.status_code == 200 and resp.json()["duration_min"] == 45)

    # PUT /api/services/{id}
    svc_update = {"default_price": 2800.0}
    resp = client.put(f"/api/services/{service_id}", json=svc_update, headers=admin_headers)
    test("Admin can update service details", resp.status_code == 200 and resp.json()["default_price"] == "2800.00")

    # DELETE /api/services/{id}
    resp = client.delete(f"/api/services/{service_id}", headers=admin_headers)
    test("Admin can delete service (soft delete)", resp.status_code == 204)
    # Check that service is_active=False
    resp = client.get(f"/api/services/{service_id}", headers=admin_headers)
    test("Soft-deleted service is_active is False", resp.json()["is_active"] is False)

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 2.8 Invoice enhancements ─────────────────────────────────────────")
    # Create Invoice with discount_percent and due_date in past (overdue)
    overdue_due = datetime.now(timezone.utc) - timedelta(days=2)
    inv_payload = {
        "patient_id": patient_id,
        "appointment_id": appt_id2,
        "line_items": [{"service_name": "Spinal Mobilization", "quantity": 1, "unit_price": 2800.0, "subtotal": 2800.0}],
        "subtotal": 2800.0,
        "discount": 0.0,
        "discount_percent": 10.0,  # 10% discount
        "tax_amount": 0.0,
        "total_amount": 2520.0,
        "due_date": overdue_due.isoformat(),
        "notes": "10% off for Swat local promotion",
    }
    resp = client.post("/api/invoices", json=inv_payload, headers=recept_headers)
    test("Create invoice with discount_percent and due date", resp.status_code == 201)
    invoice_id = resp.json()["id"]

    # GET /api/invoices/overdue
    resp = client.get("/api/invoices/overdue", headers=recept_headers)
    test("Get overdue invoices list", resp.status_code == 200 and len(resp.json()) == 1 and resp.json()[0]["id"] == invoice_id)

    # Edit invoice when PENDING
    inv_update = {"notes": "Updated promo discount note"}
    resp = client.put(f"/api/invoices/{invoice_id}", json=inv_update, headers=recept_headers)
    test("Edit PENDING invoice successfully", resp.status_code == 200 and resp.json()["notes"] == "Updated promo discount note")

    # Record payment to pay off invoice
    pay_payload = {
        "amount": 2520.0,
        "method": "CASH",
        "reference_number": "TXN-9998",
    }
    resp = client.post(f"/api/invoices/{invoice_id}/payments", json=pay_payload, headers=recept_headers)
    test("Record payment of invoice (marks PAID)", resp.status_code == 201)

    # Edit PAID invoice (should be blocked with 422)
    resp = client.put(f"/api/invoices/{invoice_id}", json=inv_update, headers=recept_headers)
    test("Edit non-PENDING invoice is BLOCKED (422)", resp.status_code == 422, f"Status: {resp.status_code}")

    # ─────────────────────────────────────────────────────────────────────────
    # Cleanup DB
    try:
        engine.dispose()
        if os.path.exists("test_phase2.db"):
            os.remove("test_phase2.db")
    except Exception:
        pass

    # ── Summary ───────────────────────────────────────────────────────────────
    passed = sum(1 for _, ok in results if ok)
    failed = sum(1 for _, ok in results if not ok)
    total = len(results)

    print("\n" + "=" * 70)
    print(f" RESULTS: {passed}/{total} passed  |  {failed} failed")
    print("=" * 70)

    if failed > 0:
        print("\n❌ FAILED TESTS:")
        for name, ok in results:
            if not ok:
                print(f"   - {name}")
        sys.exit(1)
    else:
        print("\n🎉 All Phase 2 features verified successfully!")
        sys.exit(0)


if __name__ == "__main__":
    run_all_tests()
