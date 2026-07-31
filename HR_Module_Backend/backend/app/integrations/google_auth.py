# app/integrations/google_auth.py
"""Shared OAuth credential loading for Google API clients (Gmail, Calendar).

Both integrations reuse the same token file so HR only authorizes once.
Google does not let a refresh token's granted scopes expand after the fact —
if a new scope is added to either client's SCOPES list, credentials/token.json
must be regenerated via scripts/authorize_gmail.py.
"""
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

from app.config import settings


class GoogleAuthError(Exception):
    """Raised when the shared OAuth token is missing or cannot be refreshed."""


def load_credentials(scopes: list[str]) -> Credentials:
    token_path = Path(settings.gmail_token_file)
    if not token_path.exists():
        raise GoogleAuthError(
            f"Google OAuth token not found at {token_path}. Run scripts/authorize_gmail.py first."
        )

    creds = Credentials.from_authorized_user_file(str(token_path), scopes)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_path.write_text(creds.to_json())

    return creds
