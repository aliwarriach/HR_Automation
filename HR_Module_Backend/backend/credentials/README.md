# Gmail OAuth credentials

This directory holds Gmail API secrets. Nothing here should be committed
(see `.gitignore`).

## Setup

1. In Google Cloud Console, enable the **Gmail API** and create an OAuth
   client ID of type **Desktop app**.
2. Download the client secret JSON and save it here as `credentials.json`.
3. From `backend/`, run:

   ```
   python scripts/authorize_gmail.py
   ```

   This opens a browser for consent and writes `token.json` here. The
   background poller reads and refreshes `token.json` automatically from
   then on — you only need to repeat this if the token is revoked.
