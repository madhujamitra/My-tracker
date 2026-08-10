# Gmail applied date + recruiter pipeline signals

Status: **shipped (code)**  
Design: [[design]] · Eng: [[engineering]] · Plan: [[plan]] · Parent: [[../applications/product]]

## Outcome

Sync creates/updates applications so **Applied date = the day that email was received**, and **recruiter-contact pipelines** (waiting on them *or* waiting on me) count as `applied` — not only “thank you for applying” confirmations. Screening **calendar invites must not be missed**.

## Non-goals

- Not a full thread crawler / whole-inbox ATS
- Not new statuses for “recruiter” vs “self” (same `applied`; optional source tag only)
- Not changing BYOK key vault
- Not auto-replying to recruiters

## Slice

1. Parse Gmail `Date` → `applied_at` / `last_activity_at` (never sync clock for applied date).  
2. Classify recruiter outreach + in-progress recruiter threads as `new_application` → `applied`.  
3. Keep invites as `interview_event` (parse start when present); ensure linked app with correct `applied_at`.  
4. Recruiter mail that still needs *my* reply → application **and** `needs_reply` (dual write).

## Rollback

Redeploy prior `gmail-sync` + classify; existing rows keep dates (no destructive migration). Manual edit of `applied_at` remains.

## Constraint

**Trust / precision:** false “applied” from cold recruiter spam vs missing real pipelines. Prefer: high-signal recruiter patterns + AI-on-miss; company = **employer** when named (Vistera/Mosaic), not agency.

## Evidence

| Example (user fixtures) | Expected |
|-------------------------|----------|
| IT/IQ ↔ Vistera (resume submitted / represent) | App **Vistera**, `applied`, `applied_at` = that mail’s Date |
| Forecareer ↔ Mosaic (resume shared) | App **Mosaic**, `applied`, `applied_at` = first synced signal’s Date (ASSUMED: this message’s Date if we don’t walk thread) |
| Cover Genius “Invitation… Initial Screening” | `interview_event` + app **Cover Genius** (or from domain), invite time parsed when possible |
| Altimetrik / React Architect (waiting on my reply) | App **Altimetrik**, `applied` + open **needs_reply** |

Dashboard “Applied today” uses real `applied_at`, not sync day.

## Two apply types (product)

| Type | User meaning | Status | Extra |
|------|--------------|--------|-------|
| A — Self applied | I submitted; confirmation / receipt | `applied` | — |
| B — Recruiter pipeline | Recruiter contacted me; I’m in process (waiting on them **or** on me) | `applied` | If waiting on me → also `needs_reply` |

## Open questions

| ID | Question | Default if undecided |
|----|----------|----------------------|
| Q1 | Thread first-mail date vs this-message Date for `applied_at`? | **ASSUMED:** Date of message that **creates** the app; never overwrite with a later mail |
| Q2 | Cold “are you open to opportunities?” with no employer name? | **ASSUMED:** `needs_reply` only if reply asked; else ignore / AI; no fake Unknown spam flood |
| Q3 | Agency vs client company when both present? | **ASSUMED:** prefer client name in subject/body (“with Vistera”, “with Mosaic”) |

## Shippable steps

1. Date-from-email in sync create/update  
2. Recruiter-pipeline classify (+ fixtures from screenshots)  
3. Invite parse + query widen so invites aren’t filtered out  
4. Dual write applied + needs_reply when waiting on me  
5. Unit tests + manual Sync on the four fixture threads  
