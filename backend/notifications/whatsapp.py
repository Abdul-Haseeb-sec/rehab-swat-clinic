import logging
from twilio.rest import Client
from settings import settings

logger = logging.getLogger(__name__)

def send_whatsapp_message(to: str, message: str) -> bool:
    """
    Send a WhatsApp message via Twilio.
    Normalizes 'to' number: strips spaces, removes leading 0, prefixes with 'whatsapp:+92'.
    If the number is already fully formatted (starts with 'whatsapp:'), keeps it as is.
    """
    try:
        # Load credentials
        sid = settings.twilio_account_sid
        token = settings.twilio_auth_token
        from_number = settings.twilio_whatsapp_from

        if not sid or not token or not from_number:
            logger.warning("Twilio credentials not configured in settings. Skipping sending.")
            return False

        # Clean/Normalize phone number
        cleaned_to = to.strip()
        if not cleaned_to.startswith("whatsapp:"):
            # Strip '+' or country code prefix if it's there
            if cleaned_to.startswith("+92"):
                cleaned_to = cleaned_to[3:]
            elif cleaned_to.startswith("92"):
                cleaned_to = cleaned_to[2:]
            
            # Strip leading zero
            if cleaned_to.startswith("0"):
                cleaned_to = cleaned_to[1:]
            
            # Final WhatsApp format for Twilio
            formatted_to = f"whatsapp:+92{cleaned_to}"
        else:
            formatted_to = cleaned_to

        client = Client(sid, token)
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=formatted_to
        )
        logger.info(f"WhatsApp message sent successfully to {formatted_to}. SID: {msg.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send WhatsApp message: {e}")
        return False
