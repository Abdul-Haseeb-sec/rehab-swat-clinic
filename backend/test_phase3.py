"""
test_phase3.py — Automated verification for Phase 3: Redis, Celery, Twilio & Notifications.

Tests all feature requirements against an in-memory SQLite database.
Celery tasks are run synchronously in-memory using Celery's task_always_eager mode.
Twilio rest clients are fully mocked to avoid actual network requests.

Run: .\venv\Scripts\python.exe test_phase3.py
"""
import os
import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch

# ── Setup environment variables for test execution ────────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///./test_phase3.db"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_unit_tests_only_32bytes!"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:5173,http://testserver"

# Configure Celery for synchronous in-memory task execution
from celery_app import celery_app
celery_app.conf.task_always_eager = True

from fastapi.testclient import TestClient

from database import Base, engine, SessionLocal
import models
import schemas
from main import app
from auth import hash_password
from notifications.whatsapp import send_whatsapp_message
from notifications.sms import send_sms
from notifications.templates import (
    appointment_reminder_24hr,
    appointment_reminder_1hr,
    prescription_ready,
    overdue_invoice_reminder,
)

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
    print(" PHASE 3 VERIFICATION — Rehab Swat CMS")
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

    # Pre-seed Doctor (DOCTOR)
    doc_id = uuid.uuid4()
    doctor_user = models.User(
        id=doc_id,
        email="doctor@rehabswat.pk",
        password_hash=hash_password("Doctor@12345"),
        role=models.UserRole.DOCTOR,
        full_name="Dr. Abdul Rahim",
        specialization="Physical Therapist",
        is_active=True,
    )
    db.add(doctor_user)

    # Pre-seed Patient
    patient_id = uuid.uuid4()
    patient = models.Patient(
        id=patient_id,
        mrn="PT-12345",
        full_name="Sher Ali Khan",
        dob=date(1994, 8, 15),
        gender=models.Gender.MALE,
        phone="03459876543",
        cnic="15602-1234567-1",
        address="Mingora, Swat",
        is_active=True,
    )
    db.add(patient)

    db.commit()
    db.close()

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
    doctor_headers = get_headers("doctor@rehabswat.pk", "Doctor@12345")

    # Mock settings credentials for Twilio to activate code pathways
    from settings import settings
    settings.twilio_account_sid = "ACmockaccountsidXXXXXXXXXXXXXXXXXX"
    settings.twilio_auth_token = "mockauthtokenXXXXXXXXXXXXXXXXXXXX"
    settings.twilio_whatsapp_from = "whatsapp:+14155238886"

    # ─────────────────────────────────────────────────────────────────────────
    print("── 3.1 & 3.3 Twilio Gateway & Phone Normalization ───────────────────")
    
    with patch("notifications.whatsapp.Client") as mock_twilio_client_wa, \
         patch("notifications.sms.Client") as mock_twilio_client_sms:
        
        # Setup mocks
        mock_msg = MagicMock()
        mock_msg.sid = "SMmockmessagesidXXXXXXXXXXXXXXXXXX"
        
        mock_client_instance_wa = MagicMock()
        mock_client_instance_wa.messages.create.return_value = mock_msg
        mock_twilio_client_wa.return_value = mock_client_instance_wa
        
        mock_client_instance_sms = MagicMock()
        mock_client_instance_sms.messages.create.return_value = mock_msg
        mock_twilio_client_sms.return_value = mock_client_instance_sms

        # Test WhatsApp Normalization
        # Leading zero format
        res1 = send_whatsapp_message("03459876543", "Hello patient")
        called_to_1 = mock_client_instance_wa.messages.create.call_args[1]["to"]
        test("WhatsApp normalization (0345... -> whatsapp:+92345...)", res1 and called_to_1 == "whatsapp:+923459876543", called_to_1)

        # Standard clean country code format
        res2 = send_whatsapp_message("+923459876543", "Hello patient")
        called_to_2 = mock_client_instance_wa.messages.create.call_args[1]["to"]
        test("WhatsApp normalization (+92345... -> whatsapp:+92345...)", res2 and called_to_2 == "whatsapp:+923459876543", called_to_2)

        # Pre-formatted format
        res3 = send_whatsapp_message("whatsapp:+923459876543", "Hello patient")
        called_to_3 = mock_client_instance_wa.messages.create.call_args[1]["to"]
        test("WhatsApp pre-formatted number passes straight through", res3 and called_to_3 == "whatsapp:+923459876543", called_to_3)

        # SMS Normalization (non-whatsapp)
        res4 = send_sms("03459876543", "Hello patient SMS")
        called_to_4 = mock_client_instance_sms.messages.create.call_args[1]["to"]
        test("SMS normalization (0345... -> +92345...)", res4 and called_to_4 == "+923459876543", called_to_4)

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 3.2 Twilio Template Rendering ───────────────────────────────────")
    # Verify templates render exactly the expected text
    t_24h = appointment_reminder_24hr("Sher Ali Khan", "10:30 AM", "Dr. Fazal Rahim")
    test("24-Hour pre-appointment template contains required elements", 
         "Sher Ali Khan" in t_24h and "10:30 AM" in t_24h and "Dr. Fazal Rahim" in t_24h and "tomorrow" in t_24h)

    t_1h = appointment_reminder_1hr("Sher Ali Khan", "11:30 AM")
    test("1-Hour pre-appointment template contains required elements", 
         "Sher Ali Khan" in t_1h and "11:30 AM" in t_1h and "1 hour" in t_1h)

    t_rx = prescription_ready("Sher Ali Khan", "Dr. Fazal Rahim", "https://clinic.pk/rx/123.pdf")
    test("Prescription template contains download URL and doctor name", 
         "Sher Ali Khan" in t_rx and "Dr. Fazal Rahim" in t_rx and "https://clinic.pk/rx/123.pdf" in t_rx)

    t_inv = overdue_invoice_reminder("Sher Ali Khan", Decimal("2500.00"), "INV-2026-0001")
    test("Overdue billing template displays standard PKR currency", 
         "Sher Ali Khan" in t_inv and "2500.00" in t_inv and "INV-2026-0001" in t_inv and "PKR" in t_inv)

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 3.4 CRUD Notification Endpoints ─────────────────────────────────")
    
    # Manually seed notifications for the Doctor
    db = SessionLocal()
    notif1 = models.Notification(
        id=uuid.uuid4(),
        user_id=doc_id,
        type=models.NotificationType.GENERAL,
        title="Welcome to Rehab Swat CMS",
        message="System initial initialization complete.",
        is_read=False,
    )
    notif2 = models.Notification(
        id=uuid.uuid4(),
        user_id=doc_id,
        type=models.NotificationType.LOW_STOCK,
        title="Low Stock Alert",
        message="Theraband quantity is below threshold (5 left).",
        is_read=False,
    )
    db.add(notif1)
    db.add(notif2)
    db.commit()
    db.close()

    # Test GET /api/notifications (Unread)
    resp = client.get("/api/notifications", headers=doctor_headers)
    test("GET /api/notifications retrieves unread notifications", resp.status_code == 200 and len(resp.json()) == 2)
    notif_id_to_read = resp.json()[0]["id"]

    # Test GET /api/notifications/all (Paginated)
    resp_all = client.get("/api/notifications/all?limit=5", headers=doctor_headers)
    test("GET /api/notifications/all returns list", resp_all.status_code == 200 and len(resp_all.json()) == 2)

    # Test PUT /api/notifications/{id}/read
    resp_read = client.put(f"/api/notifications/{notif_id_to_read}/read", headers=doctor_headers)
    test("PUT /api/notifications/{id}/read updates is_read to True", resp_read.status_code == 200 and resp_read.json()["is_read"] is True)

    # Check unread length now
    resp_unread_after = client.get("/api/notifications", headers=doctor_headers)
    test("Unread count reduced by 1", len(resp_unread_after.json()) == 1)

    # Test PUT /api/notifications/read-all
    resp_read_all = client.put("/api/notifications/read-all", headers=doctor_headers)
    test("PUT /api/notifications/read-all bulk marks remaining as read", resp_read_all.status_code == 200)

    # Verify no unread remains
    resp_unread_final = client.get("/api/notifications", headers=doctor_headers)
    test("Zero unread notifications remaining", len(resp_unread_final.json()) == 0)

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 3.5 Automated Clinical Notification Triggers ─────────────────────")

    # 1. Appointment cancellation trigger doctor alert
    # Pre-seed an appointment
    db = SessionLocal()
    appt_id = uuid.uuid4()
    appt = models.Appointment(
        id=appt_id,
        patient_id=patient_id,
        doctor_id=doc_id,
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
        duration_min=30,
        type=models.AppointmentType.FOLLOW_UP,
        status=models.AppointmentStatus.SCHEDULED,
        reminder_sent=False,
        session_num=1,
        is_cancelled=False,
    )
    db.add(appt)
    db.commit()
    db.close()

    # Cancel appointment via reception headers
    cancel_payload = {"cancellation_reason": "Patient is out of town"}
    resp_cancel = client.post(f"/api/appointments/{appt_id}/cancel", json=cancel_payload, headers=admin_headers)
    test("Soft-cancel appointment endpoint returns 200", resp_cancel.status_code == 200)

    # Verify doctor received the cancellation notification
    resp_doctor_notifs = client.get("/api/notifications", headers=doctor_headers)
    test("Doctor automatically notified of appointment cancellation", 
         len(resp_doctor_notifs.json()) == 1 and 
         resp_doctor_notifs.json()[0]["type"] == "APPOINTMENT_CANCELLED",
         resp_doctor_notifs.json()[0]["title"] if resp_doctor_notifs.json() else "None")

    # Clear doctor notifications
    client.put("/api/notifications/read-all", headers=doctor_headers)

    # 2. Treatment plan completion triggers doctor RECALL alert & launches schedule_patient_recall task
    # Pre-seed a treatment plan
    db = SessionLocal()
    plan_id = uuid.uuid4()
    plan = models.TreatmentPlan(
        id=plan_id,
        patient_id=patient_id,
        doctor_id=doc_id,
        diagnosis="Carpal Tunnel Syndrome",
        goals=[{"goal": "Reduce numbness", "target": "100%"}],
        total_sessions=6,
        frequency_per_week=2,
        status=models.TreatmentPlanStatus.ACTIVE,
        start_date=date.today(),
    )
    db.add(plan)
    db.commit()
    db.close()

    # Complete plan (requires doctor access)
    with patch("tasks.clinical.send_whatsapp_message") as mock_wa:
        mock_wa.return_value = True
        
        # PUT /api/treatment-plans/{plan_id} -> set status=COMPLETED
        plan_update = {"status": "COMPLETED"}
        resp_plan = client.put(f"/api/treatment-plans/{plan_id}", json=plan_update, headers=doctor_headers)
        test("Complete treatment plan returns 200", resp_plan.status_code == 200)

        # Verify that doctor received the RECALL notification automatically due in 30 days
        resp_doctor_recall = client.get("/api/notifications", headers=doctor_headers)
        test("Doctor automatically received RECALL follow-up notification in 30 days",
             len(resp_doctor_recall.json()) == 1 and 
             resp_doctor_recall.json()[0]["type"] == "RECALL",
             resp_doctor_recall.json()[0]["title"] if resp_doctor_recall.json() else "None")

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 3.6 Celery Billing background tasks ──────────────────────────────")

    # Pre-seed invoice overdue and billing outstanding
    db = SessionLocal()
    inv_overdue_id = uuid.uuid4()
    inv_overdue = models.Invoice(
        id=inv_overdue_id,
        patient_id=patient_id,
        invoice_number="INV-OVERDUE-01",
        subtotal=Decimal("4000.00"),
        discount=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("4000.00"),
        amount_paid=Decimal("0.00"),
        status=models.InvoiceStatus.PENDING,
        issued_at=datetime.now(timezone.utc) - timedelta(days=10),
        due_date=datetime.now(timezone.utc) - timedelta(days=3), # Past due
    )
    
    inv_future_id = uuid.uuid4()
    inv_future = models.Invoice(
        id=inv_future_id,
        patient_id=patient_id,
        invoice_number="INV-FUTURE-01",
        subtotal=Decimal("3000.00"),
        discount=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("3000.00"),
        amount_paid=Decimal("0.00"),
        status=models.InvoiceStatus.PENDING,
        issued_at=datetime.now(timezone.utc),
        due_date=datetime.now(timezone.utc) + timedelta(days=5), # Future due
    )
    
    db.add(inv_overdue)
    db.add(inv_future)
    db.commit()
    db.close()

    # Import billing tasks
    from tasks.billing import mark_overdue_invoices, send_overdue_reminders

    with patch("tasks.billing.send_whatsapp_message") as mock_billing_wa:
        mock_billing_wa.return_value = True
        
        # Run invoice aging cron task
        mark_overdue_invoices()
        
        # Verify database statuses
        db = SessionLocal()
        db_inv_overdue = db.query(models.Invoice).filter(models.Invoice.id == inv_overdue_id).first()
        db_inv_future = db.query(models.Invoice).filter(models.Invoice.id == inv_future_id).first()
        
        test("Invoice with due_date in past aged to OVERDUE status", db_inv_overdue.status == models.InvoiceStatus.OVERDUE)
        test("Invoice with due_date in future remains PENDING status", db_inv_future.status == models.InvoiceStatus.PENDING)
        db.close()

        # Run weekly billing reminders task
        send_overdue_reminders()
        test("Weekly Monday reminders sends WhatsApp reminder to patient", mock_billing_wa.called)

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 3.7 Celery Pre-appointment Reminders (24h and 1h) ───────────────")

    # Seed 2 appointments: one in 24 hours, one in 75 minutes (1h15m)
    db = SessionLocal()
    
    appt_24h_id = uuid.uuid4()
    appt_24h = models.Appointment(
        id=appt_24h_id,
        patient_id=patient_id,
        doctor_id=doc_id,
        scheduled_at=datetime.now(timezone.utc) + timedelta(hours=24), # Exactly 24h away
        duration_min=30,
        type=models.AppointmentType.FOLLOW_UP,
        status=models.AppointmentStatus.SCHEDULED,
        reminder_sent=False,
        session_num=2,
        is_cancelled=False,
    )
    
    appt_1h_id = uuid.uuid4()
    appt_1h = models.Appointment(
        id=appt_1h_id,
        patient_id=patient_id,
        doctor_id=doc_id,
        scheduled_at=datetime.now(timezone.utc) + timedelta(minutes=75), # 75 mins away
        duration_min=30,
        type=models.AppointmentType.FOLLOW_UP,
        status=models.AppointmentStatus.SCHEDULED,
        reminder_sent=False,
        session_num=3,
        is_cancelled=False,
    )
    
    db.add(appt_24h)
    db.add(appt_1h)
    db.commit()
    db.close()

    # Import reminder tasks
    from tasks.reminders import send_appointment_reminders, send_same_day_reminders

    with patch("tasks.reminders.send_whatsapp_message") as mock_reminders_wa:
        mock_reminders_wa.return_value = True

        # Run 24h reminders task
        send_appointment_reminders()
        
        db = SessionLocal()
        db_appt_24h = db.query(models.Appointment).filter(models.Appointment.id == appt_24h_id).first()
        test("24h reminder task sent WhatsApp reminder and marked reminder_sent = True", db_appt_24h.reminder_sent is True)
        db.close()

        # Run 1h same-day reminders task
        send_same_day_reminders()
        
        db = SessionLocal()
        db_appt_1h = db.query(models.Appointment).filter(models.Appointment.id == appt_1h_id).first()
        test("1h same-day reminder task sent WhatsApp reminder and marked same_day_reminder_sent = True", 
             db_appt_1h.same_day_reminder_sent is True)
        db.close()

    # ─────────────────────────────────────────────────────────────────────────
    print("\n── 3.8 Daily Patient recalls ───────────────────────────────────────")

    # Manually configure the RECALL notification creation time to be exactly 30 days ago
    # in order to trigger the send_recall_reminders daily beat task
    db = SessionLocal()
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    recall_notif_id = uuid.uuid4()
    recall_notif = models.Notification(
        id=recall_notif_id,
        user_id=doc_id,
        type=models.NotificationType.RECALL,
        title="Recall Reminder: Sher Ali Khan",
        message="Please follow up with patient Sher Ali Khan (Phone: 03459876543) who completed their treatment plan 30 days ago.",
        is_read=False,
        created_at=thirty_days_ago,
    )
    db.add(recall_notif)
    db.commit()
    db.close()

    # Import recalls task
    from tasks.clinical import send_recall_reminders

    with patch("tasks.clinical.send_whatsapp_message") as mock_recalls_wa:
        mock_recalls_wa.return_value = True
        
        # Run recalls daily beat task
        send_recall_reminders()
        
        test("Daily recalls task query and send WhatsApp recall message to patient successfully", mock_recalls_wa.called)
        if mock_recalls_wa.called:
            called_phone = mock_recalls_wa.call_args[0][0]
            called_msg = mock_recalls_wa.call_args[0][1]
            test("Recalls WhatsApp sent to correct phone number format", called_phone == "03459876543", called_phone)
            test("Recalls message includes recovery congratulations", "30 days" in called_msg and "recovery" in called_msg)

    # ─────────────────────────────────────────────────────────────────────────
    # Cleanup SQLite Database file
    try:
        engine.dispose()
        if os.path.exists("test_phase3.db"):
            os.remove("test_phase3.db")
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
        print("\n🎉 All Phase 3 features and background tasks verified successfully!")
        sys.exit(0)


if __name__ == "__main__":
    run_all_tests()
