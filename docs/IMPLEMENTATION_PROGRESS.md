# Implementation progress

- **Plan:** `docs/domains/application-pipeline/plan.md`
- **Branch:** `main`
- **Baseline:** `npm test` — 41 pass (pre-change)
- **Pre-existing failures:** none

## Phases

| Phase | Status |
|-------|--------|
| 1 Schema + UI statuses | **complete** |
| 2 Classify outreach ≠ applied | **complete** |
| 3 Sync + LLM + no-backward | **complete** |
| 4 Validate & docs | **complete** (AC7 manual Sync pending deploy) |
| 5 Full stage enum | **deferred** |

## Acceptance criteria

| ID | Status | Evidence |
|----|--------|----------|
| AC1 | code done | `APPLICATION_STATUSES` + form/filter; needs SQL alter applied in Supabase |
| AC2 | pass | `getJobDashboardStats` `inPipeline` includes opportunity |
| AC3 | pass | `gmailClassify.test.js` CGI interest → `new_opportunity` |
| AC4 | pass | ack / representation → `new_application` |
| AC5 | code done | `gmail-sync` `new_opportunity` → status opportunity + needs_reply; needs deploy |
| AC6 | pass | `pickForwardStatus('interviewing','opportunity')` stays interviewing |
| AC7 | **blocked on user** | Manual Sync after schema SQL + `gmail-sync` deploy |

## Files changed

- Schema: `supabase/schema.sql`
- UI: `ApplicationsPage.jsx`, `applications.js`, `gmail.js`, `staleApplications.js`
- Classify: `gmailClassify.js`, `_shared/classify.js`
- Pipeline: `pipelineStatus.js` (src + edge)
- LLM: `llmClassifyParse.js`, `_shared/llmClassify.js`
- Sync: `gmail-sync/index.ts`
- Tests: `gmailClassify.test.js`, `llmClassifyParse.test.js`, `staleApplications.test.js`
- Docs: application-pipeline packet, parent applications product, this progress file

## Commands executed

| Command | Result |
|---------|--------|
| `npm test` | 70 pass (incl. 20 pipeline fixtures) |
| `npm run build` | ok |

## Runtime evidence

- Unit fixtures cover CGI interest, ack, Vistera, Mosaic, forward-only rank.
- Live Sync E2E not run in this session (needs deployed function + DB CHECK).

## Decisions and deviations

- Phase A only (+`opportunity`); Phase B stages collapsed in LLM normalize.
- `needs_reply` with company ensures opportunity app (forward-only if already further along).
- Fill `role` from LLM `job_title` / `proposed_role` when empty.

## Unresolved risks

- Existing false Applied rows not auto-backfilled.
- CHECK violation until user runs schema alter.
- Deploy lag: code in repo ≠ live Edge until `supabase functions deploy gmail-sync`.

## Blockers

- **B1** User must run schema SQL (status + kind CHECK).
- **B2** User must redeploy `gmail-sync`.
- **AC7** Manual Sync after B1–B2.

## Next eligible phase

Phase 5 (deferred) after AC7 verified in production.
