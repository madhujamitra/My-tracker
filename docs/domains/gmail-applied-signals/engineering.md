# Gmail applied signals — engineering

Status: **shipped (code)** · Product: [[product]] · Design: [[design]]

## Call

Extend existing classify + `gmail-sync` only: **email `Date` → `applied_at`**, recruiter-pipeline → `new_application`, invites stay `interview_event` with better parse/query; dual-write `needs_reply` when waiting on candidate.

## Why

- Today `ensureApplication` sets `applied_at: now` → “Applied today” lies.  
- `APPLIED_RE` misses recruiter threads (Vistera/Mosaic/Altimetrik).  
- Invites can miss Gmail `q` or get weak `starts_at` (`now+24h`).

## Risk

- Recruiter spam → too many `applied` rows → tighten patterns + AI miss-path; Clear/manual delete.  
- Wrong company (agency vs client) → prefer subject “with X” extract.  
- Overwriting `applied_at` on updates → **never** change `applied_at` if row exists.

## Reuse (verified)

| Path | Role |
|------|------|
| `supabase/functions/gmail-sync/index.ts` | Sync loop; `ensureApplication`; Date header already read for needs_reply |
| `supabase/functions/_shared/classify.js` | Heuristics — extend |
| `src/lib/gmailClassify.js` | Mirror classify + tests |
| `supabase/functions/_shared/llmClassify.js` | Prompt kinds — add recruiter_pipeline guidance |
| `src/lib/llmClassifyParse.js` | Allow same kinds |
| `src/gmailClassify.test.js` | Fixtures from product examples |
| `applications.applied_at` | Existing `date` column — no migration |

## Data rules

| Event | `applications` | `applied_at` | Other |
|-------|----------------|--------------|-------|
| Type A confirmation | insert/match `applied` | **message Date** (create only) | — |
| Type B recruiter pipeline | insert/match `applied` | message Date (create only) | if waiting-on-me → `mail_needs_reply` |
| Interview / calendar invite | ensure app `interviewing` | message Date if **new** app | `interview_events.starts_at` from subject/snippet when parseable |
| Reject / offer | status update | **do not** change `applied_at` | — |

Helper: `emailDateToIsoDate(dateHdr) → 'YYYY-MM-DD' | null`; fallback `now` only if header missing.

## Classify additions

```text
RECRUITER_PIPELINE_RE — opportunity / represent you / share.*resume / submit(ting)? (your )?resume /
  interested in (a )?(new )?opportunity / Tech Lead opportunity with / opportunity with <Company>
WAITING_ON_ME — please (share|send).*(resume|availability) / if you are interested / looking forward to hearing from you
  (already partly NEEDS_REPLY_RE)
```

Priority (keep reject/offer/interview before apply):

1. reject → offer → interview/invite  
2. APPLIED_RE (type A)  
3. RECRUITER_PIPELINE → `new_application` + flag `awaiting_candidate_reply?`  
4. needs_reply alone (no employer / weak)  

LLM system prompt: teach type A/B; company = employer; `applied` for recruiter pipeline; `ignore` pure cold spam without employer.

## Gmail query widen

Add terms: `opportunity`, `interested`, `Invitation`, `screening`, `resume` (keep `newer_than:7d` cap).

## Invite `starts_at`

Best-effort parse from subject (`Tue Aug 4, 2026 5:30pm`) / snippet; else keep stub; don’t block create.

## API / client

No new Edge functions. Sync summary unchanged shape (optional `recruiter_pipeline` count — skip unless cheap).

## Tests

| Case | Level |
|------|-------|
| Date header → applied_at | unit (pure parse) |
| Vistera / Mosaic / Altimetrik / Cover Genius fixtures | unit classify |
| ensureApplication does not overwrite applied_at | unit or sync helper test |
| LLM normalize still ignore-safe | existing parse tests |

## Secrets

None new.
