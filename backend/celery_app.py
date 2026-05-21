import os
from celery import Celery
from celery.schedules import crontab
from settings import settings

# Initialize Celery app using Redis configuration from settings
celery_app = Celery(
    "rehab_swat",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

# Standard Celery performance and serialization configurations
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Karachi",  # Swat, Pakistan local timezone
    enable_utc=True,
)

# Auto-discover tasks inside the 'tasks' folder package
celery_app.autodiscover_tasks(["tasks"])

# Define the Beat periodic task schedule
celery_app.conf.beat_schedule = {
    # 3.2: 24h & 1h appointment reminders checked every 15 minutes
    "send-appointment-reminders-every-15-min": {
        "task": "tasks.reminders.send_appointment_reminders",
        "schedule": 900.0,  # 15 minutes in seconds
    },
    "send-same-day-reminders-every-15-min": {
        "task": "tasks.reminders.send_same_day_reminders",
        "schedule": 900.0,
    },
    # 3.4: Overdue invoice daily cron and weekly reminder messaging
    "mark-overdue-invoices-daily-midnight": {
        "task": "tasks.billing.mark_overdue_invoices",
        "schedule": crontab(hour=0, minute=0),  # Midnight daily
    },
    "send-overdue-reminders-weekly-monday-9am": {
        "task": "tasks.billing.send_overdue_reminders",
        "schedule": crontab(day_of_week=1, hour=9, minute=0),  # Mondays at 9:00 AM
    },
    # 3.5: Recall reminders messaging daily at 9:00 AM
    "send-recall-reminders-daily-9am": {
        "task": "tasks.clinical.send_recall_reminders",
        "schedule": crontab(hour=9, minute=0),  # Daily at 9:00 AM
    },
}
