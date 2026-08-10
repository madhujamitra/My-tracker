# BYOK AI email analysis — plan

Status: **Phase 1–2 shipped (code)** · Phase 3 polish deferred

[[product]] · [[design]] · [[engineering]]

## 1. Outcome & non-goals

User BYOK improves Gmail sync classification; no hosted LLM; heuristics remain primary + fallback.

## 2. Sources reconciled

| Source | Decision |
|--------|----------|
| Product | Modules paste key; sync uses AI when present |
| Design | Card under Google sync; password field; On/Off chip |
| Eng | Encrypted `user_ai_settings`; Edge-only decrypt |
| Conflict | None — React/Tailwind my-task |

## 3. Blockers

| ID | Blocker | Phase |
|----|---------|-------|
| B2 | Set `AI_KEY_ENCRYPTION_SECRET` on Supabase | Deploy |
| B3 | Redeploy `gmail-sync` + shared `llmClassify` | Phase 2 |

## 4. E2E journeys

| Step | System | Success |
|------|--------|---------|
| Open Modules | App | AI card visible |
| Paste key → Save | ai-key-save | Chip “AI on”, hint ••••abcd |
| Sync (rules miss) | gmail-sync + LLM | Offer/odd mail classified; apps updated |
| Sync (LLM 429) | gmail-sync | Continues with rules; message shows AI errors |
| Clear key | ai-key-clear | Chip off; sync still works |

## 5. Screen / system map

Modules (AiKeyPanel) → Edge ai-key-* → `user_ai_settings`  
gmail-sync → classify heuristics → (miss) decrypt key → LLM JSON → applications / mail_needs_reply

## 6. State / backend

See [[engineering]]. No secrets in `app_state`.

## 7. Design match

See [[design]]. Mirror `GmailPanel` card pattern.

## 8. Implementation phases

### Phase 1 — Key vault plumbing
- **Status:** shipped (code)
- **AC1:** Key not in client storage; status returns hint only  
- **Tests:** `src/lib/aiCrypto` / crypto tests  

### Phase 2 — Sync + LLM classify
- **Status:** shipped (code) — deploy `gmail-sync`
- **Behavior:** Heuristic first; LLM only on miss; max 15 AI calls/sync; stop AI on 401/403/429  
- **Also:** heuristic `offer` regex; sync summary `offers` + `ai_*`  
- **AC2:** “we are pleased to offer” → `offer` (rules); ambiguous → LLM when key on  
- **Tests:** `src/lib/llmClassifyParse.test.js`, offer in `gmailClassify.test.js`  

### Phase 3 — Copy + guardrails
- **Goal:** Richer cost/privacy copy; optional AI toggle without clearing key  
- **Deps:** Phase 2  

## 9. Failure & recovery

| Failure | User sees | Recovery |
|---------|-----------|----------|
| Invalid key | Save error / sync AI errors | Fix key |
| LLM 429 | Sync partial + “AI errors (rules used)” | Retry later |
| Decrypt fail | Sync heuristics only | Re-paste key in Modules |

## 10. Rollout / rollback

Works only if user pastes key. Rollback: Clear key or redeploy prior `gmail-sync`.

## 11. Production DoD

- [ ] Save/clear/status E2E  
- [ ] Sync with AI on + off  
- [ ] No ciphertext in SELECT for authenticated role  
- [ ] Redeploy `gmail-sync` after Phase 2  

## Principal engineer

**Call:** Heuristic first; LLM on miss only (capped) — accuracy without burning tokens.  
**Slice:** Phase 1 vault alone; Phase 2 wires sync.  
**Proof:** Parse unit tests; Sync message shows `AI hits/calls`; 429 → rules continue.
