import logging
from datetime import datetime, timezone
from celery_app import celery_app
from database import SessionLocal
import models
from notifications.whatsapp import send_whatsapp_message
from notifications.templates import overdue_invoice_reminder

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.billing.mark_overdue_invoices")
def mark_overdue_invoices():
    """
    Finds all PENDING or PARTIAL invoices where due_date is in the past,
    updates their status to OVERDUE, and notifies the patient.
    """
    logger.info("Starting mark_overdue_invoices task...")
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        overdue_invoices = (
            db.query(models.Invoice)
            .filter(
                models.Invoice.due_date < now,
                models.Invoice.status.in_([models.InvoiceStatus.PENDING, models.InvoiceStatus.PARTIAL])
            )
            .all()
        )

        count = 0
        for inv in overdue_invoices:
            inv.status = models.InvoiceStatus.OVERDUE
            count += 1
            
            patient = inv.patient
            if patient:
                outstanding = inv.total_amount - (inv.amount_paid or 0)
                msg = overdue_invoice_reminder(patient.full_name, outstanding, inv.invoice_number)
                send_whatsapp_message(patient.phone, msg)
                
        db.commit()
        logger.info(f"Completed mark_overdue_invoices. Updated: {count}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error in mark_overdue_invoices task: {e}", exc_info=True)
        raise e
    finally:
        db.close()


@celery_app.task(name="tasks.billing.send_overdue_reminders")
def send_overdue_reminders():
    """
    Queries all invoices marked as OVERDUE and sends WhatsApp outstanding balance reminders.
    """
    logger.info("Starting send_overdue_reminders task...")
    db = SessionLocal()
    try:
        overdue_invoices = (
            db.query(models.Invoice)
            .filter(models.Invoice.status == models.InvoiceStatus.OVERDUE)
            .all()
        )

        sent_count = 0
        for inv in overdue_invoices:
            patient = inv.patient
            if patient:
                outstanding = inv.total_amount - (inv.amount_paid or 0)
                msg = overdue_invoice_reminder(patient.full_name, outstanding, inv.invoice_number)
                success = send_whatsapp_message(patient.phone, msg)
                if success:
                    sent_count += 1
                    
        db.commit()
        logger.info(f"Completed send_overdue_reminders. Sent: {sent_count}")
    except Exception as e:
        logger.error(f"Error in send_overdue_reminders task: {e}", exc_info=True)
        raise e
    finally:
        db.close()
