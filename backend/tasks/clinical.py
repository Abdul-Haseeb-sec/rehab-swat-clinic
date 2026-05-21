import logging
import re
from datetime import date, datetime, timedelta, timezone
from celery_app import celery_app
from database import SessionLocal
import models
from notifications.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.clinical.schedule_patient_recall")
def schedule_patient_recall(plan_id_str: str):
    """
    Triggered when a treatment plan is set to COMPLETED.
    Creates an internal notification for the doctor reminding them of a 30-day follow-up.
    """
    logger.info(f"Starting schedule_patient_recall for plan: {plan_id_str}")
    db = SessionLocal()
    try:
        import uuid
        plan_id = uuid.UUID(plan_id_str)
        plan = db.query(models.TreatmentPlan).filter(models.TreatmentPlan.id == plan_id).first()
        if not plan:
            logger.warning(f"Treatment plan {plan_id_str} not found.")
            return

        patient = plan.patient
        doctor = plan.doctor
        if not patient or not doctor:
            logger.warning(f"Patient or Doctor not linked to plan {plan_id_str}.")
            return

        title = f"Recall Reminder: {patient.full_name}"
        message = (
            f"Please follow up with patient {patient.full_name} (Phone: {patient.phone}) "
            f"who completed their treatment plan for '{plan.diagnosis}' 30 days ago."
        )

        # Import create_notification helper directly from main to prevent duplication
        from main import create_notification
        create_notification(
            db=db,
            user_id=doctor.id,
            type=models.NotificationType.RECALL,
            title=title,
            message=message
        )
        db.commit()
        logger.info(f"Successfully created recall notification for doctor {doctor.full_name}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in schedule_patient_recall: {e}", exc_info=True)
        raise e
    finally:
        db.close()


@celery_app.task(name="tasks.clinical.send_recall_reminders")
def send_recall_reminders():
    """
    Daily beat task running at 9:00 AM.
    Finds notifications of type RECALL that are due today (created 30 days ago)
    and sends a WhatsApp follow-up reminder to the patient.
    """
    logger.info("Starting send_recall_reminders task...")
    db = SessionLocal()
    try:
        today = date.today()
        # 30 days recall period ends today
        target_date = today - timedelta(days=30)

        # Query all RECALL notifications created on that date
        from sqlalchemy import func
        notifications = (
            db.query(models.Notification)
            .filter(
                models.Notification.type == models.NotificationType.RECALL,
                func.date(models.Notification.created_at) == target_date
            )
            .all()
        )

        sent_count = 0
        for notif in notifications:
            # Extract phone number from notification message using regex
            match = re.search(r"Phone:\s*([0-9\+]+)", notif.message)
            if not match:
                logger.warning(f"No phone number found in recall message: {notif.message}")
                continue
            
            phone = match.group(1).strip()
            # Extract patient name from title
            patient_name = notif.title.replace("Recall Reminder: ", "").strip()

            patient_message = (
                f"Dear {patient_name},\n\n"
                f"It has been 30 days since you completed your physical therapy treatment plan at Rehab Swat Clinic. "
                f"We hope you are feeling great and maintaining your recovery!\n"
                f"If you would like to schedule a routine check-up or need further guidance, please let us know.\n\n"
                f"Best regards,\n"
                f"Rehab Swat Clinic"
            )

            success = send_whatsapp_message(phone, patient_message)
            if success:
                sent_count += 1

        logger.info(f"Completed send_recall_reminders. Sent: {sent_count}")
    except Exception as e:
        logger.error(f"Error in send_recall_reminders task: {e}", exc_info=True)
        raise e
    finally:
        db.close()
