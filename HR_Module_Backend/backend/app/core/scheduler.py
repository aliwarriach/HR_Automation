# app/core/scheduler.py
"""Background scheduler for periodic Gmail resume polling.

Runs on APScheduler's own thread, independent of the request/response
cycle. Each job execution opens and closes its own DB session since there
is no request to hang dependency injection off of.
"""
import logging
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import SessionLocal
from app.services.resume_ingestion_service import poll_and_ingest
from app.services.announcement_service import send_due_notifications

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler()


def _run_poll_job() -> None:
    db = SessionLocal()
    try:
        poll_and_ingest(db)
    finally:
        db.close()


def _run_announcement_notification_job() -> None:
    db = SessionLocal()
    try:
        send_due_notifications(db)
    finally:
        db.close()


def start_scheduler() -> None:
    if not Path(settings.gmail_token_file).exists():
        logger.warning(
            "Gmail token file not found at %s - resume polling and announcement "
            "notifications are disabled. Run scripts/authorize_gmail.py to enable them.",
            settings.gmail_token_file,
        )
        return

    _scheduler.add_job(
        _run_poll_job,
        "interval",
        minutes=settings.gmail_poll_interval_minutes,
        id="gmail_resume_poll",
        next_run_time=datetime.now(),  # run once immediately, then on the interval
        replace_existing=True,
    )
    _scheduler.add_job(
        _run_announcement_notification_job,
        "interval",
        minutes=settings.announcement_notification_poll_interval_minutes,
        id="announcement_notifications",
        next_run_time=datetime.now(),
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Gmail resume polling scheduled every %d minute(s).", settings.gmail_poll_interval_minutes)
    logger.info(
        "Announcement notification sweep scheduled every %d minute(s).",
        settings.announcement_notification_poll_interval_minutes,
    )


def shutdown_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
