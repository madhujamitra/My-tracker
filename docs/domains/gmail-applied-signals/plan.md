# Gmail applied date + recruiter pipeline — plan

Status: **shipped (code)** — redeploy `gmail-sync` to activate

[[product]] · [[design]] · [[engineering]]

## 1. Outcome & non-goals

**Outcome:** Sync sets **Applied date from the email’s received day**, treats **recruiter pipelines** as `applied` (self-submit *and* recruiter-contact), and **does not miss screening invites**.

**Non-goals:** Thread-wide first-mail archaeology; new status enum; recruiter vs self UI badges; hosted LLM changes beyond prompt/classify.

## 2. Sources reconciled

| Source | Decision |
|--------|----------|
| Product | Two apply types → same `applied`; dual-write needs_reply when waiting on me; company = employer |
| Design | No new UI; Applications + KPI + needs-reply consume correct data |
| Eng | Extend classify + `gmail-sync` only; never overwrite `applied_at` |
| Conflict | “Waiting on them” vs “waiting on me” — both `applied`; only me → also needs_reply |
| ASSUMED Q1 | `applied_at` = Date of message that **creates** the row |
| ASSUMED Q2 | Cold spam without employer → ignore / needs_reply only if explicit ask |
| ASSUMED Q3 | Prefer “with \<Company\>” over agency From-name |

## 3. Blockers

| ID | Blocker | Phase |
|----|---------|-------|
| B1 | Redeploy `gmail-sync` after classify/date fix (incl. prior `decryptApiKey` fix) | Phase 1–2 deploy |
| B2 | Confirm 7d window covers fixture mails at test time | Manual E2E |

No open product blockers beyond ASSUMED Q1–Q3.

## 4. E2E user journeys

| Step | System | Success |
|------|--------|---------|
| Connect Google | existing OAuth | Connected |
| Sync | `gmail-sync` | No Edge crash |
| Type A receipt in window | classify + insert | App `applied`, `applied_at` = mail Date |
| Type B recruiter (Vistera/Mosaic) | classify + insert | Employer company, `applied`, correct date |
| Type B waiting on me (Altimetrik) | dual write | App + open needs_reply |
| Screening invite (Cover Genius) | interview_event | App + interview; not skipped |
| Re-sync same mail | proposals applied | No duplicate; `applied_at` unchanged |
| Dashboard | `getJobDashboardStats` | “Applied today” matches real dates |

## 5. Screen / system map

```text
Gmail message (Date, From, Subject, snippet)
  → classifyJobEmail / LLM-on-miss
  → gmail-sync ensureApplication(applied_at from Date)
  → applications | interview_events | mail_needs_reply
  → ApplicationsPage Applied column | KPI Applied today | Reply chip
```

## 6. State / backend deltas

| Delta | Detail |
|-------|--------|
| Schema | **None** (`applied_at date` exists) |
| `ensureApplication` | Accept `appliedAt`; set only on insert; updates touch `last_activity_at` / status only |
| Classify | Recruiter pipeline regex + company-from-“with X”; invite/query widen |
| LLM prompt | Type A/B + employer company |
| Auth | Unchanged |

## 7. Design match

No chrome change. Success = correct dates/rows on existing surfaces ([[design]]).

## 8. Implementation phases

### Phase 1 — Applied date from email
- **Goal:** Stop using sync `now` for `applied_at`
- **Extend:** `gmail-sync/index.ts` (`emailDateToIsoDate`, pass into `ensureApplication`); optional `src/lib/emailDate.js` + test
- **AC1:** New app from sync has `applied_at` = Date header day  
- **AC2:** Existing app match does not change `applied_at`  
- **Tests:** unit parse Date header variants  
- **Deps:** none  

### Phase 2 — Recruiter pipeline = applied
- **Goal:** Type B fixtures classify as `new_application` / `applied`
- **Extend:** `_shared/classify.js`, `src/lib/gmailClassify.js`, LLM system string in `llmClassify.js`
- **AC3:** Mosaic / Vistera / Altimetrik-style subject+snippet → `new_application`, employer company when present  
- **AC4:** Waiting-on-me → also `mail_needs_reply` upsert in sync  
- **Tests:** `gmailClassify.test.js` fixtures from product table  
- **Deps:** Phase 1 (date on create)  

### Phase 3 — Invites not missed
- **Goal:** Screening calendar invites always classify + better `starts_at`
- **Extend:** Gmail `q` terms; `CALENDAR_INVITE_RE` if needed; best-effort datetime parse for `interview_events.starts_at`
- **AC5:** “Invitation from… Initial Screening” → `interview_event`, not skip  
- **AC6:** When subject has weekday+time, `starts_at` ≠ dumb now+24h (best effort)  
- **Tests:** classify invite fixture; optional parse unit  
- **Deps:** Phase 1 for new-app date  

### Phase 4 — Validate & docs
- **Goal:** Ship gate + docs honesty  
- **Extend:** `docs/domains/applications/product.md` stage note; gmail-setup one-liner  
- **AC7:** Manual Sync on four user fixtures (or closest in 7d)  
- **Deps:** Phases 1–3 deployed  

## 9. Failure & recovery

| Failure | User sees | Recovery |
|---------|-----------|----------|
| Bad Date header | `applied_at` = today fallback | Manual edit Applied date |
| False applied spam | Extra board row | Delete / status edit; tighten regex later |
| Invite still filtered by `q` | Missing interview | Widen query; Sync again |
| LLM 429 | Rules-only for rest of sync | Existing AI error counts |
| Edge boot crash | “Failed to send…” | Deploy fix (decryptApiKey already) |

## 10. Analytics & monetization

None required. Optional later: `sync_recruiter_pipeline_count` in summary — out of ship.

## 11. Rollout / rollback

- Deploy `gmail-sync` (+ shared classify bundle).  
- Rollback: redeploy previous function revision; rows already written keep dates (safe).  
- No feature flag; behaviour is sync-time only.

## 12. Production DoD

- [ ] `npm test` green (date parse + classify fixtures)  
- [ ] AC1–AC6  
- [ ] Manual: at least one Type B + one invite in Sync summary / board  
- [ ] “Applied today” KPI not inflated by sync-day stamps  
- [ ] Docs in this folder status → partial/shipped after implement  

## 13. Open / deferred

- Walk Gmail thread for true first-message `applied_at`  
- UI badge self vs recruiter  
- Agency/client disambiguation model beyond regex  
- Backfill rewrite of existing wrong `applied_at` rows  

## Principal lenses (locked)

**Product:** Two apply types, one status; date = received day.  
**Critic:** Biggest kill risk = recruiter **spam → fake applied**; mitigate with employer-required / AI ignore + never overwrite dates.  
**QA:** Unit fixtures for four examples; E2E = one Sync after deploy.  
**Eng:** Smallest seam = classify + `ensureApplication` date — no new tables.
