# Gmail setup (Stages 5–6)

Product: [[product]] · Tech: [[tech]]

## What you get

1. **Connect Gmail** (readonly) via Google OAuth  
2. Tokens stored in `gmail_connections` (service role only — not readable by the browser)  
3. **Sync** scans recent mail → **pending proposals**  
4. You **Accept** or **Dismiss** before the Applications board changes  

## One-time Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.  
2. Enable **Gmail API**.  
3. **APIs & Services → OAuth consent screen**  
   - External (or Internal if Workspace)  
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/calendar.readonly`  
   - Add yourself as a test user while in Testing.

Also enable **Google Calendar API** in the API Library (same project as Gmail API).
4. **Credentials → Create OAuth client ID → Web application**  
   - Authorized redirect URI (must match exactly):

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback
```

5. Copy **Client ID** and **Client secret**.

## Supabase SQL

Re-run [`supabase/schema.sql`](../../supabase/schema.sql) so `gmail_connections` + `gmail_proposals` exist.

## Edge Function secrets

```bash
# From my-task/ with Supabase CLI logged in and linked
supabase secrets set \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  APP_URL="http://localhost:5173" \
  GMAIL_OAUTH_STATE_SECRET="long-random-string"
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to functions.

For production, set `APP_URL` to your Vercel URL.

## Deploy functions

```bash
supabase functions deploy gmail-oauth-start
supabase functions deploy gmail-oauth-callback --no-verify-jwt
supabase functions deploy gmail-status
supabase functions deploy gmail-disconnect
supabase functions deploy gmail-sync
supabase functions deploy google-calendar-list
```

After pulling auto-apply changes: **Disconnect** then **Connect Google** again so Calendar scope is granted. Sync applies the last **7 days** automatically (no Accept/Dismiss).

Entrypoints are `supabase/functions/<name>/index.ts`. Docker is optional for remote deploy; the “Docker is not running” warning is usually fine.

`config.toml` sets `verify_jwt = false` only for the OAuth callback (Google redirect has no user JWT).

## App usage

1. Enable **Applications** under Modules.  
2. **Connect Gmail** → Google consent → redirect back with `?gmail=connected`.  
3. **Sync now** → review **Pending proposals** → Accept / Dismiss.  
4. Optional: in Gmail, create label `job-tracker` and apply it to job mail (sync prefers that label).

## Security notes

- Scope is **gmail.readonly** only (no send).  
- Refresh tokens never go to the Vite client.  
- Propose-before-write is intentional until classifiers are trusted.
