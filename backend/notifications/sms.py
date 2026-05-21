import logging
import os
from twilio.rest import Client
from settings import settings

logger = logging.getLogger(__name__)

def send_sms(to: str, message: str) -> bool:
    """
    Send an SMS message via Twilio (non-WhatsApp).
    Normalizes 'to' number: strips spaces, removes leading 0, prefixes with '+92'.
    """
    try:
        sid = settings.twilio_account_sid
        token = settings.twilio_auth_token
        # Read from environment or fallback to a standard Twilio number
        from_number = os.getenv("TWILIO_SMS_FROM", "+14155238886")

        if not sid or not token:
            logger.warning("Twilio credentials not configured in settings. Skipping SMS sending.")
            return False

        # Clean/Normalize phone number
        cleaned_to = to.strip()
        if not cleaned_to.startswith("+"):
            # Strip '+' or country code prefix if it's there
            if cleaned_to.startswith("92"):
                cleaned_to = cleaned_to[2:]
            
            # Strip leading zero
            if cleaned_to.startswith("0"):
                cleaned_to = cleaned_to[1:]
            
            # Final E.164 phone format for Twilio SMS
            formatted_to = f"+92{cleaned_to}"
        else:
            formatted_to = cleaned_to

        client = Client(sid, token)
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=formatted_to
        )
        logger.info(f"SMS sent successfully to {formatted_to}. SID: {msg.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return False
