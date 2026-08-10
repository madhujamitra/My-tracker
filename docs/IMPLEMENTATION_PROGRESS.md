# Implementation progress

- **Plan:** `docs/domains/gmail-applied-signals/plan.md`
- **Branch:** `main`
- **Baseline:** `npm test` — 30 pass (pre-change)
- **Pre-existing failures:** none
- **Deviation:** Implemented gmail-applied-signals (conversation active plan), not obsolete Applications scaffold

## Phases

| Phase | Status |
|-------|--------|
| 1 Applied date from email | **complete** |
| 2 Recruiter pipeline = applied | **complete** |
| 3 Invites not missed | **complete** |
| 4 Validate & docs | **complete** (manual Sync pending user deploy) |

## Acceptance criteria

| ID | Status | Implementation | Test | Runtime |
|----|--------|----------------|------|---------|
| AC1 | done | `ensureApplication(..., appliedAt)` from `emailDateToIsoDate` | `emailDate.test.js` | Needs Sync after deploy |
| AC2 | done | Match path never updates `applied_at` | code review ensureApplication | Needs Sync |
| AC3 | done | Recruiter classify + employer guess | Vistera/Mosaic/Altimetrik fixtures | Needs Sync |
| AC4 | done | `awaiting_candidate_reply` → needs_reply upsert | Altimetrik fixture + sync dual write | Needs Sync |
| AC5 | done | Invitation from + Initial Screening | Cover Genius fixture | Needs Sync (7d window) |
| AC6 | done | `parseInviteStartsAt` | emailDate.test.js | Needs Sync |
| AC7 | pending | — | — | User: deploy + Sync now |

## Files changed

- `src/lib/emailDate.js`, `src/emailDate.test.js`
- `src/lib/gmailClassify.js`, `src/gmailClassify.test.js`
- `src/lib/llmClassifyParse.js`
- `supabase/functions/_shared/{emailDate,classify,llmClassify}.js`
- `supabase/functions/gmail-sync/index.ts`
- `docs/domains/gmail-applied-signals/*`, applications product/gmail-setup
- `docs/IMPLEMENTATION_PLAN.md`, `docs/IMPLEMENTATION_PROGRESS.md`
- `package.json` (test list)

## Commands executed

- `npm test` → **38 pass**
- `supabase functions deploy gmail-sync` → **skipped by user** (must run locally)

## Decisions

- Employer preferred via Client: / “with X team” / subject dash-tail over From person name
- Recruiter without employer → needs_reply only if waiting-on-me, else skip (anti-spam)
- No `applied_at` backfill of existing rows

## Unresolved risks

- Mails older than 7d (e.g. Altimetrik Jul 30) won’t appear until query window expands
- False-positive recruiter → applied spam still possible
- Deploy not run from this session

## Blockers

None for code. **Deploy `gmail-sync`** required for runtime AC7.

## Next eligible phase

None — code complete. User action: deploy + Sync.
