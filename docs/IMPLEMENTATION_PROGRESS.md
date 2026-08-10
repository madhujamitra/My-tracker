# Implementation progress — Applications / Google sync

## Call

Auto-apply last 7 days of Gmail + Calendar tab; remove Accept/Dismiss.

## Why

- Propose UI slowed the personal tracker; user owns false positives.
- Calendar needs Calendar API, not Gmail bodies alone.
- Needs-reply belongs on the landing chrome, not buried in Modules.

## Risk

Wrong auto-classify → bad app rows. Notice via Applications board. Rollback: Disconnect Google; delete bad rows; redeploy prior sync if needed.

## You must do

1. Re-run `supabase/schema.sql` (mail_needs_reply + proposal constraint widen)
2. Google Cloud: enable **Calendar API**; add `calendar.readonly` on consent screen
3. Redeploy functions:
   ```bash
   supabase functions deploy gmail-oauth-start
   supabase functions deploy gmail-sync
   supabase functions deploy google-calendar-list
   ```
4. In app: **Disconnect** → **Connect Google** again (new scope) → **Sync now**
