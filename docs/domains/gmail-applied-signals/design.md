# Gmail applied signals — design

Status: **shipped (code)** · Product: [[product]] · Eng: [[engineering]]

**No new screens.** Sync semantics + existing Applications / dashboard surfaces.

## 1. Scope & non-goals

| In | Out |
|----|-----|
| Correct Applied date on Applications table | New “apply type” tab |
| Dashboard “Applied today” reflects email day | Redesign board chrome |
| Needs-reply chip still for waiting-on-me | Separate recruiter inbox UI |

## 2. Design context

| Path | Use |
|------|-----|
| `ApplicationsPage.jsx` Applied column | Shows `applied_at` as-is |
| Dashboard job KPI “Applied today” | Uses `applied_at` date equality |
| GmailPanel sync summary | Optional: show `applications` count unchanged pattern |
| Needs-reply notice | Unchanged; dual-write feeds it |

## 3. Screen → behaviour map

| # | Surface | Empty | Loading | Error | Success |
|---|---------|-------|---------|-------|---------|
| 1 | Applications list | — | — | — | `applied_at` = email day (YYYY-MM-DD local/UTC date from header) |
| 2 | Manual add form | Today default OK | — | — | User can still override date |
| 3 | Sync message | — | Syncing… | Existing rose banner | Counts; no new chip for “type A/B” in v1 |
| 4 | Needs reply | No open items | — | — | Type B waiting-on-me appears here |

## 4. Visual / copy

- No new badges for self vs recruiter in v1 (deferred).  
- If we store `source` later, optional muted note under company — **out of this ship**.

## 5. Design DoD

- [ ] No layout change required to validate feature  
- [ ] Applied date on a synced row matches Gmail message day for fixtures  
- [ ] Invite still creates interview / interviewing path visible in Upcoming / Calendar flow already shipped  
