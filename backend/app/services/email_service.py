"""可选 SMTP 邮件发送。"""

from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

settings = get_settings()


def smtp_enabled() -> bool:
    return settings.smtp_enabled


def _send_email_sync(*, to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to
    message.set_content(body)

    if settings.smtp_use_tls:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as client:
            client.starttls()
            if settings.smtp_user:
                client.login(settings.smtp_user, settings.smtp_password)
            client.send_message(message)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as client:
        if settings.smtp_user:
            client.login(settings.smtp_user, settings.smtp_password)
        client.send_message(message)


async def send_email(*, to: str, subject: str, body: str) -> None:
    await asyncio.to_thread(_send_email_sync, to=to, subject=subject, body=body)
