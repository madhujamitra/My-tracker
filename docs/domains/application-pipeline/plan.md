# Application pipeline redesign — plan

Status: **shipped (code)** — apply schema SQL + redeploy `gmail-sync`; AC7 manual Sync pending

[[product]] · [[design]] · [[engineering]]

## 1. Outcome & non-goals

**Outcome:** Cold recruiter outreach lands as **Opportunity** (+ reply action when needed), not Applied; real submissions/acks stay Applied; reply is never a pipeline status.

**Non-goals:** Full ATS; Phase B stages in the first deploy unless migration bundled; auto-backfill of historical false Applied rows.

## 2. Sources reconciled

| Source | Decision |
|--------|----------|
| Product | Pipeline status ≠ email kind ≠ awaiting_candidate_reply |
| Design | Opportunity chip + Active filter + KPI; amber action via needs-reply |
| Eng | Phase A: add `opportunity` + classify/sync; collapse advanced LLM stages until B |
| Conflict | User’s 12-stage prompt vs ship size → **Phase A** statuses + prompt text with normalize collapse |
| ASSUMED Q1 | Keep `not_selected` for stale |
| ASSUMED Q2 | Phase A schema = +opportunity only |
| ASSUMED Q3 | Stale rule treats opportunity as active |

## 3. Blockers

| ID | Blocker | Phase |
|----|---------|-------|
| B1 | User runs schema SQL / migration for new CHECK | Phase 1 deploy |
| B2 | Redeploy `gmail-sync` after classify | Phase 2–3 |
| — | No open product blockers beyond ASSUMED | — |

## 4. E2E user journeys

| Step | System | Success |
|------|--------|---------|
| Sync CGI interest email | classify + sync | App **Opportunity**, company CGI; needs_reply open |
| Sync “submitted your profile” | classify + sync | App **Applied** |
| Sync application acknowledgement | classify + sync | **Applied** |
| Sync interview while applied | sync | **Interviewing**; not downgraded |
| Sync “send availability” while interviewing | sync | Status stays interviewing; awaiting/needs_reply |
| Board filter Active | UI | Shows opportunity + applied + interviewing |
| KPI In pipeline | App.jsx stats | Includes opportunity |
| Manual set Opportunity | Applications form | Persists |

## 5. Screen / system map

```text
Gmail → q → classify / LLM
  → kind + proposed_status + awaiting
  → gmail-sync (forward-only status)
  → applications.status | mail_needs_reply | interview_events
  → ApplicationsPage chips/filters | KPI | Reply chip
```

## 6. State / backend deltas

| Delta | Detail |
|-------|--------|
| `applications.status` | + `opportunity` (Phase A CHECK) |
| `gmail_proposals.kind` | + `new_opportunity` (optional; can map to needs_reply + status) |
| `role` | Fill from LLM `job_title` when present |
| Auth | Unchanged |
| Forward-only | Rank helper in sync / shared |

## 7. Design match

Opportunity chip distinct from Applied; Active includes opportunity; action = amber needs-reply pattern ([[design]]).

## 8. Implementation phases

### Phase 1 — Schema + UI statuses
- **Goal:** Board can store/show `opportunity`
- **Extend:** `schema.sql`, `applications.js`, `ApplicationsPage.jsx`, `gmail.js` inPipeline + stale active set
- **AC1:** Create/edit/filter Opportunity works after SQL applied  
- **AC2:** In pipeline counts opportunity  
- **Tests:** none critical (constant list)  
- **Deps:** none  

### Phase 2 — Classify outreach ≠ applied
- **Goal:** CGI interest fixture → opportunity + awaiting; submission → applied
- **Extend:** `_shared/classify.js`, `gmailClassify.js`, tests  
- **AC3:** Interest outreach not `new_application`  
- **AC4:** Strong pipeline / ack still applied  
- **Deps:** Phase 1 for DB write of opportunity  

### Phase 3 — Sync apply + LLM + no-backward
- **Goal:** Edge writes opportunity/applied correctly; never regress stage
- **Extend:** `gmail-sync`, `llmClassify.js` SYSTEM + normalize allowlist/collapse  
- **AC5:** Sync CGI interest → opportunity row + needs_reply  
- **AC6:** Interviewing + availability ask keeps interviewing  
- **Tests:** normalize + rank unit tests  
- **Deps:** Phase 1–2  

### Phase 4 — Validate & docs
- **Goal:** Deploy notes; parent applications product stage  
- **AC7:** Manual Sync on CGI-style + ack fixtures  
- **Deps:** 1–3 deployed  

### Phase 5 (deferred) — Full stage enum
- screening, assessment, final_round, accepted, on_hold + kinds assessment_event/offer_event  
- **Deps:** Phase 4 stable  

## 9. Failure & recovery

| Failure | User sees | Recovery |
|---------|-----------|----------|
| CHECK violation | Sync skip / error | Run schema migration |
| False opportunity spam | Extra Opportunity rows | Delete / ignore tighten |
| LLM invents stage | Collapsed or ignored | Normalize allowlist |
| Stale closes opportunity | not_selected | Edit status undo |

## 10. Analytics & monetization

None required.

## 11. Rollout / rollback

1. Apply schema  
2. Deploy `gmail-sync`  
3. Sync  

Rollback: prior function revision; opportunity rows remain readable if CHECK still allows, or map → applied in emergency.

## 12. Production DoD

- [x] AC1–AC6 (code; AC1/AC5 need live DB + deploy)  
- [x] `npm test` green (47)  
- [ ] CGI interest ≠ Applied on board (after Sync deploy)  
- [x] Active filter + In pipeline include opportunity  
- [x] Docs status → shipped (code)  

## 13. Open / deferred

- Phase 5 full pipeline UI/KPI cards per stage  
- Historical backfill of false Applied → Opportunity  
- `confidence` on LLM output  

## Principal lenses

**Product:** Opportunity first; reply is attribute.  
**Eng:** Smallest migration (+opportunity); collapse advanced stages until B.  
**QA:** Unit fixtures for CGI interest vs submit vs ack; one Sync E2E.  
**UX:** Chip + filter + KPI; no “Needs reply” status color.
