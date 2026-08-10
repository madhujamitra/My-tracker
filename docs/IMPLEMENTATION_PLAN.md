# Implementation plan — Applications phase

Product: `docs/domains/applications/product.md`

## Phases

| # | Name | Acceptance |
|---|------|------------|
| 0 | Docs | product + tech present |
| 1 | Modules shell | toggle persists in `meta.__workspace`; Applications tab only when on |
| 2 | Applications CRUD | list/add/edit/delete; statuses; survives refresh (Supabase) |
| 3 | Interviews | add event linked to app; Upcoming list sorted by `starts_at` |
| 4 | Stale rule | default 20d; configurable; auto `not_selected` on load |
| 5 | Gmail connect | **shipped scaffold** — deploy + secrets required |
| 6 | Gmail propose | **shipped scaffold** — heuristic classify + Accept/Dismiss |

## Out of scope this ship

Full Google OAuth, Edge Functions, calendar API, Excalidraw.
