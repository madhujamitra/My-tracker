# BYOK AI email analysis

Status: **Phase 1–2 shipped (code)** — redeploy `gmail-sync` for LLM path

Design: [[design]] · Build: [[engineering]] · Plan: [[plan]] · Parent: applications

## Outcome

Job seeker pastes **their own** LLM API key in Modules so Gmail sync classifies mail (applied / reject / interview / offer / needs-reply) more accurately than keyword heuristics alone.

## Non-goals

- Not bundling a paid Actofy/my-task hosted LLM for all users
- Not sending mail bodies to a third party without an explicit user key
- Not replacing Google OAuth
- Not building a full email client or chat UI in v1

## Slice

Modules → **AI analysis** card → paste OpenAI-compatible API key → Save / Clear → Sync: **rules first**, AI on misses (max 15/sync); no key → heuristics only.

## Rollback

Clear key in Modules (row deleted). Sync falls back to regex classifier. No migration of historical auto-applies.

## Constraint

**Secrets:** key must never appear in Vite/`VITE_*`, logs, or client network traces to third parties except the user’s chosen LLM endpoint. Prefer encrypt-at-rest in Supabase + Edge Function-only use.

## Evidence

1. Save key → status “AI analysis on”  
2. Sync with ambiguous reject/offer mail → correct `offer` / `rejected` without false Accept UI  
3. Clear key → sync still works via heuristics  

## Open questions

| ID | Question | Default if undecided |
|----|----------|----------------------|
| Q1 | Provider: OpenAI only vs OpenAI-compatible base URL? | ASSUMED: OpenAI-compatible (base URL + key) |
| Q2 | Model default? | ASSUMED: `gpt-4o-mini` (cheap) |
| Q3 | Send full body or subject+snippet only? | ASSUMED: subject + snippet + from (minimize PII) |
| Q4 | Encrypt key with app secret vs Vault? | ASSUMED: Edge encrypt with `AI_KEY_ENCRYPTION_SECRET` |
