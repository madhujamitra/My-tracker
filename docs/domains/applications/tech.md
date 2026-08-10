# Applications — tech

Product: [[product]]

## Data model

### `meta.__workspace` (in existing `app_state.meta`)

```json
{
  "modules": { "applications": false },
  "applicationsStaleDays": 20
}
```

Reserved key `__workspace` — never use as a task index.

### `public.applications`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| user_id | uuid | RLS = auth.uid() |
| company | text | required |
| role | text | |
| status | text | applied \| interviewing \| offer \| rejected \| not_selected \| withdrawn |
| applied_at | date | |
| last_activity_at | timestamptz | bump on status/interview/notes |
| notes | text | |
| contact_linkedin | text | |
| contact_other | text | |
| created_at / updated_at | timestamptz | |

### `public.interview_events`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| user_id | uuid | RLS |
| application_id | uuid FK | on delete cascade |
| title | text | |
| event_type | text | interview \| call \| linkedin \| other |
| starts_at | timestamptz | |
| link | text | |
| notes | text | |

### Planned (Stage 5+)

~~Gmail tables + Edge Functions~~ — see [[gmail-setup]].

### Gmail (shipped scaffold)

| Table / fn | Role |
|------------|------|
| `gmail_connections` | Refresh/access tokens — **service_role only** |
| `gmail_proposals` | Pending propose/confirm rows (user can select/update) |
| `gmail-oauth-start` | Returns Google auth URL |
| `gmail-oauth-callback` | Exchanges code, stores tokens, redirects to APP_URL |
| `gmail-status` / `gmail-disconnect` / `gmail-sync` | Status, revoke, scan → proposals |

Client: `src/lib/gmail.js`, `src/lib/gmailClassify.js`, `src/features/applications/GmailPanel.jsx`

Setup: [[gmail-setup]]

## Client modules

| Path | Role |
|------|------|
| `src/lib/modules.js` | read/write `__workspace` |
| `src/lib/applications.js` | CRUD applications + events |
| `src/lib/staleApplications.js` | pure stale detection + apply |
| `src/lib/gmail.js` / `gmailClassify.js` | OAuth invoke, proposals Accept/Dismiss |
| `src/features/applications/*` | UI including GmailPanel |

## Stale rule

On Applications tab load: if `status` ∈ {applied, interviewing} and `last_activity_at` older than N days → set `not_selected` and bump `updated_at`. User can manually change status back.

## Gmail flow

1. OAuth `gmail.readonly` via Edge Functions (see [[gmail-setup]])
2. Refresh token in `gmail_connections` (service_role only)
3. Sync → `gmail_proposals` → Accept/Dismiss in UI
4. Accept updates applications / interview_events + `last_activity_at`
