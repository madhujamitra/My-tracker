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
| `applied` | Submitted; waiting |
| `interviewing` | At least one interview/call in play |
| `offer` | Offer received |
| `rejected` | Explicit rejection |
| `not_selected` | Stale (no activity N days) or assumed closed |
| `withdrawn` | User withdrew |

## Stages

| Stage | Deliverable | Status |
|-------|-------------|--------|
| 0 | This product + tech packet | done |
| 1 | Modules shell (toggle Applications) | shipping |
| 2 | Applications CRUD board | shipping |
| 3 | Interview/call events + Upcoming | shipping |
| 4 | Stale → not_selected (default 20d) | shipping |
| 5 | Connect Gmail UI + token storage | shipping |
| 6 | Sync → propose → confirm | shipping |
| 7 | Calendar API + auto-apply 7d | shipping |
| 8 | BYOK AI email analysis | shipping — `docs/domains/ai-email-analysis/` |
| 9 | Applied date from email + recruiter pipeline | shipping — [[../gmail-applied-signals/plan]] |
| 10 | Application pipeline stages (opportunity ≠ applied) | **shipped (code)** — [[../application-pipeline/plan]] (deploy schema + gmail-sync) |

## Slice (this ship)

Modules on → Connect Google (Gmail + Calendar) → **Sync last 7 days** auto-applies:
new apps, rejections, interview/calendar invites, needs-reply inbox.
**Calendar** tab shows Google Calendar. Dashboard **Reply** badge for waiting mail.
No Accept/Dismiss.

## Rollback

Toggle Applications off (tab hides). Data remains in DB. Later: Disconnect Gmail revokes token.

## Constraint

Trust + OAuth for Gmail (backend tokens). Until then: reliability of manual board + clear empty/error states.

## Evidence

- Enable module → Applications tab appears
- CRUD survives refresh
- Add interview → shows in Upcoming
- App with no activity past N days → `not_selected` (undo via status edit)

## Open questions

- Default stale days: 20 (user-editable in Modules)?
- Gmail: propose-only forever, or auto-apply high-confidence rejects later?
- Require user Gmail label `job-tracker` vs whole-inbox query?
