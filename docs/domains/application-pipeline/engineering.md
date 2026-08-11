# Application pipeline — engineering

Status: **shipped (code)** · Product: [[product]] · Design: [[design]]

## Call

Extend `applications.status` + classify/sync only: **opportunity** first; keep `awaiting_candidate_reply` / `mail_needs_reply` as action layer; **never move status backward** on email apply.

## Why

- Current Type B / “Opportunities with…” falsely creates **applied**.  
- CGI interest outreach must not inflate Applied today / pipeline trust.  
- Full stage enum is reversible as additive CHECK values; product ships Phase A first.

## Risk

- Migration CHECK fails if bad data — validate before alter.  
- Broader status set breaks filters/KPI if not updated together.  
- LLM invents stages — normalize allowlist; unknown → ignore or keep current.

## Reuse (verified)

| Path | Role |
|------|------|
| `supabase/schema.sql` applications status CHECK | Widen |
| `src/lib/applications.js` APPLICATION_STATUSES | Widen |
| `ApplicationsPage.jsx` STATUS_STYLES, filters | Extend |
| `src/lib/gmail.js` getJobDashboardStats | inPipeline includes opportunity |
| `supabase/functions/_shared/classify.js` | Split outreach vs pipeline |
| `supabase/functions/_shared/llmClassify.js` SYSTEM | Full stage prompt (Phase A subset enforced in normalize) |
| `gmail-sync/index.ts` ensureApplication + apply | Map kinds; no-backward |
| `mail_needs_reply` | Dual-write when awaiting |
| `src/lib/staleApplications.js` | Treat opportunity as active for stale? **ASSUMED: yes** (same as applied) |

## Target status enum

```text
opportunity | applied | screening | assessment | interviewing | final_round |
offer | accepted | rejected | not_selected | withdrawn | on_hold
```

**Phase A ship:** add `opportunity` only to CHECK + UI (minimal migration).  
**Phase B:** add remaining stages in one migration when classify emits them.

## Email kind → apply (Phase A)

| kind | proposed_status | DB action |
|------|-----------------|-----------|
| new_opportunity / needs_reply (no prior app) | opportunity | upsert app opportunity; needs_reply if awaiting |
| new_application | applied | upsert applied |
| interview_event | interviewing (A) / screening|… (B) | ensure app + event |
| status_update | rejected/offer/… | update if forward-only |
| ignore | — | skip |

### No-backward map (rank)

```text
opportunity=1, applied=2, screening=3, assessment=4, interviewing=5,
final_round=6, offer=7, accepted=8
exits: rejected, withdrawn, on_hold, not_selected (terminal; only overwrite with explicit status_update of same family)
```

Only update status if `rank(new) > rank(current)` OR current is opportunity→applied, OR explicit terminal transition.

## Schema delta (Phase A)

```sql
-- drop + recreate check to include 'opportunity'
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in (
    'opportunity', 'applied', 'interviewing', 'offer',
    'rejected', 'not_selected', 'withdrawn'
  ));
```

Phase B widens again.

`gmail_proposals.kind` CHECK: add `new_opportunity` (and later assessment_event, offer_event).

Optional: `applications.role` already exists — map LLM `job_title` → `role`.

## Classify (Phase A)

- INITIAL outreach (interested? / learn more / send resume if interested) → **not** RECRUITER_PIPELINE applied; → needs_reply or new_opportunity + opportunity.  
- Strong pipeline (submitted profile, representing you, acknowledgement) → new_application applied.  
- Mirror in `src/lib/gmailClassify.js` + fixtures (CGI interest email).

## LLM

Replace/extend SYSTEM with user’s stage prompt; **normalize** Phase A: map screening/assessment/final_round → `interviewing` until Phase B schema ships **OR** ship Phase B statuses in same migration (prefer: **ASSUMED Phase A normalize collapse** to keep one migration small).

## Client

| File | Change |
|------|--------|
| APPLICATION_STATUSES | + opportunity |
| STATUS_STYLES | + opportunity |
| Active filter | include opportunity |
| inPipeline | + opportunity count |
| Form select | + opportunity |

## Tests

| Case | Level |
|------|-------|
| CGI interest → opportunity + awaiting | unit |
| Submitted profile → applied | unit |
| Ack → applied | unit |
| Rank: interviewing + “send availability” keeps interviewing | unit helper |
| normalize collapses Phase B statuses in A | unit |

## Secrets

None new.
