"""One-time interactive OAuth flow to generate the shared Google API token.

Run manually (never as part of the server) after placing your OAuth client
secret at the path configured by GMAIL_CREDENTIALS_FILE:

    python scripts/authorize_gmail.py

It opens a browser for consent and writes the resulting token to the path
configured by GMAIL_TOKEN_FILE, scoped for both Gmail (resume ingestion,
interview emails) and Calendar (interview event creation) since both
integrations share one token file. The background poller and interview
scheduler load that token and refresh it automatically on every run
afterwards. Re-run this script if either integration's SCOPES list gains a
new scope — refresh tokens can't pick up expanded scopes on their own.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google_auth_oauthlib.flow import InstalledAppFlow  # noqa: E402

from app.config import settings  # noqa: E402
from app.integrations.gmail.client import SCOPES as GMAIL_SCOPES  # noqa: E402
from app.integrations.google_calendar.client import SCOPES as CALENDAR_SCOPES  # noqa: E402

SCOPES = GMAIL_SCOPES + CALENDAR_SCOPES


def main() -> None:
    credentials_path = Path(settings.gmail_credentials_file)
    if not credentials_path.exists():
        raise SystemExit(
            f"OAuth client secret not found at {credentials_path}.\n"
            "Download it from Google Cloud Console (APIs & Services > Credentials, "
            "OAuth client ID of type Desktop app) and save it there before running this script."
        )

    flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
    creds = flow.run_local_server(port=0)

    token_path = Path(settings.gmail_token_file)
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(creds.to_json())
    print(f"Gmail token saved to {token_path}")


if __name__ == "__main__":
    main()
