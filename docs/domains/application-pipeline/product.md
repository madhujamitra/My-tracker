# Application pipeline redesign

Status: **shipped (code)** — schema + Edge deploy required for live Sync  
Design: [[design]] · Eng: [[engineering]] · Plan: [[plan]] · Parent: [[../applications/product]]

## Outcome

Job seeker sees **pipeline stage that matches reality**: cold recruiter outreach is **Opportunity** (action may be required), not Applied; Applied only after real submission/representation/ack; reply waits are a **badge**, not a status.

## Non-goals

- Not a full ATS / multi-company CRM  
- Not making `needs_reply` a pipeline status  
- Not backfilling historical wrong “Applied” rows automatically in v1 (manual edit OK)  
- Not rewriting habit/task KPIs  

## Slice (this ship — Phase A)

1. Add status **`opportunity`**.  
2. Cold recruiter “are you interested?” → create/update app as **opportunity** + `awaiting_candidate_reply` / needs-reply queue — **not** applied.  
3. Submission / acknowledgement / “submitted your profile” → **applied**.  
4. Never move status **backward** from email alone.  
5. Board + filters + KPI treat opportunity as active pipeline.

Defer screening / assessment / final_round / accepted / on_hold to Phase B (schema reserved in eng).

## Rollback

Redeploy prior `gmail-sync` + classify; map unknown statuses → `applied` if needed. Drop new CHECK values only if unused.

## Constraint

**Trust:** false Applied from outreach spam damages the board more than a missing Opportunity row.

## Evidence

| Fixture | Expected |
|---------|----------|
| CGI: “Senior SWE opportunity… If you’re interested…” | `opportunity` + awaiting reply; company CGI |
| “I submitted your profile to CGI” | `applied` |
| CGI Job Application Acknowledgement | `applied` |
| Vistera representation / resume submitted | `applied` |
| Interview invite | stay/move `interviewing` (Phase A); screening detail in B |

## Target pipeline (full model)

```text
opportunity → applied → screening → assessment → interviewing → final_round → offer → accepted
exits: rejected | withdrawn | on_hold
(keep not_selected for stale auto-close OR fold into rejected — ASSUMED: keep not_selected)
```

**Separate:** `awaiting_candidate_reply: boolean` + existing `mail_needs_reply`.

## Email kinds (target)

`new_opportunity` | `new_application` | `status_update` | `interview_event` | `assessment_event` | `needs_reply` | `offer_event` | `ignore`

## Open / ASSUMED

| ID | Question | ASSUMED |
|----|----------|---------|
| Q1 | Keep `not_selected` vs merge into `rejected`? | Keep `not_selected` for stale rule |
| Q2 | Phase A only vs full enum day one? | **Phase A:** add `opportunity` + classify fix; reserve Phase B statuses in schema optionally |
| Q3 | `needs_reply` kind when already applied? | Keep status; set awaiting + mail_needs_reply |

## Shippable steps

1. Product/design/eng/plan packet (this folder)  
2. Schema + `APPLICATION_STATUSES` + filters/KPI  
3. Classify + LLM SYSTEM (outreach ≠ applied)  
4. gmail-sync apply map + no-backward  
5. Deploy + fixture Sync  
