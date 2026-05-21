import logging
from datetime import datetime, timedelta, timezone
from celery_app import celery_app
from database import SessionLocal
import models
from notifications.whatsapp import send_whatsapp_message
from notifications.templates import appointment_reminder_24hr, appointment_reminder_1hr

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.reminders.send_appointment_reminders")
def send_appointment_reminders():
    """
    Queries active appointments scheduled between 23 and 25 hours from now,
    sends a WhatsApp reminder, and marks reminder_sent = True.
    """
    logger.info("Starting send_appointment_reminders task...")
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        start_range = now + timedelta(hours=23)
        end_range = now + timedelta(hours=25)

        appointments = (
            db.query(models.Appointment)
            .filter(
                models.Appointment.scheduled_at >= start_range,
                models.Appointment.scheduled_at <= end_range,
                models.Appointment.reminder_sent == False,
                models.Appointment.is_cancelled == False,
            )
            .all()
        )

        sent_count = 0
        for appt in appointments:
            patient = appt.patient
            if not patient:
                continue
            doctor = appt.doctor
            doc_name = doctor.full_name if doctor else "Doctor"
            
            # Format time as 'HH:MM AM/PM'
            time_str = appt.scheduled_at.strftime("%I:%M %p")
            
            message_text = appointment_reminder_24hr(patient.full_name, time_str, doc_name)
            success = send_whatsapp_message(patient.phone, message_text)
            if success:
                appt.reminder_sent = True
                sent_count += 1
                
        db.commit()
        logger.info(f"Completed send_appointment_reminders. Sent: {sent_count}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in send_appointment_reminders task: {e}", exc_info=True)
        raise e
    finally:
        db.close()


@celery_app.task(name="tasks.reminders.send_same_day_reminders")
def send_same_day_reminders():
    """
    Queries active appointments scheduled between 60 and 90 minutes from now,
    sends a WhatsApp '1-hour away' reminder, and marks same_day_reminder_sent = True.
    """
    logger.info("Starting send_same_day_reminders task...")
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        start_range = now + timedelta(minutes=60)
        end_range = now + timedelta(minutes=90)

        appointments = (
            db.query(models.Appointment)
            .filter(
                models.Appointment.scheduled_at >= start_range,
                models.Appointment.scheduled_at <= end_range,
                models.Appointment.same_day_reminder_sent == False,
                models.Appointment.is_cancelled == False,
            )
            .all()
        )

        sent_count = 0
        for appt in appointments:
            patient = appt.patient
            if not patient:
                continue
            
            time_str = appt.scheduled_at.strftime("%I:%M %p")
            
            message_text = appointment_reminder_1hr(patient.full_name, time_str)
            success = send_whatsapp_message(patient.phone, message_text)
            if success:
                appt.same_day_reminder_sent = True
                sent_count += 1
                
        db.commit()
        logger.info(f"Completed send_same_day_reminders. Sent: {sent_count}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in send_same_day_reminders task: {e}", exc_info=True)
        raise e
    finally:
        db.close()
