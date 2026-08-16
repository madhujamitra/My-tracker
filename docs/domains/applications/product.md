# Applications + Gmail tracking

Status: **partial** (manual board + interviews + stale; Gmail planned)

Design: _(none yet)_ · Build: [[tech]] · Gmail: [[gmail-setup]]

## Outcome

Job seeker keeps an applications + interviews board that stays current from Gmail signals (applied / rejected / invite) plus manual notes, without living in the inbox.

## Non-goals

- Not Excalidraw / whiteboard
- Not a full ATS or auto-apply
- Not silent status changes in v1 (Gmail proposes; user confirms)
- Not rewriting the habit/task core

## Statuses

| Status | Meaning |
|--------|---------|
| `opportunity` | Recruiter outreach; not submitted yet |
| `applied` | Submitted; waiting |
| `interviewing` | At least one interview/call in play |
| `offer` | Offer received |
| `rejected` | Explicit rejection |
| `not_selected` | Stale (no activity N days) or assumed closed |
| `withdrawn` | User withdrew |
| `not_a_job` | False positive / not a real job — keep for sync audit (jot why in notes) |

## Stages

| Stage | Deliverable | Status |
|-------|-------------|--------|
| 0 | This product + tech packet | done |
| 1 | Modules shell (toggle Applications) | shipping |
| 2 | Applications CRUD board | shipping |
| 3 | Interview/call events + Upcoming (collapsible) | shipping |
| 4 | Stale → not_selected (default 20d) | shipping |
| 5 | Connect Gmail UI + token storage | shipping |
| 6 | Sync → propose → confirm | shipping |
| 7 | Calendar API + auto-apply 7d | shipping |
| 8 | BYOK AI email analysis | shipping — `docs/domains/ai-email-analysis/` |
| 9 | Applied date from email + recruiter pipeline | shipping — [[../gmail-applied-signals/plan]] |
| 10 | Application pipeline stages (opportunity ≠ applied) | **shipped (code)** — [[../application-pipeline/plan]] |
| 11 | Apply-once sync + user status lock + `not_a_job` | shipping |

## Slice (this ship)

Modules on → Connect Google → Sync last 7 days auto-applies **new** mail once.
Re-sync does not rewrite applied messages; manual status → `status_source=user`.
Upcoming interviews section is **collapsible**. Application notes visible on the board for interview tracking.
Filter **Not a job** for false Gmail imports (reason in notes).

## Rollback

Toggle Applications off. Disconnect Gmail revokes token. Set `status_source='sync'` to let sync own a row again.

## Constraint

Trust + OAuth. Manual edits stick across Sync.

## Evidence

- Collapsible upcoming persists preference
- Notes column on applications table
- Status **Not a job** available; excluded from Active filter
- Sync twice with no new mail → edited statuses unchanged

## Open questions / next bets

- **Recurring tasks** (weekly / bi-weekly / advance-date windows) — habits stay daily; todos need a recurrence model. Planned, not shipping in this slice.
- **Phone notifications** — choose one before coding:
  1. **Google Calendar reminders** — already have calendar OAuth; write needs `calendar.events` (upgrade from readonly). Best for interview times already on Calendar.
  2. **Web Push via Supabase Edge** + service worker — works for todos/habits on phone browsers; no native App Store push by itself.
  3. **FCM / OneSignal** — real mobile push; Supabase alone does not send APNs/FCM without an extra provider.
- Default stale days: 20 (user-editable in Modules)?
- Gmail: propose-only forever, or auto-apply high-confidence rejects later?
- Require user Gmail label `job-tracker` vs whole-inbox query?
