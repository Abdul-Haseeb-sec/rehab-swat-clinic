def appointment_reminder_24hr(patient_name: str, time: str, doctor_name: str) -> str:
    """
    Builds the 24-hour pre-appointment WhatsApp/SMS notification text.
    """
    return (
        f"Dear {patient_name},\n\n"
        f"This is a reminder that you have an appointment scheduled with {doctor_name} "
        f"tomorrow at {time}. Please arrive 10 minutes prior to your session.\n\n"
        f"Location: Rehab Swat Physiotherapy Clinic, Swat.\n"
        f"Thank you!"
    )


def appointment_reminder_1hr(patient_name: str, time: str) -> str:
    """
    Builds the 1-hour pre-appointment WhatsApp/SMS notification text.
    """
    return (
        f"Dear {patient_name},\n\n"
        f"Your rehabilitation session at Rehab Swat is coming up in 1 hour (at {time}). "
        f"We look forward to assisting you today.\n\n"
        f"Thank you!"
    )


def prescription_ready(patient_name: str, doctor_name: str, download_url: str) -> str:
    """
    Builds the prescription notification text with the PDF download link.
    """
    return (
        f"Dear {patient_name},\n\n"
        f"Your prescription from {doctor_name} has been prepared.\n"
        f"You can view and download your electronic prescription at: {download_url}\n\n"
        f"Best regards,\n"
        f"Rehab Swat Clinic"
    )


def overdue_invoice_reminder(patient_name: str, amount, invoice_number: str) -> str:
    """
    Builds the past-due outstanding balance invoice reminder text.
    """
    # Force convert amount to standard string representation (supporting Decimal/float)
    amt_str = f"{amount:.2f}" if isinstance(amount, (float, int)) else str(amount)
    return (
        f"Dear {patient_name},\n\n"
        f"This is a friendly notification that invoice {invoice_number} with an outstanding balance of "
        f"PKR {amt_str} is now past due.\n"
        f"Please settle the invoice at the clinic reception or via online bank transfer at your earliest convenience.\n\n"
        f"Billing Department,\n"
        f"Rehab Swat Clinic"
    )
